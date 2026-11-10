// Temas de data: Natal, Carnaval, Páscoa... Cada tema é uma "roupa" por cima do
// ponto base (o visual normal do site) e nunca muda os arquivos do base.
//
// QUEM ESCOLHE O TEMA é `tema` em js/config.js:
//   'auto'   o tema entra e sai sozinho, pelo calendário logo abaixo
//   ''       ponto base, sem tema nenhum
//   'natal'  (ou outro nome) força esse tema; com `temaAte: 'AAAA-MM-DD'` ele vale
//            até esse dia e depois o site volta ao automático
//
// PARA ESPIAR sem publicar: ?tema=carnaval mostra um tema, ?tema=base o ponto base,
// e ?dia=2027-02-08 mostra o site como ele estará nesse dia.
//
// PARA CRIAR UM TEMA: uma entrada em TEMAS, uma linha em calendario() e um arquivo
// temas/<nome>.css com as cores (copie um dos que existem). O que é igual em todos
// (cores nas molduras, ícones nos títulos, o que cai do céu) já vem de
// temas/comum.css e js/tema-efeitos.js.
//
// Este arquivo roda no <head>, antes de a página aparecer, para o tema não "piscar".
(function () {
  'use strict';

  //  selo: a frase do topo            voto: a frase do rodapé
  //  chuva: o que cai do céu — 'neve', 'confete' (com `cores`) ou uma lista de símbolos
  //  festaCores / festaGlifos: o confete de quem resolve o puzzle
  //  propulsao: uma propulsão a mais no topo, que já vem escolhida
  //  propulsaoPadrao: qual das propulsões normais já vem escolhida
  //  gorro: as peças do topo voam de gorro
  var TEMAS = {
    'natal': {
      nome: 'Natal', selo: '🎄 Feliz Natal!', voto: '🎅 Feliz Natal e bons lances! 🎄', chuva: 'neve',
      festaCores: ['#ff4d5e', '#35d07f', '#ffd36b', '#ffffff', '#bfe6ff'], festaGlifos: ['❄', '★', '♞', '♛', '♜'],
      propulsao: { id: 'neve', nome: 'Neve', i: '#FFFFFF', e: '#BFE6FF', c1: '#FFFFFF', c2: '#8FC8FF', forma: 1, cone: [0.8, 0.9] },
      gorro: true
    },
    'ano-novo': {
      nome: 'Ano Novo', selo: '🎆 Feliz Ano Novo!', voto: '🥂 Que o ano novo venha cheio de xeque-mates!', chuva: ['✨', '⭐', '🎆'],
      cores: ['#ffd36b', '#ffffff', '#fff2c4'], festaCores: ['#ffd36b', '#ffffff', '#fff2c4', '#ffb53d'], festaGlifos: ['★', '✦', '♛', '♚'],
      propulsaoPadrao: 'estrelas'
    },
    'carnaval': {
      nome: 'Carnaval', selo: '🎭 É Carnaval!', voto: '🎉 Bom Carnaval! O bloco do xadrez não para.', chuva: 'confete',
      cores: ['#ff4fd8', '#ffd36b', '#2ee6ff', '#7cff5a', '#ff9a3d', '#a06bff'],
      festaCores: ['#ff4fd8', '#ffd36b', '#2ee6ff', '#7cff5a', '#ff9a3d', '#a06bff'], propulsaoPadrao: 'arcoiris'
    },
    'pascoa': {
      nome: 'Páscoa', selo: '🐣 Feliz Páscoa!', voto: '🐰 Feliz Páscoa!', chuva: ['🥚', '🐣', '🌷', '🍫'],
      festaCores: ['#ffb3d9', '#b9f2c6', '#fff2a8', '#bfe6ff', '#d8c2ff'], festaGlifos: ['♟', '★', '♞']
    },
    'maes': {
      nome: 'Dia das Mães', selo: '💐 Feliz Dia das Mães!', voto: '💗 Feliz Dia das Mães!', chuva: ['🌸', '💗', '🌷', '💐'],
      festaCores: ['#ff8fc7', '#ffd1e8', '#ffffff', '#ff4fa0'], festaGlifos: ['♛', '♥', '★'], propulsaoPadrao: 'coracoes'
    },
    'junina': {
      nome: 'Festa Junina', selo: '🌽 Arraiá do Xadrez Express', voto: '🔥 Bom São João! Olha o xeque... é mentira!', chuva: ['🌽', '⭐', '🔥', '🎈'],
      festaCores: ['#ff4d5e', '#ffd36b', '#35d07f', '#2ee6ff', '#ff9a3d'], festaGlifos: ['★', '♞', '♜']
    },
    'xadrez': {
      nome: 'Dia Internacional do Xadrez', selo: '♟️ Dia Internacional do Xadrez', voto: '♟️ 20 de julho: Dia Internacional do Xadrez. Hoje a festa é nossa!', chuva: ['♟', '♞', '♝', '♜', '♛', '♚'],
      cores: ['#ffffff', '#ffd36b', '#2ee6ff'], festaCores: ['#ffd36b', '#ffffff', '#2ee6ff', '#a06bff'], propulsaoPadrao: 'estrelas'
    },
    'pais': {
      nome: 'Dia dos Pais', selo: '👔 Feliz Dia dos Pais!', voto: '💙 Feliz Dia dos Pais!', chuva: ['👔', '⭐', '💙', '🏆'],
      festaCores: ['#4a9bff', '#bfe6ff', '#ffffff', '#ffd36b'], festaGlifos: ['♚', '★', '♞']
    },
    'criancas': {
      nome: 'Dia das Crianças', selo: '🎈 Feliz Dia das Crianças!', voto: '🎈 Feliz Dia das Crianças! Xadrez é brincadeira séria.', chuva: ['🎈', '🍭', '⭐', '🧸'],
      festaCores: ['#ff4d5e', '#ffd36b', '#2ee6ff', '#7cff5a', '#ff4fd8'], festaGlifos: ['♞', '★', '♟'], propulsaoPadrao: 'bolhas'
    },
    'halloween': {
      nome: 'Halloween', selo: '🎃 Halloween do Xadrez Express', voto: '👻 Feliz Halloween! Cuidado com o mate do susto.', chuva: ['🎃', '👻', '🦇', '🕷️'],
      festaCores: ['#ff8a1f', '#a06bff', '#7cff5a', '#ffffff'], festaGlifos: ['♞', '★', '♛'], propulsaoPadrao: 'verde'
    },
    'black-friday': {
      nome: 'Black Friday', selo: '🖤 Black Friday', voto: '🖤 Black Friday Xadrez Express', chuva: 'confete',
      cores: ['#ffd36b', '#fff2c4', '#ffb53d', '#ffffff'], festaCores: ['#ffd36b', '#fff2c4', '#ffb53d', '#ffffff'], festaGlifos: ['★', '♛', '♚'],
      propulsaoPadrao: 'estrelas'
    }
  };

  // ---------------------------------------------------------------- calendário
  function d(ano, mes, dia) { return new Date(ano, mes - 1, dia); }
  function mais(data, dias) { return new Date(data.getFullYear(), data.getMonth(), data.getDate() + dias); }
  // domingo de Páscoa (cálculo de Meeus)
  function pascoa(ano) {
    var a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, e = Math.floor(b / 4), f = b % 4,
      g = Math.floor((8 * b + 13) / 25), h = (19 * a + b - e - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
      l = (32 + 2 * f + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 19 * l) / 433),
      mes = Math.floor((h + l - 7 * m + 90) / 25), dia = (h + l - 7 * m + 33 * mes + 19) % 32;
    return d(ano, mes, dia);
  }
  // o enésimo dia da semana do mês (semana: 0 domingo ... 6 sábado)
  function enesimo(ano, mes, semana, n) {
    var primeiro = d(ano, mes, 1), salto = (semana - primeiro.getDay() + 7) % 7;
    return d(ano, mes, 1 + salto + (n - 1) * 7);
  }
  // Quando cada tema fica no ar, do primeiro ao último dia. Vale o primeiro da lista que servir.
  function calendario(ano) {
    var p = pascoa(ano), maes = enesimo(ano, 5, 0, 2), pais = enesimo(ano, 8, 0, 2), black = mais(enesimo(ano, 11, 4, 4), 1);
    return [
      ['ano-novo', d(ano, 1, 1), d(ano, 1, 6)],            // 27 de dezembro a 6 de janeiro
      ['ano-novo', d(ano, 12, 27), d(ano, 12, 31)],
      ['carnaval', mais(p, -51), mais(p, -46)],            // da sexta à quarta-feira de cinzas
      ['pascoa', mais(p, -7), p],                          // a semana da Páscoa
      ['maes', mais(maes, -7), maes],                      // 2º domingo de maio e a semana antes
      ['junina', d(ano, 6, 1), d(ano, 6, 30)],             // junho inteiro
      ['xadrez', d(ano, 7, 14), d(ano, 7, 20)],            // a semana do dia 20 de julho
      ['pais', mais(pais, -7), pais],                      // 2º domingo de agosto e a semana antes
      ['criancas', d(ano, 10, 5), d(ano, 10, 12)],
      ['halloween', d(ano, 10, 25), d(ano, 10, 31)],
      ['black-friday', mais(black, -7), mais(black, 3)],   // a semana da Black Friday até a segunda seguinte
      ['natal', d(ano, 12, 1), d(ano, 12, 26)]
    ];
  }
  function temaDoDia(hoje) {
    var dia = d(hoje.getFullYear(), hoje.getMonth() + 1, hoje.getDate()), lista = calendario(dia.getFullYear());
    for (var k = 0; k < lista.length; k++) if (dia >= lista[k][1] && dia <= lista[k][2]) return lista[k][0];
    return '';
  }
  function deTexto(t) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t || ''); return m ? d(Number(m[1]), Number(m[2]), Number(m[3])) : null; }

  // ---------------------------------------------------------------- qual tema vale agora
  var cfg = window.XE_CONFIG || {}, hoje = new Date();
  var pedeDia = /[?&]dia=(\d{4}-\d{2}-\d{2})/.exec(location.search), pedeTema = /[?&]tema=([a-z0-9-]+)/.exec(location.search);
  if (pedeDia) hoje = deTexto(pedeDia[1]) || hoje;
  var nome = cfg.tema === undefined ? 'auto' : cfg.tema, ate = deTexto(cfg.temaAte);
  if (nome !== 'auto' && nome !== '' && ate && hoje > mais(ate, 0)) nome = 'auto';   // o tema forçado venceu
  if (nome === 'auto') nome = temaDoDia(hoje);
  if (pedeTema) nome = pedeTema[1] === 'base' ? '' : pedeTema[1];

  window.XE_TEMAS = { lista: TEMAS, temaDoDia: temaDoDia, calendario: calendario };
  var tema = TEMAS[nome];
  window.XE_TEMA = tema || {};
  if (!tema) return;

  document.documentElement.setAttribute('data-tema', nome);
  ['temas/comum.css', 'temas/' + nome + '.css'].forEach(function (arquivo) {
    var css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = arquivo;
    document.head.appendChild(css);
  });
  var js = document.createElement('script');
  js.src = 'js/tema-efeitos.js'; js.defer = true;
  document.head.appendChild(js);
})();
