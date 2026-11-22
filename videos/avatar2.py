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


def fluxos(base, alvo, caixa):
    """O movimento de cada ponto da boca entre a pose de descanso e um som (fluxo óptico),
    para a boca abrir aos poucos (deformando) em vez de trocar de imagem."""
    import cv2
    x0, y0, x1, y1 = caixa
    g = lambda a: cv2.cvtColor(np.ascontiguousarray(a[y0:y1, x0:x1, :3]).astype(np.uint8), cv2.COLOR_RGB2GRAY)
    dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
    F = dis.calc(g(base), g(alvo), None)                         # base(x) ~ alvo(x + F(x))
    F = cv2.GaussianBlur(F, (0, 0), 2.0)                         # movimento liso, sem rasgar
    return F


def morfa(base, alvo, F, caixa, a):
    """A boca a meio caminho (a de 0 a 1) entre a pose de descanso e o som."""
    import cv2
    x0, y0, x1, y1 = caixa
    B = base[y0:y1, x0:x1]; A = alvo[y0:y1, x0:x1]
    if a <= 0.001:
        return B
    h, w = F.shape[:2]
    gx, gy = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    bw = cv2.remap(np.ascontiguousarray(B), (gx - a * F[..., 0]).astype(np.float32), (gy - a * F[..., 1]).astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    aw = cv2.remap(np.ascontiguousarray(A), (gx + (1 - a) * F[..., 0]).astype(np.float32), (gy + (1 - a) * F[..., 1]).astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    m = a * a * (3 - 2 * a)                                      # a cor (dentes, língua) entra um pouco depois do movimento
    return bw * (1 - m) + aw * m


def morfa_mistura(base, alvos, F, pesos, caixa, a):
    """A boca a caminho de uma mistura de sons: o movimento é a média dos movimentos de cada som,
    e cada imagem é deformada para essa mesma forma antes de misturar as cores (sem fantasma)."""
    import cv2
    x0, y0, x1, y1 = caixa
    B = np.ascontiguousarray(base[y0:y1, x0:x1])
    if a <= 0.001 or not pesos:
        return B
    Fm = sum(w * F[s] for s, w in pesos.items())
    h, w_ = Fm.shape[:2]
    gx, gy = np.meshgrid(np.arange(w_, dtype=np.float32), np.arange(h, dtype=np.float32))
    ox, oy = gx - a * Fm[..., 0], gy - a * Fm[..., 1]                 # o ponto da pose base que veio para cá
    bw = cv2.remap(B, ox.astype(np.float32), oy.astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    cor = 0
    for s, w in pesos.items():
        A = np.ascontiguousarray(alvos[s][y0:y1, x0:x1])
        cor = cor + w * cv2.remap(A, (ox + F[s][..., 0]).astype(np.float32), (oy + F[s][..., 1]).astype(np.float32),
                                  cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    m = a * a * (3 - 2 * a)
    return bw * (1 - m) + cor * m


def movimento_da_boca(alvo, env, fps):
    """Para cada quadro: o som da boca e o quanto ela está aberta (0 a 1), com inércia,
    como um músculo de verdade: ela acelera e freia, sem pular de uma forma para a outra."""
    n = len(alvo)
    sons, abre = [], []
    a, vel, atual = 0.0, 0.0, 'A'
    k, amort = (2 * math.pi * 7.5) ** 2, 2 * 0.85 * (2 * math.pi * 7.5)   # mola de ~7,5 Hz, quase sem balanço
    dt = 1 / fps
    for i in range(n):
        s = alvo[i]
        falando = env[i] > 0.08
        if s in ('M', 'F'):
            meta = 1.0                                            # lábios fechados / dentes no lábio: forma inteira
        elif s and falando:
            meta = float(np.clip(0.3 + env[i] * 0.75, 0.3, 1.0))
        else:
            meta = 0.0
        if s and s != atual and (a < 0.3 or s in ('M', 'F') or atual in ('M', 'F')):
            atual = s                                             # troca de som com a boca quase fechada
        elif s and s != atual:
            atual = s
        for _ in range(4):                                       # 4 passos por quadro: a mola fica estável
            acc = k * (meta - a) - amort * vel
            vel += acc * dt / 4; a += vel * dt / 4
        a = float(np.clip(a, 0, 1))
        sons.append(atual); abre.append(a)
    return sons, np.array(abre)


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
    orig = Image.open(os.path.join(pasta, av['base'] + '.png')).size
    bolha = cfg.get('bolha')
    if bolha:
        # nos Reels: uma bolha redonda dentro da zona segura, que aparece e some (janelas)
        bcx, bcy, R = bolha['cx'], bolha['cy'], bolha['r']
        M = 14
        bx0, by0, bx1, by1 = bcx - R - M, bcy - R - M, bcx + R + M, bcy + R + M
        CW, CH = bx1 - bx0, by1 - by0
        foco = bolha.get('foco', [627, 520, 860])                   # o centro e o tamanho do recorte (rosto e ombros)
        esc = 2 * R / foco[2]
        tam = (int(orig[0] * esc), int(orig[1] * esc))
        ox, oy = int(R + M - foco[0] * esc), int(R + M - foco[1] * esc)
        yy, xx = np.mgrid[0:CH, 0:CW]
        dist = np.sqrt((xx - R - M) ** 2 + (yy - R - M) ** 2)
        disco = np.clip(R - dist + 0.5, 0, 1)
        anel = np.clip(R + 6 - dist + 0.5, 0, 1) - disco
        fundo = np.zeros((CH, CW, 4), np.float32)
        t_ = np.clip((yy - (M)) / (2 * R), 0, 1)[..., None]
        fundo[..., :3] = np.array([92, 64, 220]) * (1 - t_) + np.array([24, 14, 64]) * t_   # roxo da marca, em degradê
        fundo[..., 3] = disco * 255
        aro = np.zeros((CH, CW, 4), np.float32); aro[..., :3] = [255, 211, 107]; aro[..., 3] = anel * 255
        sombra = np.zeros((CH, CW, 4), np.float32); sombra[..., 3] = np.clip((R + 13 - dist) / 9, 0, 1) * 90
        janelas = cfg.get('janelas', [])
    else:
        bx0, by0, bx1, by1 = cfg['caixa']
        CW, CH = bx1 - bx0, by1 - by0
        esc = CH / orig[1] * cfg.get('altura_rel', 1.0)
        tam = (int(orig[0] * esc), int(orig[1] * esc))
        ox, oy = int(cfg.get('dx', 0)), CH - tam[1]                # o desenho encosta embaixo

    base = carrega(pasta, av['base'], tam)
    bocas = {s: carrega(pasta, av['bocas'][s], tam) - base for s in SONS if av['bocas'].get(s)}
    olhos = {k: carrega(pasta, v, tam) - base for k, v in av['olhos'].items()}
    gestos = {k: carrega(pasta, v, tam) for k, v in av['gestos'].items()}
    reacoes = {k: carrega(pasta, v, tam) for k, v in av['reacoes'].items()}
    mb = mascara(tam, av['regioes']['boca'], esc, 10 * esc)[..., None]
    mo = mascara(tam, av['regioes']['olhos'], esc, 6 * esc)[..., None]

    env = envelope(cfg.get('audio'), n, fps)
    sons, abre = movimento_da_boca(sons_da_fala(cfg.get('audio'), n, fps), env, fps)
    rb = [int(round(v * esc)) for v in av['regioes']['boca']]
    rb = [max(0, rb[0]), max(0, rb[1]), min(tam[0], rb[2]), min(tam[1], rb[3])]
    alvos = {s: base + d for s, d in bocas.items()}
    F = {s: fluxos(base, alvos[s], rb) for s in alvos if s != 'sorriso'}
    boca_base = base.copy()
    # o peso de cada som em cada quadro, com a passagem suave (uns 5 quadros) de um para o outro
    nomes_F = list(F)
    W = np.zeros((n, len(nomes_F)), np.float32)
    for i, s_i in enumerate(sons):
        if s_i in F: W[i, nomes_F.index(s_i)] = 1
    W = ndimage.convolve1d(W, np.array([0.15, 0.5, 1, 0.5, 0.15]), axis=0, mode='nearest')
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
    vazio = bytes(CW * CH * 4)
    def visivel(t):
        v = 0.0
        for t0, t1 in janelas:
            if t0 - 0.05 <= t <= t1 + 0.05:
                v = max(v, min(1, (t - t0) / 0.35, (t1 - t) / 0.25))
        return max(0.0, v)
    for i in range(n):
        t = i / fps
        if bolha:
            vis = visivel(t)
            if vis <= 0:
                proc.stdin.write(vazio); continue
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
            boca = boca_base.copy()
            x0, y0, x1, y1 = rb
            pesos = {s: float(W[i, k]) for k, s in enumerate(nomes_F) if W[i, k] > 0.02}
            tot = sum(pesos.values()) or 1
            pesos = {s: w / tot for s, w in pesos.items()}
            boca[y0:y1, x0:x1] = morfa_mistura(base, alvos, F, pesos, rb, abre[i])
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
        if bolha:
            pess = np.asarray(tela).astype(np.float32)
            pess[..., 3] *= disco                                   # recorta o desenho no círculo
            camadas = [sombra, fundo, pess, aro]
            out = np.zeros((CH, CW, 4), np.float32)
            for c in camadas:                                       # "por cima" (alfa)
                a_c = c[..., 3:4] / 255
                out[..., :3] = c[..., :3] * a_c + out[..., :3] * (1 - a_c)
                out[..., 3:4] = a_c * 255 + out[..., 3:4] * (1 - a_c)
            tela = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
            if vis < 1:                                             # entra crescendo, com um pulinho
                e = 1 + 0.12 * math.sin(vis * math.pi) if vis > 0.5 else vis * 2 * 1.0
                e = max(0.05, min(1.12, e))
                w_, h_ = max(1, int(CW * e)), max(1, int(CH * e))
                peq = tela.resize((w_, h_), Image.BILINEAR)
                tela = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
                tela.paste(peq, ((CW - w_) // 2, (CH - h_) // 2), peq)
                tela.putalpha(tela.getchannel('A').point(lambda v_: int(v_ * min(1, vis * 1.6))))
        proc.stdin.write(tela.tobytes())
    proc.stdin.close(); proc.wait()
    if proc.returncode:
        raise SystemExit('avatar: o ffmpeg falhou')


if __name__ == '__main__':
    main()
