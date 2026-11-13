// Desenha um instante do vídeo de uma lição. Nada aqui roda sozinho com o relógio: o
// videos/gera.js entrega o roteiro (XEV.prepara) e pede cada quadro pelo segundo (XEV.quadro).
// Assim o vídeo sai igual toda vez, e quadros idênticos (o tabuleiro parado enquanto a
// fala segue) não precisam ser fotografados de novo.
(function () {
  'use strict';
  var R = null;                       // o roteiro montado por videos/licao.js
  var elCasas = document.getElementById('casas'), elPecas = document.getElementById('pecas');
  var elSetas = document.getElementById('setas'), elLegenda = document.getElementById('legenda');
  var casasEl = [];
  var DUR_SETA = 0.28, DUR_MARCA = 0.2, DUR_POE = 0.25;
  var DUR_EXPLOSAO = 0.7, DUR_ATE_BATER = 0.8;   // a explosão começa quando a peça que captura está 80% do caminho
  var elEfeitos = document.getElementById('efeitos'), elFaixa = document.getElementById('faixa'), elCartaz = document.getElementById('cartaz');

  function imagem(p) { return 'url(../img/pecas-express/' + (p === p.toUpperCase() ? 'w' : 'b') + p.toLowerCase() + '.svg)'; }
  function suave(p) { return 1 - Math.pow(1 - p, 3); }
  function n3(v) { return Math.round(v * 1000) / 1000; }
  // coluna e linha na tela da casa de índice i (a8 = 0), conforme quem está embaixo
  function xy(i) {
    var x = i % 8, y = Math.floor(i / 8);
    return R.pretasEmbaixo ? [7 - x, 7 - y] : [x, y];
  }

  function prepara(roteiro) {
    R = roteiro;
    var num = document.getElementById('numero'), tit = document.getElementById('titulo');
    if (R.numero) { num.hidden = false; num.querySelector('span').textContent = 'Lição ' + String(R.numero).padStart(2, '0'); }
    tit.textContent = R.titulo;
    tit.classList.toggle('longo', R.titulo.length > 34);
    elLegenda.hidden = !R.legenda;
    elCasas.innerHTML = ''; casasEl = [];
    for (var linha = 0; linha < 8; linha++) for (var col = 0; col < 8; col++) {
      var x = R.pretasEmbaixo ? 7 - col : col, y = R.pretasEmbaixo ? 7 - linha : linha;
      var c = document.createElement('div');
      c.className = 'casa' + ((x + y) % 2 === 0 ? ' clara' : '');
      if (col === 0) c.innerHTML += '<span class="coord fila">' + (8 - y) + '</span>';
      if (linha === 7) c.innerHTML += '<span class="coord coluna">' + 'abcdefgh'[x] + '</span>';
      elCasas.appendChild(c);
      casasEl[y * 8 + x] = c;
    }
    // as peças já carregadas antes do primeiro quadro (o cartaz troca a imagem na hora)
    var imgs = 'kqrbnpKQRBNPL'.split('').map(function (p) {
      var im = new Image(); im.src = p === 'L' ? '../img/logo.svg' : '../img/pecas-express/' + (p === p.toUpperCase() ? 'w' : 'b') + p.toLowerCase() + '.svg';
      return im.decode().catch(function () {});
    });
    return Promise.all(imgs.concat(document.fonts.ready)).then(function () { return true; });
  }

  // A faixa não pode tampar o que está em destaque: no meio, no alto ou no pé do tabuleiro,
  // fica na faixa de linhas mais longe das casas do lance, do xeque, das marcas e das setas.
  var focoAgora = [];
  function lugarDaFaixa() {
    if (!focoAgora.length) return 0.5;
    var melhor = 0.5, nota = -1;
    [0.5, 0.14, 0.86].forEach(function (a, k) {
      var cy = a * 8, livre = Math.min.apply(null, focoAgora.map(function (i) { return Math.max(Math.abs(xy(i)[1] + 0.5 - cy) - 0.75, 0); }));
      if (livre - k * 0.01 > nota) { nota = livre - k * 0.01; melhor = a; }
    });
    return melhor;
  }

  // Tudo o que aparece no segundo t, como dados. O texto disso é a "assinatura" do quadro.
  function estado(t) {
    var tab = R.inicial, veio = -1, foi = -1, setas = [], marcas = [], andando = null, novas = null;
    var xeque = null, captura = null, faixa = null, cartaz = null, cartazSai = null;
    for (var k = 0; k < R.eventos.length; k++) {
      var ev = R.eventos[k];
      if (ev.t > t) break;
      tab = ev.tabuleiro;
      andando = null; novas = null;
      var chega = ev.t + R.durLance;            // quando a peça do lance termina de andar
      if (ev.tipo === 'lance') {
        veio = ev.de; foi = ev.para; setas = []; marcas = [];
        if (t - ev.t < R.durLance) andando = { ev: ev, p: (t - ev.t) / R.durLance };
        xeque = ev.xeque != null ? { casa: ev.xeque, mate: ev.mate, t0: chega } : null;
        if (ev.capturada) captura = { casa: ev.capturada.casa, peca: ev.capturada.peca, t0: ev.t + R.durLance * DUR_ATE_BATER };
        if (ev.xeque != null) faixa = { texto: ev.mate ? 'XEQUE-MATE!' : 'XEQUE!', classe: ev.mate ? 'mate' : 'xeque', t0: chega, dur: ev.mate ? 2.2 : 1.4 };
        if (cartaz) { cartazSai = { c: cartaz, t0: ev.t }; cartaz = null; }
      } else if (ev.tipo === 'posicao') { veio = foi = -1; setas = []; marcas = []; xeque = null; }
      else if (ev.tipo === 'limpa') { setas = []; marcas = []; if (cartaz) { cartazSai = { c: cartaz, t0: ev.t }; cartaz = null; } }
      else if (ev.tipo === 'esconde') { if (cartaz) { cartazSai = { c: cartaz, t0: ev.t }; cartaz = null; } }
      else if (ev.tipo === 'mostra') cartaz = { peca: ev.peca, nome: ev.nome, t0: ev.t };
      else if (ev.tipo === 'texto') faixa = { texto: ev.texto, classe: ev.texto.length > 16 ? 'longa' : '', t0: ev.t, dur: 1.6 };
      else if (ev.tipo === 'poe') { xeque = null; if (t - ev.t < DUR_POE) novas = { casas: ev.novas, p: (t - ev.t) / DUR_POE }; }
      else if (ev.tipo === 'tira') xeque = null;
      else if (ev.tipo === 'seta') ev.setas.forEach(function (s) { setas.push({ de: s[0], para: s[1], cor: ev.cor, t0: ev.t }); });
      else if (ev.tipo === 'marca') ev.casas.forEach(function (c) { marcas.push({ casa: c, cor: ev.cor, t0: ev.t }); });
    }

    var pecas = [], pula = {};
    if (andando) andando.ev.movem.forEach(function (m) { pula[m.para] = true; });
    for (var i = 0; i < 64; i++) {
      if (!tab[i] || pula[i]) continue;
      var pos = xy(i), esc = 1;
      if (novas && novas.casas.indexOf(i) >= 0) esc = 0.5 + 0.5 * suave(novas.p);
      pecas.push({ p: tab[i], x: pos[0], y: pos[1], e: n3(esc), o: 1 });
    }
    if (andando) {
      var p = suave(andando.p), cap = andando.ev.capturada;
      // a peça capturada fica na casa até a outra chegar nela; aí explode
      if (cap && andando.p < DUR_ATE_BATER) { var pc = xy(cap.casa); pecas.push({ p: cap.peca, x: pc[0], y: pc[1], e: 1, o: 1 }); }
      andando.ev.movem.forEach(function (m) {
        var a = xy(m.de), b = xy(m.para);
        pecas.push({ p: m.peca, x: n3(a[0] + (b[0] - a[0]) * p), y: n3(a[1] + (b[1] - a[1]) * p),
          e: n3(1 + 0.16 * Math.sin(Math.PI * andando.p)), o: 1, anda: 1 });
      });
    }

    // efeitos que duram um pouco: explosão da captura, brilho do xeque, faixa, cartaz
    var expl = null;
    if (captura && t >= captura.t0 && t - captura.t0 < DUR_EXPLOSAO) {
      var c = xy(captura.casa);
      expl = { x: c[0], y: c[1], peca: captura.peca, semente: captura.casa, p: n3((t - captura.t0) / DUR_EXPLOSAO) };
    }
    var brilho = null;
    if (xeque && t >= xeque.t0) {
      var dx = t - xeque.t0;
      // pisca forte três vezes e depois fica aceso, parado
      brilho = { casa: xeque.casa, mate: xeque.mate ? 1 : 0, o: dx < 1.2 ? n3(0.55 + 0.45 * Math.cos(dx * Math.PI * 5)) : 1 };
    }
    focoAgora = [];
    if (veio >= 0) focoAgora.push(veio); if (foi >= 0) focoAgora.push(foi);
    if (xeque && t >= xeque.t0) focoAgora.push(xeque.casa);
    marcas.forEach(function (m) { focoAgora.push(m.casa); });
    setas.forEach(function (s) { focoAgora.push(s.de, s.para); });
    var fx = null;
    if (faixa && t >= faixa.t0 && t - faixa.t0 < faixa.dur) {
      var df = t - faixa.t0, fim = faixa.dur - df;
      fx = { texto: faixa.texto, classe: faixa.classe, y: lugarDaFaixa(),
        e: n3(df < 0.3 ? 0.4 + 0.6 * molinha(df / 0.3) : 1), o: n3(Math.min(1, df / 0.12, fim / 0.25)) };
    }
    var cz = null;
    if (cartaz) {
      var dc = t - cartaz.t0;
      cz = { peca: cartaz.peca, nome: cartaz.nome, o: n3(Math.min(1, dc / 0.2)), e: n3(dc < 0.45 ? 0.3 + 0.7 * molinha(dc / 0.45) : 1),
        giro: n3((dc * 14) % 360), nomeO: n3(Math.max(0, Math.min(1, (dc - 0.25) / 0.25))) };
    } else if (cartazSai && t - cartazSai.t0 < 0.3) {
      var ds = t - cartazSai.t0;
      cz = { peca: cartazSai.c.peca, nome: cartazSai.c.nome, o: n3(1 - ds / 0.3), e: n3(1 + 0.15 * ds / 0.3),
        giro: n3(((t - cartazSai.c.t0) * 14) % 360), nomeO: n3(1 - ds / 0.3) };
    }

    var leg = null;
    if (R.legenda) for (var b = 0; b < R.legendas.length; b++) {
      var bl = R.legendas[b];
      if (t >= bl.ini - 0.08 && t < bl.some) {
        var atual = -1;
        for (var w = 0; w < bl.palavras.length; w++) if (t >= bl.palavras[w].ini - 0.03) atual = w;
        leg = { b: b, w: atual };
      }
    }
    return {
      pecas: pecas, veio: veio, foi: foi, leg: leg, expl: expl, brilho: brilho, faixa: fx, cartaz: cz,
      setas: setas.map(function (s) { return { de: s.de, para: s.para, cor: s.cor, p: n3(suave(Math.min(1, (t - s.t0) / DUR_SETA))) }; }),
      marcas: marcas.map(function (m) { return { casa: m.casa, cor: m.cor, o: n3(Math.min(1, (t - m.t0) / DUR_MARCA)) }; })
    };
  }

  // passa um pouco do tamanho final e volta (o "pulo" de quando algo aparece)
  function molinha(p) { var c = 1.9; p = p - 1; return 1 + (c + 1) * p * p * p + c * p * p; }
  // números "aleatórios" que saem sempre iguais para a mesma casa (o vídeo sai igual toda vez)
  function acaso(n) { var x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }

  // A explosão da peça capturada: clarão, onda que abre e faíscas, em % do tabuleiro.
  function explosao(e) {
    var cx = (e.x + 0.5) * 12.5, cy = (e.y + 0.5) * 12.5, p = e.p, h = '';
    if (p < 0.35) {        // a peça capturada incha, fica branca e some
      var q = p / 0.35;
      h += '<i class="peca-voa" style="left:' + cx + '%;top:' + cy + '%;width:12.5%;height:12.5%;background-image:' + imagem(e.peca) +
        ';transform:translate(-50%,-50%) scale(' + n3(1 + 0.5 * q) + ');opacity:' + n3(1 - q) + ';filter:brightness(' + n3(1 + 3 * q) + ')"></i>';
    }
    if (p < 0.5) {
      var c = 6 + 26 * suave(p / 0.5);
      h += '<i class="clarao" style="left:' + cx + '%;top:' + cy + '%;width:' + n3(c) + '%;height:' + n3(c) + '%;opacity:' + n3(1 - p / 0.5) + '"></i>';
    }
    var o = 8 + 30 * suave(p);
    h += '<i class="onda" style="left:' + cx + '%;top:' + cy + '%;width:' + n3(o) + '%;height:' + n3(o) + '%;opacity:' + n3(1 - p) + '"></i>';
    var CORES = ['#fff6d8', '#ffd36b', '#ff9a3d', '#ff4f78', '#ffffff'];
    for (var k = 0; k < 16; k++) {
      var ang = (k / 16) * Math.PI * 2 + acaso(e.semente * 31 + k) * 0.5;
      var dist = (7 + 13 * acaso(e.semente * 17 + k)) * suave(p);
      var tam = (1.1 + 1.3 * acaso(e.semente * 7 + k)) * (1 - p);
      if (tam < 0.08) continue;
      h += '<i style="left:' + n3(cx + Math.cos(ang) * dist) + '%;top:' + n3(cy + Math.sin(ang) * dist + 6 * p * p) + '%;width:' + n3(tam) +
        '%;height:' + n3(tam) + '%;background:' + CORES[k % CORES.length] + ';box-shadow:0 0 10px ' + CORES[k % CORES.length] + '"></i>';
    }
    return h;
  }

  // Os pontos de uma seta, em casas: reta, ou em "L" no pulo do cavalo (primeiro a perna comprida).
  function caminho(de, para) {
    var a = xy(de), b = xy(para), dx = b[0] - a[0], dy = b[1] - a[1];
    var pts = [[a[0] + 0.5, a[1] + 0.5]];
    if (Math.abs(dx) * Math.abs(dy) === 2) pts.push(Math.abs(dx) === 2 ? [b[0] + 0.5, a[1] + 0.5] : [a[0] + 0.5, b[1] + 0.5]);
    pts.push([b[0] + 0.5, b[1] + 0.5]);
    // a seta sai da beirada da peça, não do meio dela
    var vx = pts[1][0] - pts[0][0], vy = pts[1][1] - pts[0][1], v = Math.hypot(vx, vy) || 1;
    pts[0] = [pts[0][0] + vx / v * 0.3, pts[0][1] + vy / v * 0.3];
    return pts;
  }
  function desenhaSeta(s) {
    var pts = caminho(s.de, s.para), CABECA = 0.44, LARGURA = 0.27, total = 0, k;
    for (k = 1; k < pts.length; k++) total += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
    var ate = total * s.p;
    if (ate < 0.05) return '';
    // ponto do caminho a uma distância d do começo, e a direção ali
    function em(d) {
      var falta = Math.max(0, d);
      for (var j = 1; j < pts.length; j++) {
        var sx = pts[j][0] - pts[j - 1][0], sy = pts[j][1] - pts[j - 1][1], L = Math.hypot(sx, sy);
        if (falta <= L || j === pts.length - 1) { var f = Math.min(1, falta / L); return { x: pts[j - 1][0] + sx * f, y: pts[j - 1][1] + sy * f, ux: sx / L, uy: sy / L, seg: j }; }
        falta -= L;
      }
    }
    // a haste vai pelos cantos até a base da ponta (ou só até o canto, logo depois de virar)
    var ponta = em(ate), k0 = pts[ponta.seg - 1];
    var noTrecho = Math.hypot(ponta.x - k0[0], ponta.y - k0[1]) - CABECA * 0.85;
    var d = 'M' + n3(pts[0][0]) + ' ' + n3(pts[0][1]);
    for (k = 1; k < ponta.seg; k++) d += 'L' + n3(pts[k][0]) + ' ' + n3(pts[k][1]);
    if (noTrecho > 0) d += 'L' + n3(k0[0] + ponta.ux * noTrecho) + ' ' + n3(k0[1] + ponta.uy * noTrecho);
    var bx = ponta.x - ponta.ux * CABECA, by = ponta.y - ponta.uy * CABECA;
    var cab = [[ponta.x, ponta.y], [bx - ponta.uy * LARGURA, by + ponta.ux * LARGURA], [bx + ponta.uy * LARGURA, by - ponta.ux * LARGURA]]
      .map(function (q) { return n3(q[0]) + ',' + n3(q[1]); }).join(' ');
    return '<g class="' + s.cor + '" opacity=".92">' + (d.indexOf('L') > 0 ? '<path d="' + d + '"/>' : '') + '<polygon points="' + cab + '"/></g>';
  }

  function desenha(e) {
    var k;
    for (k = 0; k < 64; k++) {
      casasEl[k].classList.toggle('veio', k === e.veio);
      casasEl[k].classList.toggle('foi', k === e.foi);
      casasEl[k].querySelectorAll('.marca,.xeque-brilho').forEach(function (v) { v.remove(); });
    }
    if (e.brilho) {
      var br = document.createElement('i');
      br.className = 'xeque-brilho' + (e.brilho.mate ? ' mate' : ''); br.style.opacity = e.brilho.o;
      casasEl[e.brilho.casa].appendChild(br);
    }
    elEfeitos.innerHTML = e.expl ? explosao(e.expl) : '';
    elFaixa.hidden = !e.faixa;
    if (e.faixa) {
      elFaixa.textContent = e.faixa.texto;
      elFaixa.className = 'faixa ' + e.faixa.classe;
      elFaixa.style.transform = 'translate(-50%,-50%) scale(' + e.faixa.e + ')';
      elFaixa.style.top = (e.faixa.y * 100) + '%';
      elFaixa.style.opacity = e.faixa.o;
    }
    elCartaz.hidden = !e.cartaz;
    if (e.cartaz) {
      elCartaz.style.opacity = e.cartaz.o;
      document.getElementById('cartazPeca').src = e.cartaz.peca === 'logo' ? '../img/logo.svg' :
        '../img/pecas-express/' + (e.cartaz.peca === e.cartaz.peca.toUpperCase() ? 'w' : 'b') + e.cartaz.peca.toLowerCase() + '.svg';
      elCartaz.classList.toggle('logo', e.cartaz.peca === 'logo');
      document.getElementById('cartazPeca').style.transform = 'scale(' + e.cartaz.e + ')';
      document.getElementById('cartazRaios').style.transform = 'rotate(' + e.cartaz.giro + 'deg)';
      var nm = document.getElementById('cartazNome');
      nm.textContent = e.cartaz.nome; nm.style.opacity = e.cartaz.nomeO;
    }
    e.marcas.forEach(function (m) {
      var el = document.createElement('i');
      el.className = 'marca ' + m.cor; el.style.opacity = m.o;
      casasEl[m.casa].appendChild(el);
    });
    var html = '';
    e.pecas.forEach(function (p) {
      html += '<div class="peca' + (p.p === p.p.toLowerCase() ? ' preta' : '') + (p.anda ? ' anda' : '') + '" style="background-image:' + imagem(p.p) +
        ';transform:translate(' + (p.x * 100) + '%,' + (p.y * 100) + '%) scale(' + p.e + ');opacity:' + p.o + '"></div>';
    });
    elPecas.innerHTML = html;
    elSetas.innerHTML = e.setas.map(desenhaSeta).join('');
    if (R.legenda) {
      elLegenda.textContent = '';
      if (e.leg) R.legendas[e.leg.b].palavras.forEach(function (w, i) {
        var s = document.createElement('span');
        s.textContent = w.texto;
        if (i === e.leg.w) s.className = 'dita'; else if (i > e.leg.w) s.className = 'falta';
        elLegenda.appendChild(s);
      });
    }
  }

  var ultima = null;
  // Põe o palco no segundo t e devolve true se a imagem mudou desde o quadro anterior.
  function quadro(t) {
    var e = estado(t), assinatura = JSON.stringify(e);
    if (assinatura === ultima) return false;
    ultima = assinatura;
    desenha(e);
    return true;
  }

  window.XEV = { prepara: prepara, quadro: quadro };
})();
