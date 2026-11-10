#!/usr/bin/env python3
"""Desenha o conjunto de peças próprio do Xadrez Express em img/pecas-express/.

Formas geométricas e arredondadas, com uma faixa dourada na base de todas as
peças (a marca do conjunto). Brancas quase puras, pretas em índigo com
contorno escuro. Uso: python3 ferramentas/gera-pecas-express.py
"""
import os

# o corpo de cada peça (viewBox 0 0 100 100); {d} = cor dos detalhes
FORMAS = {
    'p': '<circle cx="50" cy="30" r="14"/><path d="M41 42h18l9 30H32z"/>',
    'r': '<path d="M27 16h11v8h7v-8h10v8h7v-8h11v22H27z"/><path d="M34 38h32l3 34H31z"/>',
    'b': '<circle cx="50" cy="11" r="5"/><path d="M50 14c17 15 19 31 11 42H39c-8-11-6-27 11-42z"/>'
         '<path d="M56 25 46 39" stroke="{d}" stroke-width="4.5" fill="none"/><path d="M41 56h18l8 16H33z"/>',
    'n': '<path d="M33 72c0-17 13-23 9-35l-10 8-8-7 13-21 9 4 3-9 8 8c15 7 18 27 13 52z"/>'
         '<circle cx="44" cy="29" r="3.2" fill="{d}" stroke="none"/>'
         '<path d="M58 26c5 8 6 20 3 34" stroke="{d}" stroke-width="3.5" fill="none"/>',
    'q': '<path d="M23 31l11 27h32l11-27-14 13-13-19-13 19z"/><circle cx="23" cy="28" r="5.5"/>'
         '<circle cx="50" cy="21" r="5.5"/><circle cx="77" cy="28" r="5.5"/><path d="M35 58h30l4 14H31z"/>',
    'k': '<path d="M46 6h8v7h7v8h-7v9h-8v-9h-7v-8h7z"/><path d="M30 36q20-12 40 0l-6 22H36z"/>'
         '<path d="M35 58h30l4 14H31z"/>',
}
BASE = '<path d="M28 72h44v8H28z" fill="url(#o)"/><rect x="20" y="80" width="60" height="12" rx="6"/>'
CORES = {
    'w': dict(a='#ffffff', b='#f3f0ff', traco='#1b1250', d='#5a45c9'),
    'b': dict(a='#5b4bd0', b='#1a1158', traco='#0d0730', d='#ffd36b'),
}

def main():
    pasta = os.path.join(os.path.dirname(__file__), '..', 'img', 'pecas-express')
    os.makedirs(pasta, exist_ok=True)
    for cor, c in CORES.items():
        for peca, forma in FORMAS.items():
            svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><defs>'
                   '<linearGradient id="c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="%s"/><stop offset="1" stop-color="%s"/></linearGradient>'
                   '<linearGradient id="o" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9a8"/><stop offset="1" stop-color="#ffb53d"/></linearGradient>'
                   '</defs><g fill="url(#c)" stroke="%s" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round">%s%s</g></svg>'
                   ) % (c['a'], c['b'], c['traco'], forma.replace('{d}', c['d']), BASE)
            with open(os.path.join(pasta, cor + peca + '.svg'), 'w') as f:
                f.write(svg)
    print('12 peças gravadas em img/pecas-express/')

if __name__ == '__main__':
    main()
