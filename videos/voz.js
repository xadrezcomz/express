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

const API = 'https://api.elevenlabs.io/v1/';
function cabecalhos() {
  return { 'xi-api-key': process.env.ELEVENLABS_API_KEY || 'chave-posta-pelo-ambiente', 'content-type': 'application/json' };
}
async function pede(caminho, opcoes) {
  const r = await fetch(API + caminho, Object.assign({ headers: cabecalhos() }, opcoes));
  if (!r.ok) {
    const dica = r.status === 401 ? ' A chave da ElevenLabs está faltando ou é inválida.' : '';
    throw new Error('A ElevenLabs recusou o pedido (' + r.status + ').' + dica + ' ' + (await r.text()).slice(0, 300));
  }
  return r.json();
}

function config(pasta) {
  const f = path.join(pasta, 'voz.json');
  const c = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
  if (process.env.ELEVENLABS_VOICE_ID && !c.voz) c.voz = process.env.ELEVENLABS_VOICE_ID;
  return c;
}

// As vozes da conta (as clonadas vêm com category "cloned" ou "professional").
async function vozes() { return (await pede('voices')).voices; }

// Grava `texto` em `arquivoMp3` e devolve as palavras com o segundo de cada uma.
async function grava(texto, arquivoMp3, cfg) {
  if (!cfg || !cfg.voz) throw new Error('Falta dizer qual voz usar: crie voz.json na pasta das lições (veja videos/voz.js) ou rode --vozes para ver os códigos');
  const corpo = { text: texto, model_id: cfg.modelo || 'eleven_multilingual_v2' };
  if (cfg.ajustes) corpo.voice_settings = cfg.ajustes;
  const j = await pede('text-to-speech/' + encodeURIComponent(cfg.voz) + '/with-timestamps?output_format=mp3_44100_128',
    { method: 'POST', body: JSON.stringify(corpo) });
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
