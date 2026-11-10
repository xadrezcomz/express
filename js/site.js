// O que é comum ao site todo: frase do dia, cartão do curso (e a venda, quando
// houver link em js/config.js), confete, compartilhar e as entradas suaves.
(function () {
  'use strict';
  var CFG = window.XE_CONFIG || {};
  var CALMO = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  function id(x) { return document.getElementById(x); }
  function numeroDoDia() {
    var d = new Date();
    return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(2026, 0, 5)) / 86400000);
  }

  // ---------------------------------------------------------------- compartilhar
  // Usa o compartilhamento do celular; onde não houver, copia o texto.
  window.XE_compartilha = function (texto, url, botao) {
    if (navigator.share) { navigator.share({ text: texto, url: url }).catch(function () { /* a pessoa desistiu */ }); return; }
    var tudo = texto + ' ' + url, original = botao && botao.textContent;
    var avisa = function () { if (!botao) return; botao.textContent = 'Copiado ✓'; setTimeout(function () { botao.textContent = original; }, 1800); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(tudo).then(avisa, function () {});
    else { var t = document.createElement('textarea'); t.value = tudo; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); avisa(); } catch (e) { /* sem cópia */ } t.remove(); }
  };

  // ---------------------------------------------------------------- frase do dia
  var FRASES = window.XE_FRASES || [];
  if (FRASES.length && id('fraseTexto')) {
    var dia = numeroDoDia(), f = FRASES[((dia % FRASES.length) + FRASES.length) % FRASES.length];
    id('fraseTexto').textContent = f.t;
    id('fraseAutor').textContent = f.a;
    id('frasePapel').textContent = f.p || '';
    id('fraseData').textContent = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
    id('fraseCompartilhar').addEventListener('click', function () {
      window.XE_compartilha('“' + f.t + '” — ' + f.a, location.origin + location.pathname + '#frase', this);
    });
  }

  // ---------------------------------------------------------------- venda do curso
  var insta = CFG.instagram || 'https://www.instagram.com/xadrezcomz/';
  document.querySelectorAll('[data-instagram]').forEach(function (a) { a.href = insta; });
  var botao = id('cursoBotao');
  if (CFG.linkCompra) {
    botao.href = CFG.linkCompra; botao.textContent = 'Quero começar agora';
    id('cursoSelo').textContent = 'Disponível';
    id('cursoNota').textContent = 'Acesso imediato. Assista no celular, quando e onde quiser.';
    if (CFG.preco) {
      id('cursoPreco').hidden = false;
      id('cursoPrecoPor').textContent = CFG.preco;
      id('cursoPrecoDe').textContent = CFG.precoDe || '';
      id('cursoParcelas').textContent = CFG.parcelas || '';
      id('barraPreco').textContent = CFG.preco;
    }
    var topo = document.querySelector('[data-cta-topo]');
    if (topo) topo.textContent = 'Comprar';
    // a barra fixa do celular aparece depois do topo e some quando o cartão do curso está na tela
    var barra = id('barraCompra'); barra.hidden = false; id('barraBotao').href = CFG.linkCompra; id('barraBotao').target = '_blank'; id('barraBotao').rel = 'noopener';
    document.body.classList.add('tem-barra');
    var passouTopo = false, vendoCurso = false;
    var ajustaBarra = function () { barra.classList.toggle('aparece', passouTopo && !vendoCurso); };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { passouTopo = !e[0].isIntersecting; ajustaBarra(); }, { threshold: 0.3 }).observe(id('inicio'));
      new IntersectionObserver(function (e) { vendoCurso = e[0].isIntersecting; ajustaBarra(); }, { threshold: 0.2 }).observe(id('cursoCartao'));
    }
  } else { botao.href = insta; }

  // ---------------------------------------------------------------- cartão do curso
  // inclina seguindo o mouse (ou o dedo) e passa um brilho por cima
  var cartao = id('cursoCartao');
  if (cartao && !CALMO) {
    var mexe = function (ev) {
      var r = cartao.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
      cartao.style.setProperty('--ry', ((x - 0.5) * 9).toFixed(2) + 'deg');
      cartao.style.setProperty('--rx', ((0.5 - y) * 7).toFixed(2) + 'deg');
      cartao.style.setProperty('--bx', (x * 100).toFixed(1) + '%');
      cartao.style.setProperty('--by', (y * 100).toFixed(1) + '%');
    };
    cartao.addEventListener('pointermove', mexe);
    cartao.addEventListener('pointerleave', function () { cartao.style.setProperty('--rx', '0deg'); cartao.style.setProperty('--ry', '0deg'); });
  }
  // a "telinha" do cartão: uma amostra de como são as lições, trocando sozinha
  var AMOSTRAS = [
    ['wn', 'Como o cavalo se move', '0:45'], ['wb', 'O bispo e as diagonais', '0:38'], ['wr', 'A torre nas colunas abertas', '0:52'],
    ['wq', 'A força da dama', '0:41'], ['wk', 'Proteja o seu rei: o roque', '0:58'], ['wp', 'O peão que vira dama', '0:36']
  ];
  var amostra = 0, tPeca = id('telaPeca'), tBarra = id('telaBarra'), vendoTela = false, inicioTela = 0;
  function poeAmostra() {
    var a = AMOSTRAS[amostra];
    tPeca.style.backgroundImage = 'url(img/pecas/' + a[0] + '.svg)';
    id('telaTitulo').textContent = a[1]; id('telaTempo').textContent = a[2];
    id('telaNumero').textContent = (amostra + 1 < 10 ? '0' : '') + (amostra + 1);
  }
  function giraTela(agora) {
    if (!vendoTela) return;
    if (!inicioTela) inicioTela = agora;
    var q = (agora - inicioTela) / 4200;
    if (q >= 1) {
      inicioTela = agora; q = 0; amostra = (amostra + 1) % AMOSTRAS.length;
      tPeca.classList.add('troca');
      setTimeout(function () { poeAmostra(); tPeca.classList.remove('troca'); }, 300);
    }
    tBarra.style.width = (q * 100).toFixed(1) + '%';
    requestAnimationFrame(giraTela);
  }
  if (tPeca) {
    poeAmostra();
    if (!CALMO && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        var antes = vendoTela; vendoTela = e[0].isIntersecting;
        if (vendoTela && !antes) { inicioTela = 0; requestAnimationFrame(giraTela); }
      }, { threshold: 0.1 }).observe(cartao);
    } else tBarra.style.width = '35%';
  }

  // ---------------------------------------------------------------- entradas suaves
  var revelar = document.querySelectorAll('.revela');
  if ('IntersectionObserver' in window) {
    var olho = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visto'); olho.unobserve(e.target); } });
    }, { threshold: 0.15 });
    revelar.forEach(function (el) { olho.observe(el); });
  } else revelar.forEach(function (el) { el.classList.add('visto'); });

  // ---------------------------------------------------------------- a festa (confete)
  // Chamada pelo puzzle ao acertar: confete e peças de xadrez estourando a partir do tabuleiro.
  var telaFesta = id('festa');
  window.XE_festa = function (origem) {
    if (CALMO || !telaFesta || !telaFesta.getContext) return;
    var c = telaFesta.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2);
    var L = window.innerWidth, A = window.innerHeight;
    telaFesta.width = L * dpr; telaFesta.height = A * dpr; telaFesta.classList.add('ligada');
    var r = origem.getBoundingClientRect(), ox = r.left + r.width / 2, oy = Math.min(A * 0.75, Math.max(A * 0.25, r.top + r.height / 2));
    var CORES = ['#ffd36b', '#ff9a3d', '#2ee6ff', '#a06bff', '#ff4fd8', '#7cff5a', '#ffffff'], GLIFOS = ['♞', '♛', '♜', '♝', '♚', '♟', '★'];
    var pecas = [], qtd = L < 600 ? 90 : 150;
    for (var k = 0; k < qtd; k++) {
      var ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.6, v = 380 + Math.random() * 620;
      pecas.push({ x: ox, y: oy, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, giro: Math.random() * 6, vg: (Math.random() - 0.5) * 12,
        cor: CORES[k % CORES.length], t: 6 + Math.random() * 8, glifo: k % 6 === 0 ? GLIFOS[k % GLIFOS.length] : null, vida: 0, max: 2.2 + Math.random() * 1.4 });
    }
    var antes = performance.now();
    (function quadro(agora) {
      var dt = Math.min(0.05, (agora - antes) / 1000); antes = agora;
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, L, A);
      var vivas = 0;
      pecas.forEach(function (p) {
        p.vida += dt; if (p.vida > p.max) return; vivas++;
        p.vy += 900 * dt; p.vx *= 1 - 0.9 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.giro += p.vg * dt;
        c.save(); c.translate(p.x, p.y); c.rotate(p.giro);
        c.globalAlpha = Math.min(1, (p.max - p.vida) * 2); c.fillStyle = p.cor;
        if (p.glifo) { c.font = (p.t * 3) + 'px serif'; c.textAlign = 'center'; c.fillText(p.glifo, 0, p.t); }
        else c.fillRect(-p.t / 2, -p.t / 4, p.t, p.t / 2 * (0.4 + Math.abs(Math.sin(p.giro))));
        c.restore();
      });
      if (vivas) requestAnimationFrame(quadro); else { c.clearRect(0, 0, L, A); telaFesta.classList.remove('ligada'); }
    })(antes);
  };
})();
