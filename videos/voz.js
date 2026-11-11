// Grava a fala de uma lição com a sua voz clonada na ElevenLabs, a partir do texto.
// A ElevenLabs devolve, junto com o áudio, o segundo exato de cada letra: os lances e as
// setas ficam no ponto sem precisar de reconhecimento de fala.
//
// Precisa de duas variáveis de ambiente (nunca escreva a chave num arquivo do site):
//   ELEVENLABS_API_KEY   a chave da sua conta
//   ELEVENLABS_VOICE_ID  o código da sua voz clonada (ou "voz: CODIGO" no cabeçalho da lição)
// Opcional: ELEVENLABS_MODEL (padrão: eleven_multilingual_v2, que fala português).
'use strict';
const fs = require('fs');

function configurada() { return !!process.env.ELEVENLABS_API_KEY; }

// Grava `texto` em `arquivoMp3` e devolve as palavras com o segundo de cada uma.
async function grava(texto, arquivoMp3, voz) {
  const chave = process.env.ELEVENLABS_API_KEY;
  voz = voz || process.env.ELEVENLABS_VOICE_ID;
  if (!chave) throw new Error('Falta a variável ELEVENLABS_API_KEY');
  if (!voz) throw new Error('Falta dizer qual voz usar: variável ELEVENLABS_VOICE_ID ou "voz:" no cabeçalho da lição');

  const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + encodeURIComponent(voz) + '/with-timestamps?output_format=mp3_44100_128', {
    method: 'POST',
    headers: { 'xi-api-key': chave, 'content-type': 'application/json' },
    body: JSON.stringify({ text: texto, model_id: process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2' })
  });
  if (!r.ok) throw new Error('A ElevenLabs recusou o pedido (' + r.status + '): ' + (await r.text()).slice(0, 300));
  const j = await r.json();
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

module.exports = { configurada, grava };
