#!/usr/bin/env node
// Gera os vídeos curtos das lições do Xadrez Express: o áudio da fala + o tabuleiro 2D do
// site com as peças andando, setas e legenda, em MP4 de 1080x1920.
//
//   node videos/gera.js 001-cavalo            um vídeo (usa videos/audios/001-cavalo.*)
//   node videos/gera.js todas                 todas as lições com áudio que ainda não têm vídeo em dia
//   node videos/gera.js 001-cavalo --previa   sem áudio, no ritmo estimado da fala (para conferir os lances)
//   node videos/gera.js 001-cavalo --foto 12  só uma foto do segundo 12 (PNG)
//   node videos/gera.js --rascunho audio.m4a  ouve um áudio gravado e escreve o rascunho da lição
//
//   node videos/gera.js 001-cavalo --voz      sem áudio: grava a fala com a voz clonada (ElevenLabs)
//   node videos/gera.js --vozes               lista as vozes da conta da ElevenLabs
//
// Outras opções: --audio ARQUIVO, --refaz (refaz mesmo que o vídeo esteja em dia).
// O formato do arquivo da lição e o passo a passo estão em videos/LEIA-ME.md.
// Precisa de: node, playwright (chromium), ffmpeg e, para áudio gravado, faster-whisper.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const L = require('./licao.js');
const voz = require('./voz.js');

const AQUI = __dirname;
// As lições do curso (textos e áudios) são vendidas, então moram fora deste repositório, que é
// público: numa pasta privada com licoes/, audios/ e voz.json. Ela é a da variável XE_LICOES ou,
// se existir, a pasta "express-licoes" ao lado deste repositório. Sem nenhuma das duas, vale
// videos/ (onde fica só a lição de exemplo). Os vídeos prontos saem sempre em videos/prontos/.
const VIZINHA = path.join(AQUI, '..', '..', 'express-licoes');
const BASE = process.env.XE_LICOES ? path.resolve(process.env.XE_LICOES) : (fs.existsSync(VIZINHA) ? VIZINHA : AQUI);
const PASTA = { licoes: path.join(BASE, 'licoes'), audios: path.join(BASE, 'audios'), prontos: path.join(AQUI, 'prontos'), cache: path.join(AQUI, '.cache') };
const EXT_AUDIO = ['mp3', 'm4a', 'wav', 'ogg', 'opus', 'aac', 'mp4', 'webm', 'flac'];
const QPS = 30, LARGURA = 1080, ALTURA = 1920;
const SOBRA = 0.8;            // segundos de vídeo depois que a fala termina

function roda(cmd, args, opcoes) {
  const r = spawnSync(cmd, args, Object.assign({ encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }, opcoes));
  if (r.error) throw new Error('Não consegui rodar "' + cmd + '": ' + r.error.message);
  if (r.status !== 0) throw new Error(cmd + ' falhou:\n' + String(r.stderr || '').split('\n').slice(-12).join('\n'));
  return r.stdout;
}
function duracaoDoAudio(arquivo) {
  return Number(roda('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', arquivo]).trim());
}
function achaAudio(nome) {
  for (const e of EXT_AUDIO) { const f = path.join(PASTA.audios, nome + '.' + e); if (fs.existsSync(f)) return f; }
  return null;
}
function achaLicao(arg) {
  const tentativas = [arg, arg + '.txt', path.join(PASTA.licoes, arg), path.join(PASTA.licoes, arg + '.txt'),
    path.join(AQUI, 'licoes', arg), path.join(AQUI, 'licoes', arg + '.txt')];
  const f = tentativas.find(t => fs.existsSync(t) && fs.statSync(t).isFile());
  if (!f) throw new Error('Não achei a lição "' + arg + '" (procurei em videos/licoes/)');
  return f;
}

// As palavras ouvidas num áudio, com o segundo de cada uma. Fica guardado em videos/.cache:
// o mesmo áudio só é ouvido uma vez.
function ouve(audio) {
  const st = fs.statSync(audio);
  fs.mkdirSync(PASTA.cache, { recursive: true });
  const guardado = path.join(PASTA.cache, path.basename(audio) + '.' + st.size + '.' + Math.round(st.mtimeMs) + '.json');
  const aoLado = audio.replace(/\.[^.]+$/, '') + '.palavras.json';      // deixado pela ElevenLabs (videos/voz.js)
  if (fs.existsSync(aoLado) && fs.statSync(aoLado).mtimeMs >= st.mtimeMs - 2000) return JSON.parse(fs.readFileSync(aoLado, 'utf8'));
  if (!fs.existsSync(guardado)) {
    process.stdout.write('  ouvindo o áudio... ');
    const t0 = Date.now();
    roda('python3', [path.join(AQUI, 'alinha.py'), audio, guardado]);
    console.log(((Date.now() - t0) / 1000).toFixed(0) + 's');
  }
  return JSON.parse(fs.readFileSync(guardado, 'utf8'));
}

// ---------------------------------------------------------------- o vídeo de uma lição
const navegadores = {};   // um Chromium para o 2D e outro para o 3D
const RAIZ = path.join(AQUI, '..');
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png' };
async function abrePalco(estilo) {
  // Sem placa de vídeo, o 3D (WebGL) precisa do SwiftShader. O 2D não usa WebGL e sai cerca de
  // 3 vezes mais rápido desenhado direto pelo processador (--disable-gpu), com a mesma imagem.
  const tres = estilo === '3d';
  if (!navegadores[tres]) navegadores[tres] = await require('playwright').chromium.launch({
    args: tres ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : ['--disable-gpu'] });
  const pagina = await navegadores[tres].newPage({ viewport: { width: LARGURA, height: ALTURA }, deviceScaleFactor: 1 });
  pagina.on('pageerror', e => console.error('  ✘ erro no palco: ' + e.message));
  if (estilo === '3d') {
    // o palco 3D usa módulos JavaScript, que o navegador não abre direto do disco:
    // os arquivos do repositório são servidos num endereço de mentira
    await pagina.route('http://palco.local/**', rota => {
      const f = path.join(RAIZ, decodeURIComponent(new URL(rota.request().url()).pathname));
      if (!f.startsWith(RAIZ) || !fs.existsSync(f)) return rota.fulfill({ status: 404, body: '' });
      rota.fulfill({ status: 200, contentType: TIPOS[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
    });
    await pagina.goto('http://palco.local/videos/palco3d.html');
    await pagina.waitForFunction(() => window.XEV_PRONTO, null, { timeout: 60000 });
  } else {
    await pagina.goto('file://' + path.join(AQUI, 'palco.html'));
  }
  return pagina;
}

async function geraVideo(arquivoLicao, op) {
  const nome = path.basename(arquivoLicao).replace(/\.txt$/, '');
  const licao = L.le(fs.readFileSync(arquivoLicao, 'utf8'), nome);
  const saida = path.join(PASTA.prontos, nome + '.mp4');
  let audio = op.previa ? null : (op.audio || achaAudio(nome));

  if (!audio && !op.previa && op.foto == null) {
    if (!op.voz) {
      if (op.lote) return null;
      throw new Error('A lição "' + nome + '" ainda não tem áudio. Ponha a gravação em videos/audios/' + nome +
        '.m4a (ou .mp3, .ogg, .wav...), ou use --voz com a ElevenLabs, ou --previa para ver sem áudio.');
    }
    console.log('  gravando a fala na ElevenLabs...');
    fs.mkdirSync(PASTA.audios, { recursive: true });
    audio = path.join(PASTA.audios, nome + '.mp3');
    const gravado = await voz.grava(licao.fala, audio, Object.assign({}, voz.config(BASE), licao.voz ? { voz: licao.voz } : {}));
    fs.writeFileSync(audio.replace(/\.mp3$/, '.palavras.json'), JSON.stringify(gravado));
  }
  if (op.lote && !op.refaz && audio && fs.existsSync(saida)) {
    const feito = fs.statSync(saida).mtimeMs;
    if (feito > fs.statSync(arquivoLicao).mtimeMs && feito > fs.statSync(audio).mtimeMs) return null;   // já está em dia
  }
  console.log('▶ ' + nome + (licao.titulo ? '  (' + licao.titulo + ')' : ''));

  // os segundos de cada palavra da fala
  let tempos, durAudio = 0;
  if (audio) {
    durAudio = duracaoDoAudio(audio);
    const ouvido = ouve(audio);
    const r = L.temposOuvidos(licao.palavras, ouvido.palavras, durAudio);
    tempos = r.tempos;
    if (r.casadas < 0.75) {
      console.log('  ⚠ só ' + Math.round(r.casadas * 100) + '% do texto da lição bate com o que foi dito no áudio.' +
        ' Confira se o texto é o mesmo da gravação: os lances podem sair fora do ponto.');
    }
  } else {
    tempos = L.temposEstimados(licao.palavras, 0.3);
  }
  const roteiro = L.roteiro(licao, tempos, durAudio);
  if (op.estilo) roteiro.estilo = op.estilo;
  const duracao = roteiro.duracao + SOBRA;

  const pagina = await abrePalco(roteiro.estilo);
  await pagina.evaluate(r => window.XEV.prepara(r), roteiro);
  fs.mkdirSync(PASTA.prontos, { recursive: true });

  if (op.foto != null) {
    await pagina.evaluate(t => window.XEV.quadro(t), op.foto);
    const png = path.join(PASTA.prontos, nome + '-' + String(op.foto).replace('.', '_') + 's.png');
    await pagina.screenshot({ path: png });
    await pagina.close();
    console.log('  foto: ' + path.relative(process.cwd(), png));
    return png;
  }

  // fotografa só os quadros em que algo muda; cada foto vale por quantos quadros ficar igual
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xe-video-'));
  const total = Math.ceil(duracao * QPS);
  const fotos = [];
  const cdp = await pagina.context().newCDPSession(pagina);     // foto direta do Chromium: bem mais rápida
  for (let q = 0; q < total; q++) {
    const mudou = await pagina.evaluate(t => window.XEV.quadro(t), q / QPS);
    if (mudou || !fotos.length) {
      const f = path.join(tmp, 'q' + String(fotos.length).padStart(5, '0') + '.jpg');
      const foto = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 94, optimizeForSpeed: true });
      fs.writeFileSync(f, Buffer.from(foto.data, 'base64'));
      fotos.push({ arquivo: f, quadros: 1 });
    } else fotos[fotos.length - 1].quadros++;
  }
  await pagina.close();
  let lista = 'ffconcat version 1.0\n';
  fotos.forEach(f => { lista += "file '" + f.arquivo + "'\nduration " + (f.quadros / QPS).toFixed(6) + '\n'; });
  lista += "file '" + fotos[fotos.length - 1].arquivo + "'\n";
  fs.writeFileSync(path.join(tmp, 'lista.txt'), lista);

  // junta as fotos, a barrinha de progresso e o áudio (com o volume padronizado)
  const d = duracao.toFixed(3);
  const args = ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'lista.txt')];
  if (audio) args.push('-i', audio); else args.push('-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo');
  args.push('-f', 'lavfi', '-i', 'color=c=0xffd36b:s=' + LARGURA + 'x10:r=' + QPS,
    '-filter_complex',
    '[0:v]fps=' + QPS + ',format=yuv420p[q];[q][2:v]overlay=x=\'-W+W*t/' + d + '\':y=H-10:shortest=0[v];' +
    '[1:a]' + (audio ? 'loudnorm=I=-16:TP=-1.5:LRA=11,' : '') + 'apad[a]',
    '-map', '[v]', '-map', '[a]', '-t', d,
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(QPS),
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', saida);
  roda('ffmpeg', args);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('  ✔ ' + path.relative(process.cwd(), saida) + '  (' + duracao.toFixed(1) + 's, ' + fotos.length + ' fotos para ' + total + ' quadros)');
  return saida;
}

// ---------------------------------------------------------------- rascunho a partir de um áudio
// Ouve a gravação e escreve videos/licoes/NOME.txt com o texto dito, uma frase por linha,
// pronto para receber as ordens do tabuleiro. O áudio é copiado para videos/audios/.
function rascunho(audio, nome) {
  if (!fs.existsSync(audio)) throw new Error('Não achei o áudio ' + audio);
  nome = nome || path.basename(audio).replace(/\.[^.]+$/, '');
  fs.mkdirSync(PASTA.audios, { recursive: true });
  fs.mkdirSync(PASTA.licoes, { recursive: true });
  const destino = path.join(PASTA.audios, nome + path.extname(audio).toLowerCase());
  if (path.resolve(audio) !== destino) fs.copyFileSync(audio, destino);
  const arquivo = path.join(PASTA.licoes, nome + '.txt');
  if (fs.existsSync(arquivo)) throw new Error('Já existe ' + path.relative(process.cwd(), arquivo) + ': apague ou use --nome OUTRO');
  const ouvido = ouve(destino);
  const numero = (nome.match(/^\d+/) || [''])[0];
  // uma frase por linha
  const frases = ouvido.frases.join(' ').replace(/\s+/g, ' ').replace(/([.!?…])\s+/g, '$1\n').trim();
  fs.writeFileSync(arquivo, 'licao: ' + (numero ? Number(numero) : '') + '\ntitulo: \nposicao: inicial\n---\n' + frases + '\n');
  console.log('Rascunho em ' + path.relative(process.cwd(), arquivo) + '. Falta o título, a posição e as ordens do tabuleiro.');
  return arquivo;
}

// ---------------------------------------------------------------- linha de comando
async function principal() {
  const args = process.argv.slice(2), op = {}, nomes = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--previa') op.previa = true;
    else if (a === '--3d') op.estilo = '3d';
    else if (a === '--2d') op.estilo = '2d';
    else if (a === '--refaz') op.refaz = true;
    else if (a === '--voz') op.voz = true;
    else if (a === '--vozes') op.vozes = true;
    else if (a === '--audio') op.audio = args[++i];
    else if (a === '--foto') op.foto = Number(String(args[++i]).replace(',', '.'));
    else if (a === '--rascunho') op.rascunho = args[++i];
    else if (a === '--nome') op.nome = args[++i];
    else if (a[0] === '-') throw new Error('Opção desconhecida: ' + a);
    else nomes.push(a);
  }
  if (op.rascunho) { rascunho(op.rascunho, op.nome); return; }
  if (op.vozes) {
    (await voz.vozes()).forEach(v => console.log(v.voice_id + '  ' + (v.category || '').padEnd(13) + v.name));
    return;
  }
  if (!nomes.length) {
    console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 16).map(l => l.replace(/^\/\/ ?/, '')).join('\n'));
    return;
  }
  let feitos = 0, falhas = 0;
  try {
    if (nomes.length === 1 && nomes[0] === 'todas') {
      op.lote = true;
      const licoes = fs.readdirSync(PASTA.licoes).filter(f => /\.txt$/.test(f)).sort();
      for (const f of licoes) {
        try { if (await geraVideo(path.join(PASTA.licoes, f), op)) feitos++; }
        catch (e) { falhas++; console.error('  ✘ ' + f + ': ' + e.message); }
      }
      console.log(feitos + ' vídeo(s) gerado(s)' + (falhas ? ', ' + falhas + ' com erro' : '') + '.');
    } else {
      for (const n of nomes) await geraVideo(achaLicao(n), op);
    }
  } finally {
    for (const n of Object.values(navegadores)) await n.close();
  }
  if (falhas) process.exitCode = 1;
}

principal().catch(e => { console.error('✘ ' + e.message); process.exit(1); });
