#!/usr/bin/env python3
"""O avatar do professor numa pose só, que se mexe (em vez de trocar o desenho inteiro).

A pasta privada das lições (express-licoes/avatar/) tem o avatar.json e um jogo de imagens do
mesmo desenho, todas do mesmo tamanho e com o rosto no mesmo lugar, em que só muda um pedaço:
  - bocas: uma imagem por som (A, E, I, O, U, M, F e sorriso). A fala é transformada em sons
    letra a letra, no tempo de cada palavra (o .palavras.json do áudio), e só a região da boca
    é trocada, com uma mistura suave entre um som e o próximo;
  - olhos: meio fechado e fechado (a piscada) e olhando para baixo (pensando);
  - gestos: o mesmo desenho com o braço (explicando, dedo levantado, joinha); a boca e os olhos
    continuam animados por cima;
  - reações: um rosto diferente (comemorando, surpreso), por pouco tempo, sem a boca animada.
Por cima de tudo, o corpo respira, a cabeça balança de leve e acena nas palavras em destaque.

Uso: python3 avatar2.py config.json   (o gera.js escreve o config)
"""
import json, math, os, re, subprocess, sys, unicodedata
import numpy as np
from PIL import Image
from scipy import ndimage

TROCA = 0.22          # segundos da troca de gesto
SONS = ['A', 'E', 'I', 'O', 'U', 'M', 'F', 'sorriso']


def carrega(pasta, nome, tam):
    im = Image.open(os.path.join(pasta, nome + '.png')).convert('RGBA')
    return np.asarray(im.resize(tam, Image.LANCZOS)).astype(np.float32)


def mascara(tam, caixa, esc, suave):
    """Uma região retangular com cantos arredondados e borda bem macia."""
    W, H = tam
    m = np.zeros((H, W), np.float32)
    x0, y0, x1, y1 = [int(round(v * esc)) for v in caixa]
    m[max(0, y0):min(H, y1), max(0, x0):min(W, x1)] = 1
    return ndimage.gaussian_filter(m, suave)


def sons_da_fala(audio, n, fps):
    """Para cada quadro, o som da boca, a partir das letras de cada palavra no tempo dela."""
    arq = re.sub(r'\.[a-z0-9]+$', '', audio or '') + '.palavras.json'
    alvo = [None] * n
    if not audio or not os.path.exists(arq):
        return alvo
    vog = {'a': 'A', 'e': 'E', 'i': 'I', 'y': 'I', 'o': 'O', 'u': 'U'}
    for w in json.load(open(arq)).get('palavras', []):
        txt = unicodedata.normalize('NFD', w['p'].lower())
        txt = ''.join(ch for ch in txt if 'a' <= ch <= 'z')
        if not txt:
            continue
        seq = []
        for j, ch in enumerate(txt):
            fim = j == len(txt) - 1 or (j == len(txt) - 2 and txt[-1] == 's')
            if ch in vog:
                s = vog[ch]
                if fim and len(txt) > 2 and s == 'E': s = 'I'          # "parte" -> "parti"
                if fim and len(txt) > 2 and s == 'O': s = 'U'          # "lado" -> "ladu"
                seq.append((s, 2.0))
            elif ch in 'mbp':
                seq.append(('M', 1.0))
            elif ch in 'fv':
                seq.append(('F', 1.0))
            else:
                seq.append((None, 0.8))                                # as outras: vão de passagem
        total = sum(p for _, p in seq)
        t = w['ini']; dur = max(0.05, w['fim'] - w['ini'])
        for s, p in seq:
            d = dur * p / total
            k0, k1 = int(round(t * fps)), int(round((t + d) * fps))
            if s:
                for k in range(max(0, k0), min(n, max(k1, k0 + 1))):
                    alvo[k] = s
            t += d
    return alvo


def envelope(audio, n, fps):
    if not audio:
        return np.zeros(n)
    x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', audio, '-ac', '1', '-ar', '16000', '-f', 's16le', '-'],
                                     capture_output=True).stdout, np.int16).astype(float)
    hop = 16000 // fps
    rms = np.array([np.sqrt((x[i * hop:(i + 1) * hop] ** 2).mean()) if i * hop < len(x) else 0 for i in range(n)])
    ref = np.percentile(rms[rms > 0], 90) if (rms > 0).any() else 1
    return np.clip(rms / ref, 0, 1.2)


def pesos_da_boca(alvo, env, fps):
    """Matriz quadros x sons, com a passagem suave de um som para o outro."""
    n = len(alvo)
    P = np.zeros((n, len(SONS)), np.float32)
    k_m, k_s = SONS.index('M'), SONS.index('sorriso')
    ult, quieto = 'M', 0
    for i in range(n):
        falando = env[i] > 0.1
        quieto = 0 if falando else quieto + 1
        s = alvo[i] or (ult if falando else 'M')
        if not falando and alvo[i] is None:
            s = 'sorriso' if quieto > fps * 0.7 else 'M'           # pausa longa: um sorriso leve
        P[i, SONS.index(s)] = 1
        if alvo[i]: ult = alvo[i]
        # voz baixinha: a boca abre menos (mistura com a boca fechada)
        if s in 'AEIOU' and env[i] < 0.45:
            f = max(0.35, env[i] / 0.45)
            P[i] *= f; P[i, k_m] += 1 - f
    k = np.array([0.3, 1.0, 0.3]); k /= k.sum()                  # passagem curta (mistura longa dobra a boca)
    P = ndimage.convolve1d(P, k, axis=0, mode='nearest')
    P[:, k_s] = ndimage.uniform_filter1d(P[:, k_s], 9, mode='nearest')   # o sorriso chega devagar
    return P / P.sum(1, keepdims=True)


def piscadas(n, fps, semente):
    """0 aberto, 1 meio fechado, 2 fechado: uma piscada de 5 quadros a cada 2 a 5 segundos."""
    rnd = np.random.default_rng(semente)
    v = np.zeros(n, int); t = rnd.uniform(0.8, 2.5)
    while t * fps < n:
        k = int(t * fps)
        for j, q in enumerate([1, 2, 2, 1, 1] if rnd.random() < 0.85 else [1, 2, 2, 1, 1, 0, 1, 2, 1]):   # às vezes, duas seguidas
            if k + j < n: v[k + j] = max(v[k + j], q)
        t += rnd.uniform(2.0, 5.0)
    return v


def main():
    cfg = json.load(open(sys.argv[1]))
    pasta, fps = cfg['pasta'], cfg['fps']
    av = json.load(open(os.path.join(pasta, 'avatar.json')))
    n = int(math.ceil(cfg['duracao'] * fps))
    bx0, by0, bx1, by1 = cfg['caixa']
    CW, CH = bx1 - bx0, by1 - by0
    orig = Image.open(os.path.join(pasta, av['base'] + '.png')).size
    esc = CH / orig[1] * cfg.get('altura_rel', 1.0)
    tam = (int(orig[0] * esc), int(orig[1] * esc))
    ox, oy = int(cfg.get('dx', 0)), CH - tam[1]                    # o desenho encosta embaixo

    base = carrega(pasta, av['base'], tam)
    bocas = {s: carrega(pasta, av['bocas'][s], tam) - base for s in SONS if av['bocas'].get(s)}
    olhos = {k: carrega(pasta, v, tam) - base for k, v in av['olhos'].items()}
    gestos = {k: carrega(pasta, v, tam) for k, v in av['gestos'].items()}
    reacoes = {k: carrega(pasta, v, tam) for k, v in av['reacoes'].items()}
    mb = mascara(tam, av['regioes']['boca'], esc, 10 * esc)[..., None]
    mo = mascara(tam, av['regioes']['olhos'], esc, 6 * esc)[..., None]

    env = envelope(cfg.get('audio'), n, fps)
    P = pesos_da_boca(sons_da_fala(cfg.get('audio'), n, fps), env, fps)
    pis = piscadas(n, fps, cfg.get('semente', 7))
    linha = sorted(cfg.get('linha', []))                            # [[t, nome, dur], ...]
    acenos = cfg.get('acenos', [])

    def corpo_em(t):
        """Qual gesto/reação vale no segundo t, e quanto dele (para a troca suave)."""
        ativo = None
        for ini, nome, dur in linha:
            if ini <= t < ini + dur:
                ativo = (ini, nome, dur)
        if not ativo:
            return None, 0
        ini, nome, dur = ativo
        f = min(1, (t - ini) / TROCA, (ini + dur - t) / TROCA)
        return nome, max(0, f)

    proc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-i', cfg['entrada'],
                             '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', f'{CW}x{CH}', '-r', str(fps), '-i', '-',
                             '-filter_complex', f'[1:v]format=rgba[a];[0:v][a]overlay={bx0}:{by0}:format=auto[v]',
                             '-map', '[v]', '-map', '0:a', '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p',
                             '-c:a', 'copy', '-movflags', '+faststart', cfg['saida']], stdin=subprocess.PIPE)
    cx, cy = tam[0] / 2, tam[1]                                     # gira em volta da base do peito
    for i in range(n):
        t = i / fps
        nome, f = corpo_em(t)
        img = base
        reacao = nome in reacoes
        if nome in gestos:
            img = base + (gestos[nome] - base) * f
        elif reacao:
            img = base + (reacoes[nome] - base) * f
        lsync = 1 - f if reacao else 1                              # na reação, o rosto é o dela
        if lsync > 0:
            # a boca e os olhos são trocados inteiros na região deles (vêm da pose base), em vez de
            # somados: assim um gesto com o rosto um pouco diferente não fica com a boca dobrada
            boca = base + sum(P[i, k] * bocas[s] for k, s in enumerate(SONS) if s in bocas and P[i, k] > 0.01)
            img = img + (boca - img) * mb * lsync
            q = pis[i]
            olho = base
            if q == 2: olho = base + olhos['fechado']
            elif q == 1: olho = base + olhos['meio']
            elif nome == 'pensa' and 'baixo' in olhos: olho = base + olhos['baixo'] * f
            img = img + (olho - img) * mo * lsync
        # o movimento: respiração, balanço e o aceno nas palavras fortes
        fala = env[max(0, i - 12):i + 1].mean()
        ang = math.sin(t * 1.3) * 0.8 + fala * math.sin(t * 4.1) * 1.2
        aceno = sum(math.sin(min(1, (t - a) / 0.45) * math.pi) for a in acenos if 0 <= t - a < 0.45)
        dy = math.sin(t * 2.0) * 2.0 + aceno * 6 * esc / 0.45
        resp = 1 + math.sin(t * 2.0) * 0.006
        quadro = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
        quadro = quadro.transform(quadro.size, Image.AFFINE,
                                  (1 / resp, 0, cx - cx / resp, 0, 1 / resp, cy - cy / resp - dy), resample=Image.BILINEAR)
        quadro = quadro.rotate(ang, resample=Image.BICUBIC, center=(cx, cy))
        tela = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
        tela.paste(quadro, (ox, oy), quadro)
        proc.stdin.write(tela.tobytes())
    proc.stdin.close(); proc.wait()
    if proc.returncode:
        raise SystemExit('avatar: o ffmpeg falhou')


if __name__ == '__main__':
    main()
