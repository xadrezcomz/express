// O menu do topo no celular: o botão de três linhas abre e fecha a lista de seções.
(function () {
  'use strict';
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
