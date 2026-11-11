# Capas da Hotmart

Capas dos módulos e das aulas (1920x1080, JPG) com a identidade do site.

| Arquivo | O que é |
|---|---|
| `lista.js` | Os módulos e as aulas: títulos, peça, cor, duração. **É aqui que se muda um título.** |
| `modelo-modulo.html` | O desenho da capa de módulo |
| `modelo-aula.html` | O desenho da capa de aula |
| `capa.css`, `capa.js` | O que os dois modelos têm em comum (fundo, marca, estrelas, rastro, foguete) |
| `gera.js` | Tira as fotos com o Playwright e confere tamanho e peso |
| `saida/` | As capas prontas e a `folha-miniaturas.jpg` |

```sh
node capas/gera.js             # todas as capas + folha de miniaturas
node capas/gera.js 03          # só o módulo 03 e as aulas dele
node capas/gera.js --amostra   # só a primeira de módulo e a primeira de aula
```

O título encolhe sozinho até caber em três linhas. Se mesmo assim não couber, ou se um
arquivo passar do limite da Hotmart (5 MB módulo, 2 MB aula), o script avisa e termina com erro.
As cores dos módulos se alternam (ciano, ouro, rosa, roxo, laranja) pela ordem da lista.
