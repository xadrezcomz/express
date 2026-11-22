# Vídeos das lições

Transforma **o áudio da fala + um arquivo de texto da lição** num vídeo vertical (1080x1920, MP4)
com o tabuleiro 2D do site, as peças andando, setas, casas marcadas, legenda e a barrinha de
progresso. Uma lição de 1 minuto fica pronta em cerca de 1 minuto.

O tabuleiro é o 2D do Desafio (não o 3D da Partida do dia): visto de cima nenhuma peça
esconde outra, as setas apontam para a casa exata e ele ocupa a largura toda do celular.

## Os três jeitos de fazer um vídeo

**1. Gravei o áudio, sem texto.** O áudio é ouvido e vira o rascunho da lição; faltam só as
ordens do tabuleiro.

```sh
node videos/gera.js --rascunho minha-gravacao.m4a --nome 002-bispo
# edite videos/licoes/002-bispo.txt: título, posição e as ordens entre colchetes
node videos/gera.js 002-bispo
```

**2. Tenho o texto e gravo o áudio depois.** Escreva `videos/licoes/002-bispo.txt`, confira os
lances com `node videos/gera.js 002-bispo --previa` (vídeo mudo, no ritmo estimado da fala),
grave lendo o texto e salve em `videos/audios/002-bispo.m4a` (serve mp3, ogg, wav, opus...).

```sh
node videos/gera.js 002-bispo
```

**3. Só o texto, com a minha voz clonada (ElevenLabs).** O áudio é gravado pela ElevenLabs e o
vídeo sai direto do texto:

```sh
node videos/gera.js 002-bispo --voz
```

A chave da conta nunca fica em arquivo: nas sessões do Claude na nuvem ela é um segredo de
rede do ambiente; em outro computador, é a variável `ELEVENLABS_API_KEY`. A voz fica em
`voz.json`, na pasta das lições (`node videos/gera.js --vozes` lista os códigos da conta):

```json
{ "voz": "CODIGO_DA_VOZ", "modelo": "eleven_multilingual_v2",
  "ajustes": { "stability": 0.5, "similarity_boost": 0.8, "speed": 1.0 } }
```

Em quantidade: `node videos/gera.js todas` (com `--voz`, se for o caso) faz todas as lições
que têm áudio e ainda não têm vídeo em dia. Os vídeos ficam em `videos/prontos/`.

Os lances ficam no ponto da fala porque o áudio é ouvido por reconhecimento de fala, que anota
o segundo de cada palavra (na ElevenLabs, os segundos já vêm junto com o áudio). Por isso o
texto da lição precisa ser o que foi dito; pequenas diferenças não atrapalham.

## Onde ficam as lições

As lições do curso são vendidas, e este repositório é público. Por isso os textos e os áudios
ficam numa **pasta privada**, fora daqui, com `licoes/`, `audios/` e `voz.json`. O gerador
usa a pasta da variável `XE_LICOES` ou, se existir, a pasta `express-licoes` ao lado deste
repositório (um repositório privado clonado ali). Sem nenhuma das duas, ele usa `videos/`,
onde só entra a lição de exemplo (`licoes/exemplo-cavalo.txt`). Os vídeos prontos saem sempre
em `videos/prontos/`, que não vai para o repositório.

## O arquivo da lição

```
licao: 1
titulo: Como o cavalo se move
posicao: vazio
pecas: cavalo branco d4
---
O cavalo anda em L: [seta d4 e6] duas casas para um lado e uma para o outro.
[lance d4e6] Assim!
```

Cabeçalho (tudo opcional):

| Linha | O que faz |
|---|---|
| `licao: 1` | o número que aparece no selo "Lição 01" |
| `titulo: ...` | o título no alto do vídeo |
| `posicao: inicial` | `inicial`, `vazio` ou uma posição em FEN |
| `pecas: cavalo branco d4, rei preto e8` | peças postas por cima da posição |
| `lado: pretas` | vira o tabuleiro (pretas embaixo) |
| `legenda: nao` | tira a legenda |
| `voz: CODIGO` | a voz da ElevenLabs para esta lição |
| `estilo: 3d` | tabuleiro e peças em 3D, com a câmera acompanhando os lances (sem esta linha, sai o 2D) |

Depois do `---` vem a fala. Cada ordem entre colchetes acontece **quando começa a palavra
que vem logo depois dela**:

| Ordem | O que faz |
|---|---|
| `[lance e2e4]` ou `[e2e4]` | a peça de e2 vai para e4 (captura, roque, en passant e promoção funcionam) |
| `[lance e2e4 e7e5 g1f3]` | vários lances em sequência |
| `[lance e7e8 cavalo]` | promoção para outra peça (sem dizer, vira dama) |
| `[seta d4 e6]` | uma seta; no pulo do cavalo ela sai em L |
| `[seta d1h5 f1c4 vermelha]` | várias setas, com cor: `amarela`, `verde`, `vermelha`, `azul` |
| `[marca c6 e6 verde]` | destaca casas |
| `[limpa]` | apaga setas e marcas (um lance também apaga) |
| `[poe torre preta g7]` | faz aparecer uma peça |
| `[tira g7]` | faz sumir uma peça |
| `[posicao inicial]` | troca a posição inteira (`inicial`, `vazio` ou FEN) |
| `[mostra bispo]` | a peça bem grande, com o nome, por cima do tabuleiro (`[mostra cavalo preto]` para a preta) |
| `[mostra logo]` | o logo do Xadrez Express grande, para chamadas ("na próxima aula...") |
| `[esconde]` | tira o cartaz da peça (`[limpa]` e um lance também tiram) |
| `[texto Garfo!]` | uma faixa com o texto no meio do tabuleiro, por 1,6 segundo |
| `[mao f3]` | uma mão desce e segura a peça de f3 (só no 3D); se o lance seguinte sair dessa casa, a mão leva a peça junto e solta. Se a pasta privada das lições tem `modelos/mao.fbx` (uma mão com ossos nos dedos), é esse modelo 3D que aparece, fechando em pinça; sem ele, um desenho |
| `[visao 2d]` / `[visao 3d]` | troca o tabuleiro para o 2D (visto de cima) ou o 3D no meio do vídeo, com uma fusão curta |
| `[lance e2e4 @12.5]` | qualquer ordem pode ter o segundo exato, se precisar acertar na mão |

Alguns efeitos são automáticos, sem ordem nenhuma:

- **Captura:** a peça capturada fica na casa até a outra chegar e explode (clarão, onda e faíscas).
- **Xeque:** quando um lance deixa o rei em xeque, a casa do rei pisca em vermelho e aparece
  a faixa **XEQUE!**. Se for mate, a casa fica dourada e a faixa é **XEQUE-MATE!**. Só funciona com
  os dois reis no tabuleiro.

**Fala diferente da legenda.** `{trinta e duas|32}` faz a voz falar "trinta e duas" e a legenda
mostrar "32" (bom para números, que a voz erra no gênero quando vêm em algarismos). As casas
escritas como `e5`, `D4` ou `E quatro` são faladas pelo nome da letra ("é cinco", "dê quatro"):
sem isso a voz lê o "e" como a conjunção ("i").

Os lances não passam por conferência de regra: a peça vai de uma casa à outra. Isso permite
posições de ensino (um cavalo sozinho no tabuleiro, sem reis). Linhas começadas por `#` são
anotações e não entram na fala.

## Zona segura dos Reels

O Instagram cobre o vídeo com o nome da conta, a legenda do post e os botões de curtir,
comentar e compartilhar. Por isso o título, a legenda, o tabuleiro, as faixas, os cartazes, as
telas gráficas e o rodapé ficam dentro de **x 80–940 e y 250–1480** (250 px livres em cima, 440
embaixo, 80 à esquerda e 140 à direita). As medidas estão no fim do `palco.css` e do
`palco3d.css`, e o enquadramento da câmera 3D (`QUADRO` no `palco3d.js`) segue a mesma área.

## A edição "show"

Com `edicao: show` no cabeçalho (e `estilo: 3d`), o vídeo ganha uma edição mais intensa:

- **texto animado** no alto no lugar da legenda: a frase entra palavra por palavra; as palavras
  escritas entre asteriscos na fala (`um lance *ousado:*`) vêm grandes e douradas (os asteriscos
  não vão para a voz);
- **barra fixa** com o nome da aula e o contador de lances (conta as ordens `[nota]`);
- câmera mais perto e mais baixa; o mate pisca e treme a tela, a captura treme;
- **efeitos sonoros**, se a pasta das lições tiver `sons/` (`peca`, `impacto`, `mate`, `whoosh`,
  `pop`, `alerta`, em mp3): cada lance, captura, mate, tela e etiqueta toca o seu som.

E estas ordens (só no 3D):

| Ordem | O que faz |
|---|---|
| `[nota 7... Cd3#]` | o lance escrito, grande, embaixo do tabuleiro |
| `[etiqueta d3 Livre! vermelha]` | um adesivo com texto em cima da casa (`amarela`, `verde`, `vermelha`, `azul`); some num `[limpa]` ou depois de 4,5 s |
| `[flash vermelha]` | a tela pisca na cor |
| `[treme]` | a tela treme |
| `[tela numero 7 \| lances]` | número gigante (com bolinhas, se for até 12) |
| `[tela alerta Armadilha! \| subtítulo]` | alerta com fundo listrado |
| `[tela carimbo Texto do papel \| CARIMBO \| cabeçalho]` | um papel que recebe um carimbo |
| `[tela medidor 95 \| Confiança]` | um medidor que sobe até o valor (%) |
| `[tela lista Item ✓ \| Item ✗ \| Item ?]` | lista que entra item por item |
| `[tela frase linha pequena \| LINHA GRANDE]` | uma frase de impacto em tela cheia |

| `[tela cronometro 5 \| Ache o lance!]` | contagem regressiva (para desafios) |
| `[tela icone trofeu \| Título \| subtítulo]` | uma ilustração de `videos/icones/` (relogio, trofeu, celular, apito, livro, lampada, alvo) |
| `[tela versus FEN lance \| Iniciante \| FEN lance \| Mestre]` | dois tabuleirinhos lado a lado: o lance errado (vermelho) e o certo (verde) |
| `[tela celular pasta/gravacao \| 4]` | um celular grande na tela, tocando uma gravação de tela (mp4 vertical) a partir do segundo 4; o caminho é relativo à pasta das lições. Fica até o próximo lance, `[esconde]`, `[limpa]`, posição ou tela |
| `[zoom]` | a câmera chega bem perto do próximo lance (o golpe decisivo) |
| `[lance e5d3 lento]` | a peça anda em câmera lenta |

Cabeçalho da edição show: `serie: Armadilha #2 de 8` (aparece na barra e na capa) e
`musica: suspense` (trilha de `musicas/` da pasta das lições, baixinha por baixo da voz). Todo
vídeo show abre com uma **capa** de 0,7 s (título grande e série), que o `posta.js` usa como capa
do Reel.

A tela gráfica cobre o tabuleiro até um `[esconde]`, `[limpa]`, lance, `[posicao]` ou outra tela.

## O estilo 3D

Com `estilo: 3d` no cabeçalho (ou `--3d` no comando), o vídeo sai com o tabuleiro e as peças
em 3D, no desenho das peças do site, e uma câmera que vai até as casas de cada acontecimento
(lance, seta, marca, peça nova) e volta a mostrar o tabuleiro inteiro quando a posição muda.
As ordens e os efeitos são os mesmos do 2D. A legenda fica em caixinhas, logo abaixo do título.

Para variar o visual, uma lição pode alternar os dois estilos com `[visao 2d]` e `[visao 3d]`
(o cabeçalho diz com qual começa). O vídeo é filmado inteiro nos dois estilos e os trechos são
emendados com uma fusão de 0,35 segundo; por isso leva o tempo do 3D mais o do 2D. Com `--2d` ou
`--3d` no comando, as trocas são ignoradas (bom para conferir rápido); numa `--foto`, vale o
estilo daquele segundo. Deixe pelo menos 1 segundo entre duas trocas.

O 3D é desenhado pelo processador (sem placa de vídeo), então demora mais: uma lição de 30
segundos leva cerca de 1 minuto e meio, contra uns 30 segundos no 2D. `--2d` força o 2D numa
lição que tem `estilo: 3d`.

## O avatar do professor

Com `avatar: sim` no cabeçalho, o professor (um desenho) aparece no canto de baixo, à esquerda,
falando junto com a voz: a boca abre e fecha com o volume do áudio, os olhos piscam e o corpo
balança de leve. Tudo é feito aqui, com programas gratuitos (`videos/avatar.py`, em Python, com
numpy, scipy e Pillow); não usa nenhum serviço pago.

As imagens são a cara do dono do curso, então ficam na pasta privada das lições, em `avatar/`:
um PNG com fundo transparente por pose e o `poses.json`, que marca em cada pose, em pixels da
imagem:

- cada olho: os dois cantos (`c`), o ponto mais alto da pálpebra (`topo`) e o mais baixo do olho
  (`baixo`). A pálpebra desce seguindo o ângulo daquele olho, coberta com a pele lisa de volta
  dele, e fecha num arco com a linha dos cílios; a armação dos óculos fica por cima
  (`"armacao": true` quando ela cruza o próprio olho);
- a boca: os dois cantos (`c`) e o meio da linha onde ela abre (`meio`: a borda de baixo dos
  dentes de cima, ou o encontro dos lábios). O programa acha a borda exata perto dessa linha, e o
  queixo desce na direção do queixo daquela pose (perpendicular aos cantos da boca).

A boca abre com o volume da voz e fica redonda nos "o" e "u" (ele usa o tempo de cada palavra
do `.palavras.json` do áudio). Sem a pasta `avatar/`, o vídeo sai sem o avatar.

A pose muda sozinha conforme a fala:

| Quando | Pose |
|---|---|
| a primeira frase | `apresenta` |
| uma pergunta | `pensa` e `duvida`, alternando |
| "atenção", "cuidado", "importante", `[tela alerta]` | `atencao` |
| "parabéns", "muito bem", "isso aí" | `comemora` |
| um xeque-mate | `surpreso` |
| `[mostra cavalo]` (e as outras peças) | segurando a peça: `peao`, `torre`, `cavalo`, `bispo`, `dama`, `rei` |
| "até lá", `[mostra logo]` | `joinha` |
| no resto, a cada 6 segundos ou mais | `explica`, `fala` e `apresenta`, em rodízio |

Para escolher a pose num ponto da fala, use `[avatar surpreso]` (vale por uns 4 segundos).
O avatar é colado no vídeo pronto e leva uns 40 segundos a mais por minuto de vídeo.

Ele ocupa a faixa de baixo da tela, abaixo do tabuleiro (até 10 px da borda, para a barrinha de
progresso continuar à vista). Nos Reels essa faixa fica por baixo do nome do perfil e da legenda
do Instagram: use o avatar nas aulas do curso.

### O avatar de uma pose só (o padrão)

Se a pasta `avatar/` tiver um `avatar.json`, vale o avatar de uma pose só (`videos/avatar2.py`),
que se mexe em vez de trocar de desenho. São várias imagens do mesmo desenho, do mesmo tamanho
e com o rosto no mesmo lugar, em que só muda um pedaço:

- `base`: a pose de descanso, de boca fechada;
- `bocas`: uma por som (A, E, I, O, U, M, F e um sorriso para as pausas). A fala vira sons letra
  a letra, no tempo de cada palavra. A boca não troca de imagem: o programa mede (fluxo óptico)
  como cada ponto dos lábios anda da pose de descanso até cada som e deforma a boca aos poucos.
  O quanto ela abre segue o volume da voz, com a inércia de uma mola (acelera e freia), e na
  passagem de um som para outro os movimentos se misturam antes das cores, sem imagem fantasma;
- `olhos`: meio fechado e fechado (a piscada, às vezes dupla) e olhando para baixo (nas perguntas);
- `gestos`: o braço explicando (de tempos em tempos), o dedo levantado ("atenção", "importante",
  "regra") e o joinha ("até lá", `[mostra logo]`); a boca e os olhos continuam animados;
- `reacoes`: comemorando ("parabéns", "muito bem") e surpreso (no xeque-mate), por pouco tempo.

O corpo respira, a cabeça balança de leve e acena nas palavras em `*destaque*`.
`[avatar dedo]` (ou `explica`, `joinha`, `pensa`, `comemora`, `surpreso`) força um gesto.

## Postar no Instagram

`node videos/posta.js NOME` converte `videos/prontos/NOME.mp4` para o formato de Reels do Instagram,
cria o post com a legenda de `instagram/NOME.txt` (na pasta privada das lições) e envia o vídeo,
mas **não publica**: fica um rascunho que expira em 24 horas. `--publica` publica de verdade e anota
o link em `instagram/publicados.json`. A conta e o quadro da capa ficam em `instagram.json`
(`{ "conta": "ID da conta do Instagram", "capa_ms": 1500 }`).

O token da Meta (login do Facebook para Empresas, com `instagram_content_publish`) nunca fica em
arquivo: nas sessões do Claude na nuvem ele é um segredo de rede do ambiente para
`graph.facebook.com` e `rupload.facebook.com`; em outro computador, a variável `META_TOKEN`.

## Para rodar

Precisa de `node`, `ffmpeg`, `playwright` (Chromium) e, para áudio gravado,
`pip install faster-whisper` (o modelo é baixado na primeira vez).

| Arquivo | O que é |
|---|---|
| `gera.js` | a linha de comando: fotografa os quadros e monta o MP4 |
| `licao.js` | lê a lição e calcula o segundo de cada lance, seta e legenda |
| `palco.html`, `palco.css`, `palco.js` | o quadro do vídeo 2D: visual, tabuleiro e animações |
| `palco3d.html`, `palco3d.css`, `palco3d.js` | o quadro do vídeo 3D (three.js): cena, peças, câmera e animações |
| `vendor/` | o three.js (licença MIT), guardado aqui porque o site não tem etapa de build |
| `alinha.py` | ouve o áudio e anota o segundo de cada palavra |
| `voz.js` | grava a fala na ElevenLabs |

O visual (cores, tamanho do título, legenda) fica em `palco.css`. Como o vídeo é refeito a
partir do texto e do áudio, mudar o visual e rodar `todas --refaz` atualiza o curso inteiro.

