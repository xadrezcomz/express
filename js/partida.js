// A partida do dia: uma partida clássica por dia, passando sozinha num
// tabuleiro inclinado em 3D nas cores do site, com as peças em pé, as casas do lance
// acesas e uma seta de luz da origem ao destino.
//
// O banco (dados/partidas.js) só é baixado quando a seção chega perto da tela.
(function () {
  'use strict';
  var X = window.Xadrez, secao = document.getElementById('partida'), plano = document.getElementById('p3Plano');
  if (!X || !secao || !plano) return;

  var elPecas = document.getElementById('p3Pecas'), elSeta = document.getElementById('p3Seta');
  var elLance = document.getElementById('p3Lance'), elBarra = document.getElementById('p3Barra');
  var elMat = document.getElementById('p3Material'), elMatNum = document.getElementById('p3MaterialNum');
  var btToca = document.getElementById('p3Toca'), btVolta = document.getElementById('p3Volta'), btVai = document.getElementById('p3Vai');
  var btInicio = document.getElementById('p3Inicio'), btVel = document.getElementById('p3Vel');
  var CALMO = window.matchMedia('(prefers-reduced-motion:reduce)').matches;

  var G = null, posicoes = [], lances = [], sans = [];
  var atual = 0, tocando = false, relogio = null, naTela = false, pausouNaMao = false;
  var VELS = [{ nome: '1x', ms: 1100 }, { nome: '2x', ms: 600 }, { nome: '½x', ms: 2000 }], vel = 0;
  var casas = [], pecas = {};

  function numeroDoDia() {
    var d = new Date();
    return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(2026, 0, 5)) / 86400000);
  }

  // ---------------------------------------------------------------- tabuleiro
  function montaCasas() {
    var grade = document.getElementById('p3Casas');
    for (var i = 0; i < 64; i++) {
      var c = document.createElement('i');
      c.className = 'p3-casa' + ((i % 8 + Math.floor(i / 8)) % 2 === 0 ? ' clara' : '');
      grade.appendChild(c); casas.push(c);
    }
  }
  function poe(el, i) { el.style.left = (i % 8) * 12.5 + '%'; el.style.top = Math.floor(i / 8) * 12.5 + '%'; }
  function criaPeca(i, p) {
    var el = document.createElement('div'), branca = p === p.toUpperCase();
    el.className = 'p3-peca ' + (branca ? 'branca' : 'preta');
    el.innerHTML = '<span style="background-image:url(img/pecas-express/' + (branca ? 'w' : 'b') + p.toLowerCase() + '.svg)"></span>';
    poe(el, i);
    elPecas.appendChild(el); pecas[i] = el;
    return el;
  }
  function montaPecas(pos) {
    elPecas.innerHTML = ''; pecas = {};
    for (var i = 0; i < 64; i++) if (pos.casas[i]) criaPeca(i, pos.casas[i]);
  }
  function centro(i) { return [(i % 8) * 12.5 + 6.25, Math.floor(i / 8) * 12.5 + 6.25]; }

  // acende as casas do lance, desenha a seta e marca xeque / mate
  function destaca(n, animar) {
    var i;
    for (i = 0; i < 64; i++) casas[i].className = casas[i].className.replace(/ (de|para|xeque)\b/g, '');
    elPecas.querySelectorAll('.selo').forEach(function (s) { s.remove(); });
    elPecas.querySelectorAll('.rei-xeque').forEach(function (s) { s.classList.remove('rei-xeque'); });
    if (n === 0) { elSeta.style.opacity = 0; return; }
    var l = lances[n - 1], pos = posicoes[n], a = centro(l.de), b = centro(l.para);
    casas[l.de].className += ' de'; casas[l.para].className += ' para';
    elSeta.setAttribute('x1', a[0]); elSeta.setAttribute('y1', a[1]); elSeta.setAttribute('x2', b[0]); elSeta.setAttribute('y2', b[1]);
    elSeta.style.opacity = 1;
    if (animar) { elSeta.classList.remove('risca'); void elSeta.getBoundingClientRect(); elSeta.classList.add('risca'); }
    if (X.emXeque(pos)) {
      var rei = X.casaDoRei(pos, pos.vez), mate = /#$/.test(sans[n - 1]);
      casas[rei].className += ' xeque';
      if (pecas[rei]) pecas[rei].classList.add('rei-xeque');
      var selo = document.createElement('b');
      selo.className = 'selo' + (mate ? ' mate' : ''); selo.textContent = mate ? '#' : '+';
      if (pecas[l.para]) pecas[l.para].appendChild(selo);
    }
  }

  // A barra de avaliação: quanto as brancas estão melhor (ou pior) depois de cada lance,
  // pela conta do Stockfish que vem pronta no banco (campo "v", em décimos de peão;
  // de ±1000 em diante é mate à vista). Devolve [altura da parte branca em %, texto].
  function avaliacao(n) {
    var v = n === 0 ? 2 : G.v[n - 1];
    if (v >= 1000 || v <= -1000) {
      var lances = Math.abs(v) - 1000;
      return [v > 0 ? 100 : 0, lances ? 'M' + lances : (v > 0 ? '1-0' : '0-1')];
    }
    // a mesma curva dos sites de xadrez: um peão já mexe bem a barra, cinco quase a enchem
    var altura = 50 + 50 * (2 / (1 + Math.exp(-0.0368 * v)) - 1);
    return [Math.max(3, Math.min(97, altura)), (v > 0 ? '+' : (v < 0 ? '−' : '')) + (Math.abs(v) / 10).toFixed(1)];
  }

  // (a notação sai em português: R rei, D dama, T torre, B bispo, C cavalo)
  function sanPT(s) {
    return s.replace(/[KQRN]/g, function (c) { return { K: 'R', Q: 'D', R: 'T', N: 'C' }[c]; });
  }
  function texto(n) {
    if (n === 0) return 'Posição inicial';
    return Math.ceil(n / 2) + (n % 2 ? '. ' : '… ') + sanPT(sans[n - 1]);
  }

  function pinta(n) {
    elLance.textContent = texto(n);
    elBarra.max = lances.length; elBarra.value = n;
    elBarra.style.setProperty('--feito', (lances.length ? n / lances.length * 100 : 0) + '%');
    if (G.v) { var av = avaliacao(n); elMat.style.height = av[0] + '%'; elMatNum.textContent = av[1]; }
    var fim = n === lances.length;
    document.getElementById('p3Fim').hidden = !fim;
    btToca.textContent = tocando ? '⏸' : (fim ? '↺' : '▶');
    btToca.setAttribute('aria-label', tocando ? 'Pausar' : (fim ? 'Ver de novo' : 'Tocar'));
  }

  // vai para o lance n; um passo à frente é animado, o resto é montado direto
  function vaiPara(n) {
    n = Math.max(0, Math.min(lances.length, n));
    if (n === atual + 1) {
      var l = lances[atual], antes = posicoes[atual];
      var vitima = l.enPassant ? l.para + (antes.vez === 'w' ? 8 : -8) : l.para;
      if (pecas[vitima]) { var morta = pecas[vitima]; delete pecas[vitima]; morta.classList.add('capturada'); setTimeout(function () { morta.remove(); }, 420); }
      var el = pecas[l.de]; delete pecas[l.de]; pecas[l.para] = el; poe(el, l.para);
      el.classList.remove('pula'); void el.offsetWidth; el.classList.add('pula');
      if (l.roque) {
        var deT = l.roque === 'curto' ? l.para + 1 : l.para - 2, paraT = l.roque === 'curto' ? l.para - 1 : l.para + 1;
        pecas[paraT] = pecas[deT]; delete pecas[deT]; poe(pecas[paraT], paraT);
      }
      if (l.promo) {
        var branca = antes.vez === 'w';
        el.firstChild.style.backgroundImage = 'url(img/pecas-express/' + (branca ? 'w' : 'b') + l.promo + '.svg)';
      }
      atual = n; destaca(n, true);
    } else if (n !== atual) {
      atual = n; montaPecas(posicoes[n]); destaca(n, false);
    }
    pinta(n);
  }

  // ---------------------------------------------------------------- tocar
  function agenda() {
    clearTimeout(relogio);
    if (!tocando) return;
    relogio = setTimeout(function () {
      if (atual >= lances.length) { tocando = false; pinta(atual); return; }
      vaiPara(atual + 1); agenda();
    }, atual === 0 ? 700 : VELS[vel].ms);
  }
  function toca() { if (!G) return; if (atual >= lances.length) vaiPara(0); tocando = true; pinta(atual); agenda(); }
  function pausa() { tocando = false; clearTimeout(relogio); if (G) pinta(atual); }

  btToca.addEventListener('click', function () { if (tocando) { pausouNaMao = true; pausa(); } else { pausouNaMao = false; toca(); } });
  btVolta.addEventListener('click', function () { pausouNaMao = true; pausa(); vaiPara(atual - 1); });
  btVai.addEventListener('click', function () { pausouNaMao = true; pausa(); vaiPara(atual + 1); });
  btInicio.addEventListener('click', function () { pausouNaMao = true; pausa(); vaiPara(0); });
  btVel.addEventListener('click', function () { vel = (vel + 1) % VELS.length; btVel.textContent = VELS[vel].nome; if (tocando) agenda(); });
  elBarra.addEventListener('input', function () { pausouNaMao = true; pausa(); vaiPara(Number(elBarra.value)); });

  // ---------------------------------------------------------------- carregar
  function prepara() {
    var banco = window.XE_PARTIDAS, dia = numeroDoDia();
    G = banco[((dia % banco.length) + banco.length) % banco.length];
    sans = G.m.split(' ');
    var pos = X.deFEN(X.INICIO); posicoes = [pos]; lances = [];
    for (var i = 0; i < sans.length; i++) {
      var l = X.deSAN(pos, sans[i]);
      if (!l) { sans.length = i; break; }
      pos = X.joga(pos, l); lances.push(l); posicoes.push(pos);
    }
    document.getElementById('p3Titulo').textContent = G.t || (G.b + ' x ' + G.p);
    document.getElementById('p3Brancas').textContent = G.b;
    document.getElementById('p3Pretas').textContent = G.p;
    document.getElementById('p3Onde').textContent = [G.l, G.a].filter(Boolean).join(', ');
    var mate = /#$/.test(sans[sans.length - 1] || '');
    document.getElementById('p3FimTexto').textContent =
      (G.r === '1-0' ? 'Vitória das brancas' : 'Vitória das pretas') + (mate ? ' por xeque-mate' : ' — o adversário abandonou') + '.';
    if (!G.v || G.v.length < lances.length) { G.v = null; elMat.parentNode.parentNode.hidden = true; }   // sem avaliação no banco: a barra some
    montaPecas(posicoes[0]); destaca(0); pinta(0);
    secao.classList.add('pronta');
    if (naTela && !CALMO) toca();
  }
  function carrega() {
    if (window.XE_PARTIDAS) { prepara(); return; }
    var s = document.createElement('script');
    s.src = 'dados/partidas.js'; s.onload = prepara;
    document.body.appendChild(s);
  }

  montaCasas();
  btVel.textContent = VELS[vel].nome;
  var pedido = false;
  if ('IntersectionObserver' in window) {
    // baixa o banco um pouco antes de a seção aparecer...
    new IntersectionObserver(function (es, o) {
      if (es[0].isIntersecting && !pedido) { pedido = true; carrega(); o.disconnect(); }
    }, { rootMargin: '700px 0px' }).observe(secao);
    // ...e só toca enquanto o tabuleiro está na tela
    new IntersectionObserver(function (es) {
      naTela = es[0].isIntersecting;
      if (!G) return;
      if (naTela && !pausouNaMao && !tocando && atual < lances.length && !CALMO) toca();
      else if (!naTela && tocando) pausa();
    }, { threshold: 0.35 }).observe(document.getElementById('p3Palco'));
  } else { carrega(); }
  document.addEventListener('visibilitychange', function () { if (document.hidden && tocando) pausa(); });

  window.XE_PARTIDA = { estado: function () { return { atual: atual, total: lances.length, tocando: tocando, partida: G }; }, vaiPara: vaiPara };
})();
