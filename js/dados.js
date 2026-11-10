// Os bancos do site (puzzles, partidas e frases) são grandes, e cada visita só
// precisa do item do dia. Por isso eles ficam cortados em fatias pequenas, em
// dados/fatias/, e aqui se baixa só a fatia onde está o item pedido.
// As fatias são feitas por ferramentas/fatia-dados.js a partir de dados/*.js.
(function () {
  'use strict';
  var esperando = {};      // 'puzzles-3' -> quem está esperando essa fatia
  var prontas = {};        // 'puzzles-3' -> os itens dela

  // cada arquivo de fatia chama isto ao chegar
  window.XE_fatia = function (tipo, numero, itens) {
    var chave = tipo + '-' + numero;
    prontas[chave] = itens;
    (esperando[chave] || []).forEach(function (f) { f(); });
    delete esperando[chave];
  };

  // Entrega a `pronto` o item do banco `tipo` que cabe ao dia `dia` (os bancos dão a volta quando acabam).
  window.XE_dados = function (tipo, dia, pronto) {
    var info = (window.XE_FATIAS || {})[tipo];
    if (!info) return;
    var i = ((dia % info.total) + info.total) % info.total, numero = Math.floor(i / info.porFatia), chave = tipo + '-' + numero;
    var entrega = function () { pronto(prontas[chave][i - numero * info.porFatia]); };
    if (prontas[chave]) { entrega(); return; }
    if (esperando[chave]) { esperando[chave].push(entrega); return; }
    esperando[chave] = [entrega];
    var s = document.createElement('script');
    s.src = 'dados/fatias/' + chave + '.js';
    document.body.appendChild(s);
  };
})();
