// ============================================================================
//  CONFIGURAÇÃO DO SITE — é aqui que você liga a venda do curso.
//
//  Enquanto `linkCompra` estiver vazio, o site mostra "Em breve" e o botão leva
//  para o Instagram. Quando o curso estiver pronto, cole o link de compra entre
//  as aspas e (se quiser) preencha os preços: os botões de compra aparecem
//  sozinhos no topo, no cartão do curso e na barra fixa do celular.
// ============================================================================
window.XE_CONFIG = {
  linkCompra: 'https://pay.hotmart.com/F108444972P?off=qxxyc3yo&bid=1794535357552',
  preco: 'R$ 49,90',       // aparece grande no cartão do curso e na barra do celular
  precoDe: '',             // ex.: 'R$ 197'     (aparece riscado; opcional)

  // OFERTA POR TEMPO LIMITADO: até o fim do dia `ate`, o site usa o link e o preço da
  // oferta, mostra o preço normal riscado e a contagem regressiva. Depois, volta sozinho
  // ao link e ao preço normais acima. Sem oferta: apague o bloco ou deixe `ate` no passado.
  oferta: {
    nome: 'Black Friday',
    link: 'https://pay.hotmart.com/F108444972P?off=vi1i89hy',
    preco: 'R$ 29,90',
    ate: '2026-11-30'
  },
  parcelas: '',            // ex.: 'ou 12x de R$ 9,70'  (opcional)
  instagram: 'https://www.instagram.com/xadrezcomz/',

  // O QUE TEM NO CURSO: aparece no cartão do curso (números, módulos e bônus).
  // Só entra no cartão o que estiver preenchido; nada de número inventado.
  curso: {
    modulos: [
      { titulo: 'Conhecendo o tabuleiro e as peças', aulas: 8 },
      { titulo: 'Regras Essenciais', aulas: 11 },
      { titulo: 'Primeiros Passos na Estratégia', aulas: 4 },
      { titulo: 'Táticas Essenciais', aulas: 6 },
      { titulo: 'Xeque-mates e Finais', aulas: 6 },
      { titulo: 'Sua Primeira Partida', aulas: 6 }
    ],
    bonus: [
      { titulo: 'Notação Algébrica', aulas: 12, texto: 'Leia e escreva qualquer partida, como nos livros.' },
      { titulo: 'Glossário do Xadrez', aulas: 12, texto: 'As palavras que todo jogador usa, mostradas no tabuleiro.' },
      { titulo: 'Regras Oficiais da FIDE', aulas: 12, texto: 'As leis do xadrez para quem vai jogar torneio.' },
      { titulo: 'Xadrez Digital', aulas: 12, texto: 'Jogue e estude no Lichess e no Chess.com, pelo celular.' },
      { titulo: 'Aberturas com as Brancas', aulas: 12, texto: 'As principais aberturas, com os planos de cada uma.' },
      { titulo: 'Aberturas com as Pretas', aulas: 12, texto: 'As principais defesas contra e4 e contra d4.' },
      { titulo: 'Armadilhas', aulas: 12, texto: 'As armadilhas mais famosas, para aplicar e para não cair.' },
      { titulo: 'Táticas Avançadas', aulas: 12, texto: 'Os golpes dos jogadores experientes.' },
      { titulo: 'Estratégia de Meio-jogo', aulas: 12, texto: 'Como pensar quando não há tática: planos e peões.' },
      { titulo: 'Finais Completos', aulas: 10, texto: 'De rei e peão aos finais de torre.' },
      { titulo: 'Como Treinar Sozinho', aulas: 10, texto: 'Como continuar evoluindo depois do curso.' }
    ]
  },

  // TEMA DE DATA: a "roupa" do site (Natal, Carnaval, Páscoa...). As datas e a
  // lista dos temas estão em js/temas.js.
  //   'auto'  o tema entra e sai sozinho nas datas certas
  //   ''      ponto base: o visual normal, sem tema nenhum
  //   'natal' (ou outro nome) força esse tema; com `temaAte` ele vale até esse
  //           dia e depois o site volta ao automático
  tema: 'black-friday',
  temaAte: '2026-11-30'
};

// Liga a oferta enquanto ela vale (para testar outra data: ?dia=2026-12-01 no endereço).
(function (c) {
  var o = c.oferta, m = /[?&]dia=(\d{4})-(\d{2})-(\d{2})/.exec(location.search), hoje = new Date();
  if (m) hoje = new Date(+m[1], +m[2] - 1, +m[3], 12);
  if (!o || !o.ate || !o.link) return;
  var p = o.ate.split('-'), fim = new Date(+p[0], +p[1] - 1, +p[2], 23, 59, 59);
  if (hoje > fim) return;
  c.ofertaAtiva = { nome: o.nome, fim: fim.getTime(), precoNormal: c.preco };
  c.precoDe = c.preco;
  c.preco = o.preco;
  c.linkCompra = o.link;
})(window.XE_CONFIG);
