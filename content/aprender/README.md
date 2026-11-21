# Conteúdo da seção Aprender

Tudo o que aparece em `aprender/` (catálogo, cards e lições) vem destes arquivos JSON.
Para criar uma lição nova não é preciso mexer em código: basta escrever o JSON e listá-lo no card.

```
content/aprender/
  colecoes.json                  as coleções e a ordem dos cards
  cards/{card}/card.json         título, descrição e a lista de lições do card
  cards/{card}/licao-01.json     teoria, exercícios e avaliação de uma lição
assets/aprender/avatar/          imagens do professor (PNG com fundo transparente)
assets/aprender/capas/           capas dos cards (3:4)
```

Endereços: `aprender/#/` é o catálogo, `aprender/#/{card}` a página do card e
`aprender/#/{card}/{licao}` a lição (com `/teoria`, `/exercicios` ou `/avaliacao` no fim).

## colecoes.json

```json
{ "colecoes": [
  { "id": "primeiros-passos", "titulo": "Primeiros Passos", "cards": ["aprendendo-xadrez"] }
] }
```

`cards` lista as pastas de `cards/`, na ordem em que aparecem.

## card.json

```json
{
  "titulo": "Aprendendo Xadrez",
  "descricao": "Uma frase curta sobre o card.",
  "capa": "aprendendo-xadrez.webp",
  "peca": "wn",
  "licoes": [
    { "id": "licao-01", "titulo": "O Tabuleiro" },
    { "id": "licao-02", "titulo": "Mate em 1" }
  ]
}
```

- `licoes`: a ordem da lista é a numeração (1, 2, 3...). O `id` é o nome do arquivo sem `.json`.
- `capa` (opcional): arquivo em `assets/aprender/capas/`. Se faltar, o site procura `{card}.webp`;
  sem imagem, mostra uma capa provisória com o título e a peça de `peca` (`wn`, `wq`, `bk`...).

## A lição (licao-XX.json)

```json
{
  "id": "licao-01",
  "titulo": "O Tabuleiro",
  "abertura": "Texto da capa da lição.",
  "teoria": [ ...passos... ],
  "exercicios": { "instrucao": "Faça o melhor lance", "itens": [ ...exercícios... ] },
  "avaliacao": [ ...questões... ]
}
```

### Texto do professor

Vale em `texto`, `acerto`, `pergunta` e `explicacao`: `**negrito**` e `==destaque==` (palavra-chave
marcada em amarelo).

### Posições

`fen` aceita uma posição FEN ou os atalhos `"vazio"` (tabuleiro sem peças) e `"inicial"`.
`lado: "b"` mostra o tabuleiro do ponto de vista das pretas. Casas sempre em minúsculas: `e4`.
Lances em UCI: casa de saída + casa de chegada (`e2e4`), com a peça no fim na promoção (`e7e8q`).

### Passos da teoria

```json
{
  "fen": "vazio",
  "texto": "Esta é a casa ==e4==.",
  "pose": "apontando",
  "destaques": [{ "casas": ["e4"], "cor": "verde" }],
  "setas": [{ "de": "e2", "para": "e4", "cor": "azul" }],
  "rotulos": ["e4"],
  "animacao": ["e2e4", "e7e5"],
  "interativo": { "casa": "e4", "acerto": "Isso!", "erro": "Quase!" }
}
```

- `pose`: a expressão do professor naquele passo (sem `pose`, vale `explicando`):

  | pose | quando usar |
  |---|---|
  | `apresentando` | abertura da lição e boas-vindas |
  | `comemorando` | acertos e conquistas |
  | `curioso` | perguntas e desafios ("sua vez") |
  | `explicando` | regras importantes (a padrão) |
  | `surpreso` | jogadas inesperadas e curiosidades |
  | `pensativo` | análise de posições e problemas |
  | `atencao` | alertas e erros comuns |
  | `aprovando` | elogios e encerramento |
  | `curso` | o professor segurando o peão: quando se fala do curso |

  | `peca-peao`, `peca-torre`, `peca-bispo`, `peca-cavalo`, `peca-dama`, `peca-rei` | o professor segurando a peça |
  | `gesto-aponta`, `gesto-aqui`, `gesto-oferece`, `gesto-vem`, `gesto-convida`, `gesto-pensa`, `gesto-cinco`, `gesto-tres`, `mostrando` | gestos de explicação (`gesto-tres`: "três saídas", "três defesas") |

  Cada reação tem variações que o site alterna sozinho para não repetir a mesma imagem (por exemplo,
  `comemorando` vira às vezes `vibrando`, `joinha` ou `piscadinha`; a lista fica em `VARIA`, em
  `js/aprender.js`). Passos sem `pose` alternam entre os gestos de explicação.

  Na lição de uma peça, ponha `"avatar": "peca-torre"` (logo depois do título): a capa, a abertura e
  um a cada três passos de explicação mostram o professor segurando a peça.

  Nos exercícios e na avaliação o site escolhe sozinho: `curioso` na pergunta, `comemorando` no acerto,
  `atencao` no erro, `pensativo` na dica, e `curso` na tela de lição concluída.
- Cores de destaques e setas: `verde`, `vermelho`, `azul`, `amarelo`, `roxo`, `rosa`.
- `rotulos`: escreve o nome dentro das casas. `"todas"` mostra o mapa inteiro.
- `animacao`: lances jogados sozinhos ao entrar no passo; destaques e setas aparecem depois deles.
- `interativo`: o aluno só avança depois de tocar na casa (`"casa"`) ou fazer o lance (`"lance"`).
  Se o lance pedido dá mate, qualquer outro mate também vale. Depois de dois erros, o professor
  mostra o caminho.

### Exercícios

Quatro tipos de item:

```json
{ "tipo": "casa", "fen": "vazio", "pergunta": "Toque na casa e5", "resposta": ["e5"], "dica": "..." }
{ "tipo": "autoral", "fen": "...", "pergunta": "Leve o bispo até h8", "solucao": ["a1h8"], "dica": "..." }
{ "tipo": "lichess", "puzzleId": "00sHx" }
{ "tipo": "multipla", "fen": "...", "pergunta": "Xeque, mate ou afogamento?", "opcoes": ["Xeque", "Xeque-mate", "Empate por afogamento"], "correta": 1, "explicacao": "..." }
```

- `multipla`: pergunta de escolha. Com `fen` (e, se quiser, `setas` e `destaques`), a posição aparece no
  tabuleiro; sem `fen`, o tabuleiro some. Nos exercícios dá para errar e tentar de novo.

- `casa`: o aluno toca numa casa; `resposta` pode ter várias casas certas.
- `autoral`: a `solucao` alterna lance do aluno e resposta do adversário (`["a1a8", "e8d7", "a8d8"]`).
  Quem joga é quem tem a vez na `fen`.
- `lichess`: vem do banco do Lichess. **Não preencha à mão**: veja abaixo.
- Em qualquer lance, um xeque-mate sempre vale como acerto.
- A primeira dica marca a peça (ou mostra o texto de `dica`); a segunda mostra a seta.

### Avaliação Final

Os mesmos tipos dos exercícios (`casa`, `autoral`, `lichess`, `multipla`). A múltipla escolha também aceita `fen`:

```json
{ "tipo": "multipla", "pergunta": "Quantas casas tem o tabuleiro?",
  "opcoes": ["32", "48", "64", "81"], "correta": 2, "explicacao": "São 8 × 8 = 64 casas." }
```

`correta` conta a partir de zero (A = 0, B = 1...). Sem dica e uma tentativa só; aprova com 70%.

## Exercícios do Lichess

O banco tem milhões de puzzles, então nada é carregado no navegador. Um script escolhe os puzzles
e grava a posição e os lances dentro do JSON da lição:

1. Na lição, ponha o filtro e as vagas:
   ```json
   "importar": { "temas": ["mateIn1"], "rating": [600, 1000], "popularidade": 80, "jogadas": 500 },
   "exercicios": { "instrucao": "Mate em 1", "itens": [{ "tipo": "lichess" }, { "tipo": "lichess" }] }
   ```
   Também vale `"aberturas": ["Italian_Game"]` no filtro, e vagas na `avaliacao`
   (`{ "tipo": "lichess", "pergunta": "Mate em 1" }`). Para um puzzle específico, use
   `{ "tipo": "lichess", "puzzleId": "00sHx" }`.
2. Baixe o banco e rode o script (leva cerca de 30 segundos):
   ```sh
   curl -O https://database.lichess.org/lichess_db_puzzle.csv.zst
   pip install zstandard
   python3 ferramentas/importa-puzzles-aprender.py lichess_db_puzzle.csv.zst
   ```

A escolha é sempre a mesma, e um puzzle nunca se repete entre lições. Para trocar um puzzle, apague o
`fen` dele (e o `puzzleId`, para sortear outro) e rode de novo.
Temas úteis: `mateIn1`, `mateIn2`, `fork`, `pin`, `skewer`, `hangingPiece`, `endgame`, `opening`.

## Avatar e capas

- Avatar: uma imagem por expressão em `assets/aprender/avatar/{pose}.webp` (a tabela de poses está
  acima), quadrada (440 × 440), com fundo transparente e o professor apoiado na borda de baixo.
  Pose que faltar usa `explicando.webp`; sem nenhuma, aparece `placeholder.svg`.
- Capas: `assets/aprender/capas/{card}.webp` (ou PNG, com o nome em `capa`), proporção 3:4,
  por exemplo 600 × 800. O título fica embaixo da imagem, então a capa não precisa de texto.

## Progresso

Fica só no aparelho de cada pessoa (localStorage, chave `xe.aprender`): passo da teoria, exercícios
feitos, nota e aprovação da avaliação. O botão "Zerar meu progresso", no fim do catálogo, apaga tudo.
Não há conta, cadastro nem servidor.
