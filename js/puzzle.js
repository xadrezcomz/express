// O puzzle do dia: um exercício por dia, tirado de dados/puzzles.js (banco do Lichess).
//
// No banco, a posição (FEN) vem um lance ANTES do exercício: o primeiro lance da
// lista é do adversário, e só então é a vez de quem resolve. Como no Lichess,
// vale o lance previsto ou qualquer lance que dê xeque-mate.
(function () {
  'use strict';
  var X = window.Xadrez, BANCO = window.XE_PUZZLES;
  var elTab = document.getElementById('tabuleiro');
  if (!X || !BANCO || !BANCO.length || !elTab) return;

  var elCasas = document.getElementById('casas'), elPecas = document.getElementById('pecas');
  var elVez = document.getElementById('pzVez'), elMsg = document.getElementById('pzMsg');
  var elVitoria = document.getElementById('pzVitoria'), elVitoriaTexto = document.getElementById('pzVitoriaTexto');
  var btDica = document.getElementById('pzDica'), btSolucao = document.getElementById('pzSolucao'), btDeNovo = document.getElementById('pzDeNovo');
  var moldura = elTab.parentNode;

  // ---------------------------------------------------------------- o puzzle de hoje
  // Dia 0 = segunda-feira, 5 de janeiro de 2026 (a dificuldade do banco sobe de segunda a domingo).
  function numeroDoDia(data) {
    var d = data || new Date();
    return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(2026, 0, 5)) / 86400000);
  }
  var hoje = numeroDoDia();
  var campos = BANCO[((hoje % BANCO.length) + BANCO.length) % BANCO.length].split('|');
  var PZ = { id: campos[0], fen: campos[1], lances: campos[2].split(' '), rating: Number(campos[3]), temas: campos[4].split(' ') };

  var TEMAS = {
    fork: 'garfo', pin: 'cravada', skewer: 'espeto', discoveredAttack: 'ataque descoberto', doubleCheck: 'xeque duplo',
    hangingPiece: 'peça pendurada', backRankMate: 'mate do corredor', smotheredMate: 'mate abafado', sacrifice: 'sacrifício',
    deflection: 'desvio', attraction: 'atração', trappedPiece: 'peça presa', promotion: 'promoção', capturingDefender: 'eliminar o defensor',
    intermezzo: 'lance intermediário', xRayAttack: 'raio X', zugzwang: 'zugzwang', quietMove: 'lance silencioso', clearance: 'liberação',
    interference: 'interferência', exposedKing: 'rei exposto', kingsideAttack: 'ataque na ala do rei', queensideAttack: 'ataque na ala da dama',
    advancedPawn: 'peão avançado', attackingF2F7: 'ataque em f2/f7', defensiveMove: 'lance defensivo'
  };

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
  // A peça que anda deixa o rastro escolhido no topo do site (js/hero.js desenha).
  // A cada quadro medimos onde a peça está na tela, então o rastro acompanha tanto
  // a animação do lance quanto o dedo arrastando.
  var telaRastro = document.getElementById('tabRastro'), ctxRastro = telaRastro && telaRastro.getContext ? telaRastro.getContext('2d') : null;
  var rastros = [], rastroLigado = false, dprRastro = 1, ladoTab = 0;
  var CALMO = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  function rastreia(el) {
    if (!ctxRastro || !window.XE_RASTRO || CALMO || !el) return;
    for (var k = 0; k < rastros.length; k++) if (rastros[k].el === el) { rastros[k].parada = 0; return; }
    var cores = window.XE_RASTRO.cores[el.tipo] || window.XE_RASTRO.cores.p;
    rastros.push({ el: el, pts: [], x: 0, y: 0, rgb: cores.rgb, rgb2: cores.rgb2, fase: Math.random() * 100, parada: 0, novo: true });
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

  function diz(texto, tipo) { elMsg.textContent = texto; elMsg.className = 'puzzle-msg' + (tipo ? ' ' + tipo : ''); }
  function mostraVez() {
    var brancas = minhaCor === 'w', mate = null;
    PZ.temas.forEach(function (t) { var m = /^mateIn(\d)$/.exec(t); if (m) mate = Number(m[1]); });
    var texto = (brancas ? 'Brancas' : 'Pretas') + ' jogam e ' + (mate ? 'dão mate em ' + mate : 'ganham');
    elVez.innerHTML = '<i class="bolinha' + (brancas ? '' : ' pretas') + '"></i><span>' + texto + '</span>';
  }

  // ---------------------------------------------------------------- o jogo
  function comeca() {
    clearTimeout(espera);
    pos = X.deFEN(PZ.fen);
    minhaCor = pos.vez === 'w' ? 'b' : 'w';
    virado = minhaCor === 'b';
    passo = 0; erros = 0; usouAjuda = false; estado = 'esperando';
    montaCasas(); montaPecas(); mostraVez();
    elVitoria.hidden = true; moldura.classList.remove('venceu');
    btDica.disabled = btSolucao.disabled = false;
    diz('O adversário acabou de jogar…');
    espera = setTimeout(function () {
      aplica(X.deUCI(pos, PZ.lances[0])); passo = 1; estado = 'jogando';
      diz(memoria().ultimo === hoje ? 'Você já resolveu o de hoje ✓ Quer jogar de novo?' : 'Sua vez! Ache o melhor lance.', memoria().ultimo === hoje ? 'bom' : '');
    }, 800);
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
    if (!certo) {
      erros++;
      marca('errou', [para]);
      var el = pecas[de];
      if (el) { poe(el, de); el.classList.remove('treme'); void el.offsetWidth; el.classList.add('treme'); }
      diz(erros > 1 ? 'Ainda não. Que tal pedir uma dica?' : 'Não é esse. Tente outro lance!', 'ruim');
      escolhe(-1);
      setTimeout(function () { marca('errou', []); }, 700);
      return true;
    }
    aplica(l); passo++;
    if (passo >= PZ.lances.length || X.ehMate(pos)) { vence(); return true; }
    estado = 'esperando';
    diz('Boa! Continue…', 'bom');
    espera = setTimeout(function () {
      aplica(X.deUCI(pos, PZ.lances[passo])); passo++; estado = 'jogando';
      diz('Isso! E agora?', 'bom');
    }, 800);
    return true;
  }

  function vence() {
    estado = 'resolvido';
    btDica.disabled = btSolucao.disabled = true;
    moldura.classList.add('venceu');
    elTab.classList.remove('venceu'); void elTab.offsetWidth; elTab.classList.add('venceu');
    var tema = null;
    PZ.temas.forEach(function (t) { if (!tema && TEMAS[t]) tema = TEMAS[t]; });
    if (usouAjuda) {
      diz('Essa foi a solução. Amanhã tem outro!', 'bom');
      elVitoriaTexto.textContent = '';
      return;
    }
    var m = memoria();
    if (m.ultimo !== hoje) {
      m.sequencia = m.ultimo === hoje - 1 ? (m.sequencia || 0) + 1 : 1;
      m.ultimo = hoje; m.total = (m.total || 0) + 1;
      grava(m);
    }
    mostraSequencia();
    diz(X.ehMate(pos) ? 'Xeque-mate!' : 'Puzzle resolvido!', 'bom');
    elVitoriaTexto.textContent = (erros === 0 ? 'De primeira! ' : 'Você resolveu o puzzle de hoje. ') +
      (tema ? 'O tema era: ' + tema + '. ' : '') +
      (m.sequencia > 1 ? 'Já são ' + m.sequencia + ' dias seguidos!' : 'Volte amanhã para manter a sequência.');
    elVitoria.hidden = false;
    if (window.XE_festa) window.XE_festa(moldura);
  }

  function mostraSequencia() {
    var m = memoria(), el = document.getElementById('pzSequencia');
    var viva = m.ultimo === hoje || m.ultimo === hoje - 1;
    if (viva && m.sequencia > 0) { el.hidden = false; el.textContent = '🔥 ' + m.sequencia + (m.sequencia > 1 ? ' dias seguidos' : ' dia'); }
    else el.hidden = true;
  }

  // ---------------------------------------------------------------- botões
  btDica.addEventListener('click', function () {
    if (estado !== 'jogando') return;
    var l = X.deUCI(pos, PZ.lances[passo]);
    var jaTem = casas[l.de].classList.contains('dica');
    marca('dica', jaTem ? [l.de, l.para] : [l.de]);
    diz(jaTem ? 'A peça vai para a casa marcada.' : 'Olhe bem para a peça marcada…');
  });
  btSolucao.addEventListener('click', function () {
    if (estado === 'resolvido') return;
    clearTimeout(espera);
    usouAjuda = true; estado = 'mostrando';
    btDica.disabled = btSolucao.disabled = true;
    diz('Veja a solução:');
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

  // ---------------------------------------------------------------- cabeçalho e relógio
  var nivel = PZ.rating < 950 ? 'Fácil' : (PZ.rating < 1250 ? 'Médio' : 'Difícil');
  document.getElementById('pzNivel').textContent = 'Nível: ' + nivel;
  document.getElementById('pzData').textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  document.getElementById('pzLichess').href = 'https://lichess.org/training/' + PZ.id;

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
    var texto = 'Resolvi o puzzle do dia do Xadrez Express' + (erros === 0 ? ' de primeira' : '') + '! Será que você consegue?';
    if (window.XE_compartilha) window.XE_compartilha(texto, location.origin + location.pathname + '#puzzle', this);
  });

  mostraSequencia();
  comeca();

  window.XE_PUZZLE = { hoje: PZ, estado: function () { return estado; } };
})();
