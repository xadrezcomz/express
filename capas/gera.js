#!/usr/bin/env node
// Gera as capas dos módulos e das aulas para a Hotmart (1920x1080, JPG), a partir de
// capas/lista.js e dos modelos modelo-modulo.html e modelo-aula.html.
//
//   node capas/gera.js              gera todas + a folha de miniaturas (capas/saida/)
//   node capas/gera.js 00           só o módulo 00 e as aulas dele
//   node capas/gera.js --amostra    só a primeira capa de módulo e a primeira de aula
//
// Precisa do playwright. No fim, confere o tamanho em pixels e o peso de cada arquivo.
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');

const RAIZ = path.join(__dirname, '..'), SAIDA = path.join(__dirname, 'saida');
const ORDEM = ['ciano', 'ouro', 'rosa', 'roxo', 'laranja'];
const LIMITE = { modulo: 5 * 1024 * 1024, aula: 2 * 1024 * 1024 };
const TIPOS = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.jpg': 'image/jpeg' };
const fatia = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

(async () => {
  const args = process.argv.slice(2), amostra = args.includes('--amostra'), so = args.find(a => !a.startsWith('--'));
  delete require.cache[require.resolve('./lista.js')];
  const lista = require('./lista.js');

  // a fila de capas
  const fila = [];
  lista.forEach((m, i) => {
    const cor = m.cor || ORDEM[i % ORDEM.length], base = 'modulo-' + m.numero;
    if (so && so !== m.numero) return;
    fila.push({ tipo: 'modulo', arquivo: base + '.jpg', dados: { numero: m.numero, titulo: m.titulo, peca: m.peca, cor } });
    (m.aulas || []).forEach(a => fila.push({ tipo: 'aula', arquivo: base + '-' + fatia(a.rotulo) + '.jpg',
      dados: { rotulo: a.rotulo, titulo: a.titulo, peca: a.peca || m.peca, cor, duracao: a.duracao, semente: m.numero + a.rotulo } }));
  });
  const fazer = amostra ? [fila.find(c => c.tipo === 'modulo'), fila.find(c => c.tipo === 'aula')].filter(Boolean) : fila;
  const repetido = fazer.map(c => c.arquivo).find((a, i, t) => t.indexOf(a) !== i);
  if (repetido) throw new Error('Dois itens da lista dariam o mesmo arquivo: ' + repetido);

  // um servidor só para o navegador achar as fontes e as peças
  const srv = http.createServer((req, res) => {
    const arq = path.join(RAIZ, decodeURIComponent(req.url.split('?')[0]));
    if (!arq.startsWith(RAIZ) || !fs.existsSync(arq)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    fs.createReadStream(arq).pipe(res);
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + srv.address().port + '/capas/';

  fs.mkdirSync(SAIDA, { recursive: true });
  const nav = await chromium.launch();
  const pag = await nav.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  let erro = false;
  for (const c of fazer) {
    await pag.goto(url + 'modelo-' + c.tipo + '.html');
    await pag.evaluate(d => monta(d), c.dados);
    await pag.waitForLoadState('networkidle');
    const estourou = await pag.evaluate(() => { const t = document.getElementById('titulo'); return t.scrollHeight > t.parentElement.clientHeight || t.scrollWidth > t.clientWidth; });
    const destino = path.join(SAIDA, c.arquivo);
    await pag.screenshot({ path: destino, type: 'jpeg', quality: 88 });
    const kb = fs.statSync(destino).size / 1024, passou = fs.statSync(destino).size > LIMITE[c.tipo];
    if (passou || estourou) erro = true;
    c.kb = kb;
    console.log(c.arquivo.padEnd(40), '1920x1080', (kb.toFixed(0) + ' KB').padStart(8),
      passou ? '  ACIMA DO LIMITE!' : '  ok', estourou ? '  TÍTULO NÃO COUBE!' : '');
  }

  // a folha de miniaturas
  if (!amostra) {
    const todas = fs.readdirSync(SAIDA).filter(a => /^modulo-.*\.jpg$/.test(a)).sort();
    await pag.setContent('<style>body{margin:0;padding:24px;background:#07041a;color:#f4f1ff;font:600 15px sans-serif;display:grid;grid-template-columns:repeat(4,1fr);gap:18px;width:1600px;box-sizing:border-box}' +
      'img{width:100%;border-radius:10px;display:block;margin-bottom:6px}</style>' +
      todas.map(a => '<div><img src="' + url + 'saida/' + a + '">' + a + '</div>').join(''));
    await pag.setViewportSize({ width: 1600, height: 900 });
    await pag.waitForLoadState('networkidle');
    await pag.screenshot({ path: path.join(SAIDA, 'folha-miniaturas.jpg'), type: 'jpeg', quality: 85, fullPage: true });
    console.log('folha-miniaturas.jpg (' + todas.length + ' capas)');
  }
  await nav.close(); srv.close();
  if (erro) process.exit(1);
})();
