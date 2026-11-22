# Capas da Hotmart

Capas dos módulos e das aulas (1920x1080, JPG) com a identidade do site.

| Arquivo | O que é |
|---|---|
| `lista.js` | Os módulos e as aulas: títulos, peça, cor, duração. **É aqui que se muda um título.** |
| `lista-bonus.js` | Os 11 módulos bônus (capa "BÔNUS 01", arquivos `bonus-01.jpg`, `bonus-01-aula-01.jpg`) |
| `modelo-modulo.html` | O desenho da capa de módulo |
| `modelo-aula.html` | O desenho da capa de aula |
| `modelo-banner.html` | O fundo do topo do curso na área de membros (1920x640, 3:1): `banner-hotmart.jpg` |
| `capa.css`, `capa.js` | O que os dois modelos têm em comum (fundo, marca, estrelas, rastro, foguete) |
| `gera.js` | Tira as fotos com o Playwright e confere tamanho e peso |
| `saida/` | As capas prontas, a `folha-miniaturas.jpg` (módulos) e a `folha-bonus.jpg` (bônus) |

```sh
node capas/gera.js             # todas as capas + folha de miniaturas
node capas/gera.js modulo-03     # só o módulo 3 e as aulas dele
node capas/gera.js bonus-07      # só o bônus 07 e as aulas dele
node capas/gera.js banner        # só o fundo do topo do curso
node capas/gera.js --amostra   # só a primeira de módulo e a primeira de aula
```

O título encolhe sozinho até caber em três linhas. Se mesmo assim não couber, ou se um
arquivo passar do limite da Hotmart (5 MB módulo, 2 MB aula), o script avisa e termina com erro.
As cores dos módulos se alternam (ciano, ouro, rosa, roxo, laranja) pela ordem da lista.
