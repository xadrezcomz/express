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
];
