// A seção Aprender: o catálogo, a página de cada card e o player da lição
// (teoria passo a passo, exercícios e avaliação final), com o professor falando.
//
// Endereços (o site fica no GitHub Pages, por isso o "#"):
//   aprender/#/                          catálogo
//   aprender/#/{card}                    página do card, com a lista de lições
//   aprender/#/{card}/{licao}            capa da lição
//   aprender/#/{card}/{licao}/teoria     (ou /exercicios, /avaliacao)
//
// Todo o conteúdo vem de content/aprender/ (ver o README de lá). O progresso fica só
// no aparelho, em localStorage.
(function () {
  'use strict';
  var X = window.Xadrez, Tabuleiro = window.Tabuleiro;
  var CONTEUDO = '../content/aprender/', ASSETS = '../assets/aprender/', PECAS = '../img/pecas-express/';
  var FEN = { vazio: '8/8/8/8/8/8/8/8 w - - 0 1', inicial: X.INICIO };
  var CHAVE = 'xe.aprender';
  var APROVA = 70;
  var app = document.getElementById('app');

  var ACERTOS = ['Isso aí!', 'Mandou bem!', 'Boa! Olho de enxadrista.', 'Exatamente!', 'É isso! Próximo?'];
  var ERROS = ['Não é esse. Olha de novo!', 'Quase! Tenta outro.', 'Hmm, esse não. Respira e procura.', 'Esse não resolve. Tenta mais uma.'];
  function sorteia(lista) { return lista[Math.floor(Math.random() * lista.length)]; }

  // ---------------------------------------------------------------- utilidades
  function el(tag, classe, html) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  // **negrito** e ==destaque== no texto do professor
  function formata(t) { return esc(t || '').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/==(.+?)==/g, '<mark>$1</mark>'); }
  function fen(f) { return FEN[f] || f || FEN.vazio; }
  function oposto(cor) { return cor === 'w' ? 'b' : 'w'; }
  function titulo(t) { document.title = t + ' | Aprender | Xadrez Express'; }

  var cache = {};
  function json(caminho) {
    if (!cache[caminho]) {
      cache[caminho] = fetch(CONTEUDO + caminho).then(function (r) {
        if (!r.ok) throw new Error('sem ' + caminho);
        return r.json();
      });
      cache[caminho].catch(function () { delete cache[caminho]; });
    }
    return cache[caminho];
  }
  function carregaCard(slug) { return json('cards/' + slug + '/card.json'); }
  function carregaLicao(slug, id) { return json('cards/' + slug + '/' + id + '.json'); }

  // relógios e teclas da tela atual: tudo é desligado quando se muda de tela
  var limpezas = [];
  function quandoSair(f) { limpezas.push(f); }
  function depois(f, ms) { var t = setTimeout(f, ms); quandoSair(function () { clearTimeout(t); }); return t; }
  function sai() { limpezas.splice(0).forEach(function (f) { try { f(); } catch (e) { /* tudo bem */ } }); }

  // ---------------------------------------------------------------- progresso (só no aparelho)
  function prog() { try { return JSON.parse(localStorage.getItem(CHAVE) || '{}') || {}; } catch (e) { return {}; } }
  function grava(p) { try { localStorage.setItem(CHAVE, JSON.stringify(p)); } catch (e) { /* modo privado: segue sem gravar */ } }
  function daLicao(card, licao) { return ((prog().cards || {})[card] || {})[licao] || {}; }
  function anota(card, licao, mudanca) {
    var p = prog();
    p.cards = p.cards || {}; p.cards[card] = p.cards[card] || {};
    var l = p.cards[card][licao] = p.cards[card][licao] || {};
    for (var k in mudanca) l[k] = mudanca[k];
    p.ultimo = { card: card, licao: licao };
    grava(p);
  }
  function situacao(card, licao) {
    var l = daLicao(card, licao);
    if (l.avaliacao && l.avaliacao.aprovada) return 'concluida';
    if (l.teoria || l.passo || l.exercicios || l.avaliacao) return 'andamento';
    return 'nova';
  }

  // ---------------------------------------------------------------- avatar e capas
  // As expressões do professor (assets/aprender/avatar/{pose}.webp):
  //   apresentando  abertura e boas-vindas        comemorando  acertos e conquistas
  //   curioso       perguntas e desafios           explicando   regras importantes (a padrão)
  //   surpreso      jogadas inesperadas            pensativo    análise de posições e dicas
  //   atencao       alertas e erros                aprovando    elogios e encerramento
  //   curso         segurando o peão: quando se fala do curso
  // Pose que faltar usa a padrão; sem nenhuma imagem, o desenho provisório.
  var faltam = {};
  function poeAvatar(img, pose) {
    var lista = [pose, 'explicando'].filter(function (p, i, a) { return p && !faltam[p] && a.indexOf(p) === i; });
    (function tenta(k) {
      if (k >= lista.length) { img.onerror = null; img.src = ASSETS + 'avatar/placeholder.svg'; return; }
      img.onerror = function () { faltam[lista[k]] = true; tenta(k + 1); };
      img.src = ASSETS + 'avatar/' + lista[k] + '.webp';
    })(0);
  }
  function avatar(pose, classe) {
    var img = el('img', 'prof-avatar' + (classe ? ' ' + classe : ''));
    img.alt = 'Professor Fhellipe'; img.width = 440; img.height = 440; img.decoding = 'async';
    poeAvatar(img, pose || 'explicando');
    return img;
  }
  // O professor: avatar e balão de fala.
  function professor() {
    var caixa = el('div', 'prof'), img = avatar('explicando'), balao = el('div', 'prof-balao');
    balao.setAttribute('aria-live', 'polite');
    caixa.appendChild(img); caixa.appendChild(balao);
    return {
      el: caixa,
      fala: function (texto, pose) {
        balao.innerHTML = formata(texto);
        poeAvatar(img, pose || 'explicando');
        balao.classList.remove('fala'); void balao.offsetWidth; balao.classList.add('fala');
      }
    };
  }
  // A capa do card (3:4). Sem imagem em assets/aprender/capas/, mostra uma capa provisória com o título.
  function capa(slug, card) {
    var caixa = el('div', 'apr-capa'), chave = 'capa:' + slug;
    function provisoria() {
      caixa.innerHTML = '<div class="apr-capa-falsa"><img src="' + PECAS + (card.peca || 'wn') + '.svg" alt="" width="120" height="120"><b>' + esc(card.titulo) + '</b></div>';
    }
    if (faltam[chave]) { provisoria(); return caixa; }
    var img = el('img');
    img.alt = ''; img.loading = 'lazy'; img.width = 600; img.height = 800;
    img.onerror = function () { faltam[chave] = true; provisoria(); };
    img.src = ASSETS + 'capas/' + (card.capa || slug + '.webp');
    caixa.appendChild(img);
    return caixa;
  }
  function bolinhas(slug, card) {
    return '<span class="apr-bolinhas" aria-label="Progresso">' + card.licoes.map(function (l) {
      return '<i class="' + situacao(slug, l.id) + '"></i>';
    }).join('') + '</span>';
  }
  function falha(texto) {
    app.innerHTML = '';
    var c = el('div', 'apr-vazio');
    c.appendChild(avatar('pensativo'));
    c.appendChild(el('p', '', texto));
    c.appendChild(el('a', 'botao botao-vidro', 'Voltar para o Aprender'));
    c.lastChild.href = '#/';
    app.appendChild(c);
  }

  // ================================================================ catálogo
  function catalogo() {
    titulo('Catálogo');
    app.innerHTML = '';
    app.appendChild(el('header', 'apr-cabeca',
      '<p class="olho">Aprender</p><h1>Aprenda xadrez passo a passo</h1>' +
      '<p class="sub">Lições gratuitas, com o professor Fhellipe explicando cada passo. Um complemento do <a href="../#curso">curso Xadrez Express</a>.</p>'));
    var continua = el('div', 'apr-continuar'); continua.hidden = true;
    var lista = el('div', 'apr-colecoes');
    app.appendChild(continua); app.appendChild(lista);

    json('colecoes.json').then(function (dados) {
      var slugs = [];
      dados.colecoes.forEach(function (c) { c.cards.forEach(function (s) { if (slugs.indexOf(s) < 0) slugs.push(s); }); });
      return Promise.all(slugs.map(function (s) { return carregaCard(s).catch(function () { return null; }); })).then(function (cards) {
        var porSlug = {};
        slugs.forEach(function (s, i) { if (cards[i]) porSlug[s] = cards[i]; });
        dados.colecoes.forEach(function (c) {
          var secao = el('section', 'apr-colecao');
          secao.appendChild(el('h2', '', esc(c.titulo)));
          var grade = el('div', 'apr-grade');
          c.cards.forEach(function (s) {
            var card = porSlug[s];
            if (!card) return;
            var a = el('a', 'apr-card'); a.href = '#/' + s;
            a.appendChild(capa(s, card));
            a.appendChild(el('h3', '', esc(card.titulo)));
            a.appendChild(el('p', 'apr-card-info', card.licoes.length + (card.licoes.length === 1 ? ' lição' : ' lições') + bolinhas(s, card)));
            grade.appendChild(a);
          });
          secao.appendChild(grade);
          lista.appendChild(secao);
        });
        // "Continuar de onde parei"
        var u = prog().ultimo, card = u && porSlug[u.card], lic = card && card.licoes.filter(function (l) { return l.id === u.licao; })[0];
        if (lic) {
          var n = card.licoes.indexOf(lic) + 1;
          continua.innerHTML = '<div><p class="olho">Continuar de onde parei</p><p class="apr-continuar-titulo">' + esc(card.titulo) +
            ' · Lição ' + n + ': ' + esc(lic.titulo) + '</p></div>';
          var b = el('a', 'botao botao-ouro', 'Continuar'); b.href = '#/' + u.card + '/' + u.licao;
          continua.appendChild(b);
          continua.hidden = false;
        }
        if (prog().cards) {
          var zera = el('button', 'apr-zerar', 'Zerar meu progresso'); zera.type = 'button';
          zera.addEventListener('click', function () {
            if (!window.confirm('Apagar todo o seu progresso nas lições? Não dá para desfazer.')) return;
            try { localStorage.removeItem(CHAVE); } catch (e) { /* tudo bem */ }
            catalogo();
          });
          app.appendChild(zera);
        }
      });
    }).catch(function () { falha('Não consegui carregar as lições agora. Confere a internet e tenta de novo.'); });
  }

  // ================================================================ página do card
  function paginaCard(slug) {
    carregaCard(slug).then(function (card) {
      titulo(card.titulo);
      app.innerHTML = '';
      var volta = el('a', 'apr-volta', '‹ Aprender'); volta.href = '#/';
      app.appendChild(volta);
      var topo = el('header', 'apr-card-topo');
      topo.appendChild(capa(slug, card));
      topo.appendChild(el('div', 'apr-card-texto', '<h1>' + esc(card.titulo) + '</h1><p class="sub">' + esc(card.descricao || '') + '</p>' +
        '<p class="apr-card-info">' + card.licoes.length + (card.licoes.length === 1 ? ' lição' : ' lições') + bolinhas(slug, card) + '</p>'));
      app.appendChild(topo);

      var proxima = card.licoes.filter(function (l) { return situacao(slug, l.id) !== 'concluida'; })[0];
      var ol = el('ol', 'apr-licoes');
      card.licoes.forEach(function (l, i) {
        var p = daLicao(slug, l.id), sit = situacao(slug, l.id);
        var li = el('li', 'apr-licao ' + sit + (proxima === l ? ' proxima' : ''));
        var etapas = [['Teoria', p.teoria], ['Exercícios', p.exercicios], ['Avaliação', p.avaliacao && p.avaliacao.aprovada]].map(function (e) {
          return '<span class="' + (e[1] ? 'feita' : '') + '">' + e[0] + (e[1] ? ' ✓' : '') + '</span>';
        }).join('');
        li.innerHTML = '<span class="apr-licao-num">' + (i + 1) + '</span><div class="apr-licao-texto"><h2>' + esc(l.titulo) + '</h2>' +
          '<p class="apr-licao-etapas">' + etapas + '</p></div>';
        var b = el('a', 'botao ' + (proxima === l ? 'botao-ouro' : 'botao-vidro') + ' botao-p', sit === 'concluida' ? 'Rever' : (sit === 'andamento' ? 'Continuar' : 'Começar'));
        b.href = '#/' + slug + '/' + l.id;
        li.appendChild(b);
        ol.appendChild(li);
      });
      app.appendChild(ol);
    }).catch(function () { falha('Não achei esse card. Que tal voltar e escolher outro?'); });
  }

  // ================================================================ a lição
  function licao(slug, id, etapa) {
    Promise.all([carregaCard(slug), carregaLicao(slug, id)]).then(function (r) {
      var card = r[0], L = r[1];
      var n = card.licoes.map(function (l) { return l.id; }).indexOf(id) + 1;
      var ctx = { slug: slug, id: id, card: card, L: L, n: n, base: '#/' + slug + '/' + id };
      titulo('Lição ' + n + ': ' + L.titulo);
      app.innerHTML = '';
      var p = daLicao(slug, id);
      var topo = el('nav', 'licao-topo', '<a class="apr-volta" href="#/' + slug + '">‹ ' + esc(card.titulo) + '</a>' +
        '<span>Lição ' + n + ' · ' + esc(L.titulo) + '</span>');
      app.appendChild(topo);
      var abas = el('nav', 'licao-etapas');
      abas.setAttribute('aria-label', 'Etapas da lição');
      [['teoria', 'Teoria', p.teoria], ['exercicios', 'Exercícios', p.exercicios], ['avaliacao', 'Avaliação Final', p.avaliacao && p.avaliacao.aprovada]].forEach(function (e) {
        var a = el('a', (etapa === e[0] ? 'atual' : '') + (e[2] ? ' feita' : ''), e[1] + (e[2] ? ' <i>✓</i>' : ''));
        a.href = ctx.base + '/' + e[0];
        if (etapa === e[0]) a.setAttribute('aria-current', 'step');
        abas.appendChild(a);
      });
      app.appendChild(abas);
      ctx.corpo = el('div', 'licao-corpo');
      app.appendChild(ctx.corpo);
      if (etapa === 'teoria') teoria(ctx);
      else if (etapa === 'exercicios') exercicios(ctx);
      else if (etapa === 'avaliacao') avaliacao(ctx);
      else capaLicao(ctx);
    }).catch(function () { falha('Não achei essa lição. Que tal voltar e escolher outra?'); });
  }

  function capaLicao(ctx) {
    var p = daLicao(ctx.slug, ctx.id), c = el('div', 'licao-capa');
    c.appendChild(avatar('apresentando', 'grande'));
    var texto = el('div', 'licao-capa-texto', '<p class="olho">Lição ' + ctx.n + '</p><h1>' + esc(ctx.L.titulo) + '</h1>' +
      (ctx.L.abertura ? '<p class="sub">' + formata(ctx.L.abertura) + '</p>' : '') +
      '<p class="licao-capa-etapas"><span>Teoria</span><span>Exercícios</span><span>Avaliação Final</span></p>');
    var b = el('a', 'botao botao-ouro botao-g', p.passo && !p.teoria ? 'Continuar' : 'Começar');
    b.href = ctx.base + '/teoria';
    texto.appendChild(b);
    c.appendChild(texto);
    ctx.corpo.appendChild(c);
    b.focus({ preventScroll: true });
  }

  // O palco: tabuleiro de um lado, faixa, professor e botões do outro (embaixo, no celular).
  function palco(ctx) {
    var p = el('div', 'palco'), tab = el('div', 'palco-tab'), lado = el('div', 'palco-lado');
    var moldura = el('div'); tab.appendChild(moldura);
    p.appendChild(tab); p.appendChild(lado);
    ctx.corpo.appendChild(p);
    return { el: p, tab: tab, lado: lado, tabuleiro: new Tabuleiro(moldura, { pecas: PECAS }), moldura: moldura };
  }
  function botao(texto, classe, aoClicar) {
    var b = el('button', 'botao ' + (classe || 'botao-vidro'), texto);
    b.type = 'button';
    if (aoClicar) b.addEventListener('click', aoClicar);
    return b;
  }
  // Garante que o tabuleiro inteiro está à vista (no celular, o botão "Próximo" fica embaixo
  // e a página pode ter rolado, deixando o topo do tabuleiro atrás do cabeçalho fixo).
  function mostraTabuleiro(P) {
    var r = P.moldura.getBoundingClientRect(), topo = document.querySelector('.topo').getBoundingClientRect().bottom + 8;
    if (r.top < topo || r.bottom > window.innerHeight) {
      var alvo = window.scrollY + r.top - topo;
      window.scrollTo({ top: Math.max(0, alvo), behavior: 'smooth' });
    }
  }
  function vez(cor) { return '<i class="bolinha' + (cor === 'b' ? ' pretas' : '') + '"></i>' + (cor === 'b' ? 'Pretas jogam' : 'Brancas jogam'); }
  function selo(moldura) {
    var s = el('div', 'tab-certo', '✓');
    moldura.appendChild(s);
    depois(function () { s.remove(); }, 1300);
  }

  // ================================================================ etapa 1: teoria
  function teoria(ctx) {
    var passos = ctx.L.teoria, salvo = daLicao(ctx.slug, ctx.id);
    var i = salvo.teoria ? 0 : Math.min(salvo.passo || 0, passos.length - 1);
    var P = palco(ctx), T = P.tabuleiro, prof = professor(), feitos = {}, errosNoPasso = 0, vezDoPasso = 0;
    var contador = el('p', 'passo-contador'), barra = el('div', 'passo-barra', '<i></i>');
    var nav = el('div', 'passo-nav');
    var antes = botao('‹', 'botao-vidro passo-volta', function () { mostra(i - 1); });
    antes.setAttribute('aria-label', 'Passo anterior');
    var segue = botao('Próximo ›', 'botao-ouro passo-segue', function () {
      if (segue.disabled) return;
      if (i < passos.length - 1) mostra(i + 1);
      else { anota(ctx.slug, ctx.id, { teoria: true, passo: 0 }); location.hash = ctx.base + '/exercicios'; }
    });
    nav.appendChild(antes); nav.appendChild(segue);
    P.lado.appendChild(contador); P.lado.appendChild(barra); P.lado.appendChild(prof.el); P.lado.appendChild(nav);

    function libera(sim) { segue.disabled = !sim; segue.classList.toggle('pulsa', sim && passos[i].interativo && feitos[i]); }
    function mostra(k) {
      if (k < 0 || k >= passos.length) return;
      i = k; vezDoPasso++; errosNoPasso = 0;
      var meu = vezDoPasso, passo = passos[i];
      if (!salvo.teoria) anota(ctx.slug, ctx.id, { passo: i });
      contador.textContent = 'Passo ' + (i + 1) + ' / ' + passos.length;
      barra.firstChild.style.width = ((i + 1) / passos.length * 100) + '%';
      antes.disabled = i === 0;
      segue.textContent = i === passos.length - 1 ? 'Ir para os exercícios ›' : 'Próximo ›';
      T.modo('nenhum');
      T.posicao(fen(passo.fen), passo.lado || 'w');
      mostraTabuleiro(P);
      prof.fala(passo.texto, passo.pose);
      var marcas = { destaques: passo.destaques, setas: passo.setas, rotulos: passo.rotulos };
      var lances = (passo.animacao || []).slice();
      (function anima() {
        if (meu !== vezDoPasso) return;
        if (!lances.length) { T.desenho(marcas); return; }
        depois(function () { if (meu === vezDoPasso) T.joga(lances.shift(), anima); }, 650);
      })();
      var it = passo.interativo;
      libera(!it || feitos[i]);
      if (!it) return;
      function acertou() {
        feitos[i] = true;
        T.modo('nenhum');
        prof.fala(it.acerto || sorteia(ACERTOS), 'comemorando');
        libera(true);
        segue.focus({ preventScroll: true });
      }
      function errou(texto) {
        errosNoPasso++;
        prof.fala(it.erro || texto, 'atencao');
        // travou duas vezes: o professor mostra o caminho
        if (errosNoPasso >= 2) {
          if (it.casa) T.marcaCasas('dica', [it.casa]);
          else T.desenho({ setas: [{ de: it.lance.slice(0, 2), para: it.lance.slice(2, 4), cor: 'verde' }] });
        }
      }
      if (it.casa) {
        T.modo('casa', { aoTocar: function (c) {
          if (c === it.casa) { T.marcaCasas('dica', []); T.marcaCasas('certa', [c]); acertou(); return; }
          T.marcaCasas('errou', [c]);
          depois(function () { T.marcaCasas('errou', []); }, 700);
          errou('Essa é a ==' + c + '==. Quase! Tenta de novo.');
        } });
      } else if (it.lance) {
        var antesDoLance = T.estado(), certoDa = X.deUCI(antesDoLance, it.lance), daMate = certoDa && X.ehMate(X.joga(antesDoLance, certoDa));
        T.modo('lance', { cor: antesDoLance.vez, aoTentar: function (l) {
          var depoisDoLance = X.joga(T.estado(), l);
          if (X.uci(l) === it.lance || (daMate && X.ehMate(depoisDoLance))) { T.aplica(l); acertou(); }
          else { T.erra(l); errou(sorteia(ERROS)); }
        } });
      }
    }
    function tecla(ev) {
      if (ev.target.closest && ev.target.closest('input,textarea')) return;
      if (ev.key === 'ArrowRight' && !segue.disabled) segue.click();
      if (ev.key === 'ArrowLeft') mostra(i - 1);
    }
    document.addEventListener('keydown', tecla);
    quandoSair(function () { document.removeEventListener('keydown', tecla); });
    mostra(i);
  }

  // ================================================================ etapa 2: exercícios
  function exercicios(ctx, fila) {
    var EX = ctx.L.exercicios || { itens: [] }, itens = EX.itens;
    if (!itens.length) { ctx.corpo.appendChild(el('p', 'sub', 'Esta lição não tem exercícios. Siga para a avaliação.')); return; }
    fila = fila || itens.map(function (_, k) { return k; });
    var resultados = {}, pos = 0, item, linha, passo, erros, viu, dicas, terminou, vezDoItem = 0;
    var faixa = el('div', 'ex-faixa'), instr = el('p', 'ex-instrucao'), quem = el('p', 'ex-vez');
    faixa.appendChild(instr); faixa.appendChild(quem);
    var trilha = el('ol', 'ex-trilha');
    trilha.setAttribute('aria-label', 'Exercícios');
    fila.forEach(function (k, j) { var b = el('li', '', String(j + 1)); trilha.appendChild(b); });
    ctx.corpo.appendChild(trilha);
    var P = palco(ctx), T = P.tabuleiro, prof = professor();
    var acoes = el('div', 'ex-acoes');
    var bDica = botao('💡 Dica', 'botao-vidro', dica), bSolucao = botao('Ver solução', 'botao-vidro', verSolucao);
    var bProximo = botao('Próximo ›', 'botao-ouro', proximo);
    acoes.appendChild(bDica); acoes.appendChild(bSolucao); acoes.appendChild(bProximo);
    P.lado.appendChild(faixa); P.lado.appendChild(prof.el); P.lado.appendChild(acoes);

    function marcaTrilha() {
      Array.prototype.forEach.call(trilha.children, function (b, j) {
        var r = resultados[fila[j]];
        b.className = (j === pos ? 'atual' : '') + (r === 'certo' ? ' certo' : (r === 'errado' ? ' errado' : ''));
        b.textContent = r === 'certo' ? '✓' : (r === 'errado' ? '✗' : String(j + 1));
      });
    }
    function estadoBotoes() {
      bProximo.hidden = !terminou;
      bDica.hidden = bSolucao.hidden = terminou;
      bProximo.textContent = pos === fila.length - 1 ? 'Ver resultado ›' : 'Próximo ›';
    }
    function carrega(j) {
      pos = j; vezDoItem++; item = itens[fila[j]];
      erros = 0; viu = false; dicas = 0; terminou = false; passo = 0;
      var meu = vezDoItem;
      marcaTrilha(); estadoBotoes();
      mostraTabuleiro(P);
      instr.textContent = item.pergunta || item.instrucao || EX.instrucao || 'Faça o melhor lance';
      if (item.tipo === 'casa') {
        quem.innerHTML = '';
        T.posicao(fen(item.fen), item.lado || 'w');
        prof.fala(j === 0 ? 'Bora! Toque na casa certa.' : 'Próximo. Toque na casa certa.', 'curioso');
        T.modo('casa', { aoTocar: tocou });
        return;
      }
      linha = item.tipo === 'lichess' ? item.lances : item.solucao;
      var inicio = X.deFEN(item.fen), cor = item.tipo === 'lichess' ? oposto(inicio.vez) : inicio.vez;
      quem.innerHTML = vez(cor);
      T.posicao(item.fen, cor);
      T.modo('nenhum');
      prof.fala(item.tipo === 'lichess' ? 'O adversário acabou de jogar. Agora é você.' : 'Sua vez. Ache o lance.', 'curioso');
      if (item.tipo === 'lichess') {
        depois(function () { if (meu === vezDoItem) T.joga(linha[0], function () { passo = 1; suaVez(); }); }, 650);
      } else suaVez();
    }
    function suaVez() { T.modo('lance', { cor: T.estado().vez, aoTentar: tentou }); }
    function tentou(l) {
      var antes = T.estado(), esperado = linha[passo], depoisDoLance = X.joga(antes, l);
      if (X.uci(l) === esperado || X.ehMate(depoisDoLance)) {
        T.aplica(l);
        if (X.ehMate(depoisDoLance) || passo + 1 >= linha.length) { acertou(); return; }
        passo++;
        T.modo('nenhum');
        prof.fala('Boa! Continua...', 'comemorando');
        var meu = vezDoItem;
        depois(function () { if (meu === vezDoItem) T.joga(linha[passo], function () { passo++; suaVez(); }); }, 600);
        return;
      }
      T.erra(l);
      errou();
    }
    function tocou(c) {
      if ((item.resposta || []).indexOf(c) >= 0) { T.marcaCasas('dica', []); T.marcaCasas('certa', [c]); acertou(); return; }
      T.marcaCasas('errou', [c]);
      depois(function () { T.marcaCasas('errou', []); }, 700);
      errou('Essa é a ==' + c + '==. ' + sorteia(ERROS));
    }
    function errou(texto) {
      erros++;
      if (!resultados[fila[pos]]) { resultados[fila[pos]] = 'errado'; marcaTrilha(); }
      prof.fala(texto || sorteia(ERROS), 'atencao');
    }
    function acertou() {
      terminou = true;
      T.modo('nenhum');
      if (!erros && !viu) resultados[fila[pos]] = 'certo';
      marcaTrilha(); estadoBotoes();
      selo(P.moldura);
      prof.fala(erros ? 'Achou! Errar antes faz parte do caminho.' : sorteia(ACERTOS), 'comemorando');
      bProximo.focus({ preventScroll: true });
    }
    function dica() {
      dicas++;
      if (item.tipo === 'casa') {
        if (dicas === 1 && item.dica) prof.fala(item.dica, 'pensativo');
        else { T.marcaCasas('dica', item.resposta); prof.fala('Olha a casa piscando.', 'explicando'); }
        return;
      }
      var e = linha[passo];
      if (dicas === 1) { T.marcaCasas('dica', [e.slice(0, 2)]); prof.fala(item.dica || 'Olha bem para esta peça.', 'pensativo'); }
      else { T.desenho({ setas: [{ de: e.slice(0, 2), para: e.slice(2, 4), cor: 'verde' }] }); prof.fala('A seta mostra o caminho.', 'explicando'); }
    }
    function verSolucao() {
      viu = true; resultados[fila[pos]] = 'errado';
      terminou = true; estadoBotoes(); marcaTrilha();
      vezDoItem++;
      var meu = vezDoItem;
      T.modo('nenhum');
      if (item.tipo === 'casa') {
        T.marcaCasas('certa', item.resposta);
        prof.fala('Era ' + (item.resposta.length > 1 ? 'qualquer uma destas: ' : 'esta: ') + '==' + item.resposta.join('==, ==') + '==.', 'explicando');
        return;
      }
      var inicio = X.deFEN(item.fen), cor = item.tipo === 'lichess' ? oposto(inicio.vez) : inicio.vez, lances = linha.slice(), texto = [];
      T.posicao(item.fen, cor);
      var p = inicio;
      linha.forEach(function (u, k) {
        var l = X.deUCI(p, u);
        if (!(item.tipo === 'lichess' && k === 0)) texto.push(Tabuleiro.lancePT(p, l));
        p = X.joga(p, l);
      });
      prof.fala('Olha só: ==' + texto.join(' ') + '==', 'explicando');
      (function anima() {
        if (meu !== vezDoItem || !lances.length) return;
        depois(function () { if (meu === vezDoItem) T.joga(lances.shift(), anima); }, 700);
      })();
    }
    function proximo() {
      if (pos < fila.length - 1) { carrega(pos + 1); return; }
      resumo();
    }
    function resumo() {
      var certos = fila.filter(function (k) { return resultados[k] === 'certo'; }).length;
      var errados = fila.filter(function (k) { return resultados[k] !== 'certo'; });
      var completo = fila.length === itens.length;
      if (completo) anota(ctx.slug, ctx.id, { exercicios: { primeira: certos, total: fila.length } });
      else anota(ctx.slug, ctx.id, { exercicios: daLicao(ctx.slug, ctx.id).exercicios || { primeira: 0, total: itens.length } });
      sai();
      ctx.corpo.innerHTML = '';
      var c = el('div', 'resumo');
      c.appendChild(avatar(certos === fila.length ? 'comemorando' : (certos >= fila.length / 2 ? 'aprovando' : 'pensativo'), 'grande'));
      var t = el('div', 'resumo-texto', '<p class="olho">Exercícios</p><h2>' + certos + ' de ' + fila.length + ' de primeira</h2>' +
        '<p class="sub">' + (certos === fila.length ? 'Perfeito! Você está pronto para a avaliação.' :
          (certos >= fila.length / 2 ? 'Mandou bem! Quer refazer os que errou antes da avaliação?' : 'Errar faz parte. Refazer os que errou ajuda a fixar.')) + '</p>');
      var bs = el('div', 'resumo-botoes');
      if (errados.length) bs.appendChild(botao('Refazer os que errei', 'botao-vidro', function () { ctx.corpo.innerHTML = ''; exercicios(ctx, errados); }));
      var av = el('a', 'botao botao-ouro', 'Ir para a Avaliação Final ›'); av.href = ctx.base + '/avaliacao';
      bs.appendChild(av);
      t.appendChild(bs);
      c.appendChild(t);
      ctx.corpo.appendChild(c);
    }
    carrega(0);
  }

  // ================================================================ etapa 3: avaliação final
  function avaliacao(ctx) {
    var Q = ctx.L.avaliacao || [], k = 0, certas = [], vezDaQuestao = 0;
    if (!Q.length) { ctx.corpo.appendChild(el('p', 'sub', 'Esta lição não tem avaliação.')); return; }
    function questao() {
      sai();
      if (k > 0) window.scrollTo({ top: 0 });
      vezDaQuestao++;
      var q = Q[k], meu = vezDaQuestao;
      ctx.corpo.innerHTML = '';
      var topo = el('div', 'av-topo', '<p class="olho">Avaliação Final</p><p class="av-conta">Questão ' + (k + 1) + ' de ' + Q.length + '</p>');
      var barra = el('div', 'passo-barra', '<i style="width:' + (k / Q.length * 100) + '%"></i>');
      ctx.corpo.appendChild(topo); ctx.corpo.appendChild(barra);
      var segue = botao(k === Q.length - 1 ? 'Ver resultado ›' : 'Próxima ›', 'botao-ouro', function () { k++; if (k < Q.length) questao(); else resultado(); });
      segue.hidden = true;
      function registra(certo, resposta) {
        certas[k] = { certo: certo, resposta: resposta, q: q };
        segue.hidden = false;
        segue.focus({ preventScroll: true });
      }

      if (q.tipo === 'multipla') {
        var caixa = el('div', 'av-multipla');
        caixa.appendChild(el('h2', 'av-pergunta', formata(q.pergunta)));
        var ops = el('div', 'av-opcoes'), expl = el('p', 'av-explicacao');
        expl.hidden = true;
        q.opcoes.forEach(function (texto, j) {
          var b = botao('<b>' + 'ABCD'[j] + '</b><span>' + esc(texto) + '</span>', 'av-opcao', function () {
            Array.prototype.forEach.call(ops.children, function (o, m) { o.disabled = true; if (m === q.correta) o.classList.add('certa'); });
            if (j !== q.correta) b.classList.add('errada');
            expl.innerHTML = (j === q.correta ? '<b>Certo!</b> ' : '<b>Não é essa.</b> ') + formata(q.explicacao || '');
            expl.hidden = false;
            registra(j === q.correta, q.opcoes[q.correta]);
          });
          ops.appendChild(b);
        });
        caixa.appendChild(ops); caixa.appendChild(expl);
        caixa.appendChild(segue);
        ctx.corpo.appendChild(caixa);
        return;
      }

      var P = palco(ctx), T = P.tabuleiro, prof = professor();
      var faixa = el('div', 'ex-faixa'), instr = el('p', 'ex-instrucao', formata(q.pergunta || 'Faça o melhor lance')), quem = el('p', 'ex-vez');
      faixa.appendChild(instr); faixa.appendChild(quem);
      P.lado.appendChild(faixa); P.lado.appendChild(prof.el); P.lado.appendChild(segue);
      mostraTabuleiro(P);
      if (q.tipo === 'casa') {
        T.posicao(fen(q.fen), q.lado || 'w');
        prof.fala('Sem dica agora: uma tentativa só. Capricha!', 'curioso');
        T.modo('casa', { aoTocar: function (c) {
          T.modo('nenhum');
          var ok = (q.resposta || []).indexOf(c) >= 0;
          T.marcaCasas(ok ? 'certa' : 'errou', [c]);
          if (!ok) T.marcaCasas('dica', q.resposta);
          prof.fala((ok ? '**Certo!** ' : '**Não é essa.** A resposta era ==' + q.resposta.join('== ou ==') + '==. ') + (q.explicacao || ''), ok ? 'comemorando' : 'atencao');
          registra(ok, q.resposta.join(' ou '));
        } });
        return;
      }
      // questão de lance (do Lichess ou escrita à mão)
      var linha = q.tipo === 'lichess' ? q.lances : q.solucao, inicio = X.deFEN(q.fen);
      var cor = q.tipo === 'lichess' ? oposto(inicio.vez) : inicio.vez, passo = 0;
      quem.innerHTML = vez(cor);
      T.posicao(q.fen, cor);
      prof.fala('Sem dica agora: uma tentativa só. Capricha!', 'curioso');
      function suaVez() { T.modo('lance', { cor: cor, aoTentar: tentou }); }
      function respostaCerta() {
        var p = T.estado(), l = X.deUCI(p, linha[passo]);
        return l ? Tabuleiro.lancePT(p, l) : linha[passo];
      }
      function tentou(l) {
        var antes = T.estado(), depoisDoLance = X.joga(antes, l);
        if (X.uci(l) === linha[passo] || X.ehMate(depoisDoLance)) {
          T.aplica(l);
          if (X.ehMate(depoisDoLance) || passo + 1 >= linha.length) {
            T.modo('nenhum'); selo(P.moldura);
            prof.fala('**Certo!** ' + (q.explicacao || 'Mandou bem.'), 'comemorando');
            registra(true, Tabuleiro.lancePT(antes, l));
            return;
          }
          passo++;
          T.modo('nenhum');
          depois(function () { if (meu === vezDaQuestao) T.joga(linha[passo], function () { passo++; suaVez(); }); }, 600);
          return;
        }
        var certo = respostaCerta(), e = linha[passo];
        T.modo('nenhum');
        T.erra(l, function () { if (meu === vezDaQuestao) T.desenho({ setas: [{ de: e.slice(0, 2), para: e.slice(2, 4), cor: 'verde' }] }); });
        prof.fala('**Não é esse.** A jogada era ==' + certo + '==. ' + (q.explicacao || ''), 'atencao');
        registra(false, certo);
      }
      if (q.tipo === 'lichess') depois(function () { if (meu === vezDaQuestao) T.joga(linha[0], function () { passo = 1; suaVez(); }); }, 650);
      else suaVez();
    }

    function resultado() {
      sai();
      var acertos = certas.filter(function (c) { return c && c.certo; }).length;
      var nota = Math.round(acertos / Q.length * 100), aprovada = nota >= APROVA;
      var antes = daLicao(ctx.slug, ctx.id).avaliacao || {};
      anota(ctx.slug, ctx.id, { avaliacao: { nota: Math.max(nota, antes.nota || 0), aprovada: aprovada || !!antes.aprovada } });
      ctx.corpo.innerHTML = '';
      var c = el('div', 'resumo' + (aprovada ? ' aprovado' : ''));
      c.appendChild(avatar(aprovada ? 'curso' : 'pensativo', 'grande'));
      var prox = ctx.card.licoes[ctx.n];
      var t = el('div', 'resumo-texto', '<p class="olho">Avaliação Final</p><h2 class="av-nota">' + nota + '%</h2>' +
        '<p class="av-acertos">' + acertos + ' de ' + Q.length + ' certas</p>' +
        '<p class="sub">' + (aprovada ? '**Lição concluída!** Você mandou muito bem.' : 'Quase lá! Para concluir a lição, precisa de ' + APROVA + '%. Uma revisada na teoria e você passa.') + '</p>');
      t.lastChild.innerHTML = formata(t.lastChild.textContent);
      var bs = el('div', 'resumo-botoes');
      if (aprovada) {
        if (prox) { var a = el('a', 'botao botao-ouro', 'Próxima lição: ' + esc(prox.titulo) + ' ›'); a.href = '#/' + ctx.slug + '/' + prox.id; bs.appendChild(a); }
        var v = el('a', 'botao botao-vidro', 'Voltar para ' + esc(ctx.card.titulo)); v.href = '#/' + ctx.slug; bs.appendChild(v);
      } else {
        var rev = el('a', 'botao botao-vidro', 'Revisar a teoria'); rev.href = ctx.base + '/teoria'; bs.appendChild(rev);
        bs.appendChild(botao('Refazer avaliação', 'botao-ouro', function () { k = 0; certas = []; questao(); }));
      }
      t.appendChild(bs);
      if (aprovada) t.appendChild(el('p', 'resumo-curso', 'Quer ir mais longe? As videoaulas do <a href="../#curso">curso Xadrez Express</a> ensinam em 1 minuto o que levaria uma tarde.'));
      c.appendChild(t);
      ctx.corpo.appendChild(c);
      var erradas = certas.filter(function (x) { return x && !x.certo; });
      if (erradas.length) {
        var rv = el('section', 'av-revisao', '<h3>Revisão das que errou</h3>');
        erradas.forEach(function (x) {
          rv.appendChild(el('div', 'av-revisao-item', '<p class="av-revisao-pergunta">' + formata(x.q.pergunta || 'Faça o melhor lance') + '</p>' +
            '<p><b>Resposta certa:</b> ' + esc(x.resposta) + '</p>' + (x.q.explicacao ? '<p>' + formata(x.q.explicacao) + '</p>' : '')));
        });
        ctx.corpo.appendChild(rv);
      }
    }
    questao();
  }

  // ================================================================ rotas
  function rota() {
    sai();
    var partes = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    window.scrollTo(0, 0);
    if (!partes.length) catalogo();
    else if (partes.length === 1) paginaCard(partes[0]);
    else licao(partes[0], partes[1], partes[2] || '');
  }
  window.addEventListener('hashchange', rota);
  rota();

  // para os testes automáticos olharem o progresso
  window.XE_APRENDER = { progresso: prog };
})();
