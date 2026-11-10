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
| Frase do dia | `js/site.js`, `dados/frases.js` | 408 frases de figuras do xadrez e do esporte |
| O curso (cartão de venda) | `index.html`, `js/site.js`, `js/config.js` | |

`js/xadrez.js` tem as regras do xadrez usadas pelo puzzle, pela partida e pelas ferramentas.

Puzzle, partida e frase mudam à meia-noite (horário do aparelho) e seguem a ordem dos
arquivos: 728 puzzles (a dificuldade sobe de segunda a domingo), 400 partidas e 408 frases,
então nada se repete em menos de um ano.

## Temas de data (Natal, Carnaval...)

O visual normal do site é o **ponto base**. Um tema é uma "roupa" por cima dele, que nunca
altera os arquivos do base. `tema` em **`js/config.js`** manda:

| Valor | O que acontece |
|---|---|
| `'auto'` | o tema entra e sai sozinho nas datas do calendário |
| `''` | ponto base, sem tema |
| `'natal'` (ou outro nome) | força esse tema; com `temaAte: 'AAAA-MM-DD'` ele vale até esse dia e depois o site volta ao automático |

Calendário automático (em `js/temas.js`, função `calendario`):

| Tema | No ar |
|---|---|
| `ano-novo` | 27 de dezembro a 6 de janeiro |
| `carnaval` | da sexta de Carnaval à quarta-feira de cinzas |
| `pascoa` | a semana da Páscoa |
| `maes` | a semana do Dia das Mães (2º domingo de maio) |
| `junina` | junho inteiro |
| `xadrez` | 14 a 20 de julho (Dia Internacional do Xadrez) |
| `pais` | a semana do Dia dos Pais (2º domingo de agosto) |
| `criancas` | 5 a 12 de outubro |
| `halloween` | 25 a 31 de outubro |
| `black-friday` | a semana da Black Friday até a segunda seguinte |
| `natal` | 1º a 26 de dezembro |

Para espiar sem publicar: `?tema=carnaval`, `?tema=base` ou `?dia=2027-02-08` no fim do endereço.

Cada tema é uma entrada na lista de `js/temas.js` (frases, o que cai do céu, confete) e um
arquivo `temas/<nome>.css` (cores, ícones e enfeites). O que é igual em todos fica em
`temas/comum.css` e `js/tema-efeitos.js`.

No histórico do git, o commit `61c0294` é o site como estava antes do primeiro tema.

## Peças

O site usa o conjunto próprio do Xadrez Express, em `img/pecas-express/`. Os desenhos saem de
`ferramentas/gera-pecas-express.py` (formas e cores ficam no começo do arquivo). O conjunto
anterior (Cburnett, CC BY-SA 3.0) continua guardado em `img/pecas/`, sem uso.

## Refazer os bancos

```sh
# puzzles (baixa ~300 MB do Lichess)
curl -O https://database.lichess.org/lichess_db_puzzle.csv.zst
pip install zstandard
python3 ferramentas/gera-puzzles.py lichess_db_puzzle.csv.zst

# partidas: uma pasta com os PGN por jogador de pgnmentor.com/files.html
node ferramentas/gera-partidas.js pasta-com-pgn/
# e a avaliação de cada lance, que move a barra da partida do dia (precisa do stockfish)
node ferramentas/avalia-partidas.js

# por fim, corta os bancos nas fatias que o site baixa
node ferramentas/fatia-dados.js
```

A imagem que aparece ao compartilhar o link (`img/compartilhar-2.jpg`) sai de `ferramentas/gera-capa.js`.

A lista de partidas famosas (com os apelidos) fica no começo de `ferramentas/gera-partidas.js`.
Para trocar ou acrescentar frases, edite `dados/frases.js` (uma por linha). As frases de curiosidade
das partidas famosas ficam em `CURIOSIDADES`, no mesmo arquivo da lista.

**Depois de mexer em qualquer banco**, rode `node ferramentas/fatia-dados.js`. O site não baixa os
bancos inteiros: ele baixa só a fatia do dia, de `dados/fatias/` (cerca de 5 KB em vez de 360 KB).

## Publicar

`.github/workflows/publica.yml` publica no GitHub Pages a cada mudança na branch `main`
(em Settings → Pages → Source, escolha "GitHub Actions").

## Créditos

Peças: desenho próprio do Xadrez Express. Puzzles: Lichess (CC0). Fontes: Chakra Petch e Exo 2 (OFL).
