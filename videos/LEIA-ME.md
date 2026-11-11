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
| `[visao 2d]` / `[visao 3d]` | troca o tabuleiro para o 2D (visto de cima) ou o 3D no meio do vídeo, com uma fusão curta |
| `[lance e2e4 @12.5]` | qualquer ordem pode ter o segundo exato, se precisar acertar na mão |

Alguns efeitos são automáticos, sem ordem nenhuma:

- **Captura:** a peça capturada fica na casa até a outra chegar e explode (clarão, onda e faíscas).
- **Xeque:** quando um lance deixa o rei em xeque, a casa do rei pisca em vermelho e aparece
  a faixa **XEQUE!**. Se for mate, a casa fica dourada e a faixa é **XEQUE-MATE!**. Só funciona com
  os dois reis no tabuleiro.

Os lances não passam por conferência de regra: a peça vai de uma casa à outra. Isso permite
posições de ensino (um cavalo sozinho no tabuleiro, sem reis). Linhas começadas por `#` são
anotações e não entram na fala.

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

