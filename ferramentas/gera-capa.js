#!/usr/bin/env node
// Tira a foto que aparece quando o link do site é compartilhado (img/compartilhar-2.jpg, 1200x630).
// É o topo do site no ponto base, com o título bem grande e a frase do curso.
//
// Uso: com o site servido em http://localhost:8765 (python3 -m http.server 8765),
//   node ferramentas/gera-capa.js
// Precisa do playwright. Ao mudar a imagem, troque também o número no nome do
// arquivo (e em index.html): WhatsApp e Instagram guardam a imagem antiga pelo nome.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await p.goto('http://localhost:8765/?tema=base');
  await p.addStyleTag({ content: `
    .topo,.hero-dica,.efeitos,.acoes,.selo,.hero-texto::before{display:none!important}
    .hero{min-height:630px;height:630px;padding:0;justify-content:center}
    .hero-texto{max-width:none;gap:26px}
    .hero h1{font-size:212px;line-height:.9}
    .chamada{font-size:46px;max-width:none;font-weight:600}` });
  await p.evaluate(() => {
    document.querySelector('.chamada').innerHTML = 'O jeito mais rápido de <b>evoluir no xadrez</b>';
    window.dispatchEvent(new Event('resize'));
  });
  await p.waitForTimeout(3500);
  await p.screenshot({ path: 'img/compartilhar-2.jpg', type: 'jpeg', quality: 88 });
  await b.close();
})();
