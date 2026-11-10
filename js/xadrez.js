// Regras do xadrez, enxutas: o bastante para o puzzle do dia saber quais
// lances são legais, aplicar lances no formato UCI ("e2e4", "e7e8q") e
// reconhecer xeque e xeque-mate.
//
// O tabuleiro é uma lista de 64 casas, a8 = 0 ... h1 = 63. Peças brancas em
// maiúscula ("P N B R Q K"), pretas em minúscula, casa vazia = ''.
(function (raiz) {
  'use strict';

  var COLUNAS = 'abcdefgh';

  function casaParaIndice(c) { return (8 - Number(c[1])) * 8 + COLUNAS.indexOf(c[0]); }
  function indiceParaCasa(i) { return COLUNAS[i % 8] + (8 - Math.floor(i / 8)); }
  function ehBranca(p) { return p !== '' && p === p.toUpperCase(); }
  function corDa(p) { return p === '' ? null : (ehBranca(p) ? 'w' : 'b'); }

  function deFEN(fen) {
    var partes = fen.trim().split(/\s+/), casas = [];
    partes[0].split('/').forEach(function (linha) {
      for (var i = 0; i < linha.length; i++) {
        var ch = linha[i];
        if (ch >= '1' && ch <= '8') { for (var k = 0; k < Number(ch); k++) casas.push(''); }
        else casas.push(ch);
      }
    });
    return {
      casas: casas,
      vez: partes[1] || 'w',
      roque: partes[2] && partes[2] !== '-' ? partes[2] : '',
      ep: partes[3] && partes[3] !== '-' ? casaParaIndice(partes[3]) : -1
    };
  }

  function copia(pos) {
    return { casas: pos.casas.slice(), vez: pos.vez, roque: pos.roque, ep: pos.ep };
  }

  var DIR_TORRE = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  var DIR_BISPO = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  var DIR_TODAS = DIR_TORRE.concat(DIR_BISPO);
  var SALTOS = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];

  // A casa `alvo` é atacada por alguma peça da cor `cor`?
  function atacada(pos, alvo, cor) {
    var c = pos.casas, x = alvo % 8, y = Math.floor(alvo / 8), i, d, nx, ny, p;
    // peões (um peão branco ataca "para cima", isto é, vem de uma fileira abaixo)
    var dy = cor === 'w' ? 1 : -1, peao = cor === 'w' ? 'P' : 'p';
    ny = y + dy;
    if (ny >= 0 && ny < 8) {
      if (x > 0 && c[ny * 8 + x - 1] === peao) return true;
      if (x < 7 && c[ny * 8 + x + 1] === peao) return true;
    }
    var cavalo = cor === 'w' ? 'N' : 'n', rei = cor === 'w' ? 'K' : 'k';
    for (i = 0; i < 8; i++) {
      nx = x + SALTOS[i][0]; ny = y + SALTOS[i][1];
      if (nx >= 0 && nx < 8 && ny >= 0 && ny < 8 && c[ny * 8 + nx] === cavalo) return true;
      nx = x + DIR_TODAS[i][0]; ny = y + DIR_TODAS[i][1];
      if (nx >= 0 && nx < 8 && ny >= 0 && ny < 8 && c[ny * 8 + nx] === rei) return true;
    }
    for (i = 0; i < 8; i++) {
      d = DIR_TODAS[i]; nx = x + d[0]; ny = y + d[1];
      while (nx >= 0 && nx < 8 && ny >= 0 && ny < 8) {
        p = c[ny * 8 + nx];
        if (p !== '') {
          if (corDa(p) === cor) {
            var t = p.toLowerCase();
            if (t === 'q' || (i < 4 ? t === 'r' : t === 'b')) return true;
          }
          break;
        }
        nx += d[0]; ny += d[1];
      }
    }
    return false;
  }

  function casaDoRei(pos, cor) { return pos.casas.indexOf(cor === 'w' ? 'K' : 'k'); }
  function emXeque(pos, cor) {
    cor = cor || pos.vez;
    return atacada(pos, casaDoRei(pos, cor), cor === 'w' ? 'b' : 'w');
  }

  // Lances que seguem o movimento das peças, sem olhar se o rei fica em xeque.
  function pseudoLances(pos) {
    var c = pos.casas, vez = pos.vez, lista = [], i, x, y, p, t, k, d, nx, ny, alvo;
    function poe(de, para, extra) {
      var l = { de: de, para: para, peca: c[de], captura: c[para] };
      if (extra) for (var q in extra) l[q] = extra[q];
      lista.push(l);
    }
    function poePeao(de, para, extra) {
      var yFim = Math.floor(para / 8);
      if (yFim === 0 || yFim === 7) {
        ['q', 'r', 'b', 'n'].forEach(function (pr) { poe(de, para, { promo: pr }); });
      } else poe(de, para, extra);
    }
    for (i = 0; i < 64; i++) {
      p = c[i];
      if (p === '' || corDa(p) !== vez) continue;
      x = i % 8; y = Math.floor(i / 8); t = p.toLowerCase();
      if (t === 'p') {
        var dir = vez === 'w' ? -1 : 1, inicio = vez === 'w' ? 6 : 1;
        ny = y + dir;
        if (ny < 0 || ny > 7) continue;
        if (c[ny * 8 + x] === '') {
          poePeao(i, ny * 8 + x);
          if (y === inicio && c[(y + 2 * dir) * 8 + x] === '') poe(i, (y + 2 * dir) * 8 + x, { duplo: true });
        }
        for (k = -1; k <= 1; k += 2) {
          nx = x + k;
          if (nx < 0 || nx > 7) continue;
          alvo = ny * 8 + nx;
          if (c[alvo] !== '' && corDa(c[alvo]) !== vez) poePeao(i, alvo);
          else if (alvo === pos.ep) poe(i, alvo, { enPassant: true });
        }
      } else if (t === 'n' || t === 'k') {
        var passos = t === 'n' ? SALTOS : DIR_TODAS;
        for (k = 0; k < 8; k++) {
          nx = x + passos[k][0]; ny = y + passos[k][1];
          if (nx < 0 || nx > 7 || ny < 0 || ny > 7) continue;
          alvo = ny * 8 + nx;
          if (c[alvo] === '' || corDa(c[alvo]) !== vez) poe(i, alvo);
        }
        if (t === 'k') {
          var rival = vez === 'w' ? 'b' : 'w', base = vez === 'w' ? 60 : 4;
          var curto = vez === 'w' ? 'K' : 'k', longo = vez === 'w' ? 'Q' : 'q';
          if (i === base && !atacada(pos, base, rival)) {
            if (pos.roque.indexOf(curto) >= 0 && c[base + 1] === '' && c[base + 2] === '' &&
                !atacada(pos, base + 1, rival) && !atacada(pos, base + 2, rival)) poe(i, base + 2, { roque: 'curto' });
            if (pos.roque.indexOf(longo) >= 0 && c[base - 1] === '' && c[base - 2] === '' && c[base - 3] === '' &&
                !atacada(pos, base - 1, rival) && !atacada(pos, base - 2, rival)) poe(i, base - 2, { roque: 'longo' });
          }
        }
      } else {
        var dirs = t === 'r' ? DIR_TORRE : (t === 'b' ? DIR_BISPO : DIR_TODAS);
        for (k = 0; k < dirs.length; k++) {
          d = dirs[k]; nx = x + d[0]; ny = y + d[1];
          while (nx >= 0 && nx < 8 && ny >= 0 && ny < 8) {
            alvo = ny * 8 + nx;
            if (c[alvo] === '') poe(i, alvo);
            else { if (corDa(c[alvo]) !== vez) poe(i, alvo); break; }
            nx += d[0]; ny += d[1];
          }
        }
      }
    }
    return lista;
  }

  // Devolve a posição depois do lance (a original não muda).
  function joga(pos, l) {
    var n = copia(pos), c = n.casas, vez = pos.vez;
    c[l.para] = l.promo ? (vez === 'w' ? l.promo.toUpperCase() : l.promo) : l.peca;
    c[l.de] = '';
    if (l.enPassant) c[l.para + (vez === 'w' ? 8 : -8)] = '';
    if (l.roque === 'curto') { c[l.para - 1] = c[l.para + 1]; c[l.para + 1] = ''; }
    if (l.roque === 'longo') { c[l.para + 1] = c[l.para - 2]; c[l.para - 2] = ''; }
    n.ep = l.duplo ? (l.de + l.para) / 2 : -1;
    var r = n.roque;
    if (l.peca === 'K') r = r.replace('K', '').replace('Q', '');
    if (l.peca === 'k') r = r.replace('k', '').replace('q', '');
    [[63, 'K'], [56, 'Q'], [7, 'k'], [0, 'q']].forEach(function (par) {
      if (l.de === par[0] || l.para === par[0]) r = r.replace(par[1], '');
    });
    n.roque = r;
    n.vez = vez === 'w' ? 'b' : 'w';
    return n;
  }

  function lances(pos) {
    return pseudoLances(pos).filter(function (l) { return !emXeque(joga(pos, l), pos.vez); });
  }

  function ehMate(pos) { return emXeque(pos) && lances(pos).length === 0; }

  function uci(l) { return indiceParaCasa(l.de) + indiceParaCasa(l.para) + (l.promo || ''); }

  // Acha o lance legal que corresponde ao texto UCI (ou null).
  function deUCI(pos, texto) {
    var todos = lances(pos);
    for (var i = 0; i < todos.length; i++) if (uci(todos[i]) === texto) return todos[i];
    return null;
  }

  // Acha o lance legal escrito em notação algébrica ("Nf3", "exd5", "O-O", "e8=Q+") ou null.
  function deSAN(pos, texto) {
    var t = texto.replace(/[+#!?]/g, ''), legais = lances(pos), i, l;
    if (t === 'O-O' || t === '0-0' || t === 'O-O-O' || t === '0-0-0') {
      var lado = t.length > 3 ? 'longo' : 'curto';
      for (i = 0; i < legais.length; i++) if (legais[i].roque === lado) return legais[i];
      return null;
    }
    var m = /^([KQRBN])?([a-h])?([1-8])?x?([a-h][1-8])(?:=?([QRBN]))?$/.exec(t);
    if (!m) return null;
    var peca = m[1] || 'P', para = casaParaIndice(m[4]), achado = null;
    for (i = 0; i < legais.length; i++) {
      l = legais[i];
      var origem = indiceParaCasa(l.de);
      if (l.peca.toUpperCase() !== peca || l.para !== para) continue;
      if ((m[2] && origem[0] !== m[2]) || (m[3] && origem[1] !== m[3])) continue;
      if ((l.promo || '') !== (m[5] || '').toLowerCase()) continue;
      if (achado) return null;          // ambíguo: o texto não escolhe um lance só
      achado = l;
    }
    return achado;
  }

  var INICIO = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  var api = {
    deSAN: deSAN, INICIO: INICIO,
    deFEN: deFEN, lances: lances, joga: joga, emXeque: emXeque, ehMate: ehMate,
    uci: uci, deUCI: deUCI, corDa: corDa, casaDoRei: casaDoRei,
    casaParaIndice: casaParaIndice, indiceParaCasa: indiceParaCasa
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.Xadrez = api;
})(typeof window !== 'undefined' ? window : this);
