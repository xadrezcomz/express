#!/usr/bin/env python3
"""Preenche os exercícios do Lichess nas lições da seção Aprender (content/aprender/).

Uso:
    curl -O https://database.lichess.org/lichess_db_puzzle.csv.zst
    pip install zstandard
    python3 ferramentas/importa-puzzles-aprender.py lichess_db_puzzle.csv.zst

Como funciona, dentro de cada licao-XX.json:
  - Um item { "tipo": "lichess", "puzzleId": "00sHx" } sem posição ganha a posição
    e os lances desse puzzle.
  - Um item { "tipo": "lichess" } sem puzzleId é uma vaga: o script escolhe um puzzle
    pelo filtro "importar" da lição, por exemplo
        "importar": { "temas": ["mateIn1"], "rating": [600, 1000], "popularidade": 80, "jogadas": 500 }
    (temas: o puzzle precisa ter todos; aberturas: precisa ter pelo menos uma).
  - Itens que já têm posição não são tocados. Para trocar um puzzle, apague o "fen" dele
    (e o "puzzleId", se quiser outro sorteado) e rode de novo.

A escolha é sempre a mesma para o mesmo banco (ordem fixa), e nenhum puzzle se repete
em lições diferentes. Os exercícios ficam gravados no JSON: o site nunca sorteia na visita.
"""
import csv
import glob
import hashlib
import io
import json
import os
import re
import sys

import zstandard

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'content', 'aprender', 'cards')


def vagas(licao):
    """Todos os itens do Lichess da lição (exercícios e avaliação), na ordem."""
    itens = list((licao.get('exercicios') or {}).get('itens') or [])
    itens += licao.get('avaliacao') or []
    return [i for i in itens if i.get('tipo') == 'lichess']


def serve(linha, filtro):
    temas = linha['Themes'].split()
    rating = int(linha['Rating'])
    faixa = filtro.get('rating') or [0, 4000]
    if not (faixa[0] <= rating <= faixa[1]):
        return False
    if int(linha['Popularity']) < filtro.get('popularidade', 0) or int(linha['NbPlays']) < filtro.get('jogadas', 0):
        return False
    if any(t not in temas for t in filtro.get('temas') or []):
        return False
    aberturas = filtro.get('aberturas') or []
    if aberturas and not set(aberturas) & set(linha.get('OpeningTags', '').split()):
        return False
    return True


def ordem(pid):
    return hashlib.md5(pid.encode()).hexdigest()


def preenche(item, linha):
    item['puzzleId'] = linha['PuzzleId']
    item['fen'] = linha['FEN']
    item['lances'] = linha['Moves'].split()
    item['rating'] = int(linha['Rating'])
    item['temas'] = linha['Themes'].split()


def grava(caminho, dados):
    texto = json.dumps(dados, ensure_ascii=False, indent=2)
    # listas curtas (casas, lances, temas) ficam numa linha só, para o arquivo continuar fácil de ler
    texto = re.sub(r'\[\s+((?:"[^"\n]*"|-?\d+)(?:,\s+(?:"[^"\n]*"|-?\d+))*)\s+\]',
                   lambda m: '[' + re.sub(r',\s+', ', ', m.group(1)) + ']', texto)
    with open(caminho, 'w', encoding='utf-8') as f:
        f.write(texto + '\n')


def main():
    banco = sys.argv[1]
    licoes, antes = {}, {}
    for caminho in sorted(glob.glob(os.path.join(RAIZ, '*', 'licao-*.json'))):
        with open(caminho, encoding='utf-8') as f:
            licoes[caminho] = json.load(f)
        antes[caminho] = json.dumps(licoes[caminho], sort_keys=True)

    usados = set()
    pedidos = {}          # puzzleId pedido -> itens que querem esse puzzle
    sorteio = {}          # caminho -> (filtro, quantas vagas)
    for caminho, licao in licoes.items():
        livres = 0
        for item in vagas(licao):
            if item.get('fen'):
                usados.add(item.get('puzzleId'))
            elif item.get('puzzleId'):
                pedidos.setdefault(item['puzzleId'], []).append(item)
            else:
                livres += 1
        if livres:
            if not licao.get('importar'):
                sys.exit('%s tem exercícios do Lichess sem puzzleId, mas não tem o filtro "importar"' % caminho)
            sorteio[caminho] = (licao['importar'], livres)
    if not pedidos and not sorteio:
        print('nada a preencher')
        return

    # uma passada só pelo banco: guarda os pedidos e os candidatos de cada lição
    candidatos = {c: [] for c in sorteio}
    with open(banco, 'rb') as f:
        texto = io.TextIOWrapper(zstandard.ZstdDecompressor().stream_reader(f), encoding='utf-8')
        for linha in csv.DictReader(texto):
            pid = linha['PuzzleId']
            for item in pedidos.pop(pid, []):
                preenche(item, linha)
                usados.add(pid)
            for caminho, (filtro, _) in sorteio.items():
                if serve(linha, filtro):
                    candidatos[caminho].append(linha)
    for pid in pedidos:
        print('AVISO: o puzzle %s não está no banco' % pid)

    for caminho, (filtro, livres) in sorteio.items():
        escolha = [l for l in sorted(candidatos[caminho], key=lambda l: ordem(l['PuzzleId'])) if l['PuzzleId'] not in usados]
        if len(escolha) < livres:
            sys.exit('%s: só %d puzzles servem no filtro, precisa de %d' % (caminho, len(escolha), livres))
        escolha = iter(escolha)
        for item in vagas(licoes[caminho]):
            if not item.get('fen'):
                linha = next(escolha)
                preenche(item, linha)
                usados.add(linha['PuzzleId'])
        print('%s: %d puzzles escolhidos entre %d' % (os.path.relpath(caminho), livres, len(candidatos[caminho])))

    # só regrava as lições que mudaram (as outras ficam com a formatação de quem escreveu)
    for caminho, licao in licoes.items():
        if json.dumps(licao, sort_keys=True) != antes[caminho]:
            grava(caminho, licao)


if __name__ == '__main__':
    main()
