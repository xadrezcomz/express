#!/usr/bin/env node
// Posta um vídeo pronto como Reel na Página do Facebook (a mesma legenda do Instagram).
//
//   node videos/posta-facebook.js 015-lance-ilegal
//
// Precisa de um token com acesso à Página (pages_show_list, pages_read_engagement,
// pages_manage_posts). Como no posta.js, o token nunca fica em arquivo: é o segredo de rede do
// ambiente para graph.facebook.com e rupload.facebook.com (ou a variável META_TOKEN).
// A Página é "pagina" em instagram.json; sem ela, usa a primeira Página que o token enxerga.
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { spawnSync } = require('child_process');

const AQUI = __dirname;
const BASE = process.env.XE_LICOES ? path.resolve(process.env.XE_LICOES) : path.join(AQUI, '..', '..', 'express-licoes');
const V = 'v21.0', API = 'https://graph.facebook.com/' + V + '/';
const AUT = 'Authorization: Bearer ' + (process.env.META_TOKEN || 'proxy-injected');

function curl(args) {
  const r = spawnSync('curl', ['-sS'].concat(args), { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error('curl falhou: ' + r.stderr.trim());
  let j; try { j = JSON.parse(r.stdout); } catch (e) { throw new Error('Resposta estranha da Meta: ' + r.stdout.slice(0, 300)); }
  if (j.error) throw new Error('A Meta recusou: ' + (j.error.message || JSON.stringify(j.error)));
  return j;
}
const espera = s => spawnSync('sleep', [String(s)]);

function pagina(cfg) {
  if (cfg.pagina) return cfg.pagina;
  const eu = curl([API + 'me?fields=id,name', '-H', AUT]);
  // com um token de Página, "me" já é a Página
  const contas = (() => { try { return curl([API + 'me/accounts?fields=id,name', '-H', AUT]).data || []; } catch (e) { return []; } })();
  if (contas.length) return contas[0].id;
  if (eu && eu.id) return eu.id;
  throw new Error('O token não enxerga nenhuma Página do Facebook (faltam as permissões de Página)');
}

function principal() {
  const nome = process.argv[2];
  if (!nome) throw new Error('Diga qual vídeo postar (ex.: node videos/posta-facebook.js 015-lance-ilegal)');
  const video = path.join(AQUI, 'prontos', nome + '.mp4');
  const fLegenda = path.join(BASE, 'instagram', nome + '.txt');
  const cfg = JSON.parse(fs.readFileSync(path.join(BASE, 'instagram.json'), 'utf8'));
  if (!fs.existsSync(video)) throw new Error('Não achei o vídeo ' + video);
  const legenda = fs.existsSync(fLegenda) ? fs.readFileSync(fLegenda, 'utf8').trim() : '';
  const pag = pagina(cfg);

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xe-fb-'));
  const mp4 = path.join(tmp, nome + '.mp4');
  const f = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', video, '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.1',
    '-pix_fmt', 'yuv420p', '-r', '30', '-g', '60', '-b:v', '8M', '-maxrate', '10M', '-bufsize', '16M',
    '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', mp4], { encoding: 'utf8' });
  if (f.status !== 0) throw new Error('ffmpeg: ' + f.stderr);

  // 1. abre o envio
  const ini = curl(['-X', 'POST', API + pag + '/video_reels', '-H', AUT, '--form-string', 'upload_phase=start']);
  console.log('  facebook: envio ' + ini.video_id);
  // 2. manda o arquivo
  const tam = fs.statSync(mp4).size;
  curl(['-X', 'POST', 'https://rupload.facebook.com/video-upload/' + V + '/' + ini.video_id, '-H', AUT,
    '-H', 'offset: 0', '-H', 'file_size: ' + tam, '-H', 'Expect:', '--data-binary', '@' + mp4]);
  fs.rmSync(tmp, { recursive: true, force: true });
  // 3. publica
  curl(['-X', 'POST', API + pag + '/video_reels', '-H', AUT, '--form-string', 'upload_phase=finish',
    '--form-string', 'video_id=' + ini.video_id, '--form-string', 'video_state=PUBLISHED', '--form-string', 'description=' + legenda]);
  // 4. espera o processamento
  let st = null;
  for (let k = 0; k < 60; k++) {
    espera(8);
    st = curl([API + ini.video_id + '?fields=status,permalink_url', '-H', AUT]);
    const s = st.status || {};
    if (s.video_status === 'ready' || (s.publishing_phase && s.publishing_phase.status === 'complete')) break;
    if (s.video_status === 'error') throw new Error('O Facebook não aceitou o vídeo: ' + JSON.stringify(s));
  }
  const link = st && st.permalink_url ? 'https://www.facebook.com' + st.permalink_url.replace(/^https?:\/\/[^/]+/, '') : '(link ainda não disponível)';
  const log = path.join(BASE, 'instagram', 'publicados-facebook.json');
  const lista = fs.existsSync(log) ? JSON.parse(fs.readFileSync(log, 'utf8')) : [];
  lista.push({ video: nome, id: ini.video_id, link: link, quando: new Date().toISOString() });
  fs.writeFileSync(log, JSON.stringify(lista, null, 2) + '\n');
  console.log('  ✔ facebook: ' + link);
}
try { principal(); } catch (e) { console.error('  ✘ facebook: ' + e.message); process.exit(1); }
