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
from PIL import Image

NIVEIS = 6                    # quantas aberturas de boca
TROCA = 0.18                  # segundos da troca de pose
PISCA = (0, 0.35, 0.75, 1)
REDONDO = (0, 0.5, 1)         # boca normal, meio redonda e redonda ("o", "u")    # quanto a pálpebra desceu em cada quadro da piscada


def carrega(pasta, nome):
    im = Image.open(os.path.join(pasta, nome + '.png')).convert('RGBA')
    return np.array(im).astype(np.float32)


def _parabola(p0, p1, p2):
    """Coeficientes de v(u) = a u^2 + b u + c que passa pelos três pontos (u, v)."""
    us = np.array([p0[0], p1[0], p2[0]], float); vs = np.array([p0[1], p1[1], p2[1]], float)
    return np.polyfit(us, vs, 2)


def _eixos(c0, c1):
    """Eixo u ao longo da linha dos dois cantos e eixo v perpendicular, para baixo do rosto."""
    u = np.array(c1, float) - np.array(c0, float); u /= np.linalg.norm(u)
    v = np.array([-u[1], u[0]])
    return u, v


def _linha_da_boca(a, o, u, v, k, meia, esc):
    """Acha, coluna por coluna ao longo da boca, a borda exata onde ela abre: a borda de baixo dos
    dentes de cima, ou o risco escuro entre os lábios. Parte da linha marcada e procura perto dela."""
    from scipy import ndimage
    us = np.arange(-meia, meia + 1, 1.0)
    busca = np.arange(-7 * esc - 2, 7 * esc + 2.01, 0.5)
    vs = []
    for uu in us:
        v0 = np.polyval(k, uu)
        pv = v0 + busca
        px = o[0] + uu * u[0] + pv * v[0]; py = o[1] + uu * u[1] + pv * v[1]
        rgb = np.stack([ndimage.map_coordinates(a[..., c], [py, px], order=1) for c in range(3)], -1)
        lum = rgb.mean(1); sat = rgb.max(1) - rgb.min(1)
        dente = (lum > 195) & (sat < 70)
        if dente.any():
            vs.append(pv[np.nonzero(dente)[0].max()] + 0.75)        # logo abaixo do último pixel de dente
        else:
            peso = np.exp(-(busca / (4 * esc + 1)) ** 2)            # o risco escuro mais perto da marca
            vs.append(pv[np.argmin(lum + (1 - peso) * 60)])
    vs = np.array(vs)
    marca = np.polyval(k, us)
    vs = np.where(np.abs(vs - marca) > 6 * esc + 2, marca, vs)       # descarta o que fugiu da marca
    vs = ndimage.median_filter(vs, 5, mode='nearest')
    vs = ndimage.uniform_filter1d(vs, 5, mode='nearest')
    # nas pontas, volta suave para a marca (os cantos ficam exatamente onde foram marcados)
    ponta = np.clip((meia - np.abs(us)) / 4, 0, 1)
    vs = marca + (vs - marca) * ponta
    return us, vs


def abre(a, boca, d, redondo=0.0):
    """A pose com a boca aberta d pixels, na direção do queixo daquela pose (perpendicular à linha
    dos cantos da boca): numa cabeça inclinada, o queixo desce inclinado junto."""
    if d <= 0 and redondo <= 0:
        return a
    from scipy import ndimage
    H, W = a.shape[:2]
    c0, c1, meio = np.array(boca['c'][0], float), np.array(boca['c'][1], float), np.array(boca['meio'], float)
    u, v = _eixos(c0, c1)
    o = (c0 + c1) / 2
    para = lambda p: ((p - o) @ u, (p - o) @ v)
    largura = np.linalg.norm(c1 - c0); hw = largura * 0.44       # os cantos da boca quase não abrem
    esc = largura / 135.0                                   # as distâncias foram acertadas numa boca de 135 px
    k = _parabola(para(c0), para(meio), para(c1))           # a linha marcada (cantos e meio)
    tabu, tabv = _linha_da_boca(a, o, u, v, k, largura / 2, esc)   # a borda de verdade, achada na imagem
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    pu = (xx - o[0]) * u[0] + (yy - o[1]) * u[1]
    pv = (xx - o[0]) * v[0] + (yy - o[1]) * v[1]
    linha = np.interp(pu, tabu, tabv)
    m = np.clip(1 - (pu / hw) ** 2, 0, 1) ** 1.6          # a abertura é maior no meio e afina até os cantos
    fx = np.exp(-(pu / (hw * 2.3)) ** 2)                    # o queixo inteiro desce, mais no meio
    rampa = np.clip((pv - linha) / (45 * esc), 0, 1); rampa = rampa * rampa * (3 - 2 * rampa)
    g = np.where(pv >= linha, np.maximum(m, (1 - m) * rampa), 0)
    queda = np.clip((linha + 180 * esc - pv) / (70 * esc), 0, 1)   # o pescoço não mexe
    desl = d * fx * g * queda
    out = np.stack([ndimage.map_coordinates(a[..., c], [yy - desl * v[1], xx - desl * v[0]], order=1) for c in range(4)], -1)
    # o vão que abriu: o interior escuro da boca e a língua embaixo
    # (com a borda macia: quanto do pixel caiu dentro do vão)
    vao = np.clip(linha - (pv - desl), 0, 1) * np.clip(pv - linha + 1, 0, 1) * np.clip((m - 0.02) / 0.15, 0, 1)
    t = np.clip((pv - linha) / np.maximum(desl, 1), 0, 1)
    cor = np.stack([62 + 25 * t, 16 + 6 * t, 20 + 6 * t, np.full_like(t, 255)], -1)
    lingua = np.clip((t - 0.58) / 0.12, 0, 1) * np.clip((hw * 0.5 - np.abs(pu)) / 4, 0, 1)
    cor[..., :3] = cor[..., :3] * (1 - lingua[..., None]) + np.array([176, 70, 78], np.float32) * lingua[..., None]
    out = out * (1 - vao[..., None]) + cor * vao[..., None]
    if redondo > 0:                                          # "o" e "u": a boca se fecha dos lados e fica redonda
        alto = largura * 0.45 + d
        w = np.clip(1 - (pu / (largura * 0.75)) ** 2, 0, 1) * np.clip(1 - ((pv - linha - d * 0.5) / alto) ** 2, 0, 1)
        w = w * w * (3 - 2 * w)
        fator = 1 + redondo * 0.32 * w                       # amostra mais longe do centro: a boca encolhe
        su = pu * fator
        sx = o[0] + su * u[0] + pv * v[0]; sy = o[1] + su * u[1] + pv * v[1]
        out = np.stack([ndimage.map_coordinates(out[..., c], [sy, sx], order=1) for c in range(4)], -1)
    return out


def _curvas_do_olho(o):
    """As curvas de cima e de baixo do olho, e a do olho fechado, no sistema (u, v) do olho."""
    c0, c1 = np.array(o['c'][0], float), np.array(o['c'][1], float)
    u, v = _eixos(c0, c1)
    org = (c0 + c1) / 2
    para = lambda p: ((np.array(p, float) - org) @ u, (np.array(p, float) - org) @ v)
    a0, a1 = para(c0), para(c1)
    cima = _parabola(a0, para(o['topo']), a1)
    baixo = _parabola(a0, para(o['baixo']), a1)
    # o olho fechado: um arco suave, um pouco abaixo da linha dos cantos (como um sorriso)
    _, vb = para(o['baixo']); _, vt = para(o['topo'])
    fechado = _parabola(a0, (0, vt * 0.15 + vb * 0.45), a1)
    return dict(u=u, v=v, org=org, meia=abs(a1[0]), cima=cima, baixo=baixo, fechado=fechado, alto=vb - vt)


def prepara_olhos(a, olhos, protege_armacao=False):
    """Para piscar: a pele da pálpebra, feita só com os tons de pele em volta de cada olho (sem a
    armação, os cílios e o branco do olho), num preenchimento liso."""
    from scipy import ndimage
    if not olhos:
        return None
    H, W = a.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    rgb = a[..., :3]
    lum = rgb.mean(2)
    tom = (lum > 105) & (lum < 236) & (rgb[..., 0] > rgb[..., 2] + 22) & (a[..., 3] > 200)
    pele = rgb.copy(); info = []
    for o in olhos:
        c = _curvas_do_olho(o)
        pu = (xx - c['org'][0]) * c['u'][0] + (yy - c['org'][1]) * c['u'][1]
        pv = (xx - c['org'][0]) * c['v'][0] + (yy - c['org'][1]) * c['v'][1]
        uu = np.clip(pu, -c['meia'], c['meia'])
        dentro = (np.abs(pu) <= c['meia'] + 4) & (pv >= np.polyval(c['cima'], uu) - 3) & (pv <= np.polyval(c['baixo'], uu) + 3.5)
        anel = ndimage.binary_dilation(dentro, iterations=int(max(4, c['alto'] * 0.8))) & ~dentro & tom
        sig = max(2.0, c['alto'] * 0.6)
        soma = np.stack([ndimage.gaussian_filter(rgb[..., k] * anel, sig) for k in range(3)], -1)
        peso = ndimage.gaussian_filter(anel.astype(np.float32), sig)[..., None]
        liso = soma / np.maximum(peso, 1e-4)
        zona = ndimage.binary_dilation(dentro, iterations=3)
        pele[zona] = liso[zona]
        # a armação dos óculos: o escuro que passa por perto do olho e segue para longe dele
        preto = (lum < 52) & ((rgb.max(2) - rgb.min(2)) < 28)     # a armação é preta; os cílios, marrom-escuros
        escuro = preto & ndimage.binary_dilation(zona, iterations=2)
        lab, k = ndimage.label(preto & ndimage.binary_dilation(zona, iterations=int(c['alto'] * 2)))
        longe = ~ndimage.binary_dilation(zona, iterations=int(max(3, c['alto'] * 0.7)))
        armacao = np.zeros_like(escuro)
        for i in range(1, k + 1):
            comp = lab == i
            if (comp & longe).sum() > c['alto'] * 2:
                armacao |= comp
        nucleo = (np.abs(pu) <= c['meia']) & (pv >= np.polyval(c['cima'], uu) + 1) & (pv <= np.polyval(c['baixo'], uu))
        armacao &= escuro & ~nucleo                         # dentro do olho nada é armação (pupila, cílios)
        if not protege_armacao:                             # só a armação dos lados (além dos cantos do olho)
            armacao = preto & (np.abs(pu) > c['meia'] - 1) & ndimage.binary_dilation(zona, iterations=3)
        info.append((c, pu, pv, ndimage.gaussian_filter(armacao.astype(np.float32), 0.7)))
    return dict(pele=pele, info=info)


def pisca(a, prep, quanto):
    """A pálpebra desce da curva de cima do olho até a curva do olho fechado, seguindo o ângulo de
    cada olho; ela é a pele lisa, um pouco mais escura perto dos cílios, e na borda vêm os cílios."""
    if prep is None or quanto <= 0:
        return a
    out = a.copy()
    for c, pu, pv, armacao in prep['info']:
        uu = np.clip(pu, -c['meia'], c['meia'])
        cima = np.polyval(c['cima'], uu) - 1.5
        borda = cima + 1.5 + (np.polyval(c['fechado'], uu) - cima - 1.5) * quanto     # onde a pálpebra chegou
        perto = np.clip(c['meia'] + 4.5 - np.abs(pu), 0, 1)
        alfa = np.clip(pv - cima + 1, 0, 1) * np.clip(borda + 0.8 - pv, 0, 1)
        if quanto >= 1:                                       # fechado: cobre o olho até embaixo
            alfa = np.maximum(alfa, np.clip(pv - cima + 1, 0, 1) * np.clip(np.polyval(c['baixo'], uu) + 3.5 - pv, 0, 1))
        alfa = alfa * perto * (1 - np.clip(armacao * 1.5, 0, 1))      # a armação fica por cima
        # a pálpebra fica um pouco mais escura perto dos cílios (dá volume)
        sombra = 1 - 0.12 * np.clip(1 - (borda - pv) / max(2.0, c['alto'] * 0.5), 0, 1)
        tampa = prep['pele'] * sombra[..., None]
        out[..., :3] = out[..., :3] * (1 - alfa[..., None]) + tampa * alfa[..., None]
        # os cílios: uma linha escura na borda da pálpebra, mais grossa no meio e fina nos cantos
        esp = max(1.4, c['alto'] * (0.14 + 0.1 * quanto))
        afina = np.clip(1 - (pu / (c['meia'] + 1)) ** 4, 0, 1)
        cilio = np.clip(esp * afina / 2 + 0.6 - np.abs(pv - borda), 0, 1) * perto * (1 - np.clip(armacao * 1.5, 0, 1))
        escuro = np.array([42, 24, 20], np.float32)
        out[..., :3] = out[..., :3] * (1 - cilio[..., None]) + escuro * cilio[..., None]
    return out


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


def vogais(audio, n, fps):
    """Quanto a boca fica redonda em cada quadro: as letras de cada palavra são espalhadas no tempo
    dela (o .palavras.json que a ElevenLabs devolve) e o "o" e o "u" arredondam a boca."""
    import re, unicodedata
    arq = re.sub(r'\.[a-z0-9]+$', '', audio or '') + '.palavras.json'
    r = np.zeros(n)
    if not audio or not os.path.exists(arq):
        return r
    for w in json.load(open(arq)).get('palavras', []):
        txt = unicodedata.normalize('NFD', w['p'].lower())
        txt = ''.join(ch for ch in txt if ch.isalpha())
        if not txt:
            continue
        passo = (w['fim'] - w['ini']) / len(txt)
        for j, ch in enumerate(txt):
            if ch in 'ou':
                k0 = int((w['ini'] + j * passo) * fps); k1 = int((w['ini'] + (j + 1.6) * passo) * fps) + 1
                r[max(0, k0):min(n, k1)] = 1
    # suave: chega e sai em uns 3 quadros
    k = np.array([0.15, 0.35, 0.65, 1, 0.65, 0.35, 0.15]); k /= k.sum()
    return np.clip(np.convolve(r, k, 'same') * 1.6, 0, 1)


def piscadas(n, fps, semente):
    rnd = np.random.default_rng(semente)
    v = np.zeros(n); t = rnd.uniform(0.8, 2.5)
    while t * fps < n:
        k = int(t * fps)
        for j, q in enumerate([1, 2, 3, 3, 2, 1]):            # 6 quadros (0,2 s): desce, fecha e sobe
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
        boca = m['boca']
        olhos = m.get('olhos', [])
        largura_boca = math.dist(*boca['c'])
        if len(olhos) == 2:
            cs = [np.mean(o['c'], 0) for o in olhos]
            dist = math.dist(cs[0], cs[1]); meio = tuple((cs[0] + cs[1]) / 2)
        else:                                                # olhos fechados (risada, piscadinha): estima pela boca
            dist = largura_boca * 1.05
            c0, c1 = np.array(boca['c'], float); u, v = _eixos(c0, c1)
            meio = tuple((c0 + c1) / 2 - v * dist * 1.25)
        esc = alvo_olhos / dist
        abert = [0] + [k * (dist * 0.2) / (NIVEIS - 1) for k in range(1, NIVEIS)]   # abertura máxima ~ 1/4 da distância dos olhos
        prep = prepara_olhos(a, olhos, m.get('armacao', False))
        W, H = a.shape[1], a.shape[0]
        tam = (max(1, int(W * esc)), max(1, int(H * esc)))
        imgs = []
        for d in abert:
            por_forma = []
            for rd in REDONDO:
                aberta = abre(a, boca, d, rd)
                linha_p = []
                for q in PISCA:
                    im = Image.fromarray(np.clip(pisca(aberta, prep, q), 0, 255).astype(np.uint8))
                    linha_p.append(im.resize(tam, Image.LANCZOS))
                por_forma.append(linha_p)
            imgs.append(por_forma)
        # os olhos vão para a âncora, mas sem deixar um vão embaixo (as poses são cortadas na cintura)
        cache[nome] = dict(imgs=imgs, pos=(ax - meio[0] * esc, max(ay - meio[1] * esc, cfg['altura'] - tam[1] + 2)))

    env = envelope(cfg.get('audio'), n, fps)
    pis = piscadas(n, fps, cfg.get('semente', 7))
    red = vogais(cfg.get('audio'), n, fps)
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
        c = cache[nome]; im = c['imgs'][k][rf][q]
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
        q = int(pis[i])
        rf = int(round(red[i] * (len(REDONDO) - 1))) if e > 0.12 else 0
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
