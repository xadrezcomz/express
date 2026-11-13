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
  preco: 'R$ 29,90',       // aparece grande no cartão do curso e na barra do celular
  precoDe: '',             // ex.: 'R$ 197'     (aparece riscado; opcional)
  parcelas: '',            // ex.: 'ou 12x de R$ 9,70'  (opcional)
  instagram: 'https://www.instagram.com/xadrezcomz/',

  // TEMA DE DATA: a "roupa" do site (Natal, Carnaval, Páscoa...). As datas e a
  // lista dos temas estão em js/temas.js.
  //   'auto'  o tema entra e sai sozinho nas datas certas
  //   ''      ponto base: o visual normal, sem tema nenhum
  //   'natal' (ou outro nome) força esse tema; com `temaAte` ele vale até esse
  //           dia e depois o site volta ao automático
  tema: 'black-friday',
  temaAte: '2026-11-30'
};
