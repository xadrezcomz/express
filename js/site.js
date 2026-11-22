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
  if (id('fraseTexto') && window.XE_dados) window.XE_dados('frases', numeroDoDia(), function (f) {
    id('fraseTexto').textContent = f.t;
    id('fraseAutor').textContent = f.a;
    id('frasePapel').textContent = f.p || '';
    id('fraseData').textContent = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
    id('fraseCompartilhar').addEventListener('click', function () {
      window.XE_compartilha('“' + f.t + '” — ' + f.a, location.origin + location.pathname + '#frase', this);
    });
  });

  // ---------------------------------------------------------------- venda do curso
  var insta = CFG.instagram || 'https://www.instagram.com/xadrezcomz/';
  document.querySelectorAll('[data-instagram]').forEach(function (a) { a.href = insta; });
  var botao = id('cursoBotao');
  if (CFG.linkCompra) {
    botao.href = CFG.linkCompra; botao.textContent = 'Quero começar agora';
    id('cursoSelo').textContent = 'Disponível';
    id('cursoNota').textContent = 'Acesso liberado na hora, logo depois do pagamento.';
    // garantia, acesso vitalício e compra segura só valem com a venda ligada
    document.querySelectorAll('[data-so-venda]').forEach(function (el) { el.hidden = false; });
    if (CFG.preco) {
      id('cursoPreco').hidden = false;
      id('cursoPrecoPor').textContent = CFG.preco;
      id('cursoPrecoDe').textContent = CFG.precoDe || '';
      id('cursoParcelas').textContent = CFG.parcelas || '';
      id('barraPreco').textContent = CFG.preco;
    }
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

  // ---------------------------------------------------------------- o que tem no curso
  // Números, módulos e bônus vêm de "curso" em js/config.js; só aparece o que estiver preenchido.
  var C = CFG.curso || {}, mods = (C.modulos || []).filter(function (m) { return m.titulo; }), bonus = (C.bonus || []).filter(function (b) { return b.titulo; });
  function plural(n, um, varios) { return n + ' ' + (n === 1 ? um : varios); }
  function soma(lista) { return lista.reduce(function (s, m) { return s + (Number(m.aulas) || 0); }, 0); }
  var aulasCurso = soma(mods), aulasBonus = soma(bonus), totalAulas = aulasCurso + aulasBonus;
  if (mods.length) {
    var numeros = [];
    if (totalAulas) numeros.push(['🎬', plural(totalAulas, 'aula', 'aulas')]);
    if (mods.length > 1) numeros.push(['📚', plural(mods.length, 'módulo', 'módulos')]);
    if (bonus.length) numeros.push(['🎁', plural(bonus.length, 'módulo bônus', 'módulos bônus')]);
    id('cursoNumeros').innerHTML = numeros.map(function (n) { return '<span><i aria-hidden="true">' + n[0] + '</i>' + n[1] + '</span>'; }).join('');
    id('cursoNumeros').hidden = false;
    id('cursoModulos').innerHTML = mods.map(function (m, i) {
      return '<li><b>' + (i + 1 < 10 ? '0' : '') + (i + 1) + '</b><span>' + m.titulo + (m.aulas ? '<small>' + plural(Number(m.aulas), 'aula', 'aulas') + '</small>' : '') + '</span></li>';
    }).join('');
    id('cursoConteudo').hidden = false;
  }
  if (bonus.length) {
    var lista = id('cursoBonusLista');
    lista.innerHTML = bonus.map(function (b, i) {
      return '<li' + (i >= 4 ? ' class="extra"' : '') + '><b>' + b.titulo + (b.aulas ? ' <small>' + plural(Number(b.aulas), 'aula', 'aulas') + '</small>' : '') + '</b>' + (b.texto ? '<span>' + b.texto + '</span>' : '') + '</li>';
    }).join('');
    id('cursoBonusTitulo').textContent = '🎁 ' + plural(bonus.length, 'módulo bônus', 'módulos bônus') + (aulasBonus ? ' · ' + aulasBonus + ' aulas a mais' : '');
    if (bonus.length > 4) {
      var ver = id('cursoBonusVer');
      ver.textContent = 'Ver todos os ' + bonus.length + ' bônus';
      ver.hidden = false;
      ver.addEventListener('click', function () { id('cursoBonus').classList.add('aberto'); ver.hidden = true; });
    }
    id('cursoBonus').hidden = false;
  }
  // um segundo botão de compra no fim do cartão, para quem leu a lista inteira
  if (CFG.linkCompra && (mods.length || bonus.length)) {
    var b2 = id('cursoBotao2');
    b2.href = CFG.linkCompra; b2.hidden = false;
    b2.textContent = totalAulas >= 20 && CFG.preco ? 'Quero as ' + totalAulas + ' aulas por ' + CFG.preco : 'Quero começar agora';
  }
  // a conta que vende: o preço dividido pelas aulas
  var valor = parseFloat(String(CFG.preco || '').replace(/[^\d,]/g, '').replace(',', '.'));
  if (CFG.linkCompra && valor && totalAulas >= 20) {
    var porAula = Math.ceil(valor / totalAulas * 100) / 100;
    id('cursoPorAula').innerHTML = 'São ' + totalAulas + ' aulas: <b>menos de R$ ' + porAula.toFixed(2).replace('.', ',') + ' por aula</b>.';
    id('cursoPorAula').hidden = false;
  }

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
  // A telinha do cartão: um comercial curto do curso, em cenas que passam como stories.
  // Os números saem de "curso" em js/config.js; tocar na telinha pula para a próxima cena.
  var tela = document.querySelector('.curso-tela'), elCena = id('telaCena'), elTrilha = id('telaTrilha');
  function peca(n) { return '<img class="cena-peca" src="img/pecas-express/' + n + '.svg" alt="" width="96" height="96">'; }
  var CENAS = [
    { classe: 'abre', visual: '<img class="cena-logo" src="img/logo.svg" alt="" width="120" height="120">', titulo: 'Xadrez Express', texto: 'O jeito mais rápido de evoluir no xadrez.' }
  ];
  if (totalAulas) CENAS.push({ numero: totalAulas, titulo: 'aulas', texto: 'de 30 segundos a 1 minuto. Cabe em qualquer intervalo.' });
  if (mods.length) CENAS.push({ visual: '<ol class="cena-lista">' + mods.map(function (m, i) { return '<li style="--i:' + i + '"><b>' + (i + 1) + '</b>' + m.titulo + '</li>'; }).join('') + '</ol>',
    titulo: plural(mods.length, 'módulo', 'módulos'), texto: 'Do zero até a sua primeira partida.' });
  CENAS.push(
    { classe: 'habilidade', visual: peca('wn'), sobre: 'Você vai aprender', titulo: 'Achar golpes', texto: 'Garfo, cravada, espeto e ataque descoberto.' },
    { classe: 'habilidade', visual: peca('wq'), sobre: 'Você vai aprender', titulo: 'Dar xeque-mate', texto: 'Mate do corredor, do pastor, com dama e com torre.' },
    { classe: 'habilidade', visual: peca('wp'), sobre: 'Você vai aprender', titulo: 'Começar bem', texto: 'Controlar o centro, desenvolver as peças e proteger o rei.' },
    { classe: 'habilidade', visual: peca('wk'), sobre: 'Você vai aprender', titulo: 'Ganhar os finais', texto: 'Oposição, regra do quadrado e promoção.' }
  );
  if (bonus.length) CENAS.push({ visual: '<span class="cena-presente">🎁</span>', numero: bonus.length, titulo: bonus.length === 1 ? 'módulo bônus' : 'módulos bônus',
    texto: (aulasBonus ? '+' + aulasBonus + ' aulas: ' : '') + 'aberturas, armadilhas, finais e muito mais.' });
  if (CFG.linkCompra && CFG.preco) CENAS.push({ classe: 'preco', titulo: CFG.preco, sobre: 'Tudo isso por',
    texto: (totalAulas >= 20 ? 'Menos de R$ ' + (Math.ceil(valor / totalAulas * 100) / 100).toFixed(2).replace('.', ',') + ' por aula. ' : '') + '7 dias de garantia.' });
  CENAS.push({ classe: 'fim', visual: '<span class="cena-raio">⚡</span>', titulo: 'Comece hoje', texto: 'Acesso vitalício, no celular, quando quiser.' });

  var cena = -1, inicioCena = 0, vendoTela = false, DURA = 3400;
  elTrilha.innerHTML = CENAS.map(function () { return '<i><b></b></i>'; }).join('');
  var segmentos = elTrilha.children;
  function contaAte(el, alvo) {
    var t0 = performance.now();
    (function passo(agora) {
      var q = Math.min(1, (agora - t0) / 900);
      el.textContent = Math.round(alvo * (1 - Math.pow(1 - q, 3)));
      if (q < 1) requestAnimationFrame(passo);
    })(t0);
  }
  function mostraCena(k) {
    cena = (k + CENAS.length) % CENAS.length;
    var c = CENAS[cena];
    elCena.className = 'tela-cena ' + (c.classe || '');
    elCena.innerHTML = (c.visual || '') + (c.sobre ? '<p class="cena-sobre">' + c.sobre + '</p>' : '') +
      (c.numero ? '<p class="cena-numero" data-alvo="' + c.numero + '">' + c.numero + '</p>' : '') +
      '<p class="cena-titulo">' + c.titulo + '</p><p class="cena-texto">' + c.texto + '</p>';
    void elCena.offsetWidth; elCena.classList.add('entra');
    var num = elCena.querySelector('.cena-numero');
    if (num && !CALMO) contaAte(num, c.numero);
    Array.prototype.forEach.call(segmentos, function (s, i) { s.firstChild.style.width = i < cena ? '100%' : '0'; });
    inicioCena = performance.now();
  }
  function rodaTela(agora) {
    if (!vendoTela) return;
    var q = (agora - inicioCena) / DURA;
    if (q >= 1) { mostraCena(cena + 1); q = 0; }
    segmentos[cena].firstChild.style.width = (q * 100).toFixed(1) + '%';
    requestAnimationFrame(rodaTela);
  }
  if (tela && elCena) {
    mostraCena(0);
    tela.addEventListener('click', function () { mostraCena(cena + 1); });
    if (!CALMO && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        var antes = vendoTela; vendoTela = e[0].isIntersecting;
        if (vendoTela && !antes) { inicioCena = performance.now(); requestAnimationFrame(rodaTela); }
      }, { threshold: 0.2 }).observe(tela);
    } else mostraCena(1);
  }

  // ---------------------------------------------------------------- ir até o curso
  // "Conhecer o curso", "O curso" e companhia param a tela de um jeito que o botão de compra do
  // cartão sempre fique à vista: mostra a partir do título da seção, sem o espaço vazio de cima,
  // e, se o botão não couber junto, desce o necessário para ele aparecer inteiro.
  function irAoCurso(suave) {
    var secao = id('curso'), botao = id('cursoBotao'), olho = secao && secao.querySelector('.olho');
    if (!olho || !botao) return false;
    var topo = document.querySelector('.topo').getBoundingClientRect().height;
    var y = window.scrollY, inicio = olho.getBoundingClientRect().top + y - topo - 12;
    var fimBotao = botao.getBoundingClientRect().bottom + y + 16 - window.innerHeight;
    window.scrollTo({ top: Math.max(0, Math.max(inicio, fimBotao)), behavior: suave && !CALMO ? 'smooth' : 'auto' });
    return true;
  }
  // seções de cima (partida e frase do dia) carregam durante a rolagem e podem empurrar o cartão:
  // quando a rolagem termina, confere e ajusta o que faltar
  function confere() {
    var feito = false;
    function ajusta() { if (feito) return; feito = true; window.removeEventListener('scrollend', ajusta); irAoCurso(true); setTimeout(function () { irAoCurso(false); }, 700); }
    window.addEventListener('scrollend', ajusta);
    setTimeout(ajusta, 1200);
  }
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a[href="#curso"]');
    if (!a || a.target === '_blank') return;
    if (irAoCurso(true)) { ev.preventDefault(); history.replaceState(null, '', '#curso'); confere(); }
  });
  // chegou de outra página com #curso no endereço (por exemplo, da seção Aprender)
  if (location.hash === '#curso') window.addEventListener('load', function () { setTimeout(function () { irAoCurso(false); confere(); }, 50); });

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
    var TEMA = window.XE_TEMA || {};
    var CORES = TEMA.festaCores || ['#ffd36b', '#ff9a3d', '#2ee6ff', '#a06bff', '#ff4fd8', '#7cff5a', '#ffffff'], GLIFOS = TEMA.festaGlifos || ['♞', '♛', '♜', '♝', '♚', '♟', '★'];
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
