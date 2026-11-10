// ============================================================================
//  CONFIGURAÇÃO DO SITE — é aqui que você liga a venda do curso.
//
//  Enquanto `linkCompra` estiver vazio, o site mostra "Em breve" e o botão leva
//  para o Instagram. Quando o curso estiver pronto, cole o link de compra entre
//  as aspas e (se quiser) preencha os preços: os botões de compra aparecem
//  sozinhos no topo, no cartão do curso e na barra fixa do celular.
// ============================================================================
window.XE_CONFIG = {
  linkCompra: '',          // ex.: 'https://pay.hotmart.com/XXXXXXXX'
  preco: '',               // ex.: 'R$ 97'      (aparece grande no cartão)
  precoDe: '',             // ex.: 'R$ 197'     (aparece riscado; opcional)
  parcelas: '',            // ex.: 'ou 12x de R$ 9,70'  (opcional)
  instagram: 'https://www.instagram.com/xadrezcomz/',

  // TEMA DE DATA: a "roupa" do site. Vazio ('') é o ponto base, o visual normal.
  // Para vestir um tema, escreva o nome dele (os temas ficam na pasta temas/ e a
  // lista está em js/temas.js). Hoje existe: 'natal'.
  // Para espiar um tema sem publicar: abra o site com ?tema=natal (ou ?tema=base).
  tema: 'natal'
};
