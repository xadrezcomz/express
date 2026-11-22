// Medição de visitas e cliques de compra, pelo GoatCounter (sem cookies e sem dados pessoais:
// só a página, o país aproximado e de onde a pessoa veio). Painel: https://xadrezcomz.goatcounter.com
//
// Também marca cada link de pagamento da Hotmart com a origem do clique (src=topo, cartao,
// barra, final...), para ver na Hotmart qual botão gerou cada venda.
//
// Eventos enviados (aparecem no painel com o prefixo express/):
//   express/compra/<origem>   clique num botão de compra
//   express/conhecer-curso    clique que leva ao cartão do curso
//   express/desafio/<como>    desafio do dia terminado: primeira, depois-de-errar ou viu-a-jogada
(function () {
  'use strict';
  var BASE = 'https://xadrezcomz.goatcounter.com';

  // a contagem da página em si
  var s = document.createElement('script');
  s.async = true; s.src = 'https://gc.zgo.at/count.js';
  s.setAttribute('data-goatcounter', BASE + '/count');
  document.head.appendChild(s);

  function evento(nome) {
    var gc = window.goatcounter;
    if (gc && gc.count) gc.count({ path: 'express/' + nome, title: nome, event: true });
  }
  window.XE_evento = evento;

  // a origem de cada botão de compra vai no link da Hotmart (parâmetro src)
  function marca() {
    document.querySelectorAll('a[data-origem]').forEach(function (a) {
      if (!/pay\.hotmart\.com/.test(a.href)) return;
      var u = new URL(a.href);
      u.searchParams.set('src', 'site-' + a.getAttribute('data-origem'));
      a.href = u.toString();
    });
  }
  // os scripts do site preenchem os links primeiro; depois a origem entra
  if (document.readyState === 'complete') marca(); else window.addEventListener('load', marca);

  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a');
    if (!a) return;
    if (/pay\.hotmart\.com/.test(a.href)) evento('compra/' + (a.getAttribute('data-origem') || 'outro'));
    else if (a.getAttribute('href') === '#curso' || /#curso$/.test(a.getAttribute('href') || '')) evento('conhecer-curso');
  }, true);
})();
