// A lista de módulos e aulas do curso. É o ÚNICO arquivo a mexer para trocar um título,
// uma peça, uma cor ou a duração. Depois de mudar: node capas/gera.js
//
// Módulo:  numero   o número que aparece na capa ("MÓDULO 0"), igual ao da Hotmart
//          titulo   o título do módulo
//          peca     wk wq wr wb wn wp (brancas), bk bq br bb bn bp (pretas), 'foguete' ou 'tabuleiro'
//          cor      opcional: ciano, ouro, rosa, roxo ou laranja. Sem ela, as cores
//                   se alternam nessa ordem, seguindo a posição do módulo na lista.
// Aula:    rotulo   o que aparece no selo ("AULA 0", "AULA EXTRA 01"), igual ao da Hotmart
//          titulo   o título da aula
//          peca     opcional: a peça ou 'foguete' (sem ela, usa a do módulo)
//          duracao  opcional: '0:45' vira um selo com o tempo do vídeo
module.exports = [
  {
    numero: '0',
    titulo: 'Boas-vindas ao Xadrez Express!',
    peca: 'foguete',
    aulas: [
      { rotulo: 'Aula 0', titulo: 'Bem-vindo ao Xadrez Express!' },
      { rotulo: 'Aula Extra 01', titulo: 'Como Funciona o Xadrez Express?', peca: 'wn' },
      { rotulo: 'Aula Extra 02', titulo: 'Prepare-se para Aprender!', peca: 'wp' },
    ],
  },
  {
    numero: '1',
    titulo: 'Conhecendo o tabuleiro e as peças',
    peca: 'wn',
    aulas: [
      { rotulo: 'Lição 01', titulo: 'O Tabuleiro', peca: 'tabuleiro' },
      { rotulo: 'Lição 02', titulo: 'Como Organizar as Peças no Tabuleiro', peca: 'bk' },
      { rotulo: 'Lição 03', titulo: 'A Torre', peca: 'wr' },
      { rotulo: 'Lição 04', titulo: 'O Bispo', peca: 'wb' },
      { rotulo: 'Lição 05', titulo: 'O Cavalo', peca: 'wn' },
      { rotulo: 'Lição 06', titulo: 'A Dama', peca: 'wq' },
      { rotulo: 'Lição 07', titulo: 'O Rei', peca: 'wk' },
      { rotulo: 'Lição 08', titulo: 'O Peão', peca: 'wp' },
    ],
  },
  {
    numero: '2',
    titulo: 'Regras Essenciais',
    peca: 'wk',
    aulas: [
      { rotulo: 'Lição 09', titulo: 'O Xeque', peca: 'wk' },
      { rotulo: 'Lição 10', titulo: 'O Xeque-mate', peca: 'bk' },
      { rotulo: 'Lição 11', titulo: 'O Afogamento', peca: 'bq' },
      { rotulo: 'Lição 12', titulo: 'O Roque', peca: 'wr' },
      { rotulo: 'Lição 13', titulo: 'En Passant', peca: 'bp' },
      { rotulo: 'Lição 14', titulo: 'Promoção', peca: 'wq' },
      { rotulo: 'Lição 15', titulo: 'Lance Ilegal', peca: 'bb' },
      { rotulo: 'Lição 16', titulo: 'Peça tocada é peça jogada', peca: 'wn' },
      { rotulo: 'Lição 17', titulo: 'Quem Começa a Partida?', peca: 'wp' },
      { rotulo: 'Lição 18', titulo: 'Outras Formas de Empate', peca: 'br' },
      { rotulo: 'Lição 19', titulo: 'Como Termina uma Partida de Xadrez?', peca: 'tabuleiro' },
    ],
  },
  {
    numero: '3',
    titulo: 'Primeiros Passos na Estratégia',
    peca: 'wb',
    aulas: [
      { rotulo: 'Lição 20', titulo: 'O Valor das Peças', peca: 'wq' },
      { rotulo: 'Lição 21', titulo: 'O Controle do Centro', peca: 'wp' },
      { rotulo: 'Lição 22', titulo: 'O Desenvolvimento das Peças', peca: 'wn' },
      { rotulo: 'Lição 23', titulo: 'A Segurança do Rei', peca: 'wk' },
    ],
  },
  {
    numero: '4',
    titulo: 'Táticas Essenciais',
    peca: 'wr',
    aulas: [
      { rotulo: 'Lição 24', titulo: 'O Que É uma Tática no Xadrez?', peca: 'wq' },
      { rotulo: 'Lição 25', titulo: 'O Garfo e o Ataque Duplo', peca: 'wn' },
      { rotulo: 'Lição 26', titulo: 'A Cravada', peca: 'wb' },
      { rotulo: 'Lição 27', titulo: 'O Espeto', peca: 'wr' },
      { rotulo: 'Lição 28', titulo: 'O Ataque Descoberto', peca: 'bb' },
      { rotulo: 'Lição 29', titulo: 'Como Identificar Ameaças', peca: 'bq' },
    ],
  },
  {
    numero: '5',
    titulo: 'Xeque-mates e Finais',
    peca: 'bk',
    aulas: [
      { rotulo: 'Lição 30', titulo: 'O Mate do Corredor', peca: 'wr' },
      { rotulo: 'Lição 31', titulo: 'O Mate do Pastor', peca: 'wq' },
      { rotulo: 'Lição 32', titulo: 'Mate com Dama e Rei', peca: 'wq' },
      { rotulo: 'Lição 33', titulo: 'Mate com Torre e Rei', peca: 'wr' },
      { rotulo: 'Lição 34', titulo: 'A Oposição dos Reis', peca: 'wk' },
      { rotulo: 'Lição 35', titulo: 'A Regra do Quadrado', peca: 'wp' },
    ],
  },
  // A versão anterior do Módulo 5, guardada caso volte (por exemplo, como Módulo 6).
  // Para usar: tire as barras do começo das linhas e acerte o número.
  // {
  //   numero: '5',
  //   titulo: 'Sua Primeira Partida',
  //   peca: 'wp',
  //   aulas: [
  //     { rotulo: 'Lição 30', titulo: 'As Três Fases de uma Partida', peca: 'tabuleiro' },
  //     { rotulo: 'Lição 31', titulo: 'Como Começar Bem uma Partida', peca: 'wn' },
  //     { rotulo: 'Lição 32', titulo: 'Os Erros Mais Comuns dos Iniciantes', peca: 'bp' },
  //     { rotulo: 'Lição 33', titulo: 'Como Pensar Antes de Jogar', peca: 'wb' },
  //     { rotulo: 'Lição 34', titulo: 'Como Praticar e Evoluir no Xadrez', peca: 'wq' },
  //     { rotulo: 'Lição 35', titulo: 'Seu Próximo Passo no Xadrez', peca: 'foguete' },
  //   ],
  // },
];
