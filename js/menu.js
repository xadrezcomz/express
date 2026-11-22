// O topo do site: o botão de compra e, no celular, o menu de três linhas que abre a lista de seções.
(function () {
  'use strict';
  // Com a venda ligada (linkCompra em js/config.js), o botão do topo vira "Comprar" e leva
  // direto ao pagamento: quem toca nele já decidiu.
  var cfg = window.XE_CONFIG || {}, cta = document.querySelector('[data-cta-topo]');
  if (cta && cfg.linkCompra) {
    cta.textContent = 'Comprar';
    cta.href = cfg.linkCompra;
    cta.target = '_blank'; cta.rel = 'noopener';
  }

  var topo = document.querySelector('.topo'), botao = document.querySelector('.menu-abre'), menu = document.getElementById('menu');
  if (!topo || !botao || !menu) return;
  function abre(sim) {
    topo.classList.toggle('menu-aberto', sim);
    botao.setAttribute('aria-expanded', sim ? 'true' : 'false');
    botao.setAttribute('aria-label', sim ? 'Fechar o menu' : 'Abrir o menu');
  }
  botao.addEventListener('click', function () { abre(!topo.classList.contains('menu-aberto')); });
  // escolheu uma seção (ou tocou fora): fecha
  menu.addEventListener('click', function (ev) { if (ev.target.closest('a')) abre(false); });
  document.addEventListener('click', function (ev) { if (!topo.contains(ev.target)) abre(false); });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') abre(false); });
})();
