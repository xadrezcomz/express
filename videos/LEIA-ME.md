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

**3. Só o texto, com a minha voz clonada (ElevenLabs).** Com as variáveis `ELEVENLABS_API_KEY` e
`ELEVENLABS_VOICE_ID` definidas, o áudio é gravado e o vídeo sai direto do texto:

```sh
node videos/gera.js 002-bispo --voz
```

Em quantidade: `node videos/gera.js todas` (com `--voz`, se for o caso) faz todas as lições
que têm áudio e ainda não têm vídeo em dia. Os vídeos ficam em `videos/prontos/`.

Os lances ficam no ponto da fala porque o áudio é ouvido por reconhecimento de fala, que anota
o segundo de cada palavra (na ElevenLabs, os segundos já vêm junto com o áudio). Por isso o
texto da lição precisa ser o que foi dito; pequenas diferenças não atrapalham.

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
| `[lance e2e4 @12.5]` | qualquer ordem pode ter o segundo exato, se precisar acertar na mão |

Os lances não passam por conferência de regra: a peça vai de uma casa à outra. Isso permite
posições de ensino (um cavalo sozinho no tabuleiro, sem reis). Linhas começadas por `#` são
anotações e não entram na fala.

## Para rodar

Precisa de `node`, `ffmpeg`, `playwright` (Chromium) e, para áudio gravado,
`pip install faster-whisper` (o modelo é baixado na primeira vez).

| Arquivo | O que é |
|---|---|
| `gera.js` | a linha de comando: fotografa os quadros e monta o MP4 |
| `licao.js` | lê a lição e calcula o segundo de cada lance, seta e legenda |
| `palco.html`, `palco.css`, `palco.js` | o quadro do vídeo: visual, tabuleiro e animações |
| `alinha.py` | ouve o áudio e anota o segundo de cada palavra |
| `voz.js` | grava a fala na ElevenLabs |

O visual (cores, tamanho do título, legenda) fica em `palco.css`. Como o vídeo é refeito a
partir do texto e do áudio, mudar o visual e rodar `todas --refaz` atualiza o curso inteiro.

As gravações (`audios/`) e os vídeos (`prontos/`) não vão para o repositório, que é público.
