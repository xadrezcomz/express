#!/usr/bin/env python3
"""Monta dados/puzzles.js a partir do banco de puzzles do Lichess (domínio público, CC0).

Uso:
    curl -O https://database.lichess.org/lichess_db_puzzle.csv.zst
    pip install zstandard
    python3 ferramentas/gera-puzzles.py lichess_db_puzzle.csv.zst

Escolhe puzzles curtos, bem avaliados e de nível iniciante a intermediário, e
grava um por dia para dois anos. A ordem é sempre a mesma (semente fixa), então
rodar de novo com o mesmo banco dá o mesmo arquivo.
"""
import csv
import io
import random
import sys

import zstandard

QUANTOS = 728            # 104 semanas (dois anos) sem repetir; múltiplo de 7 para a semana não desalinhar
RATING = (700, 1500)     # do iniciante ao intermediário
# a semana vai ficando mais difícil: segunda é o mais fácil, domingo o mais difícil
FAIXAS = [(700, 900), (800, 1000), (900, 1100), (1000, 1200), (1100, 1300), (1200, 1400), (1300, 1500)]
POR_FAIXA = 2000         # quantos candidatos guardar por faixa antes de sortear


def candidatos(caminho):
    with open(caminho, 'rb') as f:
        texto = io.TextIOWrapper(zstandard.ZstdDecompressor().stream_reader(f), encoding='utf-8')
        for l in csv.DictReader(texto):
            rating = int(l['Rating'])
            lances = l['Moves'].split()
            if not (RATING[0] <= rating < RATING[1]):
                continue
            if int(l['RatingDeviation']) > 80 or int(l['Popularity']) < 92 or int(l['NbPlays']) < 3000:
                continue
            # 1º lance é do adversário; depois, de 1 a 3 lances de quem resolve
            if len(lances) not in (2, 4, 6):
                continue
            yield rating, l


def main():
    caminho = sys.argv[1]
    baldes = [[] for _ in FAIXAS]
    for rating, l in candidatos(caminho):
        for i, (a, b) in enumerate(FAIXAS):
            if a <= rating < b and len(baldes[i]) < POR_FAIXA:
                baldes[i].append(l)
        if all(len(b) >= POR_FAIXA for b in baldes):
            break

    sorteio = random.Random(20260101)
    usados, escolhidos = set(), []
    for b in baldes:
        sorteio.shuffle(b)
    dia = 0
    while len(escolhidos) < QUANTOS:
        balde = baldes[dia % 7]
        while balde:
            l = balde.pop()
            if l['PuzzleId'] not in usados:
                usados.add(l['PuzzleId'])
                escolhidos.append(l)
                break
        else:
            raise SystemExit('faltaram puzzles na faixa %d' % (dia % 7))
        dia += 1

    with open('dados/puzzles.js', 'w', encoding='utf-8') as s:
        s.write('// Puzzles do dia: banco do Lichess (lichess.org/training), domínio público (CC0).\n')
        s.write('// Gerado por ferramentas/gera-puzzles.py. Cada linha: id|FEN|lances|rating|temas.\n')
        s.write('// O índice 0 cai numa segunda-feira; a dificuldade sobe ao longo da semana.\n')
        s.write('window.XE_PUZZLES = [\n')
        for l in escolhidos:
            campos = [l['PuzzleId'], l['FEN'], l['Moves'], l['Rating'], l['Themes']]
            s.write("'" + '|'.join(campos) + "',\n")
        s.write('];\n')
    print('gravados', len(escolhidos), 'puzzles')


if __name__ == '__main__':
    main()
