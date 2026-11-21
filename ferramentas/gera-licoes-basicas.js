// Gera as lições 2 a 11 do card "Aprendendo Xadrez" (content/aprender/), a partir das apostilas.
// As casas destacadas e as setas de movimento são calculadas pelas regras (js/xadrez.js).
// Depois de gerar, rode node ferramentas/valida-aprender.js (ele confere todas as lições).
//   node ferramentas/gera-licoes-basicas.js
const fs = require('fs');
const path = require('path');
const RAIZ = path.join(__dirname, '..') + '/';
const X = require(RAIZ + 'js/xadrez.js');
const PASTA = RAIZ + 'content/aprender/cards/aprendendo-xadrez/';

// casas para onde a peça da casa `c` pode ir (lances legais; a casa de um rei nunca conta)
function vai(fen, c) {
  const p = X.deFEN(fen), i = X.casaParaIndice(c);
  return [...new Set(X.lances(p).filter(l => l.de === i && !/k/i.test(l.captura || '')).map(l => X.indiceParaCasa(l.para)))];
}
// setas de movimento: uma por direção, até a última casa que a peça alcança naquela direção
function raios(fen, c, cor) {
  const alvo = new Set(vai(fen, c)), x0 = 'abcdefgh'.indexOf(c[0]), y0 = Number(c[1]), setas = [];
  for (const [dx, dy] of [[0, 1], [0, -1], [-1, 0], [1, 0], [-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    let x = x0 + dx, y = y0 + dy, fim = null;
    while (x >= 0 && x < 8 && y >= 1 && y <= 8 && alvo.has('abcdefgh'[x] + y)) { fim = 'abcdefgh'[x] + y; x += dx; y += dy; }
    if (fim) setas.push({ de: c, para: fim, cor: cor || 'azul' });
  }
  return setas;
}
const passo = (fen, texto, extra) => Object.assign({ fen, texto }, extra || {});
const verde = casas => [{ casas, cor: 'verde' }];
const mc = (pergunta, opcoes, correta, explicacao, extra) => Object.assign({ tipo: 'multipla', pergunta, opcoes, correta, explicacao }, extra || {});
const casa = (fen, pergunta, resposta, dica, explicacao) => Object.assign({ tipo: 'casa', fen, pergunta, resposta }, dica ? { dica } : {}, explicacao ? { explicacao } : {});
// "toque numa casa onde a peça de `origem` pode ir": a resposta são todas as casas que ela alcança
const casaPeca = (fen, pergunta, origem, dica, explicacao) => Object.assign(casa(fen, pergunta, vai(fen, origem), dica, explicacao), { origem });
const lance = (fen, pergunta, solucao, dica, explicacao) => Object.assign({ tipo: 'autoral', fen, pergunta, solucao }, dica ? { dica } : {}, explicacao ? { explicacao } : {});

const L = {};

// ================================================================ 2. A Torre
{
  const T = '1k6/8/8/8/3R4/8/7K/8 w - - 0 1';
  const B = '7k/8/3p4/8/3R1P2/8/8/7K w - - 0 1';
  L['licao-02'] = { titulo: 'A Torre', abertura: 'Agora as peças entram em cena. A primeira é a torre: forte, direta e sem curvas.',
    teoria: [
      passo(T, 'Hora de conhecer as peças! Começamos pela **torre**: forte, direta e sem curvas.', { pose: 'apresentando' }),
      passo(T, 'A torre anda em **linha reta**: pelas colunas e pelas fileiras, quantas casas quiser.', { destaques: verde(vai(T, 'd4')) }),
      passo(T, 'Para cima, para baixo e para os lados. Daqui de d4 ela alcança **14 casas**.', { setas: raios(T, 'd4') }),
      passo(T, 'Sua vez: leve a torre até a casa ==d8==.', { pose: 'curioso', interativo: { lance: 'd4d8', acerto: 'Isso! Reta para cima, sem parar no caminho.' } }),
      passo(B, 'A torre **não pula** peças. O peão branco em f4 trava o caminho para a direita, e o peão preto em d6 pode ser **capturado**.', { pose: 'atencao', destaques: verde(vai(B, 'd4')) }),
      passo(B, 'Capture o peão preto em ==d6==.', { pose: 'curioso', interativo: { lance: 'd4d6', acerto: 'Capturou! A torre ocupa a casa e o peão sai do tabuleiro.' } }),
      passo('inicial', 'No começo da partida, as torres ficam nos **cantos**: a1 e h1 para as brancas, a8 e h8 para as pretas.', { destaques: [{ casas: ['a1', 'h1', 'a8', 'h8'], cor: 'amarelo' }] }),
      passo('7k/8/8/8/8/8/7K/R7 w - - 0 1', 'Curiosidade: num tabuleiro vazio, a torre alcança sempre **14 casas**, esteja no canto ou no centro.', { pose: 'surpreso', destaques: verde(vai('7k/8/8/8/8/8/7K/R7 w - - 0 1', 'a1')) }),
      passo(T, 'Resumo: linha reta, quantas casas quiser, sem pular ninguém. Bora praticar?', { pose: 'aprovando' })
    ],
    exercicios: { instrucao: 'Movimento da torre', itens: [
      casaPeca('7k/8/8/8/2R5/8/8/7K w - - 0 1', 'Toque numa casa onde a torre pode ir', 'c4', 'Olhe a coluna c e a fileira 4.'),
      lance('7k/8/8/1r6/8/8/8/1R5K w - - 0 1', 'Capture a torre preta', ['b1b5'], 'As duas torres estão na mesma coluna.'),
      casaPeca('7k/8/8/2p5/8/2R1P3/8/7K w - - 0 1', 'Toque numa casa onde a torre pode ir', 'c3', 'O peão branco trava a fileira; o preto pode ser capturado.'),
      lance('6k1/8/8/3n4/8/8/8/R6K w - - 0 1', 'Leve a torre até a8 num lance só', ['a1a8'], 'Coluna a, de baixo até em cima.'),
      lance('7k/8/8/8/1n2R3/8/8/7K w - - 0 1', 'Capture o cavalo preto', ['e4b4'], 'O cavalo está na mesma fileira da torre.')
    ] },
    avaliacao: [
      mc('Como a torre se move?', ['Em diagonal', 'Em linha reta, pelas colunas e fileiras', 'Em L', 'Uma casa por vez'], 1, 'Linha reta, quantas casas quiser.'),
      casaPeca('7k/8/8/4R3/8/8/8/7K w - - 0 1', 'Toque numa casa onde a torre pode ir', 'e5', 'Qualquer casa da coluna e ou da fileira 5.'),
      mc('A torre pode pular outras peças?', ['Sim, sempre', 'Não', 'Só as peças amigas', 'Só no primeiro lance'], 1, 'Quem pula é só o cavalo.'),
      lance('7k/8/8/6q1/8/8/8/6RK w - - 0 1', 'Capture a dama preta', ['g1g5'], null, 'A torre sobe pela coluna g e captura.'),
      mc('Onde ficam as torres no começo da partida?', ['No centro', 'Nos cantos', 'Ao lado do rei', 'Na frente dos peões'], 1, 'Nos quatro cantos: a1, h1, a8 e h8.'),
      mc('Num tabuleiro vazio, quantas casas a torre alcança?', ['8', '12', '14', '16'], 2, 'Sempre 14: 7 na coluna e 7 na fileira.')
    ] };
}

// ================================================================ 3. O Bispo
{
  const T = '1k6/8/8/8/3B4/8/7K/8 w - - 0 1';
  const B = '7k/8/1p6/8/3B4/4P3/8/7K w - - 0 1';
  L['licao-03'] = { titulo: 'O Bispo', abertura: 'O bispo é o dono das diagonais. Ele corre longe, mas tem um segredo: nunca troca de cor.',
    teoria: [
      passo(T, 'Agora é a vez do **bispo**, o dono das diagonais.', { pose: 'apresentando' }),
      passo(T, 'O bispo anda na **diagonal**, quantas casas quiser.', { destaques: verde(vai(T, 'd4')) }),
      passo(T, 'São quatro direções inclinadas, como um X. Daqui de d4 ele alcança 13 casas.', { setas: raios(T, 'd4') }),
      passo(T, 'Sua vez: leve o bispo até ==a7==.', { pose: 'curioso', interativo: { lance: 'd4a7', acerto: 'Isso! Diagonal certinha.' } }),
      passo(T, 'Repare: o bispo em d4 só pisa em casas **escuras**. Ele nunca muda de cor, a partida inteira.', { pose: 'atencao', destaques: verde(vai(T, 'd4')) }),
      passo('inicial', 'Por isso cada lado tem dois bispos: um das casas **claras** e um das casas **escuras**. Eles começam ao lado do rei e da dama.', { destaques: [{ casas: ['c1', 'f1', 'c8', 'f8'], cor: 'amarelo' }] }),
      passo(B, 'Como a torre, o bispo **não pula**. O peão branco em e3 trava uma diagonal, e o peão preto em b6 pode ser capturado.', { pose: 'atencao', destaques: verde(vai(B, 'd4')) }),
      passo(B, 'Capture o peão preto em ==b6==.', { pose: 'curioso', interativo: { lance: 'd4b6', acerto: 'Capturou! Na diagonal, sem pular ninguém.' } }),
      passo(T, 'Resumo: diagonal, quantas casas quiser, sempre na mesma cor. Bora praticar?', { pose: 'aprovando' })
    ],
    exercicios: { instrucao: 'Movimento do bispo', itens: [
      casaPeca('7k/8/8/8/4B3/8/8/7K w - - 0 1', 'Toque numa casa onde o bispo pode ir', 'e4', 'Pense em um X saindo do bispo.'),
      lance('7k/8/8/5r2/8/8/8/1B5K w - - 0 1', 'Capture a torre preta', ['b1f5'], 'Siga a diagonal que sobe para a direita.'),
      mc('O bispo em e4 está numa casa clara. Ele pode chegar em uma casa escura?', ['Sim', 'Não', 'Só capturando', 'Só no fim da partida'], 1, 'O bispo nunca troca de cor.', { fen: '7k/8/8/8/4B3/8/8/7K w - - 0 1' }),
      casaPeca('7k/8/5p2/8/3B4/2P5/8/7K w - - 0 1', 'Toque numa casa onde o bispo pode ir', 'd4', 'O peão branco atrapalha; o preto pode ser capturado.'),
      lance('6k1/8/8/8/8/8/1q6/B6K w - - 0 1', 'Capture a dama preta', ['a1b2'], 'Ela está logo ali, na diagonal.')
    ] },
    avaliacao: [
      mc('Como o bispo se move?', ['Em linha reta', 'Na diagonal', 'Em L', 'Uma casa por vez'], 1, 'Diagonal, quantas casas quiser.'),
      casaPeca('7k/8/8/2B5/8/8/8/7K w - - 0 1', 'Toque numa casa onde o bispo pode ir', 'c5', 'As quatro diagonais que saem de c5.'),
      mc('Um bispo que começa numa casa escura...', ['Fica sempre em casas escuras', 'Alterna entre claras e escuras', 'Vai para as claras depois de capturar', 'Pode escolher a cor'], 0, 'O bispo nunca troca de cor.'),
      lance('7k/8/8/8/4n3/8/8/1B5K w - - 0 1', 'Capture o cavalo preto', ['b1e4'], null, 'Diagonal de b1 até e4.'),
      mc('Quantos bispos cada lado tem no começo?', ['1', '2', '3', '4'], 1, 'Dois: um de casas claras e um de casas escuras.'),
      mc('O bispo pode pular outras peças?', ['Sim', 'Não', 'Só peões', 'Só peças amigas'], 1, 'Só o cavalo pula.')
    ] };
}

// ================================================================ 4. A Dama
{
  const T = '1k6/8/8/8/3Q4/8/7K/8 w - - 0 1';
  L['licao-04'] = { titulo: 'A Dama', abertura: 'A dama é a peça mais poderosa do tabuleiro. E você já sabe metade do segredo dela.',
    teoria: [
      passo(T, 'Chegou a peça mais poderosa: a **dama**.', { pose: 'apresentando' }),
      passo(T, 'O segredo é simples: a dama anda como a **torre** e como o **bispo** juntos. Linha reta ou diagonal, quantas casas quiser.', { destaques: verde(vai(T, 'd4')) }),
      passo(T, 'São oito direções. Do centro, ela alcança **27 casas**!', { pose: 'surpreso', setas: raios(T, 'd4') }),
      passo(T, 'Sua vez: leve a dama até ==g7==, na diagonal.', { pose: 'curioso', interativo: { lance: 'd4g7', acerto: 'Isso! Diagonal, como um bispo.' } }),
      passo(T, 'Agora até ==a4==, em linha reta.', { pose: 'curioso', interativo: { lance: 'd4a4', acerto: 'Perfeito! Reta, como uma torre.' } }),
      passo('7k/8/1p6/8/3Q1P2/8/8/7K w - - 0 1', 'Ela também **não pula** ninguém, e captura do mesmo jeito que anda.', { pose: 'atencao', destaques: verde(vai('7k/8/1p6/8/3Q1P2/8/8/7K w - - 0 1', 'd4')) }),
      passo('inicial', 'Na posição inicial, lembra da regra? **Dama na sua cor**: a branca em d1, numa casa clara, e a preta em d8, numa casa escura.', { pose: 'atencao', destaques: [{ casas: ['d1', 'd8'], cor: 'amarelo' }] }),
      passo(T, 'Por ser tão forte, a dama vale muito. Cuidado para não perdê-la cedo! Bora praticar?', { pose: 'aprovando' })
    ],
    exercicios: { instrucao: 'Movimento da dama', itens: [
      casaPeca('7k/8/8/8/2Q5/8/8/7K w - - 0 1', 'Toque numa casa onde a dama pode ir', 'c4', 'Linhas retas e diagonais.'),
      lance('6k1/8/8/8/8/8/8/Q2r3K w - - 0 1', 'Capture a torre preta', ['a1d1'], 'Ela está na mesma fileira.'),
      lance('7k/8/2n5/8/8/8/8/Q6K w - - 0 1', 'Capture o cavalo preto', ['a1c3', 'h8g8', 'c3c6'].slice(0, 0).concat([]).length ? [] : null, null)
    ] },
    avaliacao: []
  };
  // o 3º exercício: cavalo em f6, na diagonal da dama
  L['licao-04'].exercicios.itens[2] = lance('7k/8/5n2/8/8/8/8/Q6K w - - 0 1', 'Capture o cavalo preto', ['a1f6'], 'Siga a grande diagonal.');
  L['licao-04'].exercicios.itens.push(
    casaPeca('7k/8/1P6/8/3Q4/8/5p2/7K w - - 0 1', 'Toque numa casa onde a dama pode ir', 'd4', 'O peão branco trava; o preto pode ser capturado.'),
    mc('Qual peça se move como torre e bispo juntos?', ['O rei', 'A dama', 'O cavalo', 'O peão'], 1, 'A dama soma os dois movimentos.')
  );
  L['licao-04'].avaliacao = [
    mc('A dama se move como...', ['Só a torre', 'Só o bispo', 'Torre e bispo juntos', 'O cavalo'], 2, 'Linha reta e diagonal.'),
    casaPeca('7k/8/8/8/5Q2/8/8/7K w - - 0 1', 'Toque numa casa onde a dama pode ir', 'f4', 'Oito direções saindo de f4.'),
    mc('Onde começa a dama branca?', ['d1, numa casa clara', 'e1, numa casa escura', 'd8', 'c1'], 0, 'Dama na sua cor: branca em d1.'),
    lance('6k1/8/8/8/8/2b5/8/6KQ w - - 0 1', 'Capture o bispo preto', ['h1c6'].slice(0, 0).length ? [] : ['h1c6'], null, 'Diagonal longa até c6.'),
    mc('Do centro de um tabuleiro vazio, quantas casas a dama alcança?', ['14', '13', '27', '8'], 2, '14 como torre mais 13 como bispo.'),
    mc('A dama pode pular peças?', ['Sim', 'Não'], 1, 'Nem a dama pula. Só o cavalo.')
  ];
  // o bispo do 4º item fica em c6, na diagonal de h1
  L['licao-04'].avaliacao[3] = lance('6k1/8/2b5/8/8/8/8/6KQ w - - 0 1', 'Capture o bispo preto', ['h1c6'], null, 'Diagonal longa de h1 até c6.');
}

// ================================================================ 5. O Rei
{
  const T = '8/8/8/8/3K4/8/8/7k w - - 0 1';
  L['licao-05'] = { titulo: 'O Rei', abertura: 'O rei é lento, mas é a peça mais importante. Se ele cair, a partida acaba.',
    teoria: [
      passo(T, 'Agora a peça mais importante de todas: o **rei**.', { pose: 'apresentando' }),
      passo(T, 'O rei anda **uma casa** em qualquer direção: para frente, para trás, para os lados e na diagonal.', { destaques: verde(vai(T, 'd4')) }),
      passo(T, 'Sua vez: leve o rei até ==e5==.', { pose: 'curioso', interativo: { lance: 'd4e5', acerto: 'Isso! Uma casinha, na diagonal.' } }),
      passo('8/8/8/8/3K4/8/8/4r2k w - - 0 1', 'Regra de ouro: o rei **nunca** pode ir para uma casa atacada. A torre preta ataca toda a coluna e, então e3, e4 e e5 estão proibidas.', { pose: 'atencao', destaques: [{ casas: vai('8/8/8/8/3K4/8/8/4r2k w - - 0 1', 'd4'), cor: 'verde' }, { casas: ['e3', 'e4', 'e5'], cor: 'vermelho' }] }),
      passo('8/8/8/3k4/8/3K4/8/8 w - - 0 1', 'Por isso, os dois reis nunca ficam lado a lado: sempre sobra pelo menos **uma casa** entre eles.', { pose: 'atencao', destaques: [{ casas: ['c4', 'd4', 'e4'], cor: 'vermelho' }] }),
      passo('inicial', 'No começo, o rei branco fica em ==e1== e o preto em ==e8==, ao lado da dama.', { destaques: [{ casas: ['e1', 'e8'], cor: 'amarelo' }] }),
      passo(T, 'O rei não pode ser capturado: quando ele é atacado e não tem saída, é **xeque-mate** e a partida acaba. Vamos ver isso mais à frente.', { pose: 'pensativo' }),
      passo(T, 'Resumo: uma casa por vez, em qualquer direção, e nunca para uma casa atacada. Bora praticar?', { pose: 'aprovando' })
    ],
    exercicios: { instrucao: 'Movimento do rei', itens: [
      casaPeca('8/8/8/8/2K5/8/8/7k w - - 0 1', 'Toque numa casa onde o rei pode ir', 'c4', 'Só uma casinha, para qualquer lado.'),
      lance('7k/8/8/8/8/2p5/2K5/8 w - - 0 1', 'Capture o peão preto com o rei', ['c2c3'], 'Ele está colado no rei.'),
      casaPeca('8/8/8/4r3/2K5/8/8/7k w - - 0 1', 'Toque numa casa segura para o rei', 'c4', 'A torre preta ataca a coluna e e a fileira 5.'),
      mc('O rei em d3 pode ir para d4?', ['Sim', 'Não, porque o rei preto vigia d4'], 1, 'Os reis nunca ficam lado a lado.', { fen: '8/8/8/3k4/8/3K4/8/8 w - - 0 1' }),
      lance('7k/8/8/8/8/8/1q6/K7 w - - 0 1', 'O rei pode capturar a dama? Faça isso!', ['a1b2'], 'A dama está sem proteção, colada no rei.')
    ] },
    avaliacao: [
      mc('Como o rei se move?', ['Uma casa em qualquer direção', 'Em L', 'Na diagonal, quantas casas quiser', 'Só para frente'], 0, 'Uma casinha, para qualquer lado.'),
      casaPeca('8/8/8/5K2/8/8/8/k7 w - - 0 1', 'Toque numa casa onde o rei pode ir', 'f5', 'As oito casas em volta.'),
      mc('O rei pode ir para uma casa atacada?', ['Sim', 'Não', 'Só se capturar', 'Só no começo'], 1, 'Nunca. Esse lance não é permitido.'),
      casaPeca('8/8/8/8/3K4/8/8/6rk w - - 0 1', 'Toque numa casa segura para o rei', 'd4', 'A torre preta só ataca a coluna g e a fileira 1.'),
      mc('Onde começa o rei branco?', ['d1', 'e1', 'e8', 'f1'], 1, 'Em e1, ao lado da dama.'),
      mc('O que acontece quando o rei é atacado e não tem saída?', ['Ele é capturado', 'É xeque-mate e a partida acaba', 'Ele volta para e1', 'Nada'], 1, 'O rei nunca é capturado: é xeque-mate.')
    ] };
}

// ================================================================ 6. O Cavalo
{
  const T = '1k6/8/8/8/3N4/8/7K/8 w - - 0 1';
  const J = '7k/8/8/2ppp3/2pNp3/2ppp3/8/7K w - - 0 1';
  L['licao-06'] = { titulo: 'O Cavalo', abertura: 'O cavalo é a peça mais diferente do xadrez: anda em L e é o único que pula.',
    teoria: [
      passo(T, 'Agora a peça mais curiosa do tabuleiro: o **cavalo**.', { pose: 'apresentando' }),
      passo(T, 'Ele anda em **L**: duas casas numa direção e mais uma para o lado.', { destaques: verde(vai(T, 'd4')) }),
      passo(T, 'Do centro, o cavalo alcança **8 casas**. Por exemplo, um L de d4 até e6: duas casas para cima e uma para o lado.', { setas: [{ de: 'd4', para: 'e6', cor: 'azul' }], destaques: verde(vai(T, 'd4')) }),
      passo(T, 'Sua vez: leve o cavalo até ==f5==.', { pose: 'curioso', interativo: { lance: 'd4f5', acerto: 'Isso! Duas para o lado e uma para cima.' } }),
      passo(J, 'E a grande surpresa: o cavalo é a **única peça que pula** as outras. Mesmo cercado, ele escapa!', { pose: 'surpreso', destaques: verde(vai(J, 'd4')) }),
      passo(J, 'Pule por cima dos peões até ==e6==.', { pose: 'curioso', interativo: { lance: 'd4e6', acerto: 'Pulou! E repare: ele não captura quem fica no caminho.' } }),
      passo(T, 'Um detalhe: a cada salto o cavalo **troca de cor**. Saiu de uma casa escura, cai numa clara, e vice-versa.', { pose: 'atencao', destaques: verde(vai(T, 'd4')) }),
      passo('7k/8/8/8/8/8/8/N6K w - - 0 1', 'No canto, ele fica fraco: só **2 casas**. Cavalo gosta do centro!', { pose: 'pensativo', destaques: verde(vai('7k/8/8/8/8/8/8/N6K w - - 0 1', 'a1')) }),
      passo('inicial', 'Na posição inicial, os cavalos ficam ao lado das torres: b1 e g1, b8 e g8. Bora praticar?', { pose: 'aprovando', destaques: [{ casas: ['b1', 'g1', 'b8', 'g8'], cor: 'amarelo' }] })
    ],
    exercicios: { instrucao: 'Movimento do cavalo', itens: [
      casaPeca('7k/8/8/8/4N3/8/8/7K w - - 0 1', 'Toque numa casa onde o cavalo pode ir', 'e4', 'Duas casas numa direção e uma para o lado.'),
      lance('7k/8/8/2r5/8/1N6/8/7K w - - 0 1', 'Capture a torre preta', ['b3c5'], 'Um L para cima e para a direita.'),
      casaPeca('7k/8/8/8/8/8/8/6NK w - - 0 1', 'Toque numa casa onde o cavalo pode ir', 'g1', 'Perto da borda, sobram poucas casas.'),
      lance('7k/8/3q4/2ppp3/2pNp3/2ppp3/8/7K w - - 0 1', 'Pule e capture a dama preta', [], 'O cavalo pula os peões.'),
      mc('Qual é a única peça que pode pular outras?', ['A torre', 'O cavalo', 'A dama', 'O rei'], 1, 'Só o cavalo pula.')
    ] },
    avaliacao: [
      mc('Como o cavalo se move?', ['Em linha reta', 'Na diagonal', 'Em L', 'Uma casa por vez'], 2, 'Duas casas e mais uma para o lado.'),
      casaPeca('7k/8/8/5N2/8/8/8/7K w - - 0 1', 'Toque numa casa onde o cavalo pode ir', 'f5', 'Oito casas em L.'),
      mc('O cavalo pode pular outras peças?', ['Sim', 'Não'], 0, 'É a única peça que pula.'),
      lance('7k/8/8/8/8/5b2/8/4N2K w - - 0 1', 'Capture o bispo preto', ['e1f3'], null, 'Um L de e1 até f3.'),
      mc('Um cavalo numa casa clara, depois de um lance, fica numa casa...', ['Clara', 'Escura', 'Da mesma cor', 'Depende'], 1, 'Ele troca de cor a cada salto.'),
      mc('Onde o cavalo é mais forte?', ['No canto', 'Na borda', 'No centro'], 2, 'No centro ele alcança 8 casas; no canto, só 2.')
    ] };
  // o cavalo de d4 alcança a dama em ... ajusta: dama em e6
  L['licao-06'].exercicios.itens[3] = lance('7k/8/4q3/2ppp3/2pNp3/2ppp3/8/7K w - - 0 1', 'Pule e capture a dama preta', ['d4e6'], 'O cavalo pula os peões.');
}

// ================================================================ 7. O Peão
{
  L['licao-07'] = { titulo: 'O Peão', abertura: 'O peão é pequeno, mas é a alma do xadrez. Ele tem regras só dele.',
    teoria: [
      passo('inicial', 'Agora o soldado do tabuleiro: o **peão**. Cada lado começa com oito, na segunda fileira.', { pose: 'apresentando', destaques: [{ casas: ['a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2'], cor: 'amarelo' }] }),
      passo('7k/8/8/8/8/8/4P3/7K w - - 0 1', 'O peão anda **para frente**, uma casa. Mas no primeiro lance dele, pode andar **duas**.', { destaques: verde(['e3', 'e4']) }),
      passo('7k/8/8/8/8/8/4P3/7K w - - 0 1', 'Sua vez: avance o peão duas casas, até ==e4==.', { pose: 'curioso', interativo: { lance: 'e2e4', acerto: 'Isso! Primeiro lance, duas casas.' } }),
      passo('7k/8/8/8/4P3/8/8/7K w - - 0 1', 'Depois do primeiro lance, é **uma casa por vez**. E atenção: o peão **nunca anda para trás**.', { pose: 'atencao', destaques: verde(['e5']) }),
      passo('7k/8/8/4p3/4P3/8/8/7K w - - 0 1', 'Se tiver uma peça na frente, o peão fica **travado**: ele não captura para frente.', { pose: 'atencao', destaques: [{ casas: ['e5'], cor: 'vermelho' }] }),
      passo('7k/8/8/3n1r2/4P3/8/8/7K w - - 0 1', 'O peão **captura na diagonal**, uma casa à frente. Daqui ele pode tomar o cavalo ou a torre.', { pose: 'surpreso', setas: [{ de: 'e4', para: 'd5', cor: 'vermelho' }, { de: 'e4', para: 'f5', cor: 'vermelho' }] }),
      passo('7k/8/8/3n1r2/4P3/8/8/7K w - - 0 1', 'Capture a **torre**, que vale mais.', { pose: 'curioso', interativo: { lance: 'e4f5', acerto: 'Boa escolha! A torre vale mais que o cavalo.' } }),
      passo('7k/8/8/3pP3/8/8/8/7K w - d6 0 1', 'Uma regra especial: o **en passant**. O peão preto acabou de andar duas casas e parou ao lado do branco. O branco pode capturá-lo como se ele tivesse andado só uma.', { pose: 'surpreso', setas: [{ de: 'e5', para: 'd6', cor: 'vermelho' }] }),
      passo('7k/8/8/3pP3/8/8/8/7K w - d6 0 1', 'Capture en passant: leve o peão de ==e5== para ==d6==.', { pose: 'curioso', interativo: { lance: 'e5d6', acerto: 'Isso! O peão preto sai do tabuleiro, mesmo sem estar em d6.' } }),
      passo('7k/8/8/8/4P3/8/8/7K w - - 0 1', 'Resumo: para frente, duas casas no primeiro lance, captura na diagonal e nunca volta. Bora praticar?', { pose: 'aprovando' })
    ],
    exercicios: { instrucao: 'Movimento do peão', itens: [
      casaPeca('7k/8/8/8/8/8/3P4/7K w - - 0 1', 'Toque numa casa onde o peão pode ir', 'd2', 'É o primeiro lance dele.'),
      lance('7k/8/8/2b1n3/3P4/8/8/7K w - - 0 1', 'Capture o cavalo preto', ['d4e5'], 'O peão captura na diagonal.'),
      mc('O peão em d4 pode avançar?', ['Sim, para d5', 'Não, está travado'], 1, 'O peão não captura para frente.', { fen: '7k/8/8/3p4/3P4/8/8/7K w - - 0 1' }),
      lance('7k/8/8/5Pp1/8/8/8/7K w - g6 0 1', 'Capture en passant', ['f5g6'], 'O peão preto acabou de andar duas casas.'),
      mc('O peão pode andar para trás?', ['Sim', 'Não', 'Só capturando', 'Só no fim'], 1, 'Nunca. Cada avanço é para sempre.')
    ] },
    avaliacao: [
      mc('Como o peão anda?', ['Para frente', 'Para qualquer lado', 'Na diagonal', 'Em L'], 0, 'Sempre para frente.'),
      mc('Como o peão captura?', ['Para frente', 'Na diagonal, uma casa à frente', 'Para trás', 'Em L'], 1, 'Na diagonal, uma casa à frente.'),
      casaPeca('7k/8/8/8/8/8/6P1/7K w - - 0 1', 'Toque numa casa onde o peão pode ir', 'g2', 'Primeiro lance: uma ou duas casas.'),
      lance('7k/8/8/8/8/1q1r4/2P5/7K w - - 0 1', 'Capture a dama preta', ['c2b3'], null, 'Diagonal para a esquerda.'),
      mc('Quando o peão pode andar duas casas?', ['Sempre', 'No primeiro lance dele', 'Quando captura', 'Nunca'], 1, 'Só no primeiro lance de cada peão.'),
      mc('Como se chama a captura especial de peão?', ['Roque', 'En passant', 'Promoção', 'Xeque'], 1, 'En passant: "de passagem".')
    ] };
}

// ================================================================ 8. Promoção do peão
{
  const P = '7k/4P3/8/8/8/8/8/K7 w - - 0 1';
  L['licao-08'] = { titulo: 'Promoção do Peão', abertura: 'Todo peão sonha com o mesmo dia: chegar ao outro lado e virar outra peça.',
    teoria: [
      passo(P, 'O peão tem um superpoder escondido: a **promoção**.', { pose: 'apresentando' }),
      passo(P, 'Quando o peão chega à **última fileira**, ele vira outra peça: dama, torre, bispo ou cavalo. Só não pode virar rei.', { destaques: verde(['e8']) }),
      passo(P, 'Sua vez: avance o peão até ==e8== e escolha a **dama**.', { pose: 'curioso', interativo: { lance: 'e7e8q', acerto: 'Promoveu! Um peão virou a peça mais forte do jogo.' } }),
      passo('4Q2k/8/8/8/8/8/8/K7 b - - 0 1', 'Quase sempre se escolhe a **dama**, porque ela é a mais forte. E dá até para ter duas damas no tabuleiro!', { pose: 'surpreso' }),
      passo('3r3k/4P3/8/8/8/8/8/K7 w - - 0 1', 'O peão também pode promover **capturando**, na diagonal. Capture a torre em ==d8== e vire dama.', { pose: 'curioso', interativo: { lance: 'e7d8q', acerto: 'Captura e promoção no mesmo lance!' } }),
      passo('7k/5K2/8/8/8/8/8/8 w - - 0 1', 'Às vezes outra peça é melhor. Quem escolhe algo que não é dama faz uma **subpromoção**, por exemplo para dar mate de cavalo ou evitar um empate.', { pose: 'pensativo' }),
      passo('8/8/8/8/8/8/3p4/7K b - - 0 1', 'Vale para as pretas também: o peão preto promove ao chegar na **fileira 1**.', { pose: 'atencao', destaques: verde(['d1']) }),
      passo(P, 'Resumo: peão na última fileira vira dama, torre, bispo ou cavalo. Bora praticar?', { pose: 'aprovando' })
    ],
    exercicios: { instrucao: 'Promoção', itens: [
      lance('7k/8/8/8/8/8/1P5K/8 w - - 0 1'.replace('1P5K/8', '7K/8').replace('8/8/8/8/8', '1P6/8/8/8/8'), 'Promova o peão a dama', ['b7b8q'], 'Avance até a última fileira.'),
      casaPeca('7k/2P5/8/8/8/8/8/K7 w - - 0 1', 'Em que casa este peão vai promover?', 'c7', 'Ele anda para frente até a fileira 8.'),
      lance('2r4k/1P6/8/8/8/8/8/K7 w - - 0 1', 'Capture a torre e promova a dama', ['b7c8q'], 'O peão captura na diagonal.'),
      mc('Em que peça o peão NÃO pode se transformar?', ['Dama', 'Cavalo', 'Rei', 'Torre'], 2, 'Rei só existe um de cada lado.'),
      mc('Onde o peão preto promove?', ['Na fileira 8', 'Na fileira 1', 'No centro', 'Em qualquer canto'], 1, 'As pretas andam para baixo, até a fileira 1.')
    ] },
    avaliacao: [
      mc('O que acontece quando o peão chega à última fileira?', ['Nada', 'Ele volta para o começo', 'Ele vira outra peça', 'A partida acaba'], 2, 'É a promoção.'),
      mc('Qual peça costuma ser escolhida na promoção?', ['Dama', 'Torre', 'Bispo', 'Cavalo'], 0, 'A dama, por ser a mais forte.'),
      lance('7k/3P4/8/8/8/8/8/K7 w - - 0 1', 'Promova o peão a dama', ['d7d8q'], null, 'Avançou e virou dama.'),
      mc('Pode haver duas damas brancas no tabuleiro?', ['Sim, com a promoção', 'Não, nunca'], 0, 'Com a promoção, sim.'),
      lance('5n1k/6P1/8/8/8/8/8/K7 w - - 0 1', 'Capture o cavalo e promova a dama', ['g7f8q'], null, 'Captura na diagonal e promoção.'),
      mc('Como se chama escolher uma peça que não é a dama?', ['Subpromoção', 'En passant', 'Roque', 'Afogamento'], 0, 'Subpromoção.')
    ] };
  L['licao-08'].exercicios.itens[0] = lance('7k/1P6/8/8/8/8/8/K7 w - - 0 1', 'Promova o peão a dama', ['b7b8q'], 'Avance até a última fileira.');
}

// ================================================================ 9. Capturas (apostila "Capturando Peças")
{
  L['licao-09'] = { titulo: 'Capturas', abertura: 'Tirar peças do adversário costuma ser muito bom. Mas cada captura tem as suas regras.',
    teoria: [
      passo('7k/8/8/8/5P2/8/3Q4/7K w - - 0 1', 'Capturar peças nem sempre ganha a partida, mas costuma ser ótimo. Primeira regra: você **nunca** captura as suas próprias peças.', { pose: 'apresentando', setas: [{ de: 'd2', para: 'f4', cor: 'vermelho' }] }),
      passo('7k/8/8/3qk3/3rn3/8/8/K7 w - - 0 1', 'Pergunta rápida: entre **dama, rei, torre e cavalo**, uma dessas peças nunca pode ser capturada. Qual?', { pose: 'curioso' }),
      passo('7k/8/8/3qk3/3rn3/8/8/K7 w - - 0 1', 'É o **rei**! Ele nunca é capturado, e nem pode ir para uma casa atacada. A vitória vem com o **xeque-mate**: o rei atacado, sem salvação.', { pose: 'atencao', destaques: [{ casas: ['e5'], cor: 'vermelho' }] }),
      passo('7k/8/8/3p4/8/8/3Q4/7K w - - 0 1', 'Para capturar, basta levar a sua peça até a casa da peça inimiga. Capture o peão em ==d5==.', { pose: 'curioso', interativo: { lance: 'd2d5', acerto: 'Adeus, peão! Ele sai do tabuleiro.' } }),
      passo('7k/8/8/3p4/8/8/3Q4/7K w - - 0 1', 'A dama **não pula** o peão: subindo pela coluna, ela tem que parar em d5. Só uma peça consegue pular as outras. Qual?', { pose: 'pensativo', setas: [{ de: 'd2', para: 'd8', cor: 'vermelho' }] }),
      passo('7k/8/8/3q4/3Pp3/4N3/8/7K w - - 0 1', 'O **cavalo**! Ele pula, mas não captura quem fica no caminho. Capture a dama em ==d5==.', { pose: 'surpreso', interativo: { lance: 'e3d5', acerto: 'Isso! Pulou os peões e capturou a dama.' } }),
      passo('7k/8/8/8/8/B1P1N1K1/8/8 w - - 0 1', 'Entre **bispo, peão, cavalo e rei**, qual captura de um jeito diferente de como anda?', { pose: 'curioso' }),
      passo('7k/8/8/8/3p4/2P5/8/7K w - - 0 1', 'O **peão**! Ele anda reto para frente, mas captura na **diagonal**. Capture o peão preto.', { pose: 'explicando', interativo: { lance: 'c3d4', acerto: 'Na diagonal, como manda a regra.' } }),
      passo('7k/8/8/8/3P4/8/8/7K w - - 0 1', 'Juntando tudo: tome as peças do adversário e, no fim, dê xeque-mate no rei. Bora praticar?', { pose: 'aprovando' })
    ],
    exercicios: { instrucao: 'Capture!', itens: [
      lance('7k/8/8/5n2/8/8/2B5/7K w - - 0 1', 'Capture o cavalo preto', ['c2f5'], 'O bispo está na diagonal certa.'),
      lance('7k/8/8/8/8/2r5/1P6/7K w - - 0 1', 'Capture a torre com o peão', ['b2c3'], 'O peão captura na diagonal.'),
      lance('7k/8/8/2b5/2pp4/2pp4/8/7K w - - 0 1'.replace('7K', '1N5K'), 'Pule e capture o bispo', ['b1c3'].slice(0, 0).concat([]).length ? [] : [], null),
      mc('Qual peça nunca pode ser capturada?', ['A dama', 'O rei', 'A torre', 'O cavalo'], 1, 'O rei nunca é capturado: a partida acaba no xeque-mate.'),
      mc('Você pode capturar uma peça sua?', ['Sim', 'Não'], 1, 'Nunca.')
    ] },
    avaliacao: [
      mc('Como se captura uma peça?', ['Pulando por cima dela', 'Levando a sua peça até a casa dela', 'Cercando a peça', 'Encostando ao lado'], 1, 'A peça inimiga sai e a sua fica no lugar.'),
      mc('Qual peça pode pular as outras?', ['A torre', 'O bispo', 'O cavalo', 'A dama'], 2, 'Só o cavalo.'),
      lance('7k/8/8/8/2q5/1P6/8/7K w - - 0 1', 'Capture a dama com o peão', ['b3c4'], null, 'Diagonal, uma casa à frente.'),
      mc('Qual peça captura de forma diferente de como anda?', ['O peão', 'A torre', 'O rei', 'O bispo'], 0, 'Anda reto e captura na diagonal.'),
      lance('7k/8/8/3r4/3pp3/4N3/8/7K w - - 0 1', 'Capture a torre preta', ['e3d5'], null, 'O cavalo pula os peões.'),
      mc('O cavalo captura as peças que pula?', ['Sim', 'Não'], 1, 'Ele só captura a peça da casa onde cai.')
    ] };
  L['licao-09'].exercicios.itens[2] = lance('7k/8/8/8/1pp5/1pb5/8/1N5K w - - 0 1', 'Capture o bispo preto', ['b1c3'], 'O cavalo pula os peões.');
}

// ================================================================ 10. Xeque-mate (finais reais)
{
  const F1 = '3K4/8/3k3b/8/6q1/8/8/8 b - - 0 1', F2 = '6k1/p4rp1/7p/8/P3Q2n/1BP2P1q/KP3b2/3R4 w - - 0 1';
  const F3 = '7k/pBp2R1b/4Q2p/4p3/1P5p/2P4q/P2r1P2/6K1 b - - 0 1', F4 = '6k1/3Q4/3p3K/3Pp3/6Pn/p7/8/5q2 w - - 0 1';
  L['licao-10'] = { titulo: 'Xeque-mate', abertura: 'Como transformar um xeque em vitória, com quatro finais reais de um dos maiores jogadores da história.',
    teoria: [
      passo(F4, 'Você ganha uma partida dando **xeque-mate**: atacar o rei de um jeito que torne impossível salvá-lo.', { pose: 'apresentando' }),
      passo(F4, 'Três saídas precisam estar fechadas ao mesmo tempo: **fugir**, **bloquear** e **capturar** quem ataca.', { pose: 'explicando' }),
      passo(F1, 'Final 1: Carlsen, de pretas, contra Grischuk, em 2016. Há vários xeques, mas só um é mate. A dama vai para a ==8ª fileira==.', { pose: 'curioso', lado: 'b', interativo: { lance: 'g4g8', acerto: 'Xeque-mate! O rei preto vigia as casas de fuga e a dama fecha a fileira.' } }),
      passo('3K2q1/8/3k3b/8/8/8/8/8 w - - 1 2', 'Repare: o **rei preto** faz um trabalho importante, tirando as casas de fuga do rei branco.', { pose: 'pensativo', lado: 'b', destaques: [{ casas: ['c7', 'd7', 'e7'], cor: 'vermelho' }] }),
      passo(F2, 'Final 2: Carlsen, de brancas, numa partida relâmpago contra Bacrot, em 2012. Normalmente é preciso mais de uma peça para dar mate. Como?', { pose: 'curioso', interativo: { lance: 'd1d8', acerto: 'Xeque-mate! A torre ataca pela 8ª fileira e a dama vigia h7.' } }),
      passo('3R2k1/p4rp1/7p/8/P3Q2n/1BP2P1q/KP3b2/8 b - - 1 1', 'E a torre preta não pode bloquear em f8: ela está **cravada** pelo bispo de b3, que atacaria o rei.', { pose: 'atencao', setas: [{ de: 'b3', para: 'g8', cor: 'vermelho' }] }),
      passo(F3, 'Final 3: Carlsen, de pretas, contra Hagberg, em 2001. Qual lance encerra a partida?', { pose: 'curioso', lado: 'b', interativo: { lance: 'd2d1', acerto: 'Xeque-mate! A torre ataca pela 1ª fileira e a dama vigia a fuga.' } }),
      passo(F4, 'Final 4: Carlsen, de brancas, contra Olszewski, em 2003. Muitos xeques, um só mate: coloque a dama **ao lado do rei**.', { pose: 'curioso', interativo: { lance: 'd7g7', acerto: 'Xeque-mate! A dama colada no rei, protegida pelo rei branco.' } }),
      passo('6k1/6Q1/3p3K/3Pp3/6Pn/p7/8/5q2 b - - 1 1', 'Dama colada ao rei inimigo é letal, **desde que esteja protegida**. Diante de um xeque, pergunte: ele pode fugir? Bloquear? Capturar?', { pose: 'aprovando' })
    ],
    exercicios: { instrucao: 'Mate em 1', itens: [
      lance('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', 'Dê xeque-mate', ['a1a8'], 'A última fileira está fechada pelos peões.'),
      lance('7k/8/6K1/8/8/8/8/1Q6 w - - 0 1', 'Dê xeque-mate', ['b1b8'], 'O rei branco já vigia as casas da frente.'),
      lance('k7/8/1K6/8/8/8/8/7R w - - 0 1', 'Dê xeque-mate', ['h1h8'], 'O rei branco tira as fugas do rei preto.'),
      lance('6k1/8/6K1/8/8/8/8/R7 w - - 0 1', 'Dê xeque-mate', ['a1a8'], 'Torre na última fileira.'),
      lance('5rk1/5p1p/8/8/8/8/1B6/6QK w - - 0 1'.replace('6QK', '3Q2K1'), 'Dê xeque-mate', [], null)
    ] },
    avaliacao: [
      mc('Quais são as três saídas de um xeque?', ['Fugir, bloquear ou capturar', 'Só fugir', 'Pedir empate', 'Mover qualquer peça'], 0, 'Mate é quando as três estão fechadas.'),
      lance('6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', 'Dê xeque-mate', ['d1d8'], null, 'Mate do corredor.'),
      mc('O que acontece com o rei no xeque-mate?', ['É capturado', 'A partida acaba sem ele ser capturado', 'Volta para e1', 'Vira outra peça'], 1, 'O rei nunca chega a ser capturado.'),
      lance('k7/2K5/8/8/8/8/8/1Q6 w - - 0 1', 'Dê xeque-mate', ['b1b7'], null, 'A dama colada no rei, protegida pelo rei branco.'),
      mc('Dama colada ao rei inimigo é mate quando...', ['Ela está protegida', 'Ela está sozinha', 'É o primeiro lance', 'Sempre'], 0, 'Sem proteção, o rei simplesmente a captura.'),
      lance('k7/8/K7/8/8/8/8/7R w - - 0 1', 'Dê xeque-mate', ['h1h8'], null, 'O rei branco cobre as fugas.')
    ] };
  L['licao-10'].exercicios.itens[4] = lance('k7/8/1K6/8/8/8/8/3Q4 w - - 0 1', 'Dê xeque-mate', ['d1d8'], 'A dama na última fileira, com o rei branco ajudando.');
}

// ================================================================ 11. Xeque, mate ou afogamento?
{
  const op = ['Xeque', 'Xeque-mate', 'Empate por afogamento'];
  const q = (fen, pergunta, correta, explicacao, setas) => mc(pergunta, op, correta, explicacao, Object.assign({ fen }, setas ? { setas } : {}));
  L['licao-11'] = { titulo: 'Xeque, Mate ou Afogamento?', abertura: 'Três resultados que decidem uma partida. Ou não decidem! Vamos aprender a diferença.',
    teoria: [
      passo('4k3/8/8/8/8/8/8/4K3 w - - 0 1', 'Três palavras decidem o destino de uma partida: **xeque**, **xeque-mate** e **afogamento**.', { pose: 'apresentando' }),
      passo('rnb1kbnr/ppp2ppp/3pp3/8/5P1q/3P1N2/PPP1P1PP/RNBQKB1R w KQkq - 1 4', 'Um **xeque** é só um ataque ao rei. Ele tem três defesas: **capturar** quem ataca, **bloquear** o caminho ou **fugir** com o rei.', { pose: 'explicando', setas: [{ de: 'f3', para: 'h4', cor: 'verde' }, { de: 'g2', para: 'g3', cor: 'azul' }, { de: 'e1', para: 'd2', cor: 'amarelo' }] }),
      passo('1R2k3/R7/8/4K3/8/8/8/8 b - - 0 1', 'O **xeque-mate** é o xeque sem defesa: a torre ataca pela 8ª fileira e a outra fecha a 7ª. Fim de jogo!', { pose: 'surpreso', destaques: [{ casas: ['e8'], cor: 'vermelho' }] }),
      passo('4k3/8/3Q1K2/8/8/8/8/8 b - - 0 1', 'Agora o **afogamento**: as pretas não têm nenhum lance, mas o rei **não está em xeque**. A partida termina **empatada**.', { pose: 'atencao', destaques: [{ casas: ['d8', 'd7', 'e7', 'f7', 'f8'], cor: 'vermelho' }] }),
      passo('5K1k/8/6P1/8/7P/3B4/8/8 b - - 0 1', 'Pergunta: as brancas acabaram de capturar um peão em g6. É a vez das pretas. Xeque, mate ou afogamento?', { pose: 'curioso' }),
      passo('5K1k/8/6P1/8/7P/3B4/8/8 b - - 0 1', '**Afogamento!** O rei preto não está em xeque e todas as casas de fuga estão cobertas. Uma vitória virou empate.', { pose: 'atencao', destaques: [{ casas: ['g8', 'g7', 'h7'], cor: 'vermelho' }] }),
      passo('8/8/8/8/8/5KP1/5B2/5k2 b - - 0 1', 'Capturar nem sempre é bom: o bispo acabou de tomar uma torre em f2 e... o rei preto ficou sem lances e sem xeque. **Afogamento**. Que tristeza!', { pose: 'surpreso' }),
      passo('2k1R2r/pp3Q1p/3p2pB/3P1N2/3q1n2/2N5/PPP2PPP/6K1 b - - 1 1', 'E cuidado com o xeque que **parece** mate: aqui a torre preta de h8 simplesmente captura a torre branca. Foi só um xeque!', { pose: 'pensativo', setas: [{ de: 'h8', para: 'e8', cor: 'verde' }] }),
      passo('1R2k3/R7/8/4K3/8/8/8/8 b - - 0 1', 'Dica de ouro: na hora de dar mate, deixe uma casa de fuga até o golpe final, para não **afogar** o rei. Bora praticar?', { pose: 'aprovando' })
    ],
    exercicios: { instrucao: 'Xeque, mate ou afogamento?', itens: [
      q('rnbqk1nr/pppp1ppp/8/4p3/1b1P4/2N5/PPP1PPPP/R1BQKBNR w KQkq - 2 3'.replace('2N5', '8').replace('R1BQKBNR', 'RNBQKBNR'), 'As pretas jogaram o bispo em b4. É xeque, mate ou afogamento?', 0, 'Só xeque: as brancas podem bloquear com c3, Cc3 ou Bd2.'),
      q('8/8/8/8/8/5K2/8/3Q1k2 b - - 0 1', 'A dama branca foi para d1. É xeque, mate ou afogamento?', 1, 'Xeque-mate! O rei branco apoia a dama junto à borda.'),
      q('4k3/8/3Q1K2/8/8/8/8/8 b - - 0 1', 'É a vez das pretas. Xeque, mate ou afogamento?', 2, 'Afogamento: sem lances e sem xeque.'),
      q('1r4k1/6R1/5KN1/6P1/8/8/8/8 b - - 0 1', 'A torre subiu para g7. Xeque, mate ou afogamento?', 1, 'Xeque-mate! O cavalo cobre as fugas e o rei branco protege a torre.'),
      q('8/8/8/8/8/5KP1/5B2/5k2 b - - 0 1', 'O bispo branco acabou de capturar em f2. Xeque, mate ou afogamento?', 2, 'Afogamento: o rei preto não tem lances e não está em xeque.'),
      q('4R2k/7p/5P2/2p1pK2/b1Br4/1P6/8/8 b - - 0 1', 'A torre subiu para e8. Xeque, mate ou afogamento?', 0, 'Só xeque: o bispo preto de a4 captura a torre.')
    ] },
    avaliacao: [
      mc('O que é empate por afogamento?', ['O rei em xeque sem saída', 'Sem lances legais e sem estar em xeque', 'Perder a dama', 'Ficar só com o rei'], 1, 'Sem lances e sem xeque: empate.'),
      q('1R2k3/R7/8/4K3/8/8/8/8 b - - 0 1', 'Xeque, mate ou afogamento?', 1, 'Xeque-mate: as duas torres fecham as fileiras 7 e 8.'),
      mc('Um xeque sempre é uma boa jogada?', ['Sim', 'Não: às vezes o adversário captura a peça que deu xeque'], 1, 'Alguns xeques são bons, outros são inúteis.'),
      q('5K1k/8/6P1/8/7P/3B4/8/8 b - - 0 1', 'É a vez das pretas. Xeque, mate ou afogamento?', 2, 'Afogamento.'),
      q('2k1R2r/pp3Q1p/3p2pB/3P1N2/3q1n2/2N5/PPP2PPP/6K1 b - - 1 1', 'A torre branca deu xeque em e8. Xeque, mate ou afogamento?', 0, 'Só xeque: a torre de h8 captura a torre branca.'),
      mc('Quem está ganhando e afoga o rei adversário...', ['Vence', 'Empata', 'Perde'], 1, 'Afogamento é empate.')
    ] };
}

// ================================================================ poses
Object.entries({ 'licao-02': 'peca-torre', 'licao-03': 'peca-bispo', 'licao-04': 'peca-dama', 'licao-05': 'peca-rei', 'licao-06': 'peca-cavalo', 'licao-07': 'peca-peao', 'licao-08': 'peca-peao' })
  .forEach(([id, a]) => { L[id] = Object.assign({ titulo: L[id].titulo, avatar: a }, L[id]); });
L['licao-10'].teoria[1].pose = 'gesto-tres';
L['licao-11'].teoria[1].pose = 'gesto-tres';

// ================================================================ conferência e gravação
const FEN = { vazio: '8/8/8/8/8/8/8/8 w - - 0 1', inicial: X.INICIO };
const f = s => FEN[s] || s;
let problemas = [];
for (const [id, l] of Object.entries(L)) {
  l.teoria.forEach((p, i) => {
    let pos = X.deFEN(f(p.fen));
    if (p.interativo && p.interativo.lance && !X.deUCI(pos, p.interativo.lance)) problemas.push(id + ' teoria ' + (i + 1) + ' lance ilegal ' + p.interativo.lance);
  });
  const itens = l.exercicios.itens.map(x => ['ex', x]).concat(l.avaliacao.map(x => ['av', x]));
  itens.forEach(([o, x], i) => {
    if (x.tipo === 'autoral') {
      if (!x.solucao || !x.solucao.length) { problemas.push(id + ' ' + o + (i + 1) + ' sem solução'); return; }
      let pos = X.deFEN(x.fen);
      for (const u of x.solucao) { const m = X.deUCI(pos, u); if (!m) { problemas.push(id + ' ' + o + (i + 1) + ' lance ilegal ' + u); return; } pos = X.joga(pos, m); }
      if (/mate/i.test(x.pergunta) && !X.ehMate(pos)) problemas.push(id + ' ' + o + (i + 1) + ' não é mate');
    }
    if (x.tipo === 'casa' && !x.resposta.length) problemas.push(id + ' ' + o + (i + 1) + ' sem resposta');
    if (x.tipo === 'multipla' && x.fen && x.opcoes === op11) {}
  });
}
var op11 = null;
// os "xeque, mate ou afogamento" da lição 11: a resposta tem que bater com as regras
for (const x of L['licao-11'].exercicios.itens.concat(L['licao-11'].avaliacao)) {
  if (x.tipo !== 'multipla' || !x.fen) continue;
  const p = X.deFEN(x.fen), sem = X.lances(p).length === 0, xq = X.emXeque(p);
  const certo = xq && sem ? 1 : (xq ? 0 : (sem ? 2 : -1));
  if (certo !== x.correta) problemas.push('licao-11 "' + x.pergunta + '": as regras dizem ' + certo + ', a lição diz ' + x.correta);
}
if (problemas.length) { console.log(problemas.join('\n')); process.exit(1); }

for (const [id, l] of Object.entries(L)) {
  const dados = Object.assign({ id }, l);
  let texto = JSON.stringify(dados, null, 2).replace(/\[\s+((?:"[^"\n]*"|-?\d+)(?:,\s+(?:"[^"\n]*"|-?\d+))*)\s+\]/g, (m, g) => '[' + g.replace(/,\s+/g, ', ') + ']');
  fs.writeFileSync(PASTA + id + '.json', texto + '\n');
  console.log(id, l.titulo, '|', l.teoria.length, 'passos,', l.exercicios.itens.length, 'exercícios,', l.avaliacao.length, 'questões');
}
