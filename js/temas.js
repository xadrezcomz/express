// Temas de data: Natal, Carnaval, Páscoa... Cada tema é uma "roupa" por cima do
// ponto base (o visual normal do site), e nunca muda os arquivos do base:
//
//   temas/<nome>.css   as cores e os enfeites (tudo dentro de html[data-tema="<nome>"])
//   temas/<nome>.js    o que precisa de movimento (neve caindo, por exemplo)
//   e uma linha na lista TEMAS, logo abaixo
//
// Quem escolhe o tema é `tema` em js/config.js. Vazio = ponto base.
// Este arquivo roda no <head>, antes de a página aparecer, para o tema não "piscar".
(function () {
  'use strict';
  var TEMAS = {
    natal: {
      nome: 'Natal',
      // confete do puzzle resolvido
      festaCores: ['#ff4d5e', '#35d07f', '#ffd36b', '#ffffff', '#ff4d5e', '#35d07f', '#bfe6ff'],
      festaGlifos: ['❄', '★', '♞', '❄', '♛', '★', '♜'],
      // uma propulsão a mais no topo do site, que já vem escolhida
      propulsao: { id: 'neve', nome: 'Neve', i: '#FFFFFF', e: '#BFE6FF', c1: '#FFFFFF', c2: '#8FC8FF', forma: 1, cone: [0.8, 0.9] },
      // as peças do topo voam de gorro
      gorro: true
    }
  };

  var cfg = window.XE_CONFIG || {}, nome = cfg.tema || '';
  var pedido = /[?&]tema=([a-z0-9-]+)/.exec(location.search);
  if (pedido) nome = pedido[1] === 'base' ? '' : pedido[1];
  var tema = TEMAS[nome];
  window.XE_TEMA = tema || {};
  if (!tema) return;

  document.documentElement.setAttribute('data-tema', nome);
  var css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = 'temas/' + nome + '.css';
  document.head.appendChild(css);
  var js = document.createElement('script');
  js.src = 'temas/' + nome + '.js'; js.defer = true;
  document.head.appendChild(js);
})();
