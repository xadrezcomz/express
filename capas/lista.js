// A lista de módulos e aulas do curso. É o ÚNICO arquivo a mexer para trocar um título,
// uma peça, uma cor ou a duração. Depois de mudar: node capas/gera.js
//
// Módulo:  numero   o número que aparece na capa ("MÓDULO 00")
//          titulo   o título do módulo
//          peca     wk wq wr wb wn wp (brancas), bk bq br bb bn bp (pretas) ou 'foguete'
//          cor      opcional: ciano, ouro, rosa, roxo ou laranja. Sem ela, as cores
//                   se alternam nessa ordem, seguindo a posição do módulo na lista.
// Aula:    rotulo   o que aparece no selo ("AULA 00", "AULA EXTRA 01")
//          titulo   o título da aula
//          peca     opcional: a peça ou 'foguete' (sem ela, usa a do módulo)
//          duracao  opcional: '0:45' vira um selo com o tempo do vídeo
module.exports = [
  {
    numero: '00',
    titulo: 'Boas-vindas ao Xadrez Express!',
    peca: 'foguete',
    aulas: [
      { rotulo: 'Aula 00', titulo: 'Bem-vindo ao Xadrez Express!' },
      { rotulo: 'Aula Extra 01', titulo: 'Como Funciona o Xadrez Express?', peca: 'wn' },
      { rotulo: 'Aula Extra 02', titulo: 'Prepare-se para Aprender!', peca: 'wp' },
    ],
  },
];
