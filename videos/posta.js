#!/usr/bin/env node
// Posta um vídeo pronto como Reel no Instagram, pela API da Meta (login do Facebook para Empresas).
//
//   node videos/posta.js 001-tabuleiro            prepara e envia, mas NÃO publica (fica um rascunho de 24 h)
//   node videos/posta.js 001-tabuleiro --publica  envia e publica de verdade
//
// O vídeo é videos/prontos/NOME.mp4; a legenda do post é instagram/NOME.txt, na pasta privada das
// lições. A conta é a de instagram.json nessa pasta ({ "conta": "ID da conta do Instagram" }).
// O token nunca fica em arquivo: nas sessões do Claude na nuvem ele é um segredo de rede do
// ambiente para graph.facebook.com e rupload.facebook.com (o proxy põe o cabeçalho Authorization).
// Em outro computador, use a variável META_TOKEN.
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { spawnSync } = require('child_process');

const AQUI = __dirname;
const VIZINHA = path.join(AQUI, '..', '..', 'express-licoes');
const BASE = process.env.XE_LICOES ? path.resolve(process.env.XE_LICOES) : VIZINHA;
const API = 'https://graph.facebook.com/v21.0/';
const AUT = 'Authorization: Bearer ' + (process.env.META_TOKEN || 'proxy-injected');

function curl(args) {
  const r = spawnSync('curl', ['-sS'].concat(args), { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error('curl falhou: ' + r.stderr.trim());
  let j; try { j = JSON.parse(r.stdout); } catch (e) { throw new Error('Resposta estranha da Meta: ' + r.stdout.slice(0, 300)); }
  if (j.error) throw new Error('A Meta recusou: ' + (j.error.message || JSON.stringify(j.error)));
  return j;
}
const espera = s => spawnSync('sleep', [String(s)]);

async function principal() {
  const nome = process.argv[2], publica = process.argv.includes('--publica');
  if (!nome) throw new Error('Diga qual vídeo postar (ex.: node videos/posta.js 001-tabuleiro)');
  const video = path.join(AQUI, 'prontos', nome + '.mp4');
  const fLegenda = path.join(BASE, 'instagram', nome + '.txt');
  const cfg = JSON.parse(fs.readFileSync(path.join(BASE, 'instagram.json'), 'utf8'));
  if (!fs.existsSync(video)) throw new Error('Não achei o vídeo ' + video);
  if (!fs.existsSync(fLegenda)) throw new Error('Falta a legenda em ' + fLegenda);
  const legenda = fs.readFileSync(fLegenda, 'utf8').trim();

  // 1. uma cópia no formato que o Instagram recomenda para Reels (H.264, AAC estéreo 44,1 kHz)
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xe-ig-'));
  const mp4 = path.join(tmp, nome + '.mp4');
  const f = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', video, '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.1',
    '-pix_fmt', 'yuv420p', '-r', '30', '-g', '60', '-b:v', '8M', '-maxrate', '10M', '-bufsize', '16M',
    '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2', '-movflags', '+faststart', mp4], { encoding: 'utf8' });
  if (f.status !== 0) throw new Error('ffmpeg: ' + f.stderr);

  // 2. o "rascunho" do Reel (container), com a legenda; a capa é o quadro em thumb_ms
  const campos = ['media_type=REELS', 'upload_type=resumable', 'caption=' + legenda, 'share_to_feed=true'];
  if (cfg.capa_ms != null) campos.push('thumb_offset=' + cfg.capa_ms);
  const c = curl(['-X', 'POST', API + cfg.conta + '/media', '-H', AUT].concat(...campos.map(x => ['--form-string', x])));
  console.log('  rascunho ' + c.id);

  // 3. o arquivo do vídeo
  // A resposta do envio às vezes vem como erro ("Request processing failed") mesmo com o vídeo
  // recebido: quem manda é o estado do rascunho. Se ele não andar, o envio é repetido.
  const tam = fs.statSync(mp4).size;
  const envia = () => { try { return curl(['-X', 'POST', c.uri, '-H', AUT, '-H', 'offset: 0', '-H', 'file_size: ' + tam,
    '-H', 'Content-Type: application/octet-stream', '-H', 'Expect:', '--data-binary', '@' + mp4]); } catch (e) { return { erro: e.message }; } };
  const estado = () => curl([API + c.id + '?fields=status_code,status', '-H', AUT]);
  let st = null;
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    envia();
    for (let k = 0; k < 45; k++) {               // até uns 6 minutos processando
      espera(8);
      st = estado();
      if (st.status_code !== 'IN_PROGRESS') break;
    }
    if (st.status_code === 'FINISHED' || st.status_code === 'ERROR') break;
  }
  fs.rmSync(tmp, { recursive: true, force: true });

  if (st.status_code !== 'FINISHED') throw new Error('O Instagram não aceitou o vídeo: ' + st.status);
  console.log('  vídeo processado');
  if (!publica) { console.log('  pronto para publicar (rascunho, não publicado). Use --publica para publicar.'); return; }

  // 5. publica
  const p = curl(['-X', 'POST', API + cfg.conta + '/media_publish', '-H', AUT, '--form-string', 'creation_id=' + c.id]);
  const info = curl([API + p.id + '?fields=permalink,timestamp', '-H', AUT]);
  const log = path.join(BASE, 'instagram', 'publicados.json');
  const lista = fs.existsSync(log) ? JSON.parse(fs.readFileSync(log, 'utf8')) : [];
  lista.push({ video: nome, id: p.id, link: info.permalink, quando: info.timestamp });
  fs.writeFileSync(log, JSON.stringify(lista, null, 2) + '\n');
  console.log('  ✔ publicado: ' + info.permalink);
}
principal().catch(e => { console.error('  ✘ ' + e.message); process.exit(1); });
