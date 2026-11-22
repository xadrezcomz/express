#!/usr/bin/env python3
"""Coloca o avatar do professor falando no canto de baixo do vídeo.

As poses (PNG com fundo transparente) e o poses.json ficam na pasta privada das lições
(express-licoes/avatar/), porque são a imagem do dono; este programa só sabe animar:
  - a boca abre e fecha com o volume da voz (o queixo desce e aparece o interior da boca);
  - os olhos piscam de tempos em tempos;
  - o corpo balança de leve, mais animado enquanto fala;
  - a pose muda conforme a linha do tempo que o gera.js manda (com uma troca rápida e suave).

Uso: python3 avatar.py config.json   (o gera.js escreve o config)
"""
import json, math, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

NIVEIS = 6                    # quantas aberturas de boca
TROCA = 0.18                  # segundos da troca de pose


def carrega(pasta, nome):
    im = Image.open(os.path.join(pasta, nome + '.png')).convert('RGBA')
    return np.array(im).astype(np.float32)


def boca_dos_dentes(a):
    """Acha os dentes (o maior bloco branco do meio do rosto) e a linha de baixo deles."""
    H, W = a.shape[:2]
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    branco = (al > 200) & (r > 205) & (g > 200) & (b > 190) & (np.abs(r - b) < 45)
    from scipy import ndimage
    lab, k = ndimage.label(branco)
    melhor = None
    for i, s in enumerate(ndimage.find_objects(lab)):
        area = int((lab[s] == i + 1).sum())
        cy, cx = (s[0].start + s[0].stop) / 2, (s[1].start + s[1].stop) / 2
        largura = s[1].stop - s[1].start
        if area < 60 or largura < 15 or cy > H * 0.6 or cy < H * 0.15:
            continue
        if (s[0].stop - s[0].start) > largura:        # alto e fino: não é dente (reflexo da peça)
            continue
        nota = area - abs(cx - W * 0.5) * 2
        if melhor is None or nota > melhor[0]:
            melhor = (nota, i + 1, s)
    if melhor is None:
        raise SystemExit('avatar: não achei os dentes; marque a boca no poses.json')
    _, n, s = melhor
    xs, ys = [], []
    for x in range(s[1].start, s[1].stop):
        col = np.where(lab[s[0].start:s[0].stop, x] == n)[0]
        if len(col):
            xs.append(x); ys.append(s[0].start + col.max() + 1)
    xs, ys = np.array(xs, float), np.array(ys, float)
    p = np.polyfit(xs, ys, 2 if len(xs) > 8 else 1)
    cx = (xs.min() + xs.max()) / 2
    return dict(cx=cx, hw=(xs.max() - xs.min()) / 2 + 5, poli=p.tolist())


def abre(a, boca, d):
    """A pose com a boca aberta d pixels (na escala da imagem original)."""
    if d <= 0:
        return a
    from scipy import ndimage
    H, W = a.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    cx, hw = boca['cx'], boca['hw']
    if 'poli' in boca:
        y0 = np.polyval(boca['poli'], np.clip(xx, cx - hw, cx + hw))
    else:
        y0 = boca['y'] - boca.get('curva', 0) * (xx - cx) ** 2
    esc = boca.get('escala', 1.0)
    m = np.clip(1 - ((xx - cx) / hw) ** 2, 0, 1) ** 1.3
    fx = np.exp(-((xx - cx) / (hw * 2.3)) ** 2)
    rampa = np.clip((yy - y0) / (45 * esc), 0, 1); rampa = rampa * rampa * (3 - 2 * rampa)
    g = np.where(yy >= y0, np.maximum(m, (1 - m) * rampa), 0)
    queda = np.clip((y0 + 180 * esc - yy) / (70 * esc), 0, 1)
    dy = d * fx * g * queda
    out = np.stack([ndimage.map_coordinates(a[..., c], [yy - dy, xx], order=1) for c in range(4)], -1)
    cav = (yy >= y0) & (yy - dy < y0) & (m > 0.02)
    t = np.clip((yy - y0) / np.maximum(dy, 1), 0, 1)
    cor = np.stack([70 + 20 * t, 18 + 5 * t, 22 + 5 * t, np.full_like(t, 255)], -1)
    lingua = (t > 0.6) & (np.abs(xx - cx) < hw * 0.55)
    cor[lingua] = [176, 70, 78, 255]
    out[cav] = cor[cav]
    return out


def pisca(img, olhos, quanto):
    """Fecha os olhos: a pálpebra (cor da pele logo acima do olho) desce e vira um risco."""
    if not olhos or quanto <= 0:
        return img
    im = img.copy()
    px = np.array(img)
    for (x, y, rx, ry) in olhos:
        # cor da pele: um pouco acima da sobrancelha do olho, dentro da lente
        # cor da pele: a bochecha logo abaixo do olho, sem os pixels escuros (armação, cílios) e claros (reflexo)
        amostra = px[int(y + ry + 2):int(y + ry + 12), int(x - rx * 0.7):int(x + rx * 0.7), :3].reshape(-1, 3).astype(int)
        soma = amostra.sum(1)
        boa = amostra[(soma > 330) & (soma < 690) & (amostra[:, 0] > amostra[:, 2] + 30)]
        pele = tuple(int(v) for v in np.percentile(boa, 80, axis=0)) if len(boa) > 5 else (225, 150, 110)
        camada = Image.new('RGBA', img.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(camada)
        fundo = y - ry - 1 + (2 * ry + 2) * quanto          # até onde a pálpebra desceu
        d.ellipse([x - rx - 2, y - ry - 3, x + rx + 2, fundo + 1], fill=pele + (255,))
        if quanto > 0.85:                                     # o risco dos cílios
            d.arc([x - rx, y - ry * 0.9, x + rx, y + ry * 0.9], 15, 165, fill=(40, 22, 18, 255), width=max(2, int(rx / 6)))
        camada = camada.filter(ImageFilter.GaussianBlur(0.6))
        # só pinta onde já era rosto (não vaza para fora da lente/armação)
        mascara = Image.new('L', img.size, 0)
        ImageDraw.Draw(mascara).ellipse([x - rx - 2, y - ry - 3, x + rx + 2, y + ry + 3], fill=255)
        mascara = mascara.filter(ImageFilter.GaussianBlur(max(1.0, ry / 3)))   # borda macia
        im = Image.composite(Image.alpha_composite(im, camada), im, mascara)
    return im


def envelope(audio, n, fps):
    if not audio:
        return np.zeros(n)
    x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', audio, '-ac', '1', '-ar', '16000', '-f', 's16le', '-'],
                                     capture_output=True).stdout, np.int16).astype(float)
    hop = 16000 // fps
    rms = np.array([np.sqrt((x[i * hop:(i + 1) * hop] ** 2).mean()) if i * hop < len(x) else 0 for i in range(n)])
    ref = np.percentile(rms[rms > 0], 90) if (rms > 0).any() else 1
    e, out = 0.0, []
    for r in rms:
        alvo = min(1, max(0, (r / ref - 0.08) / 0.8))
        e = alvo if alvo > e else e * 0.55 + alvo * 0.45
        out.append(e)
    return np.array(out)


def piscadas(n, fps, semente):
    rnd = np.random.default_rng(semente)
    v = np.zeros(n); t = rnd.uniform(0.8, 2.5)
    while t * fps < n:
        k = int(t * fps)
        for j, q in enumerate([0.5, 1, 1, 0.5]):              # 4 quadros: fecha e abre
            if k + j < n: v[k + j] = q
        t += rnd.uniform(2.2, 5.0)
    return v


def main():
    cfg = json.load(open(sys.argv[1]))
    pasta, fps = cfg['pasta'], cfg['fps']
    marc = json.load(open(os.path.join(pasta, 'poses.json')))
    dur = cfg['duracao']; n = int(math.ceil(dur * fps))
    linha = cfg['poses']                                       # [[t, 'pose'], ...]
    usadas = sorted(set(p for _, p in linha))
    alvo_olhos = cfg.get('olhos', 46)                         # distância entre os olhos no vídeo (px)
    ax, ay = cfg['ancora']                                    # onde fica o meio dos olhos no vídeo

    # cada pose: imagens já na escala do vídeo, para cada abertura de boca e cada piscada
    cache = {}
    for nome in usadas:
        a = carrega(pasta, nome)
        m = marc[nome]
        boca = boca_dos_dentes(a) if m['boca'] == 'dentes' else dict(m['boca'])
        olhos = m.get('olhos', [])
        if len(olhos) == 2:
            dist = math.dist(olhos[0][:2], olhos[1][:2]); meio = ((olhos[0][0] + olhos[1][0]) / 2, (olhos[0][1] + olhos[1][1]) / 2)
        else:
            dist = m.get('dist_olhos', 55); meio = tuple(m.get('meio_olhos', (a.shape[1] / 2, a.shape[0] * 0.27)))
        esc = alvo_olhos / dist
        boca['escala'] = dist / 122                         # as medidas da boca foram acertadas numa pose com 122 px entre os olhos
        abert = [0] + [k * (dist * 0.23) / (NIVEIS - 1) for k in range(1, NIVEIS)]   # abertura máxima ~ 1/4 da distância dos olhos
        W, H = a.shape[1], a.shape[0]
        tam = (max(1, int(W * esc)), max(1, int(H * esc)))
        imgs = []
        for d in abert:
            base = Image.fromarray(np.clip(abre(a, boca, d), 0, 255).astype(np.uint8))
            linha_p = []
            for q in (0, 0.5, 1):
                linha_p.append(pisca(base, olhos, q).resize(tam, Image.LANCZOS))
            imgs.append(linha_p)
        # os olhos vão para a âncora, mas sem deixar um vão embaixo (as poses são cortadas na cintura)
        cache[nome] = dict(imgs=imgs, pos=(ax - meio[0] * esc, max(ay - meio[1] * esc, cfg['altura'] - tam[1] + 2)))

    env = envelope(cfg.get('audio'), n, fps)
    pis = piscadas(n, fps, cfg.get('semente', 7))
    L, A = cfg['largura'], cfg['altura']
    caixa = cfg.get('caixa', [0, A - 520, 620, A])            # a área onde o avatar é desenhado
    bx0, by0, bx1, by1 = caixa
    proc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-i', cfg['entrada'],
                             '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', f'{bx1 - bx0}x{by1 - by0}', '-r', str(fps), '-i', '-',
                             '-filter_complex', f'[1:v]format=rgba[a];[0:v][a]overlay={bx0}:{by0}:format=auto[v]',
                             '-map', '[v]', '-map', '0:a', '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p',
                             '-c:a', 'copy', '-movflags', '+faststart', cfg['saida']], stdin=subprocess.PIPE)

    def pose_em(t):
        atual, ant, desde = linha[0][1], None, -9
        for tt, p in linha:
            if tt <= t:
                if p != atual: ant, desde = atual, tt
                atual = p
        return atual, ant, desde

    def desenha(nome, k, q, quadro, ang, dy, esc_extra, alfa):
        c = cache[nome]; im = c['imgs'][k][q]
        if esc_extra != 1:
            im = im.resize((max(1, int(im.width * esc_extra)), max(1, int(im.height * esc_extra))), Image.BILINEAR)
        px, py = c['pos']
        cxp, cyp = ax - bx0, ay - by0                          # gira em volta de um ponto abaixo dos olhos
        ox = (px - bx0 - cxp) * esc_extra + cxp; oy = (py - by0 - cyp) * esc_extra + cyp + dy
        camada = Image.new('RGBA', quadro.size, (0, 0, 0, 0))
        camada.paste(im, (int(round(ox)), int(round(oy))), im)
        camada = camada.rotate(ang, resample=Image.BICUBIC, center=(cxp, cyp + 260))
        if alfa < 1:
            camada.putalpha(camada.getchannel('A').point(lambda v: int(v * alfa)))
        quadro.alpha_composite(camada)

    for i in range(n):
        t = i / fps
        e = env[i]; k = min(NIVEIS - 1, int(round(e * (NIVEIS - 1))))
        q = 2 if pis[i] >= 1 else (1 if pis[i] > 0 else 0)
        fala = env[max(0, i - 15):i + 1].mean()
        ang = math.sin(t * 1.7) * 1.0 + fala * math.sin(t * 5.3) * 1.6
        dy = math.sin(t * 2.1) * 2.5 - fala * 3
        quadro = Image.new('RGBA', (bx1 - bx0, by1 - by0), (0, 0, 0, 0))
        atual, ant, desde = pose_em(t)
        p = (t - desde) / TROCA
        if ant and p < 1:
            desenha(ant, k, q, quadro, ang, dy, 1 - 0.06 * p, 1 - p)
            desenha(atual, k, q, quadro, ang, dy, 0.94 + 0.06 * p + 0.04 * math.sin(p * math.pi), p)
        else:
            pop = 1 + 0.04 * math.sin(min(1, max(0, (t - desde) / 0.35)) * math.pi) if ant else 1
            desenha(atual, k, q, quadro, ang, dy, pop, 1)
        proc.stdin.write(quadro.tobytes())
    proc.stdin.close(); proc.wait()
    if proc.returncode:
        raise SystemExit('avatar: o ffmpeg falhou')


if __name__ == '__main__':
    main()
