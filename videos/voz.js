// Grava a fala de uma lição com a voz clonada na ElevenLabs, a partir do texto.
// A ElevenLabs devolve, junto com o áudio, o segundo exato de cada letra: os lances e as
// setas ficam no ponto sem precisar de reconhecimento de fala.
//
// A chave da conta nunca fica em arquivo. Nas sessões do Claude na nuvem ela é um "segredo
// de rede" do ambiente (posto no cabeçalho xi-api-key a caminho de api.elevenlabs.io); em
// outro computador, vem da variável de ambiente ELEVENLABS_API_KEY.
//
// Qual voz e como ela fala ficam em voz.json, na pasta das lições:
//   { "voz": "CODIGO_DA_VOZ", "modelo": "eleven_multilingual_v2",
//     "ajustes": { "stability": 0.5, "similarity_boost": 0.8, "speed": 1.0 } }
// ("voz: CODIGO" no cabeçalho de uma lição troca a voz só nela.)
'use strict';
const fs = require('fs');
const path = require('path');

const { spawnSync } = require('child_process');

const API = 'https://api.elevenlabs.io/v1/';
// O pedido sai pelo curl, que passa pelo proxy do ambiente (o fetch do node não passa, e é
// no proxy que a chave é posta). Sem a variável, o cabeçalho da chave não é enviado.
function pede(caminho, corpo) {
  const args = ['-sS', '--max-time', '300', '-w', '\n%{http_code}', '-H', 'content-type: application/json'];
  if (process.env.ELEVENLABS_API_KEY) args.push('-H', 'xi-api-key: ' + process.env.ELEVENLABS_API_KEY);
  if (corpo) args.push('-X', 'POST', '--data-binary', '@-');
  const r = spawnSync('curl', args.concat(API + caminho), { input: corpo ? JSON.stringify(corpo) : undefined, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (r.error || r.status !== 0) throw new Error('Não consegui falar com a ElevenLabs: ' + (r.error ? r.error.message : r.stderr.trim()));
  const corte = r.stdout.lastIndexOf('\n'), codigo = Number(r.stdout.slice(corte + 1)), texto = r.stdout.slice(0, corte);
  if (codigo < 200 || codigo >= 300) {
    const dica = codigo === 401 ? ' A chave da ElevenLabs está faltando, é inválida ou não tem essa permissão.' : '';
    throw new Error('A ElevenLabs recusou o pedido (' + codigo + ').' + dica + ' ' + texto.slice(0, 300));
  }
  return JSON.parse(texto);
}

function config(pasta) {
  const f = path.join(pasta, 'voz.json');
  const c = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
  if (process.env.ELEVENLABS_VOICE_ID && !c.voz) c.voz = process.env.ELEVENLABS_VOICE_ID;
  return c;
}

// As vozes da conta (as clonadas vêm com category "cloned" ou "professional").
async function vozes() { return pede('voices').voices; }

// Grava `texto` em `arquivoMp3` e devolve as palavras com o segundo de cada uma.
async function grava(texto, arquivoMp3, cfg) {
  if (!cfg || !cfg.voz) throw new Error('Falta dizer qual voz usar: crie voz.json na pasta das lições (veja videos/voz.js) ou rode --vozes para ver os códigos');
  const corpo = { text: texto, model_id: cfg.modelo || 'eleven_multilingual_v2' };
  if (cfg.ajustes) corpo.voice_settings = cfg.ajustes;
  const j = pede('text-to-speech/' + encodeURIComponent(cfg.voz) + '/with-timestamps?output_format=mp3_44100_128', corpo);
  fs.writeFileSync(arquivoMp3, Buffer.from(j.audio_base64, 'base64'));

  // letras -> palavras (o texto enviado tem um espaço só entre as palavras)
  const a = j.alignment, palavras = [];
  let atual = null;
  a.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) { atual = null; return; }
    if (!atual) { atual = { p: '', ini: a.character_start_times_seconds[i], fim: 0 }; palavras.push(atual); }
    atual.p += ch;
    atual.fim = a.character_end_times_seconds[i];
  });
  return { fonte: 'elevenlabs', palavras: palavras };
}

module.exports = { config, vozes, grava };
