# Xadrez Express

Site de venda do curso **Xadrez Express** (@xadrezcomz): lições de xadrez em vídeos de
30 segundos a 1 minuto. É um site estático, sem etapa de build: basta abrir o `index.html`
por um servidor (`python3 -m http.server`) ou publicar no GitHub Pages.

## Ligar a venda do curso

Tudo fica em **`js/config.js`**. Enquanto `linkCompra` estiver vazio, o site mostra
"Em breve" e o botão leva ao Instagram. Ao colar o link de compra (e, se quiser, os
preços), os botões de compra aparecem no topo, no cartão do curso e numa barra fixa no celular.

## As seções

| Seção | Onde está | De onde veio |
|---|---|---|
| Topo: foguete e peças voando com rastro e propulsão | `js/hero.js` | Rastros e propulsões do Rock Orbit, refeitos em canvas 2D |
| Puzzle do dia | `js/puzzle.js`, `dados/puzzles.js` | Banco aberto do Lichess (CC0); peças e cores do tabuleiro do Slide Chess |
| Partida do dia (tabuleiro 3D) | `js/partida.js`, `dados/partidas.js` | 400 partidas clássicas (PGN Mentor) |
| Frase do dia | `js/site.js`, `js/frases.js` | 408 frases de figuras do xadrez e do esporte |
| O curso (cartão de venda) | `index.html`, `js/site.js`, `js/config.js` | |

`js/xadrez.js` tem as regras do xadrez usadas pelo puzzle, pela partida e pelas ferramentas.

Puzzle, partida e frase mudam à meia-noite (horário do aparelho) e seguem a ordem dos
arquivos: 728 puzzles (a dificuldade sobe de segunda a domingo), 400 partidas e 408 frases,
então nada se repete em menos de um ano.

## Refazer os bancos

```sh
# puzzles (baixa ~300 MB do Lichess)
curl -O https://database.lichess.org/lichess_db_puzzle.csv.zst
pip install zstandard
python3 ferramentas/gera-puzzles.py lichess_db_puzzle.csv.zst

# partidas: uma pasta com os PGN por jogador de pgnmentor.com/files.html
node ferramentas/gera-partidas.js pasta-com-pgn/
```

A lista de partidas famosas (com os apelidos) fica no começo de `ferramentas/gera-partidas.js`.
Para trocar ou acrescentar frases, edite `js/frases.js` (uma por linha).

## Publicar

`.github/workflows/publica.yml` publica no GitHub Pages a cada mudança na branch `main`
(em Settings → Pages → Source, escolha "GitHub Actions").

## Créditos

Peças: Cburnett (CC BY-SA 3.0). Puzzles: Lichess (CC0). Fontes: Chakra Petch e Exo 2 (OFL).
