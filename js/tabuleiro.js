// Um tabuleiro reutilizável, no visual do site (as mesmas classes do desafio do dia).
// Usa as regras de js/xadrez.js. Mostra posições, setas, casas destacadas e nomes de
// casas, anima lances e recebe o lance (ou o toque numa casa) de quem está jogando.
//
//   var t = new Tabuleiro(elemento, { pecas: '../img/pecas-express/' });
//   t.posicao('rnbqkbnr/... w KQkq - 0 1', 'w');       // FEN e de que lado se olha
//   t.desenho({ destaques: [{ casas: ['e4'], cor: 'verde' }], setas: [{ de: 'e2', para: 'e4', cor: 'azul' }], rotulos: ['e4'] });
//   t.joga('e2e4', depois);                            // anima um lance (texto UCI)
//   t.modo('lance', { cor: 'w', aoTentar: function (lance) { t.aplica(lance) ou t.erra(lance) } });
//   t.modo('casa', { aoTocar: function (casa) { ... } });
(function () {
  'use strict';
  var X = window.Xadrez;
  var VAZIO = '8/8/8/8/8/8/8/8 w - - 0 1';
  var CORES = { verde: '53,208,127', vermelho: '255,79,120', azul: '46,230,255', amarelo: '255,211,107', roxo: '160,107,255', rosa: '255,79,216' };
  var NOME_PT = { K: 'R', Q: 'D', R: 'T', B: 'B', N: 'C' };

  function nome(i) { return X.indiceParaCasa(i); }
  function indice(casa) { return X.casaParaIndice(casa); }

  function Tabuleiro(moldura, op) {
    op = op || {};
    var self = this, base = op.pecas || 'img/pecas-express/';
    moldura.classList.add('tab-moldura');
    moldura.innerHTML = '<div class="tabuleiro"><div class="casas"></div><div class="tab-marcas"></div>' +
      '<svg class="tab-setas" viewBox="0 0 8 8" aria-hidden="true"></svg><div class="pecas"></div>' +
      '<div class="tab-promo" hidden></div></div>';
    var elTab = moldura.firstChild, elCasas = elTab.children[0], elMarcas = elTab.children[1], elSetas = elTab.children[2];
    var elPecas = elTab.children[3], elPromo = elTab.children[4];
    var pos = X.deFEN(VAZIO), lado = 'w', casas = [], pecas = {};
    var atual = { tipo: 'nenhum' }, escolhida = -1, alvos = [], arrasto = null, ocupado = false, abertoEm = 0;

    // ---------------------------------------------------------------- desenho
    function xy(i) { var x = i % 8, y = Math.floor(i / 8); return lado === 'b' ? [7 - x, 7 - y] : [x, y]; }
    function poe(el, i) { var p = xy(i); el.style.transform = 'translate(' + p[0] * 100 + '%,' + p[1] * 100 + '%)'; }
    function imagem(p) { return 'url(' + base + (p === p.toUpperCase() ? 'w' : 'b') + p.toLowerCase() + '.svg)'; }

    function montaCasas() {
      elCasas.innerHTML = ''; casas = [];
      for (var linha = 0; linha < 8; linha++) for (var col = 0; col < 8; col++) {
        var x = lado === 'b' ? 7 - col : col, y = lado === 'b' ? 7 - linha : linha, i = y * 8 + x;
        var c = document.createElement('div');
        c.className = 'casa' + ((x + y) % 2 === 0 ? ' clara' : '');
        if (col === 0) c.innerHTML += '<span class="coord fila">' + (8 - y) + '</span>';
        if (linha === 7) c.innerHTML += '<span class="coord coluna">' + 'abcdefgh'[x] + '</span>';
        elCasas.appendChild(c); casas[i] = c;
      }
    }
    function criaPeca(i, p) {
      var el = document.createElement('div');
      el.className = 'peca ' + (p === p.toUpperCase() ? 'branca' : 'preta');
      el.style.backgroundImage = imagem(p);
      poe(el, i);
      elPecas.appendChild(el); pecas[i] = el;
    }
    function montaPecas() {
      elPecas.innerHTML = ''; pecas = {};
      for (var i = 0; i < 64; i++) if (pos.casas[i]) criaPeca(i, pos.casas[i]);
    }
    function marca(classe, lista) {
      for (var i = 0; i < 64; i++) casas[i].classList.remove(classe);
      (lista || []).forEach(function (i) { if (i >= 0) casas[i].classList.add(classe); });
    }
    function marcaXeque() { marca('xeque', X.emXeque(pos) ? [X.casaDoRei(pos, pos.vez)] : []); }

    // Põe uma posição (texto FEN) e escolhe de que lado se olha ('w' ou 'b').
    this.posicao = function (fen, deQueLado) {
      pos = X.deFEN(fen || VAZIO);
      if (deQueLado && deQueLado !== lado) { lado = deQueLado; montaCasas(); }
      escolhida = -1; alvos = [];
      ['veio', 'foi', 'escolhida', 'pode', 'ocupada', 'dica', 'errou', 'certa'].forEach(function (c) { marca(c, []); });
      montaPecas(); marcaXeque(); self.desenho();
      elPromo.hidden = true;
    };
    this.estado = function () { return pos; };
    this.lado = function () { return lado; };

    // Destaques, setas e nomes de casas. Chamar sem nada limpa tudo.
    //   destaques: [{ casas: ['d4', 'e4'], cor: 'verde' }]   setas: [{ de: 'a1', para: 'a8', cor: 'vermelho' }]
    //   rotulos: ['e4'] ou 'todas' (escreve o nome dentro da casa)
    this.desenho = function (d) {
      d = d || {};
      var html = '';
      (d.destaques || []).forEach(function (g) {
        var rgb = CORES[g.cor] || CORES.verde;
        (g.casas || []).forEach(function (casa) {
          var p = xy(indice(casa));
          html += '<i class="tab-destaque" style="left:' + p[0] * 12.5 + '%;top:' + p[1] * 12.5 + '%;--rgb:' + rgb + '"></i>';
        });
      });
      var nomes = d.rotulos === 'todas' ? Array.apply(null, Array(64)).map(function (_, i) { return nome(i); }) : (d.rotulos || []);
      nomes.forEach(function (casa) {
        var i = indice(casa), p = xy(i), x = i % 8, y = Math.floor(i / 8);
        html += '<b class="tab-rotulo' + ((x + y) % 2 === 0 ? ' clara' : '') + '" style="left:' + p[0] * 12.5 + '%;top:' + p[1] * 12.5 + '%">' + casa + '</b>';
      });
      elMarcas.innerHTML = html;
      var svg = '';
      (d.setas || []).forEach(function (s) {
        var a = xy(indice(s.de)), b = xy(indice(s.para)), rgb = CORES[s.cor] || CORES.verde;
        var x1 = a[0] + 0.5, y1 = a[1] + 0.5, x2 = b[0] + 0.5, y2 = b[1] + 0.5, dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy) || 1;
        var ux = dx / len, uy = dy / len, cabeca = 0.42, fimx = x2 - ux * 0.16, fimy = y2 - uy * 0.16, bx = fimx - ux * cabeca, by = fimy - uy * cabeca;
        var cor = 'rgba(' + rgb + ',.88)';
        svg += '<line x1="' + (x1 + ux * 0.18) + '" y1="' + (y1 + uy * 0.18) + '" x2="' + bx + '" y2="' + by + '" stroke="' + cor + '" stroke-width=".2" stroke-linecap="round"/>' +
          '<polygon points="' + fimx + ',' + fimy + ' ' + (bx - uy * 0.25) + ',' + (by + ux * 0.25) + ' ' + (bx + uy * 0.25) + ',' + (by - ux * 0.25) + '" fill="' + cor + '"/>';
      });
      elSetas.innerHTML = svg;
    };

    // ---------------------------------------------------------------- lances
    // Anima o lance (objeto de js/xadrez.js) e atualiza a posição.
    this.aplica = function (l, depois) {
      var el = pecas[l.de], vitima = l.enPassant ? l.para + (pos.vez === 'w' ? 8 : -8) : l.para;
      if (pecas[vitima] && pecas[vitima] !== el) {
        var morta = pecas[vitima]; delete pecas[vitima];
        morta.classList.add('some'); setTimeout(function () { morta.remove(); }, 420);
      }
      if (el) { el.classList.remove('arrastando'); delete pecas[l.de]; pecas[l.para] = el; poe(el, l.para); }
      if (l.roque) {
        var deT = l.roque === 'curto' ? l.para + 1 : l.para - 2, paraT = l.roque === 'curto' ? l.para - 1 : l.para + 1;
        pecas[paraT] = pecas[deT]; delete pecas[deT]; poe(pecas[paraT], paraT);
      }
      if (l.promo && el) el.style.backgroundImage = imagem(pos.vez === 'w' ? l.promo.toUpperCase() : l.promo);
      pos = X.joga(pos, l);
      escolhida = -1; alvos = []; mostraAlvos();
      marca('veio', [l.de]); marca('foi', [l.para]); marca('dica', []); marca('errou', []);
      marcaXeque();
      if (depois) setTimeout(depois, 450);
    };
    // Anima um lance escrito em UCI ("e2e4", "e7e8q"). Devolve false se o lance não for legal.
    this.joga = function (uci, depois) {
      var l = X.deUCI(pos, uci);
      if (!l) return false;
      self.aplica(l, depois);
      return true;
    };
    // Lance que não vale: a peça vai até a casa, a casa fica vermelha e a peça volta sozinha.
    this.erra = function (l, depois) {
      var el = pecas[l.de], vitima = pecas[l.enPassant ? l.para + (pos.vez === 'w' ? 8 : -8) : l.para];
      ocupado = true; escolhida = -1; alvos = []; mostraAlvos();
      if (el) { el.classList.remove('arrastando'); poe(el, l.para); el.classList.add('errada'); }
      if (vitima && vitima !== el) vitima.classList.add('coberta');
      marca('errou', [l.para]);
      setTimeout(function () {
        if (el) { poe(el, l.de); el.classList.remove('errada'); }
        if (vitima) vitima.classList.remove('coberta');
        marca('errou', []); ocupado = false;
        if (depois) depois();
      }, 900);
    };
    // Marcas de apoio: 'dica' (casa piscando em ouro), 'certa' (verde) e 'errou' (vermelha).
    this.marcaCasas = function (classe, lista) { marca(classe, (lista || []).map(indice)); };

    // ---------------------------------------------------------------- quem pode mexer
    //   'nenhum'  só mostra
    //   'lance'   { cor: 'w'|'b', aoTentar(lance) }  o lance legal é entregue; quem chama decide se aplica ou erra
    //   'casa'    { aoTocar(casa) }                  devolve o nome da casa tocada
    this.modo = function (tipo, opcoes) {
      atual = { tipo: tipo || 'nenhum', op: opcoes || {} };
      escolhida = -1; alvos = []; mostraAlvos();
      elTab.classList.toggle('interativo', atual.tipo !== 'nenhum');
      elPromo.hidden = true;
    };

    function mostraAlvos() {
      for (var i = 0; i < 64; i++) casas[i].classList.remove('pode', 'ocupada');
      alvos.forEach(function (l) { casas[l.para].classList.add('pode'); if (pos.casas[l.para] || l.enPassant) casas[l.para].classList.add('ocupada'); });
      marca('escolhida', escolhida >= 0 ? [escolhida] : []);
    }
    function escolhe(i) {
      escolhida = i;
      alvos = i < 0 ? [] : X.lances(pos).filter(function (l) { return l.de === i; });
      mostraAlvos();
    }
    function minha(i) {
      var p = pos.casas[i];
      return p && X.corDa(p) === pos.vez && pos.vez === (atual.op.cor || pos.vez);
    }
    function tenta(de, para, pecaArrastada) {
      var opcoes = X.lances(pos).filter(function (l) { return l.de === de && l.para === para; });
      if (!opcoes.length) return false;
      if (opcoes.length > 1) { escolhePromo(opcoes, pecaArrastada); return true; }
      entrega(opcoes[0]);
      return true;
    }
    function entrega(l) { if (atual.op.aoTentar) atual.op.aoTentar(l); else self.aplica(l); }

    // promoção: as quatro peças aparecem sobre o tabuleiro para a pessoa escolher
    function escolhePromo(opcoes, el) {
      var cor = pos.vez, p = xy(opcoes[0].para);
      if (el) poe(el, opcoes[0].para);
      elPromo.innerHTML = '';
      elPromo.style.left = Math.min(p[0], 7) * 12.5 + '%';
      ['q', 'r', 'b', 'n'].forEach(function (t) {
        var l = opcoes.filter(function (o) { return o.promo === t; })[0];
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'tab-promo-peca';
        b.setAttribute('aria-label', { q: 'Dama', r: 'Torre', b: 'Bispo', n: 'Cavalo' }[t]);
        b.style.backgroundImage = imagem(cor === 'w' ? t.toUpperCase() : t);
        b.addEventListener('click', function (ev) {
          ev.stopPropagation();
          // o mesmo toque que levou o peão até a casa cai em cima do seletor: esse não vale como escolha
          if (Date.now() - abertoEm < 400) return;
          elPromo.hidden = true; entrega(l);
        });
        elPromo.appendChild(b);
      });
      elPromo.hidden = false; abertoEm = Date.now();
    }

    // ---------------------------------------------------------------- toque e arrasto
    function casaNoPonto(cx, cy) {
      var r = elTab.getBoundingClientRect(), col = Math.floor((cx - r.left) / (r.width / 8)), lin = Math.floor((cy - r.top) / (r.height / 8));
      if (col < 0 || col > 7 || lin < 0 || lin > 7) return -1;
      return lado === 'b' ? (7 - lin) * 8 + (7 - col) : lin * 8 + col;
    }
    elTab.addEventListener('pointerdown', function (ev) {
      if (ocupado || !elPromo.hidden || atual.tipo === 'nenhum') return;
      var i = casaNoPonto(ev.clientX, ev.clientY);
      if (i < 0) return;
      if (atual.tipo === 'casa') { if (atual.op.aoTocar) atual.op.aoTocar(nome(i)); return; }
      if (minha(i)) {
        var jaEra = escolhida === i;
        escolhe(i);
        arrasto = { i: i, el: pecas[i], x: ev.clientX, y: ev.clientY, mexeu: false, jaEra: jaEra, id: ev.pointerId, toque: ev.pointerType === 'touch' };
        try { elTab.setPointerCapture(ev.pointerId); } catch (e) { /* tudo bem */ }
        ev.preventDefault();
        return;
      }
      if (escolhida >= 0 && alvos.some(function (l) { return l.para === i; })) { tenta(escolhida, i); return; }
      escolhe(-1);
    });
    elTab.addEventListener('pointermove', function (ev) {
      if (!arrasto || ev.pointerId !== arrasto.id || !arrasto.el) return;
      if (!arrasto.mexeu && Math.abs(ev.clientX - arrasto.x) + Math.abs(ev.clientY - arrasto.y) < 7) return;
      arrasto.mexeu = true;
      var r = elTab.getBoundingClientRect(), c = r.width / 8;
      arrasto.el.classList.add('arrastando');
      arrasto.el.style.transform = 'translate(' + (ev.clientX - r.left - c / 2) + 'px,' + (ev.clientY - r.top - c * (arrasto.toque ? 1.1 : 0.5)) + 'px) scale(' + (arrasto.toque ? 1.45 : 1.08) + ')';
    });
    function solta(ev) {
      if (!arrasto || ev.pointerId !== arrasto.id) return;
      var a = arrasto; arrasto = null;
      if (!a.mexeu) { if (a.jaEra) escolhe(-1); return; }
      var c = elTab.getBoundingClientRect().width / 8;
      var para = ev.type === 'pointerup' ? casaNoPonto(ev.clientX, ev.clientY - (a.toque ? c * 0.6 : 0)) : -1;
      if (para < 0 || para === a.i || !tenta(a.i, para, a.el)) { a.el.classList.remove('arrastando'); poe(a.el, a.i); }
    }
    elTab.addEventListener('pointerup', solta);
    elTab.addEventListener('pointercancel', solta);

    montaCasas();
    this.posicao(op.fen || VAZIO, op.lado || 'w');
  }

  // O lance escrito em português (R rei, D dama, T torre, B bispo, C cavalo), como "Cxe5" ou "Dd8#".
  Tabuleiro.lancePT = function (pos, l) {
    var s;
    if (l.roque) s = l.roque === 'curto' ? 'O-O' : 'O-O-O';
    else {
      var t = l.peca.toUpperCase(), de = nome(l.de), para = nome(l.para);
      if (t === 'P') s = (l.captura || l.enPassant ? de[0] + 'x' : '') + para + (l.promo ? '=' + NOME_PT[l.promo.toUpperCase()] : '');
      else {
        var outros = X.lances(pos).filter(function (o) { return o.peca === l.peca && o.para === l.para && o.de !== l.de; }), dis = '';
        if (outros.length) {
          var mesmaColuna = outros.some(function (o) { return nome(o.de)[0] === de[0]; });
          var mesmaFileira = outros.some(function (o) { return nome(o.de)[1] === de[1]; });
          dis = !mesmaColuna ? de[0] : (!mesmaFileira ? de[1] : de);
        }
        s = NOME_PT[t] + dis + (l.captura ? 'x' : '') + para;
      }
    }
    var depois = X.joga(pos, l);
    return s + (X.ehMate(depois) ? '#' : (X.emXeque(depois) ? '+' : ''));
  };

  window.Tabuleiro = Tabuleiro;
})();
