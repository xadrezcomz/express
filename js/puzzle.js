// O desafio do dia: um exercício por dia, tirado do banco do Lichess (dados/puzzles.js, em fatias).
// Quando termina, o tabuleiro dá lugar a um cartão que fala com a pessoa conforme ela se saiu
// (de primeira, depois de errar, ou pedindo a jogada) e leva ao curso.
//
// No banco, a posição (FEN) vem um lance ANTES do exercício: o primeiro lance da
// lista é do adversário, e só então é a vez de quem resolve. Como no Lichess,
// vale o lance previsto ou qualquer lance que dê xeque-mate.
(function () {
  'use strict';
  var X = window.Xadrez, elTab = document.getElementById('tabuleiro');
  if (!X || !elTab || !window.XE_dados) return;
  // Dia 0 = segunda-feira, 5 de janeiro de 2026 (a dificuldade do banco sobe de segunda a domingo).
  function numeroDoDia(data) {
    var d = data || new Date();
    return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(2026, 0, 5)) / 86400000);
  }
  var hoje = numeroDoDia();
  // só a fatia do banco com o puzzle de hoje é baixada; o resto começa quando ela chega
  window.XE_dados('puzzles', hoje, function (linha) {

  var elCasas = document.getElementById('casas'), elPecas = document.getElementById('pecas');
  var elVez = document.getElementById('pzVez'), elMsg = document.getElementById('pzMsg');
  var elAjuda = document.getElementById('pzAjuda'), elResultado = document.getElementById('pzResultado');
  var btSolucao = document.getElementById('pzAjuda'), btDeNovo = document.getElementById('pzDeNovo');
  var moldura = elTab.parentNode;

  // ---------------------------------------------------------------- o puzzle de hoje
  var campos = linha.split('|');
  var PZ = { id: campos[0], fen: campos[1], lances: campos[2].split(' '), rating: Number(campos[3]), temas: campos[4].split(' ') };

  // O nome do golpe, quando o banco diz qual foi (vale o primeiro da lista que o desafio tiver).
  var GOLPES = [
    ['backRankMate', 'Esse é o mate do corredor.'], ['smotheredMate', 'Esse é o mate abafado.'],
    ['doubleCheck', 'Esse golpe se chama xeque duplo.'], ['fork', 'Esse golpe se chama garfo: uma peça atacando duas.'],
    ['pin', 'Esse golpe se chama cravada.'], ['skewer', 'Esse golpe se chama espeto.'],
    ['discoveredAttack', 'Esse golpe se chama ataque descoberto.'], ['deflection', 'Esse golpe se chama desvio.'],
    ['attraction', 'Esse golpe se chama atração.'], ['sacrifice', 'Isso foi um sacrifício: entregar para ganhar mais.'],
    ['trappedPiece', 'A peça ficou presa, sem casa para fugir.'], ['hangingPiece', 'A peça estava solta, sem defesa.'],
    ['promotion', 'O peão chegou lá e virou dama.']
  ];

  // ---------------------------------------------------------------- estado
  var pos, passo, estado, escolhida = -1, alvos = [], erros = 0, usouAjuda = false, virado = false, minhaCor = 'w';
  var pecas = {};          // índice da casa -> elemento da peça
  var casas = [];          // índice da casa -> elemento da casa
  var espera = null;

  function memoria() { try { return JSON.parse(localStorage.getItem('xe.puzzle') || '{}'); } catch (e) { return {}; } }
  function grava(m) { try { localStorage.setItem('xe.puzzle', JSON.stringify(m)); } catch (e) { /* sem armazenamento */ } }

  // ---------------------------------------------------------------- desenho
  function xy(i) { var x = i % 8, y = Math.floor(i / 8); return virado ? [7 - x, 7 - y] : [x, y]; }
  function poe(el, i) { var p = xy(i); el.style.transform = 'translate(' + p[0] * 100 + '%,' + p[1] * 100 + '%)'; }
  function imagem(p) { return 'url(img/pecas-express/' + (p === p.toUpperCase() ? 'w' : 'b') + p.toLowerCase() + '.svg)'; }

  function montaCasas() {
    elCasas.innerHTML = ''; casas = [];
    for (var linha = 0; linha < 8; linha++) for (var col = 0; col < 8; col++) {
      var x = virado ? 7 - col : col, y = virado ? 7 - linha : linha, i = y * 8 + x;
      var c = document.createElement('div');
      c.className = 'casa' + ((x + y) % 2 === 0 ? ' clara' : '');
      if (col === 0) c.innerHTML += '<span class="coord fila">' + (8 - y) + '</span>';
      if (linha === 7) c.innerHTML += '<span class="coord coluna">' + 'abcdefgh'[x] + '</span>';
      elCasas.appendChild(c); casas[i] = c;
    }
  }
  function montaPecas() {
    elPecas.innerHTML = ''; pecas = {};
    for (var i = 0; i < 64; i++) if (pos.casas[i]) criaPeca(i, pos.casas[i]);
  }
  function criaPeca(i, p) {
    var el = document.createElement('div');
    el.className = 'peca ' + (p === p.toUpperCase() ? 'branca' : 'preta') + (X.corDa(p) === minhaCor ? ' minha' : '');
    el.tipo = p.toLowerCase();
    el.style.backgroundImage = imagem(p);
    poe(el, i);
    elPecas.appendChild(el); pecas[i] = el;
    return el;
  }
  function marca(classe, lista) {
    for (var i = 0; i < 64; i++) casas[i].classList.remove(classe);
    (lista || []).forEach(function (i) { if (i >= 0) casas[i].classList.add(classe); });
  }
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

  // Aplica o lance na posição e anima as peças.
  function aplica(l) {
    var el = pecas[l.de], vitima = l.enPassant ? l.para + (pos.vez === 'w' ? 8 : -8) : l.para;
    if (pecas[vitima]) { var morta = pecas[vitima]; morta.classList.add('some'); setTimeout(function () { morta.remove(); }, 420); delete pecas[vitima]; }
    delete pecas[l.de]; pecas[l.para] = el; poe(el, l.para); rastreia(el);
    if (l.roque) {
      var deT = l.roque === 'curto' ? l.para + 1 : l.para - 2, paraT = l.roque === 'curto' ? l.para - 1 : l.para + 1;
      pecas[paraT] = pecas[deT]; delete pecas[deT]; poe(pecas[paraT], paraT); rastreia(pecas[paraT]);
    }
    if (l.promo) el.style.backgroundImage = imagem(pos.vez === 'w' ? l.promo.toUpperCase() : l.promo);
    pos = X.joga(pos, l);
    marca('veio', [l.de]); marca('foi', [l.para]); marca('dica', []); marca('errou', []);
    marca('xeque', X.emXeque(pos) ? [X.casaDoRei(pos, pos.vez)] : []);
    escolhe(-1);
  }

  // ---------------------------------------------------------------- rastro das peças
  // A peça que anda deixa o mesmo rastro que a peça do seu tipo está usando no topo do site
  // naquele momento (js/hero.js desenha e faz o rodízio).
  // A cada quadro medimos onde a peça está na tela, então o rastro acompanha tanto
  // a animação do lance quanto o dedo arrastando.
  var telaRastro = document.getElementById('tabRastro'), ctxRastro = telaRastro && telaRastro.getContext ? telaRastro.getContext('2d') : null;
  var rastros = [], rastroLigado = false, dprRastro = 1, ladoTab = 0;
  var CALMO = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  function rastreia(el) {
    if (!ctxRastro || !window.XE_RASTRO || CALMO || !el) return;
    for (var k = 0; k < rastros.length; k++) if (rastros[k].el === el) { rastros[k].parada = 0; return; }
    var cores = window.XE_RASTRO.cores[el.tipo] || window.XE_RASTRO.cores.p;
    rastros.push({ el: el, pts: [], x: 0, y: 0, rgb: cores.rgb, rgb2: cores.rgb2, fase: Math.random() * 100, parada: 0, novo: true,
      rastro: window.XE_RASTRO.estilo(el.tipo) });
    if (!rastroLigado) {
      var r = elTab.getBoundingClientRect();
      dprRastro = Math.min(window.devicePixelRatio || 1, 2); ladoTab = r.width;
      telaRastro.width = telaRastro.height = Math.round(ladoTab * dprRastro);
      rastroLigado = true; requestAnimationFrame(quadroRastro);
    }
  }
  function quadroRastro(agora) {
    var tab = elTab.getBoundingClientRect(), casa = tab.width / 8;
    ctxRastro.setTransform(dprRastro, 0, 0, dprRastro, 0, 0);
    ctxRastro.clearRect(0, 0, ladoTab, ladoTab);
    for (var k = rastros.length - 1; k >= 0; k--) {
      var t = rastros[k], viva = t.el.isConnected && !t.el.classList.contains('some');
      if (viva) {
        var r = t.el.getBoundingClientRect(), x = r.left + r.width / 2 - tab.left, y = r.top + r.height / 2 - tab.top;
        var andou = t.novo ? 99 : Math.abs(x - t.x) + Math.abs(y - t.y);
        t.x = x; t.y = y; t.novo = false;
        var u = t.pts[t.pts.length - 1];
        if (!u || Math.abs(u.x - x) + Math.abs(u.y - y) >= casa * 0.09) { t.pts.push({ x: x, y: y, r: Math.random() }); if (t.pts.length > 46) t.pts.shift(); }
        t.parada = andou < 0.5 ? t.parada + 1 : 0;
      } else t.parada = 99;
      // parou: o rastro fica um instante à mostra e depois a cauda encolhe até sumir
      if (t.parada > 22) t.pts.shift();
      if (t.pts.length < 3 && t.parada > 22) { rastros.splice(k, 1); continue; }
      window.XE_RASTRO.desenha(ctxRastro, t, casa * 0.34, agora / 1000);
    }
    if (rastros.length) requestAnimationFrame(quadroRastro);
    else { ctxRastro.clearRect(0, 0, ladoTab, ladoTab); rastroLigado = false; }
  }

  // O recado aparece por cima do tabuleiro (é para onde a pessoa está olhando) e some sozinho.
  var somRecado = null;
  function diz(texto, tipo) {
    clearTimeout(somRecado);
    elMsg.textContent = texto; elMsg.className = 'desafio-recado aparece' + (tipo ? ' ' + tipo : '');
    somRecado = setTimeout(function () { elMsg.classList.remove('aparece'); }, 2400);
  }
  function mostraVez() {
    var brancas = minhaCor === 'w', mate = null;
    PZ.temas.forEach(function (t) { var m = /^mateIn(\d)$/.exec(t); if (m) mate = Number(m[1]); });
    var texto = (brancas ? 'Brancas' : 'Pretas') + ' jogam e ' + (mate ? 'dão mate em ' + mate : 'ganham');
    elVez.innerHTML = '<i class="bolinha' + (brancas ? '' : ' pretas') + '"></i><span>' + texto + '</span>';
  }

  // ---------------------------------------------------------------- o jogo
  function comeca() {
    clearTimeout(espera);
    if (erroPendente) { clearTimeout(erroPendente.relogio); erroPendente = null; }
    pos = X.deFEN(PZ.fen);
    minhaCor = pos.vez === 'w' ? 'b' : 'w';
    virado = minhaCor === 'b';
    passo = 0; erros = 0; usouAjuda = false; estado = 'esperando';
    montaCasas(); montaPecas(); mostraVez();
    elResultado.hidden = true; moldura.classList.remove('venceu', 'fim'); elAjuda.hidden = true;
    clearTimeout(fimPendente);
    espera = setTimeout(function () {
      aplica(X.deUCI(pos, PZ.lances[0])); passo = 1; estado = 'jogando';
      diz('Sua vez!');
    }, 800);
  }

  // Lance legal, mas que não é a solução: a peça vai até a casa escolhida (para ficar
  // claro que o lance era possível), a casa fica vermelha e a peça volta sozinha.
  var erroPendente = null;
  function erra(l) {
    erros++;
    var el = pecas[l.de], vitima = pecas[l.enPassant ? l.para + (pos.vez === 'w' ? 8 : -8) : l.para];
    estado = 'voltando';
    escolhe(-1);
    poe(el, l.para); rastreia(el);
    el.classList.add('errada');
    if (vitima) vitima.classList.add('coberta');
    marca('errou', [l.para]);
    diz(erros > 1 ? 'Ainda não. Tenta outro.' : 'Não é esse. Tenta outro.', 'ruim');
    elAjuda.hidden = false;
    erroPendente = { el: el, de: l.de, vitima: vitima, relogio: setTimeout(desfazErro, 950) };
  }
  function desfazErro() {
    if (!erroPendente) return;
    var e = erroPendente; erroPendente = null;
    clearTimeout(e.relogio);
    poe(e.el, e.de); rastreia(e.el);
    e.el.classList.remove('errada');
    if (e.vitima) e.vitima.classList.remove('coberta');
    marca('errou', []);
    if (estado === 'voltando') estado = 'jogando';
  }

  function tenta(de, para) {
    if (estado !== 'jogando') return false;
    var esperado = PZ.lances[passo];
    var opcoes = X.lances(pos).filter(function (l) { return l.de === de && l.para === para; });
    if (!opcoes.length) return false;
    // promoção: usa a peça da solução; fora dela, promove a dama
    var l = opcoes[0];
    if (opcoes.length > 1) {
      var quer = esperado.slice(0, 4) === X.uci(l).slice(0, 4) && esperado[4] ? esperado[4] : 'q';
      opcoes.forEach(function (o) { if (o.promo === quer) l = o; });
    }
    var certo = X.uci(l) === esperado || X.ehMate(X.joga(pos, l));
    if (!certo) { erra(l); return true; }
    aplica(l); passo++;
    if (passo >= PZ.lances.length || X.ehMate(pos)) { vence(); return true; }
    estado = 'esperando';
    diz('Boa! Continua…', 'bom');
    espera = setTimeout(function () {
      aplica(X.deUCI(pos, PZ.lances[passo])); passo++; estado = 'jogando';
      diz('Isso! E agora?', 'bom');
    }, 800);
    return true;
  }

  var fimPendente = null;
  function vence() {
    estado = 'resolvido';
    elAjuda.hidden = true;
    moldura.classList.add('venceu');
    elTab.classList.remove('venceu'); void elTab.offsetWidth; elTab.classList.add('venceu');
    if (!usouAjuda) {
      var m = memoria();
      if (m.ultimo !== hoje) {
        m.sequencia = m.ultimo === hoje - 1 ? (m.sequencia || 0) + 1 : 1;
        m.ultimo = hoje; m.total = (m.total || 0) + 1;
        grava(m);
      }
      diz(X.ehMate(pos) ? 'Xeque-mate!' : 'É isso!', 'bom');
      if (window.XE_festa) window.XE_festa(moldura);
    }
    // um instante para ver o lance final (e o confete), e então o resultado toma o lugar do tabuleiro
    fimPendente = setTimeout(mostraResultado, usouAjuda ? 1300 : 1700);
  }

  // O cartão de resultado: fala conforme a pessoa se saiu e leva ao curso.
  function mostraResultado() {
    var titulo, texto, botao, ordinais = ['', 'segunda', 'terceira', 'quarta', 'quinta'];
    if (usouAjuda) {
      titulo = 'Essa era difícil mesmo.';
      texto = 'Ninguém nasce sabendo esse lance. É um padrão, e padrão se aprende. No Xadrez Express, um por vídeo.';
      botao = 'Quero aprender esses padrões';
    } else if (erros === 0) {
      // "mestre" fica para os dias em que o desafio é difícil de verdade
      titulo = PZ.rating >= 1100 ? 'De primeira. Você jogou como um mestre.' : 'De primeira! Olho afiado.';
      texto = 'Esse olho para a jogada certa dá para treinar. No Xadrez Express você aprende a enxergar lances assim em vídeos de 1 minuto.';
      botao = 'Quero evoluir mais rápido';
    } else {
      titulo = 'Achou! ' + (ordinais[erros] ? 'Na ' + ordinais[erros] + ' tentativa.' : 'Depois de ' + (erros + 1) + ' tentativas.');
      texto = 'Errar antes de acertar é como todo mundo aprende. No curso você conhece os padrões que fazem a jogada certa aparecer de primeira.';
      botao = 'Quero acertar de primeira';
    }
    var golpe = '';
    GOLPES.forEach(function (g) { if (!golpe && PZ.temas.indexOf(g[0]) >= 0) golpe = g[1]; });
    document.getElementById('pzTitulo').textContent = titulo;
    document.getElementById('pzTexto').textContent = texto;
    document.getElementById('pzBotao').textContent = botao;
    var elGolpe = document.getElementById('pzGolpe');
    elGolpe.hidden = !golpe; elGolpe.textContent = golpe;
    var m = memoria(), elSeq = document.getElementById('pzSequencia');
    elSeq.hidden = !(m.ultimo === hoje && m.sequencia > 1);
    elSeq.textContent = '🔥 ' + m.sequencia + ' dias seguidos';
    elMsg.classList.remove('aparece');
    moldura.classList.add('fim');
    elResultado.hidden = false;
  }

  // ---------------------------------------------------------------- "me mostra a jogada" e "jogar de novo"
  btSolucao.addEventListener('click', function () {
    if (estado === 'resolvido' || estado === 'mostrando') return;
    desfazErro();
    clearTimeout(espera);
    usouAjuda = true; estado = 'mostrando';
    elAjuda.hidden = true;
    diz('Olha só:');
    (function proximo() {
      if (passo >= PZ.lances.length) { vence(); return; }
      aplica(X.deUCI(pos, PZ.lances[passo])); passo++;
      espera = setTimeout(proximo, 1100);
    })();
  });
  btDeNovo.addEventListener('click', comeca);

  // ---------------------------------------------------------------- toque e arrasto
  function casaNoPonto(cx, cy) {
    var r = elTab.getBoundingClientRect(), col = Math.floor((cx - r.left) / (r.width / 8)), lin = Math.floor((cy - r.top) / (r.height / 8));
    if (col < 0 || col > 7 || lin < 0 || lin > 7) return -1;
    return virado ? (7 - lin) * 8 + (7 - col) : lin * 8 + col;
  }
  var arrasto = null;
  elPecas.addEventListener('pointerdown', function (ev) {
    if (estado !== 'jogando' || !ev.target.classList.contains('minha')) return;
    var i = casaNoPonto(ev.clientX, ev.clientY);
    if (i < 0 || pecas[i] !== ev.target) return;
    // tocar numa peça minha que é alvo de captura não existe; então é sempre "escolher"
    var jaEra = escolhida === i;
    escolhe(i);
    arrasto = { i: i, el: ev.target, x: ev.clientX, y: ev.clientY, mexeu: false, jaEra: jaEra, id: ev.pointerId };
    try { ev.target.setPointerCapture(ev.pointerId); } catch (e) { /* tudo bem */ }
    ev.preventDefault();
  });
  elPecas.addEventListener('pointermove', function (ev) {
    if (!arrasto || ev.pointerId !== arrasto.id) return;
    var dx = ev.clientX - arrasto.x, dy = ev.clientY - arrasto.y;
    if (!arrasto.mexeu && Math.abs(dx) + Math.abs(dy) < 8) return;
    arrasto.mexeu = true;
    var r = elTab.getBoundingClientRect(), lado = r.width / 8;
    arrasto.el.classList.add('arrastando');
    rastreia(arrasto.el);
    arrasto.el.style.transform = 'translate(' + (ev.clientX - r.left - lado / 2) + 'px,' + (ev.clientY - r.top - lado * (ev.pointerType === 'touch' ? 1.1 : 0.5)) + 'px) scale(' + (ev.pointerType === 'touch' ? 1.5 : 1.1) + ')';
  });
  function solta(ev) {
    if (!arrasto || ev.pointerId !== arrasto.id) return;
    var a = arrasto; arrasto = null;
    a.el.classList.remove('arrastando');
    if (!a.mexeu) { if (a.jaEra) escolhe(-1); return; }
    var para = ev.type === 'pointerup' ? casaNoPonto(ev.clientX, ev.clientY - (ev.pointerType === 'touch' ? elTab.getBoundingClientRect().width / 8 * 0.6 : 0)) : -1;
    if (para < 0 || para === a.i || !tenta(a.i, para)) { poe(a.el, a.i); }
  }
  elPecas.addEventListener('pointerup', solta);
  elPecas.addEventListener('pointercancel', solta);
  // toque numa casa: joga a peça escolhida para lá
  elCasas.addEventListener('click', function (ev) {
    if (estado !== 'jogando' || escolhida < 0) return;
    var i = casaNoPonto(ev.clientX, ev.clientY);
    if (i < 0) return;
    if (!tenta(escolhida, i)) escolhe(-1);
  });
  // capturar: a peça do adversário não recebe o toque (pointer-events), então o clique cai na casa

  // ---------------------------------------------------------------- relógio e compartilhar
  var elRelogio = document.getElementById('pzRelogio');
  function relogio() {
    var a = new Date(), fim = new Date(a.getFullYear(), a.getMonth(), a.getDate() + 1), s = Math.max(0, Math.floor((fim - a) / 1000));
    var dois = function (n) { return (n < 10 ? '0' : '') + n; };
    elRelogio.textContent = dois(Math.floor(s / 3600)) + ':' + dois(Math.floor(s / 60) % 60) + ':' + dois(s % 60);
    // virou o dia com a página aberta: carrega o puzzle novo
    if (numeroDoDia() !== hoje) location.reload();
  }
  setInterval(relogio, 1000); relogio();

  document.getElementById('pzCompartilhar').addEventListener('click', function () {
    var texto = usouAjuda ? 'Olha o desafio de hoje do Xadrez Express. Será que você acha a jogada?' : 'Resolvi o desafio de hoje do Xadrez Express' + (erros === 0 ? ' de primeira' : '') + '! Será que você consegue?';
    if (window.XE_compartilha) window.XE_compartilha(texto, location.origin + location.pathname + '#puzzle', this);
  });

  comeca();

  window.XE_PUZZLE = { hoje: PZ, estado: function () { return estado; } };
  });
})();
