// O voo do topo do site: o foguete do @xadrezcomz e as seis peças de xadrez
// voando com rastro e propulsão, como no Rock Orbit (lá em 3D; aqui num
// canvas 2D, leve o bastante para o celular).
//
// - No celular: arraste uma peça para pilotar; um toque no espaço chama a mais próxima.
// - No computador: a peça mais perto do mouse passa a segui-lo; um clique dá turbo em todas.
// - Os dois botões do canto trocam o desenho do rastro e a propulsão.
(function () {
  'use strict';

  var hero = document.getElementById('inicio');
  var tela = document.getElementById('voo');
  var telaEstrelas = document.getElementById('estrelas');
  if (!hero || !tela || !tela.getContext) return;
  var ctx = tela.getContext('2d');

  var TOQUE = window.matchMedia('(pointer:coarse)').matches;
  var CALMO = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  var TAU = Math.PI * 2;

  // ---------------------------------------------------------------- rastros
  // Os mesmos nomes dos rastros do Rock Orbit; cada um é um jeito de desenhar a fita.
  var RASTROS = [
    { id: 'liso', nome: 'Liso' },
    { id: 'onda', nome: 'Onda' },
    { id: 'cintilante', nome: 'Cintilante' },
    { id: 'pulsar', nome: 'Pulsar' },
    { id: 'eletrico', nome: 'Elétrico' },
    { id: 'helice', nome: 'Hélice' },
    { id: 'arcoiris', nome: 'Arco-íris' },
    { id: 'tabuleiro', nome: 'Tabuleiro' }
  ];

  // ---------------------------------------------------------------- propulsões
  //  i/e: chama de dentro e de fora; c1 -> c2: cor das fagulhas do começo ao fim da vida;
  //  forma: 0 bola, 1 estrela, 2 coração, 3 bolha, 4 quadrado; cone: [largura, comprimento]
  var PROPULSOES = [
    { id: 'padrao', nome: 'Fogo', i: '#CFF2FF', e: '#FFB25E', c1: '#FFD27A', c2: '#E8400F' },
    { id: 'plasma', nome: 'Plasma', i: '#F0F6FF', e: '#4A6BFF', c1: '#BFE4FF', c2: '#4A2BFF', cone: [0.85, 1.7] },
    { id: 'verde', nome: 'Tóxica', i: '#E4FFB0', e: '#3CFF2A', c1: '#6CF03A', c2: '#06601E', cone: [1.3, 1.3] },
    { id: 'arcoiris', nome: 'Arco-íris', i: '#FFFFFF', e: '#FF5BD1', c1: '#FFD27A', c2: '#E8400F', arco: true },
    { id: 'estrelas', nome: 'Estrelas', i: '#FFF6D8', e: '#FFD24A', c1: '#FFFFFF', c2: '#FFB020', forma: 1 },
    { id: 'bolhas', nome: 'Bolhas', i: '#E8FFFF', e: '#7AE8FF', c1: '#C8F8FF', c2: '#5AA8FF', forma: 3, cone: [0.7, 0.8] },
    { id: 'coracoes', nome: 'Corações', i: '#FFE8F4', e: '#FF4FA0', c1: '#FFB8DA', c2: '#FF2A6A', forma: 2 },
    { id: 'pixel', nome: 'Pixel', i: '#FFFFFF', e: '#FFD23F', c1: '#FFE95B', c2: '#FF3A5A', forma: 4, semCone: true }
  ];

  function rgb(hex) { var n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function mistura(a, b, t) {
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * t) + ',' + Math.round(a[1] + (b[1] - a[1]) * t) + ',' + Math.round(a[2] + (b[2] - a[2]) * t) + ')';
  }
  // cada propulsão ganha uma paleta pronta de 8 tons, para não montar texto de cor a cada fagulha
  // o tema de data pode trazer uma propulsão a mais, que já vem escolhida (js/temas.js)
  var TEMA = window.XE_TEMA || {};
  if (TEMA.propulsao) PROPULSOES.unshift(TEMA.propulsao);
  PROPULSOES.forEach(function (p) {
    var a = rgb(p.c1), b = rgb(p.c2); p.tons = [];
    for (var k = 0; k < 8; k++) p.tons.push(mistura(a, b, k / 7));
  });
  var ARCO = []; for (var h = 0; h < 24; h++) ARCO.push('hsl(' + h * 15 + ',100%,65%)');

  var rastroAtual = 0, propAtual = 0;
  // sem escolha guardada, vale a propulsão que o tema de data indicar
  PROPULSOES.forEach(function (p, k) { if (p.id === TEMA.propulsaoPadrao) propAtual = k; });
  try {
    var salvo = JSON.parse(localStorage.getItem('xe.efeitos') || '{}');
    RASTROS.forEach(function (r, k) { if (r.id === salvo.rastro) rastroAtual = k; });
    PROPULSOES.forEach(function (p, k) { if (p.id === salvo.propulsao) propAtual = k; });
  } catch (e) { /* sem armazenamento: começa no padrão */ }

  // ---------------------------------------------------------------- as naves
  var TIPOS = [
    { id: 'foguete', cor: '#5BE1FF', cor2: '#FF4FD8' },
    { id: 'wk', cor: '#FFD36B', cor2: '#FF7A2E' },
    { id: 'wq', cor: '#FF4FD8', cor2: '#7A9BFF' },
    { id: 'wr', cor: '#FF9A3D', cor2: '#FFE95B' },
    { id: 'wb', cor: '#A06BFF', cor2: '#2EE6FF' },
    { id: 'wn', cor: '#7CFF5A', cor2: '#2EE6FF' },
    { id: 'wp', cor: '#DDEEFF', cor2: '#5BE1FF' }
  ];
  var naves = [], fagulhas = [], cintilas = [], cadentes = [];
  var L = 0, A = 0, dpr = 1, tam = 44;
  var MAX_PTS = TOQUE ? 34 : 48, PASSO = 7, MAX_FAGULHAS = TOQUE ? 240 : 460;
  var relogio = 0, ultimo = 0, rodando = false, visivel = true;

  function criaNaves() {
    naves = TIPOS.map(function (t, k) {
      var n = {
        tipo: t, x: 0, y: 0, ang: Math.random() * TAU, vel: 0, velBase: 0,
        f1: 0.35 + Math.random() * 0.4, f2: 0.9 + Math.random() * 0.7, fase: Math.random() * 100,
        pts: [], andou: 0, emite: 0, turbo: 0, piloto: false, destino: null, img: null, carimbo: null,
        rgb: rgb(t.cor), rgb2: rgb(t.cor2)
      };
      if (t.id !== 'foguete') {
        n.img = new Image();
        n.img.onload = function () { n.carimbo = null; };
        n.img.src = 'img/pecas/' + t.id + '.svg';
      }
      return n;
    });
  }

  function espalha() {
    naves.forEach(function (n, k) {
      n.x = L * (0.12 + 0.76 * ((k * 0.37 + 0.15) % 1));
      n.y = A * (0.2 + 0.65 * ((k * 0.61 + 0.3) % 1));
      n.pts = [];
    });
  }

  // ---------------------------------------------------------------- tamanho e estrelas
  function ajusta() {
    var r = hero.getBoundingClientRect();
    var l = Math.round(r.width), a = Math.round(r.height);
    if (l === L && a === A) return;
    var primeira = L === 0;
    L = l; A = a;
    dpr = Math.min(window.devicePixelRatio || 1, TOQUE ? 1.75 : 2);
    tela.width = Math.round(L * dpr); tela.height = Math.round(A * dpr);
    tam = L < 600 ? 40 : 50;
    var base = L < 600 ? 105 : 140;
    naves.forEach(function (n, k) { n.velBase = base * (0.85 + (k % 3) * 0.14); n.carimbo = null; if (!n.vel) n.vel = n.velBase; });
    if (primeira) espalha();
    pintaEstrelas();
  }

  // As estrelas ficam num canvas à parte, pintado uma vez só.
  function pintaEstrelas() {
    var c = telaEstrelas.getContext('2d');
    telaEstrelas.width = Math.round(L * dpr); telaEstrelas.height = Math.round(A * dpr);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    var qtd = Math.round(L * A / 2600), semente = 7;
    function sorte() { semente = (semente * 16807) % 2147483647; return semente / 2147483647; }
    for (var k = 0; k < qtd; k++) {
      var x = sorte() * L, y = sorte() * A, r = sorte(), raio = r < 0.85 ? 0.6 + sorte() * 0.7 : 1.2 + sorte() * 1.1;
      c.globalAlpha = 0.35 + sorte() * 0.65;
      c.fillStyle = r > 0.93 ? '#ffe9b8' : (r > 0.86 ? '#bfe6ff' : '#ffffff');
      c.beginPath(); c.arc(x, y, raio, 0, TAU); c.fill();
    }
    c.globalAlpha = 1;
    cintilas = [];
    for (var j = 0; j < (TOQUE ? 10 : 18); j++) cintilas.push({ x: sorte() * L, y: sorte() * A, f: 1 + sorte() * 2.5, fase: sorte() * 10, r: 1.4 + sorte() * 1.4 });
  }

  // ---------------------------------------------------------------- movimento
  function giraPara(n, alvo, taxa, dt) {
    var d = alvo - n.ang;
    while (d > Math.PI) d -= TAU;
    while (d < -Math.PI) d += TAU;
    var passo = taxa * dt;
    n.ang += Math.abs(d) < passo ? d : (d > 0 ? passo : -passo);
  }

  function anda(n, dt) {
    var velAlvo = n.velBase;
    if (n.piloto || n.destino) {
      var alvo = n.piloto ? ponteiro : n.destino;
      var dx = alvo.x - n.x, dy = alvo.y - n.y, dist = Math.sqrt(dx * dx + dy * dy);
      giraPara(n, Math.atan2(dy, dx), 9, dt);
      velAlvo = Math.max(n.piloto ? 0 : 60, Math.min(640, dist * 5));
      if (dist < 6 && n.piloto) velAlvo = 0;
      if (n.destino && (dist < 26 || (n.destino.t -= dt) <= 0)) n.destino = null;
    } else {
      // passeio: curvas suaves, e uma volta para dentro quando chega perto da borda
      var m = 30, fora = n.x < m || n.x > L - m || n.y < m || n.y > A - m;
      if (fora) giraPara(n, Math.atan2(A * 0.5 - n.y, L * 0.5 - n.x), 2.6, dt);
      else n.ang += (Math.sin(relogio * n.f1 + n.fase) * 0.9 + Math.sin(relogio * n.f2 + n.fase * 1.7) * 0.55) * dt;
    }
    if (n.turbo > 0) { n.turbo -= dt; velAlvo *= 2.1; }
    n.vel += (velAlvo - n.vel) * Math.min(1, dt * 5);
    var px = Math.cos(n.ang) * n.vel * dt, py = Math.sin(n.ang) * n.vel * dt;
    n.x += px; n.y += py;

    // o rastro é uma fila de pontos, como a cobrinha
    n.andou += Math.sqrt(px * px + py * py);
    while (n.andou >= PASSO) {
      n.andou -= PASSO;
      n.pts.push({ x: n.x, y: n.y, r: Math.random() });
      if (n.pts.length > MAX_PTS) n.pts.shift();
    }
    // parada, a cauda vai encolhendo
    if (n.vel < 12 && n.pts.length > 2 && Math.random() < dt * 20) n.pts.shift();

    solta(n, dt);
  }

  // ---------------------------------------------------------------- fagulhas da propulsão
  function solta(n, dt) {
    var p = PROPULSOES[propAtual];
    var ritmo = (TOQUE ? 16 : 26) * (0.35 + n.vel / 140) * (n.turbo > 0 ? 1.8 : 1);
    n.emite += ritmo * dt;
    while (n.emite >= 1) {
      n.emite -= 1;
      if (fagulhas.length >= MAX_FAGULHAS) fagulhas.shift();
      var tras = n.ang + Math.PI + (Math.random() - 0.5) * 0.7, v = 30 + Math.random() * 70;
      var forma = p.forma || 0;
      fagulhas.push({
        x: n.x - Math.cos(n.ang) * tam * 0.42, y: n.y - Math.sin(n.ang) * tam * 0.42,
        vx: Math.cos(tras) * v, vy: Math.sin(tras) * v,
        vida: 0, max: (forma === 3 ? 0.9 : 0.5) + Math.random() * 0.45,
        t: (forma ? 5 : 3) + Math.random() * (forma ? 5 : 3.5), forma: forma,
        giro: Math.random() * TAU, tom: p.arco ? Math.floor(Math.random() * 24) : -1
      });
    }
  }

  function desenhaFagulhas(dt) {
    var p = PROPULSOES[propAtual];
    for (var k = fagulhas.length - 1; k >= 0; k--) {
      var f = fagulhas[k];
      f.vida += dt;
      if (f.vida >= f.max) { fagulhas.splice(k, 1); continue; }
      f.x += f.vx * dt; f.y += f.vy * dt;
      if (f.forma === 3) f.vy -= 40 * dt; else { f.vx *= 1 - 1.6 * dt; f.vy *= 1 - 1.6 * dt; }
      var q = f.vida / f.max, t = f.t * (f.forma === 3 ? 0.6 + q * 0.8 : 1 - q * 0.7);
      ctx.globalAlpha = (1 - q) * 0.9;
      var cor = f.tom >= 0 ? ARCO[(f.tom + Math.floor(q * 8)) % 24] : p.tons[Math.min(7, Math.floor(q * 8))];
      ctx.fillStyle = cor;
      if (f.forma === 0) { ctx.beginPath(); ctx.arc(f.x, f.y, t, 0, TAU); ctx.fill(); }
      else if (f.forma === 4) { var g = Math.round(t * 1.5); ctx.fillRect(Math.round(f.x / 3) * 3, Math.round(f.y / 3) * 3, g, g); }
      else if (f.forma === 3) { ctx.strokeStyle = cor; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(f.x, f.y, t, 0, TAU); ctx.stroke(); }
      else if (f.forma === 1) estrela(f.x, f.y, t, f.giro + q * 2);
      else coracao(f.x, f.y, t);
    }
    ctx.globalAlpha = 1;
  }
  function estrela(x, y, r, giro) {
    ctx.beginPath();
    for (var k = 0; k < 10; k++) {
      var a = giro + k * Math.PI / 5, rr = k % 2 ? r * 0.42 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
  }
  function coracao(x, y, r) {
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.9);
    ctx.bezierCurveTo(x - r * 1.5, y - r * 0.2, x - r * 0.7, y - r * 1.2, x, y - r * 0.4);
    ctx.bezierCurveTo(x + r * 0.7, y - r * 1.2, x + r * 1.5, y - r * 0.2, x, y + r * 0.9);
    ctx.fill();
  }

  // ---------------------------------------------------------------- desenho do rastro
  // Cada ponto do rastro ganha a sua "normal" (o lado), para os desenhos que saem do centro.
  var nxs = new Float32Array(64), nys = new Float32Array(64);
  function normais(pts, n) {
    for (var i = 0; i < n; i++) {
      var a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      var dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      nxs[i] = -dy / d; nys[i] = dx / d;
    }
  }
  function cor(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

  // uma linha que afina e apaga para a ponta; `desvio(i)` empurra cada ponto para o lado
  function fita(pts, n, larg, estilo, alfa, desvio) {
    ctx.strokeStyle = estilo;
    for (var i = 1; i < n; i++) {
      var f = i / (n - 1), o0 = desvio ? desvio(i - 1) : 0, o1 = desvio ? desvio(i) : 0;
      ctx.globalAlpha = alfa * f;
      ctx.lineWidth = larg * (0.2 + 0.8 * f);
      ctx.beginPath();
      ctx.moveTo(pts[i - 1].x + nxs[i - 1] * o0, pts[i - 1].y + nys[i - 1] * o0);
      ctx.lineTo(pts[i].x + nxs[i] * o1, pts[i].y + nys[i] * o1);
      ctx.stroke();
    }
  }

  // `largura` e `tempo` só vêm de fora (o puzzle do dia); no voo valem o tamanho e o relógio daqui.
  function desenhaRastro(nave, largura, tempo) {
    var pts = nave.pts, n = pts.length;
    if (n < 3) return;
    // a ponta do rastro acompanha a nave sem degrau
    pts.push({ x: nave.x, y: nave.y, r: 0 }); n++;
    normais(pts, n);
    var c = nave.rgb, c2 = nave.rgb2, larg = largura || tam * 0.26, id = RASTROS[rastroAtual].id, t = tempo === undefined ? relogio : tempo, i, f;
    ctx.lineCap = 'round';

    if (id === 'liso' || id === 'arcoiris') {
      if (id === 'arcoiris') {
        for (i = 1; i < n; i++) {
          f = i / (n - 1);
          ctx.strokeStyle = ARCO[(Math.floor(t * 10) + i) % 24];
          ctx.globalAlpha = 0.2 * f; ctx.lineWidth = larg * 2.6 * (0.2 + 0.8 * f);
          ctx.beginPath(); ctx.moveTo(pts[i - 1].x, pts[i - 1].y); ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke();
          ctx.globalAlpha = 0.95 * f; ctx.lineWidth = larg * (0.2 + 0.8 * f); ctx.stroke();
        }
      } else {
        fita(pts, n, larg * 2.6, cor(c, 1), 0.2);
        fita(pts, n, larg, cor(c, 1), 0.95);
      }
      fita(pts, n, larg * 0.3, '#fff', 0.75);
    } else if (id === 'onda') {
      // três cristas de luz correndo, com a do meio mais forte
      fita(pts, n, larg * 2.4, cor(c, 1), 0.12);
      [0, 2.1, 4.2].forEach(function (fase, k) {
        fita(pts, n, larg * (k ? 0.3 : 0.42), k ? cor(c2, 1) : cor(c, 1), k ? 0.7 : 1, function (j) { return Math.sin(j * 0.55 - t * 6 + fase) * larg * 1.25; });
      });
    } else if (id === 'cintilante') {
      fita(pts, n, larg * 1.1, cor(c, 1), 0.4);
      ctx.fillStyle = '#fff';
      for (i = 0; i < n - 1; i++) {
        var r = pts[i].r;
        if (r < 0.45) continue;
        var pisca = Math.pow(0.5 + 0.5 * Math.sin(t * (3 + r * 7) + r * 40), 4);
        f = i / (n - 1);
        var lado = (r - 0.72) * 5 * larg, px = pts[i].x + nxs[i] * lado, py = pts[i].y + nys[i] * lado, g = (2 + r * 5) * pisca * (0.4 + f);
        ctx.globalAlpha = Math.min(1, pisca * (0.3 + f));
        ctx.beginPath();
        ctx.moveTo(px - g, py); ctx.lineTo(px - g * 0.18, py - g * 0.18); ctx.lineTo(px, py - g); ctx.lineTo(px + g * 0.18, py - g * 0.18);
        ctx.lineTo(px + g, py); ctx.lineTo(px + g * 0.18, py + g * 0.18); ctx.lineTo(px, py + g); ctx.lineTo(px - g * 0.18, py + g * 0.18);
        ctx.fill();
      }
    } else if (id === 'pulsar') {
      // anéis de energia correndo para a ponta
      fita(pts, n, larg * 0.8, cor(c, 1), 0.3);
      for (i = 1; i < n; i++) {
        f = i / (n - 1);
        var k = ((n - i) * 0.11 - t * 2.2) % 1; if (k < 0) k += 1;
        var b = Math.exp(-Math.pow((k - 0.5) * 6, 2));
        if (b < 0.05) continue;
        ctx.globalAlpha = b * f; ctx.strokeStyle = cor(c, 1); ctx.lineWidth = larg * (0.6 + 1.5 * b) * (0.3 + 0.7 * f);
        ctx.beginPath(); ctx.moveTo(pts[i - 1].x, pts[i - 1].y); ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke();
        if (b > 0.75) { ctx.strokeStyle = '#fff'; ctx.lineWidth *= 0.35; ctx.stroke(); }
      }
    } else if (id === 'eletrico') {
      // dois raios em zigue-zague que pulam de lugar 16 vezes por segundo
      var quadro = Math.floor(t * 16);
      var zig = function (semente, forca) {
        return function (j) {
          if (j >= n - 1) return 0;
          var s = Math.sin((j + 1) * 12.9898 + (quadro + semente) * 78.233) * 43758.5453;
          return ((s - Math.floor(s)) - 0.5) * 2 * larg * forca;
        };
      };
      var z1 = zig(nave.fase, 1.1), z2 = zig(nave.fase + 9, 1.6);
      fita(pts, n, larg * 1.7, cor(c, 1), 0.22 + 0.1 * Math.sin(t * 50), z1);
      fita(pts, n, larg * 0.42, cor(c, 1), 1, z1);
      fita(pts, n, larg * 0.16, '#fff', 1, z1);
      fita(pts, n, larg * 0.22, cor(c2, 1), 0.7, z2);
    } else if (id === 'helice') {
      // duas fitas trançadas com degraus, como um DNA
      var h1 = function (j) { return Math.sin(j * 0.5 - t * 5) * larg * 1.3; };
      var h2 = function (j) { return -Math.sin(j * 0.5 - t * 5) * larg * 1.3; };
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      for (i = 2; i < n - 1; i += 3) {
        ctx.globalAlpha = 0.4 * i / (n - 1);
        var o = h1(i);
        ctx.beginPath(); ctx.moveTo(pts[i].x + nxs[i] * o, pts[i].y + nys[i] * o); ctx.lineTo(pts[i].x - nxs[i] * o, pts[i].y - nys[i] * o); ctx.stroke();
      }
      fita(pts, n, larg * 1.3, cor(c, 1), 0.18, h1); fita(pts, n, larg * 0.42, cor(c, 1), 1, h1);
      fita(pts, n, larg * 1.3, cor(c2, 1), 0.18, h2); fita(pts, n, larg * 0.42, cor(c2, 1), 1, h2);
    } else if (id === 'tabuleiro') {
      // casas de xadrez com friso dourado
      var meia = larg * 1.05;
      for (i = 2; i < n; i += 2) {
        f = i / (n - 1);
        var m0 = meia * (0.25 + 0.75 * (i - 2) / (n - 1)), m1 = meia * (0.25 + 0.75 * f), par = (i / 2) % 2 === 0;
        var ax = pts[i - 2].x, ay = pts[i - 2].y, bx = pts[i].x, by = pts[i].y;
        ctx.globalAlpha = 0.92 * f;
        for (var ladoK = -1; ladoK <= 1; ladoK += 2) {
          ctx.fillStyle = (ladoK > 0) === par ? '#f2ecd8' : cor(c, 0.3);
          ctx.beginPath();
          ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
          ctx.lineTo(bx + nxs[i] * m1 * ladoK, by + nys[i] * m1 * ladoK);
          ctx.lineTo(ax + nxs[i - 2] * m0 * ladoK, ay + nys[i - 2] * m0 * ladoK);
          ctx.closePath(); ctx.fill();
        }
      }
      ctx.lineCap = 'butt';
      fita(pts, n, 2, '#ffc94d', 1, function (j) { return meia * (0.25 + 0.75 * j / (n - 1)); });
      fita(pts, n, 2, '#ffc94d', 1, function (j) { return -meia * (0.25 + 0.75 * j / (n - 1)); });
    }
    ctx.globalAlpha = 1;
    pts.pop();
  }

  // ---------------------------------------------------------------- as naves em si
  // A chama: duas gotas de luz atrás da nave, tremendo.
  function desenhaChama(n) {
    var p = PROPULSOES[propAtual];
    if (p.semCone) return;
    var cn = p.cone || [1, 1], forca = Math.min(1.5, 0.35 + n.vel / 150) * (n.turbo > 0 ? 1.35 : 1);
    var comp = tam * 0.85 * cn[1] * forca * (0.85 + 0.15 * Math.sin(relogio * 38 + n.fase)), lar = tam * 0.2 * cn[0];
    ctx.save();
    ctx.translate(n.x - Math.cos(n.ang) * tam * 0.3, n.y - Math.sin(n.ang) * tam * 0.3);
    ctx.rotate(n.ang + Math.PI);
    ctx.globalAlpha = 0.75; ctx.fillStyle = p.arco ? ARCO[Math.floor(relogio * 14) % 24] : p.e;
    gota(comp, lar);
    ctx.globalAlpha = 0.95; ctx.fillStyle = p.i;
    gota(comp * 0.55, lar * 0.55);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  function gota(comp, lar) {
    ctx.beginPath();
    ctx.moveTo(0, -lar);
    ctx.quadraticCurveTo(comp * 0.35, -lar * 1.1, comp, 0);
    ctx.quadraticCurveTo(comp * 0.35, lar * 1.1, 0, lar);
    ctx.closePath(); ctx.fill();
  }

  // O foguete do @xadrezcomz: corpo branco, bico e aletas vermelhos, janela azul.
  function desenhaFoguete(c, s) {
    c.fillStyle = '#e02a2a';                       // aletas
    c.beginPath(); c.moveTo(-0.28 * s, -0.16 * s); c.lineTo(-0.56 * s, -0.46 * s); c.lineTo(-0.5 * s, -0.1 * s); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(-0.28 * s, 0.16 * s); c.lineTo(-0.56 * s, 0.46 * s); c.lineTo(-0.5 * s, 0.1 * s); c.closePath(); c.fill();
    c.fillStyle = '#3a3f55';                       // bocal do motor
    c.fillRect(-0.52 * s, -0.11 * s, 0.1 * s, 0.22 * s);
    var g = c.createLinearGradient(0, -0.2 * s, 0, 0.2 * s);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#e6e9f5'); g.addColorStop(1, '#a9b0cc');
    c.fillStyle = g;                               // corpo
    c.beginPath();
    c.moveTo(-0.44 * s, -0.17 * s);
    c.quadraticCurveTo(0.1 * s, -0.27 * s, 0.3 * s, -0.14 * s);
    c.lineTo(0.3 * s, 0.14 * s);
    c.quadraticCurveTo(0.1 * s, 0.27 * s, -0.44 * s, 0.17 * s);
    c.closePath(); c.fill();
    c.fillStyle = '#e02a2a';                       // bico
    c.beginPath(); c.moveTo(0.28 * s, -0.15 * s); c.quadraticCurveTo(0.5 * s, -0.1 * s, 0.62 * s, 0); c.quadraticCurveTo(0.5 * s, 0.1 * s, 0.28 * s, 0.15 * s); c.closePath(); c.fill();
    c.fillStyle = '#20264a';                       // janela
    c.beginPath(); c.arc(0.06 * s, 0, 0.115 * s, 0, TAU); c.fill();
    c.fillStyle = '#35c8ff';
    c.beginPath(); c.arc(0.06 * s, 0, 0.085 * s, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.85)';
    c.beginPath(); c.arc(0.035 * s, -0.03 * s, 0.03 * s, 0, TAU); c.fill();
  }

  // Cada nave é desenhada uma vez num "carimbo" e depois só copiada a cada quadro.
  function carimbo(n) {
    if (n.carimbo) return n.carimbo;
    var lado = Math.ceil(tam * 1.4 * dpr), c = document.createElement('canvas');
    c.width = c.height = lado;
    var x = c.getContext('2d');
    if (n.tipo.id === 'foguete') {
      x.translate(lado / 2, lado / 2);
      desenhaFoguete(x, tam * 1.05 * dpr);
    } else {
      if (!n.img.complete || !n.img.naturalWidth) return null;
      var m = lado * 0.08;
      x.drawImage(n.img, m, m, lado - 2 * m, lado - 2 * m);
    }
    n.carimbo = c;
    return c;
  }

  function desenhaNave(n) {
    var c = carimbo(n), lado = tam * 1.4;
    // halo na cor da nave
    var halo = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, tam * 0.95);
    halo.addColorStop(0, cor(n.rgb, n.piloto ? 0.6 : 0.36)); halo.addColorStop(1, cor(n.rgb, 0));
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(n.x, n.y, tam * 0.95, 0, TAU); ctx.fill();
    if (n.piloto) {
      ctx.strokeStyle = cor(n.rgb, 0.9); ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -relogio * 30;
      ctx.beginPath(); ctx.arc(n.x, n.y, tam * 0.8, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    }
    if (!c) return;
    ctx.save();
    ctx.translate(n.x, n.y);
    // o foguete aponta para onde vai; as peças ficam em pé e só inclinam na direção do voo
    if (n.tipo.id === 'foguete') ctx.rotate(n.ang);
    else ctx.rotate(Math.cos(n.ang) * 0.32 * Math.min(1, n.vel / 120));
    ctx.drawImage(c, -lado / 2, -lado / 2, lado, lado);
    if (TEMA.gorro && n.tipo.id !== 'foguete') gorro(lado, n.tipo.id[1]);
    ctx.restore();
  }

  // O gorro de Natal das peças (tema de data): assenta no topo de cada desenho.
  var TOPO_PECA = { k: 6, q: 8, r: 9, b: 6, n: 7, p: 9 };   // onde a peça começa, no desenho de 45 de altura
  function gorro(lado, peca) {
    var y = (-0.42 + TOPO_PECA[peca] / 45 * 0.84) * lado + lado * 0.07, g = lado * 0.2;
    ctx.fillStyle = '#e8283c';
    ctx.beginPath(); ctx.moveTo(-g, y); ctx.quadraticCurveTo(-g * 0.2, y - g * 2.1, g * 1.25, y - g * 1.25); ctx.quadraticCurveTo(g * 0.6, y - g * 0.9, g, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(g * 1.3, y - g * 1.2, g * 0.34, 0, TAU); ctx.fill();
    ctx.fillRect(-g * 1.2, y - g * 0.22, g * 2.4, g * 0.5);
  }

  // ---------------------------------------------------------------- céu vivo
  function desenhaCeu(dt) {
    for (var k = 0; k < cintilas.length; k++) {
      var s = cintilas[k], b = Math.pow(0.5 + 0.5 * Math.sin(relogio * s.f + s.fase), 3), g = s.r * (1 + b * 2.2);
      ctx.globalAlpha = 0.25 + 0.75 * b; ctx.fillStyle = '#fff';
      ctx.fillRect(s.x - g, s.y - 0.5, g * 2, 1); ctx.fillRect(s.x - 0.5, s.y - g, 1, g * 2);
    }
    if (Math.random() < dt * 0.22 && cadentes.length < 2) {
      cadentes.push({ x: Math.random() * L, y: Math.random() * A * 0.5, vx: -(240 + Math.random() * 200), vy: 120 + Math.random() * 80, vida: 0 });
    }
    for (var j = cadentes.length - 1; j >= 0; j--) {
      var e = cadentes[j];
      e.vida += dt; e.x += e.vx * dt; e.y += e.vy * dt;
      if (e.vida > 0.9) { cadentes.splice(j, 1); continue; }
      var a = Math.sin(e.vida / 0.9 * Math.PI);
      var gr = ctx.createLinearGradient(e.x, e.y, e.x - e.vx * 0.22, e.y - e.vy * 0.22);
      gr.addColorStop(0, 'rgba(255,255,255,' + a + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = 1; ctx.strokeStyle = gr; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x - e.vx * 0.22, e.y - e.vy * 0.22); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------- o quadro
  function passo(dt) {
    relogio += dt;
    for (var k = 0; k < naves.length; k++) anda(naves[k], dt);
  }
  function desenha(dt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, L, A);
    desenhaCeu(dt);
    ctx.globalCompositeOperation = 'lighter';
    var k;
    for (k = 0; k < naves.length; k++) desenhaRastro(naves[k]);
    desenhaFagulhas(dt);
    for (k = 0; k < naves.length; k++) desenhaChama(naves[k]);
    ctx.globalCompositeOperation = 'source-over';
    for (k = 0; k < naves.length; k++) desenhaNave(naves[k]);
  }
  function quadro(agora) {
    if (!rodando) return;
    var dt = Math.min(0.05, (agora - ultimo) / 1000 || 0.016);
    ultimo = agora;
    passo(dt); desenha(dt);
    requestAnimationFrame(quadro);
  }
  function liga() {
    if (rodando || CALMO || !visivel || document.hidden) return;
    rodando = true; ultimo = performance.now();
    requestAnimationFrame(quadro);
  }
  function desliga() { rodando = false; }
  // quem pediu menos movimento vê o voo parado, já com os rastros desenhados
  function quadroParado() {
    if (!CALMO) return;
    for (var k = 0; k < 90; k++) passo(1 / 30);
    desenha(0);
  }

  // ---------------------------------------------------------------- pilotar
  var ponteiro = { x: 0, y: 0 }, pilotada = null, dedo = null;
  var dica = document.getElementById('heroDica');
  function interagiu() { if (dica) dica.classList.add('some'); }
  function local(ev) {
    var r = tela.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }
  function maisPerto(p, alcance) {
    var melhor = null, menor = alcance * alcance;
    naves.forEach(function (n) {
      var d = (n.x - p.x) * (n.x - p.x) + (n.y - p.y) * (n.y - p.y);
      if (d < menor) { menor = d; melhor = n; }
    });
    return melhor;
  }
  function pilota(n) {
    if (pilotada && pilotada !== n) pilotada.piloto = false;
    pilotada = n;
    if (n) { n.piloto = true; n.destino = null; interagiu(); }
  }
  function ehControle(alvo) { return alvo.closest && alvo.closest('a,button'); }

  // celular: o dedo em cima de uma peça pilota (e a página não rola); fora dela, a página rola normal
  hero.addEventListener('touchstart', function (ev) {
    if (ehControle(ev.target) || ev.touches.length > 1) return;
    var t = ev.changedTouches[0], p = local(t), n = maisPerto(p, 62);
    dedo = { id: t.identifier, x: p.x, y: p.y, mexeu: false, nave: n };
    if (n) { ponteiro.x = p.x; ponteiro.y = p.y; pilota(n); ev.preventDefault(); }
  }, { passive: false });
  hero.addEventListener('touchmove', function (ev) {
    if (!dedo) return;
    for (var k = 0; k < ev.changedTouches.length; k++) {
      var t = ev.changedTouches[k];
      if (t.identifier !== dedo.id) continue;
      var p = local(t);
      if (Math.abs(p.x - dedo.x) + Math.abs(p.y - dedo.y) > 10) dedo.mexeu = true;
      if (dedo.nave) { ponteiro.x = p.x; ponteiro.y = p.y; ev.preventDefault(); }
    }
  }, { passive: false });
  function soltaDedo(ev) {
    if (!dedo) return;
    if (dedo.nave) { dedo.nave.turbo = 0.7; pilota(null); }
    else if (!dedo.mexeu && ev.type === 'touchend' && !ehControle(ev.target)) {
      // toque no espaço vazio: a peça mais próxima vai até lá
      var n = maisPerto(dedo, 9999);
      if (n) { n.destino = { x: dedo.x, y: dedo.y, t: 2.5 }; n.turbo = 0.5; interagiu(); }
    }
    dedo = null;
  }
  hero.addEventListener('touchend', soltaDedo);
  hero.addEventListener('touchcancel', soltaDedo);

  // computador: a peça mais perto do mouse passa a segui-lo
  hero.addEventListener('mousemove', function (ev) {
    if (dedo) return;
    var p = local(ev);
    ponteiro.x = p.x; ponteiro.y = p.y;
    if (pilotada) {
      var dx = pilotada.x - p.x, dy = pilotada.y - p.y;
      if (dx * dx + dy * dy > 420 * 420) pilota(null);
    }
    if (!pilotada) { var n = maisPerto(p, 130); if (n) pilota(n); }
  });
  hero.addEventListener('mouseleave', function () { pilota(null); });
  hero.addEventListener('click', function (ev) {
    if (TOQUE || ehControle(ev.target)) return;
    naves.forEach(function (n) { n.turbo = 0.9; });
    interagiu();
  });

  // ---------------------------------------------------------------- botões de efeito
  var btRastro = document.getElementById('btRastro'), btProp = document.getElementById('btPropulsao');
  function mostraEfeitos() {
    if (btRastro) btRastro.querySelector('b').textContent = RASTROS[rastroAtual].nome;
    if (btProp) btProp.querySelector('b').textContent = PROPULSOES[propAtual].nome;
    if (CALMO) desenha(0);
  }
  // só guarda o que a pessoa escolheu de verdade; assim a propulsão de um tema de data não fica presa para sempre
  function guarda() {
    try { localStorage.setItem('xe.efeitos', JSON.stringify({ rastro: RASTROS[rastroAtual].id, propulsao: PROPULSOES[propAtual].id })); } catch (e) { /* tudo bem */ }
  }
  if (btRastro) btRastro.addEventListener('click', function () { rastroAtual = (rastroAtual + 1) % RASTROS.length; mostraEfeitos(); guarda(); interagiu(); });
  if (btProp) btProp.addEventListener('click', function () { propAtual = (propAtual + 1) % PROPULSOES.length; fagulhas.length = 0; mostraEfeitos(); guarda(); interagiu(); });

  // ---------------------------------------------------------------- começa
  criaNaves();
  ajusta();
  mostraEfeitos();
  // já entra com os rastros formados
  for (var w = 0; w < 60; w++) passo(1 / 30);
  fagulhas.length = 0;

  window.addEventListener('resize', function () { ajusta(); if (CALMO) desenha(0); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) desliga(); else liga(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      visivel = es[0].isIntersecting;
      if (visivel) liga(); else desliga();
    }, { threshold: 0.02 }).observe(hero);
  }
  if (CALMO) {
    naves.forEach(function (n) { if (n.img) n.img.addEventListener('load', function () { desenha(0); }); });
    quadroParado();
  } else liga();

  // para os testes automáticos poderem olhar o estado
  window.XE_VOO = { naves: naves, rastros: RASTROS, propulsoes: PROPULSOES };

  // O rastro escolhido aqui em cima também aparece nas peças do puzzle do dia:
  // o puzzle entrega o seu canvas e os pontos, e o desenho é o mesmo do voo.
  var CORES_PECA = {};
  TIPOS.forEach(function (t) { if (t.id !== 'foguete') CORES_PECA[t.id[1]] = { rgb: rgb(t.cor), rgb2: rgb(t.cor2) }; });
  window.XE_RASTRO = {
    cores: CORES_PECA,
    // rastro: { pts: [{x, y, r}], x, y, rgb, rgb2, fase }
    desenha: function (outroCtx, rastro, largura, tempo) {
      var meu = ctx; ctx = outroCtx;
      try { desenhaRastro(rastro, largura, tempo); } finally { ctx.globalAlpha = 1; ctx = meu; }
    }
  };
})();
