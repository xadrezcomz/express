# Xadrez Express — regras do projeto

## Seção Aprender (lições)

Toda lição nova ou alterada em `content/aprender/` segue as regras de `content/aprender/README.md`
("Regras obrigatórias") e precisa passar em `node ferramentas/valida-aprender.js` antes de subir.
O verificador também roda na publicação (`.github/workflows/publica.yml`) e barra lição com erro.

Em resumo: setas e destaques calculados pelas regras (seta de movimento vai até o fim da linha;
vermelha só para o que não pode), números do texto batendo com o tabuleiro, reis fora das linhas da
peça explicada, perguntas de movimento com `origem` e resposta completa, e nenhuma pergunta ambígua.
