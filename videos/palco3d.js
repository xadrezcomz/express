// O palco 3D: o mesmo roteiro do palco 2D (videos/licao.js), desenhado com three.js.
// Tabuleiro e peças em 3D, no desenho das peças do site (formas arredondadas e a faixa
// dourada na base), e uma câmera que vai até onde a lição está acontecendo.
//
// Como no 2D, nada roda sozinho com o relógio: o videos/gera.js chama XEV.prepara(roteiro)
// e depois XEV.quadro(t) para cada quadro. Tudo é função de t, então o vídeo sai igual
// toda vez, e um quadro idêntico ao anterior não é desenhado de novo.
import * as THREE from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { FBXLoader } from './vendor/jsm/loaders/FBXLoader.js';

let R = null;                                   // o roteiro
const TOPO = 0.1;                               // altura da face de cima das casas
const S = 1.3;                                  // altura de uma peça "de 100" no desenho do site
const DUR_SETA = 0.28, DUR_MARCA = 0.2, DUR_POE = 0.4;
const DUR_EXPLOSAO = 0.8, DUR_ATE_BATER = 0.8;
const DUR_CAMERA = 0.9;                         // quanto a câmera leva para ir de um enquadramento ao outro
const DERIVA = 0;                               // balanço contínuo da câmera (radianos): 0 deixa os quadros parados de graça
const CORES = { amarela: 0xffb53d, verde: 0x58e23a, vermelha: 0xff4f78, azul: 0x2ee6ff };

// ---------------------------------------------------------------- utilidades
const n3 = v => Math.round(v * 1000) / 1000;
const suave = p => 1 - Math.pow(1 - p, 3);
const vaiVem = p => p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
function molinha(p) { const c = 1.9; p = p - 1; return 1 + (c + 1) * p * p * p + c * p * p; }
function acaso(n) { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }
// casa (índice a8 = 0) -> coluna e linha no tabuleiro, e daí para o mundo 3D
const col = i => i % 8, lin = i => Math.floor(i / 8);
const mundoX = c => c - 3.5, mundoZ = l => l - 3.5;

// ---------------------------------------------------------------- a cena
const tela = document.getElementById('cena3d');
const render = new THREE.WebGLRenderer({ canvas: tela, antialias: true, alpha: true, preserveDrawingBuffer: true });
// o 3D é desenhado em 810x1440 e ampliado (o texto por cima continua em 1080x1920): bem mais rápido
render.setPixelRatio(0.75);
render.setSize(1080, 1920, false);
render.shadowMap.enabled = true;
render.shadowMap.type = THREE.PCFShadowMap;
// a sombra só é recalculada quando alguma peça se mexe (a câmera andando não muda a sombra)
render.shadowMap.autoUpdate = false;
render.toneMapping = THREE.NeutralToneMapping;
render.outputColorSpace = THREE.SRGBColorSpace;

const cena = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1080 / 1920, 0.1, 200);

cena.add(new THREE.HemisphereLight(0xeee8ff, 0x2a1f5c, 1.5));
const sol = new THREE.DirectionalLight(0xffffff, 2.4);
sol.position.set(-4, 12, 7);
sol.castShadow = true;
sol.shadow.mapSize.set(1024, 1024);
Object.assign(sol.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 40 });
sol.shadow.radius = 5; sol.shadow.bias = -0.0004; sol.shadow.normalBias = 0.02;
cena.add(sol);
const contraLuz = new THREE.DirectionalLight(0x6fe9ff, 1.1);      // a luz ciano de trás que contorna as peças
contraLuz.position.set(3, 5, -9); cena.add(contraLuz);
const roxa = new THREE.PointLight(0xa06bff, 40, 30); roxa.position.set(7, 4, -5); cena.add(roxa);

// o chão invisível que só recebe a sombra do tabuleiro
const chao = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.35 }));
chao.rotation.x = -Math.PI / 2; chao.position.y = -0.9; chao.receiveShadow = true; cena.add(chao);

// ---------------------------------------------------------------- tabuleiro
const moldura = new THREE.Mesh(new RoundedBoxGeometry(9.1, 0.5, 9.1, 4, 0.2),
  new THREE.MeshLambertMaterial({ color: 0x2a1f7a }));
moldura.position.y = -0.25; moldura.receiveShadow = true; moldura.castShadow = true; cena.add(moldura);
const gCasa = new RoundedBoxGeometry(0.96, 0.12, 0.96, 3, 0.07);
// as casas ocupam quase a tela toda: um material mais leve (Lambert) deixa cada quadro bem mais rápido
const mClara = new THREE.MeshLambertMaterial({ color: 0xece7ff });
const mEscura = new THREE.MeshLambertMaterial({ color: 0x7462e6 });
for (let l = 0; l < 8; l++) for (let c = 0; c < 8; c++) {
  const m = new THREE.Mesh(gCasa, (c + l) % 2 ? mEscura : mClara);
  m.position.set(mundoX(c), TOPO - 0.06, mundoZ(l)); m.receiveShadow = true; cena.add(m);
}

// letras e números na borda da moldura
function etiqueta(texto) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = '#cdc6ee'; g.font = '700 84px "Chakra Petch", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(texto, 64, 68);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), new THREE.MeshBasicMaterial({ map: tx, transparent: true }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.004;
  return m;
}
const etiquetas = [];
function poeEtiquetas() {
  etiquetas.forEach(e => cena.remove(e)); etiquetas.length = 0;
  const lado = R.pretasEmbaixo ? -1 : 1;
  for (let i = 0; i < 8; i++) {
    const a = etiqueta('abcdefgh'[i]); a.position.x = mundoX(i); a.position.z = 4.27 * lado;
    const n = etiqueta(String(8 - i)); n.position.x = -4.27 * lado; n.position.z = mundoZ(i);
    if (R.pretasEmbaixo) { a.rotation.z = Math.PI; n.rotation.z = Math.PI; }
    etiquetas.push(a, n); cena.add(a, n);
  }
}

// ---------------------------------------------------------------- as peças
// Perfis no desenho do site (img/pecas-express, viewBox 100): [meia-largura, altura no SVG].
const Y = y => (92 - y) / 100 * S, Rr = r => r / 100 * S;
function torno(pts, liso) {
  let v = pts.map(([r, y]) => new THREE.Vector2(Rr(r), Y(y)));
  if (liso) v = new THREE.SplineCurve(v).getPoints(28);
  return new THREE.LatheGeometry(v, 40);
}
const MAT = {
  w: new THREE.MeshStandardMaterial({ color: 0xfbfaff, roughness: 0.34, metalness: 0.02 }),
  b: new THREE.MeshStandardMaterial({ color: 0x2c2290, roughness: 0.3, metalness: 0.08 }),
  ouro: new THREE.MeshStandardMaterial({ color: 0xffc43d, roughness: 0.28, metalness: 0.75, emissive: 0x6b4500, emissiveIntensity: 0.35 }),
  detW: new THREE.MeshStandardMaterial({ color: 0x5a45c9, roughness: 0.4 }),
  detB: new THREE.MeshStandardMaterial({ color: 0xffd36b, roughness: 0.35, metalness: 0.4, emissive: 0x6b4500, emissiveIntensity: 0.4 })
};
const GEO = {
  base: torno([[0, 92], [27, 92], [30, 90], [30, 82], [28, 80], [0, 80]]),
  faixa: torno([[0, 80], [22, 80], [22, 72], [0, 72]]),
  corpoBaixo: torno([[0, 72], [19, 72], [15, 58], [0, 58]])
};
function malha(g, geo, mat, y) {
  const m = new THREE.Mesh(geo, mat); if (y != null) m.position.y = y;
  m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
}
function fazPeca(tipo, cor) {
  const g = new THREE.Group(), mat = MAT[cor], det = cor === 'w' ? MAT.detW : MAT.detB;
  malha(g, GEO.base, mat); malha(g, GEO.faixa, MAT.ouro);
  if (tipo === 'p') {
    malha(g, torno([[0, 72], [18, 72], [9, 42], [0, 42]]), mat);
    malha(g, new THREE.SphereGeometry(Rr(14), 40, 28), mat, Y(30));
  } else if (tipo === 'r') {
    malha(g, torno([[0, 72], [19, 72], [16, 38], [0, 38]]), mat);
    malha(g, torno([[0, 38], [23, 38], [23, 24], [0, 24]]), mat);
    for (let k = 0; k < 4; k++) {        // as ameias
      malha(g, new THREE.CylinderGeometry(Rr(23), Rr(23), Y(16) - Y(24), 16, 1, false, k * Math.PI / 2 + 0.3, Math.PI / 2 - 0.6), mat, (Y(16) + Y(24)) / 2);
    }
  } else if (tipo === 'b') {
    malha(g, torno([[0, 72], [17, 72], [9, 56], [0, 56]]), mat);
    malha(g, torno([[0, 56.5], [11, 56], [15, 49], [16.5, 40], [15, 31], [11, 22], [5, 16], [0, 14]], true), mat);
    malha(g, new THREE.SphereGeometry(Rr(5), 24, 16), mat, Y(11));
    const corte = malha(g, new THREE.BoxGeometry(Rr(4.5), Rr(19), Rr(10)), det, Y(32));
    corte.position.z = Rr(12.5); corte.rotation.z = -0.62;
  } else if (tipo === 'q') {
    malha(g, GEO.corpoBaixo, mat);
    malha(g, torno([[0, 58], [16, 58], [21, 48], [26, 34], [22, 33], [12, 40], [0, 42]], true), mat);
    for (let k = 0; k < 7; k++) {
      const a = k / 7 * Math.PI * 2, b = malha(g, new THREE.SphereGeometry(Rr(5), 20, 14), mat, Y(29));
      b.position.x = Math.cos(a) * Rr(25); b.position.z = Math.sin(a) * Rr(25);
    }
    malha(g, torno([[0, 44], [6, 40], [4, 26], [0, 25]]), mat);
    malha(g, new THREE.SphereGeometry(Rr(5.5), 24, 16), MAT.ouro, Y(21));
  } else if (tipo === 'k') {
    malha(g, GEO.corpoBaixo, mat);
    malha(g, torno([[0, 58], [14, 58], [18, 46], [20, 38], [16, 33.5], [8, 31], [0, 30.5]], true), mat);
    malha(g, new THREE.BoxGeometry(Rr(8), Rr(25), Rr(8)), MAT.ouro, Y(18.5));
    malha(g, new THREE.BoxGeometry(Rr(22), Rr(8), Rr(8)), MAT.ouro, Y(17));
  } else if (tipo === 'n') {
    // a silhueta do cavalo do site, com volume
    const f = new THREE.Shape(), P = (x, y) => [(x - 50) / 100 * S, Y(y)];
    f.moveTo(...P(33, 72)); f.bezierCurveTo(...P(33, 55), ...P(46, 49), ...P(42, 37));
    [[32, 45], [24, 38], [37, 17], [46, 21], [49, 12], [57, 20]].forEach(p => f.lineTo(...P(...p)));
    f.bezierCurveTo(...P(72, 27), ...P(75, 47), ...P(70, 72)); f.closePath();
    const esp = Rr(20), geo = new THREE.ExtrudeGeometry(f, { depth: esp, bevelEnabled: true, bevelThickness: Rr(4), bevelSize: Rr(3.5), bevelSegments: 5, curveSegments: 24 });
    geo.translate(0, 0, -esp / 2);
    const cab = malha(g, geo, mat); cab.name = 'cabeca';
    const crina = new THREE.CubicBezierCurve3(new THREE.Vector3(...P(58, 26), 0), new THREE.Vector3(...P(63, 34), 0), new THREE.Vector3(...P(64, 46), 0), new THREE.Vector3(...P(61, 60), 0));
    [1, -1].forEach(lado => {
      const z = lado * (esp / 2 + Rr(4));
      const olho = malha(g, new THREE.SphereGeometry(Rr(3.4), 16, 12), det); olho.position.set(...P(44, 29), z); olho.scale.z = 0.4;
      const c = malha(g, new THREE.TubeGeometry(crina, 24, Rr(1.7), 8), det); c.position.z = z; c.scale.z = 0.4;
    });
    g.rotation.y = cor === 'w' ? 0.45 : -0.45 + Math.PI;
  }
  return g;
}
const MODELOS = {};
function modelo(p) {
  if (!MODELOS[p]) MODELOS[p] = fazPeca(p.toLowerCase(), p === p.toUpperCase() ? 'w' : 'b');
  return MODELOS[p];
}
// As peças em cena: cada tipo tem sua fila de cópias, usadas na ordem a cada quadro.
const filas = {};
function pecaDaFila(p, k) {
  const f = filas[p] = filas[p] || [];
  if (!f[k]) {
    const ext = new THREE.Group(), dentro = modelo(p).clone();
    ext.add(dentro); f[k] = ext; cena.add(ext);
  }
  return f[k];
}

// ---------------------------------------------------------------- a mão ([mao casa])
// Um desenho (videos/mao.svg) sempre de frente para a câmera, por cima de tudo. O ponto da pinça,
// em (70, 70) do desenho de 400x400, fica no alto da peça segurada.
const ALTURA_PINCA = 0.82, TAM_MAO = 2.5, DUR_MAO_VEM = 0.4, DUR_MAO_VAI = 0.35, MAO_SOZINHA = 6;
const mao = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
mao.center.set(70 / 400, 1 - 70 / 400); mao.renderOrder = 999; mao.visible = false; cena.add(mao);
// Se a pasta privada das lições tem modelos/mao.fbx (uma mão com ossos nos dedos), a mão é esse
// modelo 3D, que chega aberta e fecha em pinça na peça. Sem o arquivo, fica o desenho.
// Os ossos do modelo: 002-004 polegar, 005-008 indicador, 009-012 médio, 013-016 anelar, 017-020 mínimo.
const MAO3D = { tam: 1.9 / 260, pinca: new THREE.Vector3(161, 83, 55), inclina: 0.6,
  aberta: { ind: 0.35, resto: 0.55, tY: 0, tX: 0, tZ: 0, tY2: 0 },
  fechada: { ind: 0.9, resto: 1, tY: 0.2, tX: 0.6, tZ: 0, tY2: 0.4 } };
let mao3d = null;
async function carregaMao3d() {
  let obj;
  try { obj = await new FBXLoader().loadAsync('/privado/modelos/mao.fbx'); } catch (e) { return; }
  const pele = new THREE.MeshStandardMaterial({ color: 0xe8b48f, roughness: 0.62, transparent: true });
  const ossos = {};
  obj.traverse(o => { if (o.isMesh) { o.material = pele; o.frustumCulled = false; } if (o.isBone) ossos[o.name] = o; });
  const base = {}; for (const k in ossos) base[k] = ossos[k].quaternion.clone();
  // a pinça fica no ponto (0,0,0) do grupo; o grupo é que vai até a peça
  obj.scale.setScalar(MAO3D.tam); obj.position.copy(MAO3D.pinca).multiplyScalar(-MAO3D.tam);
  const giro = new THREE.Group(); giro.add(obj);
  const g = new THREE.Group(); g.add(giro); g.visible = false; cena.add(g);
  mao3d = { g, giro, obj, ossos, base, pele, aperto: -1 };
}
const qA = new THREE.Quaternion(), qB = new THREE.Quaternion();
function dobra(osso, eixo, ang) {
  osso.parent.getWorldQuaternion(qB);
  const mundo = qB.clone().multiply(osso.quaternion);
  qA.setFromAxisAngle(eixo, ang);
  osso.quaternion.copy(qB.invert().multiply(qA.multiply(mundo)));
  osso.updateMatrixWorld(true);
}
// a pose da mão entre aberta (0) e fechada em pinça (1), dobrando os ossos no espaço do modelo
function poseMao(aperto) {
  if (aperto === mao3d.aperto) return;
  mao3d.aperto = aperto;
  const A = MAO3D.aberta, F = MAO3D.fechada, v = k => A[k] + (F[k] - A[k]) * aperto, B = mao3d.ossos;
  for (const k in B) B[k].quaternion.copy(mao3d.base[k]);
  // as dobras são feitas com o modelo parado na origem, sem o giro da cena
  const pai = mao3d.obj.parent; pai.remove(mao3d.obj);
  const p0 = mao3d.obj.position.clone(), s0 = mao3d.obj.scale.clone();
  mao3d.obj.position.set(0, 0, 0); mao3d.obj.scale.setScalar(1); mao3d.obj.updateMatrixWorld(true);
  const X = new THREE.Vector3(1, 0, 0), Yv = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
  ['Bone006', 'Bone007', 'Bone008'].forEach((n, i) => dobra(B[n], Z, -v('ind') * [0.6, 1, 0.8][i]));
  ['Bone010', 'Bone011', 'Bone012', 'Bone014', 'Bone015', 'Bone016', 'Bone018', 'Bone019', 'Bone020']
    .forEach((n, i) => dobra(B[n], Z, -v('resto') * [0.7, 1.2, 1][i % 3]));
  dobra(B.Bone003, Yv, v('tY')); dobra(B.Bone003, X, v('tX'));
  ['Bone003', 'Bone004'].forEach(n => dobra(B[n], Z, -v('tZ')));
  dobra(B.Bone004, Yv, v('tY2'));
  mao3d.obj.position.copy(p0); mao3d.obj.scale.copy(s0); pai.add(mao3d.obj);
}
async function carregaMao() {
  const im = new Image(); im.src = 'mao.svg'; await im.decode();
  const cv = document.createElement('canvas'); cv.width = cv.height = 512;
  cv.getContext('2d').drawImage(im, 0, 0, 512, 512);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
  mao.material.map = tx; mao.material.needsUpdate = true;
}

// ---------------------------------------------------------------- etiquetas ([etiqueta d3 LIVRE!])
// Um adesivo com texto, de frente para a câmera, um pouco acima da casa.
const COR_ETIQUETA = { amarela: ['#ffd36b', '#241300'], verde: ['#58e23a', '#0b0624'], vermelha: ['#ff4f78', '#ffffff'], azul: ['#2ee6ff', '#0b0624'] };
const texEtiqueta = {}, filaEtiquetas = [];
function texturaEtiqueta(texto, cor) {
  const k = cor + '|' + texto;
  if (texEtiqueta[k]) return texEtiqueta[k];
  const cv = document.createElement('canvas'), g = cv.getContext('2d');
  g.font = '700 92px "Chakra Petch"';
  const larg = Math.ceil(g.measureText(texto.toUpperCase()).width) + 90;
  cv.width = larg + 40; cv.height = 190;
  const [fundo, letra] = COR_ETIQUETA[cor] || COR_ETIQUETA.amarela;
  g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.roundRect(26, 30, larg, 140, 28); g.fill();
  g.fillStyle = fundo; g.beginPath(); g.roundRect(18, 16, larg, 140, 28); g.fill();
  g.lineWidth = 8; g.strokeStyle = '#0b0624'; g.stroke();
  g.font = '700 92px "Chakra Petch"'; g.fillStyle = letra; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(texto.toUpperCase(), 18 + larg / 2, 90);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
  return (texEtiqueta[k] = { tx, prop: cv.width / cv.height });
}
function etiquetaDaFila(k) {
  if (!filaEtiquetas[k]) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
    sp.renderOrder = 998; sp.center.set(0.5, 0); cena.add(sp); filaEtiquetas[k] = sp;
  }
  return filaEtiquetas[k];
}

// ---------------------------------------------------------------- placas (marcas, último lance, xeque)
const gPlaca = new RoundedBoxGeometry(0.92, 0.03, 0.92, 2, 0.012);
const filaPlacas = [];
function placa(k, cor, opac, brilho) {
  if (!filaPlacas[k]) {
    const m = new THREE.Mesh(gPlaca, new THREE.MeshStandardMaterial({ transparent: true, depthWrite: false, roughness: 0.5 }));
    filaPlacas[k] = m; cena.add(m);
  }
  const m = filaPlacas[k];
  m.visible = true; m.material.color.setHex(cor); m.material.emissive.setHex(cor);
  m.material.emissiveIntensity = brilho; m.material.opacity = opac;
  return m;
}
const luzXeque = new THREE.PointLight(0xff3c5a, 0, 3.5); cena.add(luzXeque);

// ---------------------------------------------------------------- setas
const filaSetas = [];
function caminho(de, para) {
  const a = [col(de), lin(de)], b = [col(para), lin(para)], dx = b[0] - a[0], dy = b[1] - a[1];
  const pts = [[a[0], a[1]]];
  if (Math.abs(dx) * Math.abs(dy) === 2) pts.push(Math.abs(dx) === 2 ? [b[0], a[1]] : [a[0], b[1]]);
  pts.push([b[0], b[1]]);
  const vx = pts[1][0] - pts[0][0], vy = pts[1][1] - pts[0][1], v = Math.hypot(vx, vy);
  pts[0] = [pts[0][0] + vx / v * 0.3, pts[0][1] + vy / v * 0.3];
  return pts.map(([c, l]) => [mundoX(c), mundoZ(l)]);
}
// a forma da seta (vista de cima), cortada no comprimento `ate`
function formaSeta(pts, p) {
  const L = [], CAB = 0.46, LARG = 0.13, ABA = 0.3;
  let total = 0;
  for (let k = 1; k < pts.length; k++) total += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
  const ate = total * p;
  if (ate < 0.05) return null;
  // os pontos do caminho até `ate`
  let falta = ate; L.push(pts[0]);
  for (let k = 1; k < pts.length; k++) {
    const sx = pts[k][0] - pts[k - 1][0], sy = pts[k][1] - pts[k - 1][1], d = Math.hypot(sx, sy);
    if (falta <= d) { L.push([pts[k - 1][0] + sx * falta / d, pts[k - 1][1] + sy * falta / d]); break; }
    L.push(pts[k]); falta -= d;
  }
  const n = L.length, ponta = L[n - 1], ant = L[n - 2];
  const ux = ponta[0] - ant[0], uy = ponta[1] - ant[1], du = Math.hypot(ux, uy) || 1, u = [ux / du, uy / du];
  const cab = Math.min(CAB, ate * 0.9);
  // a haste vai até a base da ponta (ou só até a última curva, se a ponta for maior que o trecho)
  const base = [ponta[0] - u[0] * cab, ponta[1] - u[1] * cab];
  const haste = L.slice(0, n - 1);
  if (Math.hypot(base[0] - ant[0], base[1] - ant[1]) > 0.01 && (ux * (base[0] - ant[0]) + uy * (base[1] - ant[1])) > 0) haste.push(base);
  const nrm = (a, b) => { const x = b[0] - a[0], y = b[1] - a[1], d = Math.hypot(x, y) || 1; return [-y / d, x / d]; };
  const esq = [], dir = [];
  haste.forEach((q, k) => {
    let nv;
    if (k === 0) nv = nrm(haste[0], haste[1] || ponta);
    else if (k === haste.length - 1) nv = nrm(haste[k - 1], q);
    else { const a = nrm(haste[k - 1], q), b = nrm(q, haste[k + 1]), m = [a[0] + b[0], a[1] + b[1]], dm = Math.hypot(m[0], m[1]); nv = [m[0] / dm * Math.SQRT2, m[1] / dm * Math.SQRT2]; }
    esq.push([q[0] + nv[0] * LARG, q[1] + nv[1] * LARG]); dir.push([q[0] - nv[0] * LARG, q[1] - nv[1] * LARG]);
  });
  const nb = [-u[1], u[0]];
  const f = new THREE.Shape(), XY = q => [q[0], -q[1]];      // a forma é desenhada em (x, -z)
  f.moveTo(...XY(esq[0]));
  esq.slice(1).forEach(q => f.lineTo(...XY(q)));
  if (haste.length < 2) f.lineTo(...XY([base[0] + nb[0] * LARG, base[1] + nb[1] * LARG]));
  f.lineTo(...XY([base[0] + nb[0] * ABA, base[1] + nb[1] * ABA]));
  f.lineTo(...XY(ponta));
  f.lineTo(...XY([base[0] - nb[0] * ABA, base[1] - nb[1] * ABA]));
  if (haste.length < 2) f.lineTo(...XY([base[0] - nb[0] * LARG, base[1] - nb[1] * LARG]));
  dir.slice().reverse().forEach(q => f.lineTo(...XY(q)));
  f.closePath();
  return f;
}
function seta(k, s) {
  if (!filaSetas[k]) {
    const m = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.93, depthWrite: false,
      roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    m.rotation.x = -Math.PI / 2; m.position.y = TOPO + 0.03; m.renderOrder = 2;
    filaSetas[k] = m; cena.add(m);
  }
  const m = filaSetas[k], chave = s.de + '-' + s.para + '-' + s.p;
  if (m.userData.chave !== chave) {
    const f = formaSeta(caminho(s.de, s.para), s.p);
    m.geometry.dispose();
    m.geometry = f ? new THREE.ExtrudeGeometry(f, { depth: 0.03, bevelEnabled: false }) : new THREE.BufferGeometry();
    m.userData.chave = chave;
  }
  m.visible = true; m.material.color.setHex(CORES[s.cor]); m.material.emissive.setHex(CORES[s.cor]); m.material.emissiveIntensity = 0.55;
}

// ---------------------------------------------------------------- explosão da captura
function texturaClarao() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const g = cv.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,236,170,.9)'); gr.addColorStop(0.6, 'rgba(255,154,61,.45)'); gr.addColorStop(1, 'rgba(255,79,120,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const clarao = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaClarao(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
clarao.renderOrder = 5; cena.add(clarao);
const onda = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 64), new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
onda.rotation.x = -Math.PI / 2; cena.add(onda);
const CORES_FAISCA = [0xfff6d8, 0xffd36b, 0xff9a3d, 0xff4f78, 0xffffff];
const faiscas = [];
for (let k = 0; k < 22; k++) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), new THREE.MeshBasicMaterial({ color: CORES_FAISCA[k % 5], transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  faiscas.push(m); cena.add(m);
}

// ---------------------------------------------------------------- o diretor da câmera
// Para cada acontecimento, o enquadramento que mostra as casas envolvidas. A câmera vai
// de um enquadramento ao outro em DUR_CAMERA segundos.
let tomadas = [];
function enquadra(casas, t, k) {
  if (!casas.length) return null;
  let x0 = 9, x1 = -9, z0 = 9, z1 = -9;
  casas.forEach(i => { const x = mundoX(col(i)), z = mundoZ(lin(i)); x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); });
  // na edição "show" a câmera chega mais perto e mais baixa, para um ar mais dramático
  const show = R.edicao === 'show';
  const larg = Math.min(9.2, Math.max(show ? 4.8 : 6, x1 - x0 + (show ? 2 : 2.6))), prof = Math.min(9.2, Math.max(show ? 3.8 : 4.6, z1 - z0 + (show ? 1.9 : 2.4)));
  let cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const sobra = Math.max(0, 4.6 - larg / 2);
  cx = Math.max(-sobra, Math.min(sobra, cx)); cz = Math.max(-sobra - 0.4, Math.min(sobra + 0.4, cz));
  const giro = [0, 0.13, -0.11, 0.08, -0.15, 0.1][k % 6];
  return { t, cx, cz, larg, prof, az: (R.pretasEmbaixo ? Math.PI : 0) + giro * (show ? 1.8 : 1), el: (show ? 0.66 : 0.8) + 0.14 * (Math.max(larg, prof) - 5.6) / 4.2 };
}
function planejaCamera() {
  const ocupadas = tab => tab.map((p, i) => p ? i : -1).filter(i => i >= 0);
  tomadas = [];
  const inicio = enquadra(ocupadas(R.inicial), -10, 0) || enquadra([0, 63], -10, 0);
  inicio.larg = 8.4; inicio.prof = 9.2; inicio.el = 1.05; inicio.cx = inicio.cz = 0; tomadas.push(inicio);
  R.eventos.forEach(ev => {
    let casas = null;
    if (ev.tipo === 'lance') { casas = [ev.de, ev.para]; if (ev.xeque != null) casas.push(ev.xeque); }
    else if (ev.tipo === 'seta') casas = [].concat(...ev.setas);
    else if (ev.tipo === 'marca') casas = ev.casas;
    else if (ev.tipo === 'poe') casas = ev.novas;
    else if (ev.tipo === 'mao') casas = [ev.casa];
    else if (ev.tipo === 'posicao') casas = ocupadas(ev.tabuleiro);
    if (!casas) return;
    const nova = enquadra(casas, ev.t, tomadas.length), ult = tomadas[tomadas.length - 1];
    if (!nova) return;
    if (ev.tipo === 'posicao') { nova.larg = 8.4; nova.prof = 9.2; nova.el = 1.05; nova.cx = nova.cz = 0; }
    // se o novo enquadramento é quase o mesmo, a câmera fica onde está
    if (Math.hypot(nova.cx - ult.cx, nova.cz - ult.cz) < 0.7 && Math.abs(nova.larg - ult.larg) < 0.9 && Math.abs(nova.prof - ult.prof) < 0.9) return;
    // uma tomada nova logo depois de outra espera a anterior terminar
    nova.t = Math.max(nova.t, ult.t + DUR_CAMERA * 0.6);
    tomadas.push(nova);
  });
}
function cameraEm(t) {
  let k = 0;
  while (k + 1 < tomadas.length && tomadas[k + 1].t <= t) k++;
  const b = tomadas[k], a = tomadas[Math.max(0, k - 1)], p = k === 0 ? 1 : vaiVem(Math.min(1, (t - b.t) / DUR_CAMERA));
  const m = (x, y) => x + (y - x) * p;
  return { cx: n3(m(a.cx, b.cx)), cz: n3(m(a.cz, b.cz)), larg: n3(m(a.larg, b.larg)), prof: n3(m(a.prof, b.prof)),
    az: n3(m(a.az, b.az) + DERIVA * Math.sin(t * 0.45)), el: n3(m(a.el, b.el) + DERIVA * 0.5 * Math.sin(t * 0.31 + 1)) };
}
// A faixa da tela onde o tabuleiro deve caber: entre a legenda e o rodapé.
const QUADRO = { x0: 30, x1: 1050, y0: 560, y1: 1740 };
function poeCamera(c) {
  const alvo = new THREE.Vector3(c.cx, TOPO, c.cz);
  const dir = new THREE.Vector3(Math.sin(c.az) * Math.cos(c.el), Math.sin(c.el), Math.cos(c.az) * Math.cos(c.el));
  // os cantos da área a mostrar, no chão e na altura das peças
  const cantos = [];
  [-1, 1].forEach(sx => [-1, 1].forEach(sz => [0, 1.2].forEach(h =>
    cantos.push(new THREE.Vector3(c.cx + sx * c.larg / 2, TOPO + h, c.cz + sz * c.prof / 2)))));
  const v = new THREE.Vector3();
  camera.clearViewOffset();
  const medida = d => {
    camera.position.copy(alvo).addScaledVector(dir, d); camera.lookAt(alvo); camera.updateMatrixWorld();
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    cantos.forEach(q => { v.copy(q).project(camera); const px = (v.x + 1) * 540, py = (1 - v.y) * 960;
      x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); });
    return { x0, x1, y0, y1 };
  };
  // a menor distância em que a área cabe na largura e na altura da faixa
  let perto = 3, longe = 80;
  for (let k = 0; k < 30; k++) {
    const d = (perto + longe) / 2, m = medida(d);
    if (m.x1 - m.x0 <= QUADRO.x1 - QUADRO.x0 && m.y1 - m.y0 <= QUADRO.y1 - QUADRO.y0) longe = d; else perto = d;
  }
  const m = medida(longe);
  // e desliza a imagem para a área ficar no meio da faixa
  const dx = (m.x0 + m.x1) / 2 - (QUADRO.x0 + QUADRO.x1) / 2, dy = (m.y0 + m.y1) / 2 - (QUADRO.y0 + QUADRO.y1) / 2;
  camera.setViewOffset(1080, 1920, dx, dy, 1080, 1920);
}

// ---------------------------------------------------------------- o estado num instante
function estado(t) {
  let tab = R.inicial, veio = -1, foi = -1, setas = [], marcas = [], andando = null, novas = null;
  let xeque = null, captura = null, faixa = null, cartaz = null, cartazSai = null, mao = null;
  let nota = null, nNota = 0, etiquetas = [], flash = null, treme = null, tela = null, telaSai = null;
  const show = R.edicao === 'show';
  const fechaTela = q => { if (tela) { telaSai = { tl: tela, t0: q }; tela = null; } };
  const maoSai = (q) => { if (mao && mao.sai == null) mao.sai = q; };
  for (const ev of R.eventos) {
    if (ev.t > t) break;
    tab = ev.tabuleiro; andando = null; novas = null;
    const chega = ev.t + R.durLance;
    if (ev.tipo === 'lance') {
      veio = ev.de; foi = ev.para; setas = []; marcas = [];
      if (t - ev.t < R.durLance) andando = { ev, p: (t - ev.t) / R.durLance };
      xeque = ev.xeque != null ? { casa: ev.xeque, mate: ev.mate, t0: chega } : null;
      if (ev.capturada) captura = { casa: ev.capturada.casa, peca: ev.capturada.peca, t0: ev.t + R.durLance * DUR_ATE_BATER };
      if (ev.xeque != null) faixa = { texto: ev.mate ? 'XEQUE-MATE!' : 'XEQUE!', classe: ev.mate ? 'mate' : 'xeque', t0: chega, dur: ev.mate ? 2.2 : 1.4 };
      if (cartaz) { cartazSai = { c: cartaz, t0: ev.t }; cartaz = null; }
      fechaTela(ev.t);
      // na edição "show", o mate e a captura pedem piscada e tremor
      if (show && ev.mate) { flash = { cor: 'amarela', t0: chega, forte: 1 }; treme = { t0: chega, forca: 1 }; }
      else if (show && ev.capturada) treme = { t0: ev.t + R.durLance * DUR_ATE_BATER, forca: 0.5 };
      // a mão que segura a peça do lance vai junto com ela e solta logo depois; outra mão sai
      if (mao && mao.sai == null && ev.de === mao.casa) { mao.segue = ev; mao.sai = chega + 0.3; }
      else maoSai(ev.t);
    } else if (ev.tipo === 'posicao') { veio = foi = -1; setas = []; marcas = []; xeque = null; etiquetas = []; maoSai(ev.t); fechaTela(ev.t); }
    else if (ev.tipo === 'nota') { nNota++; nota = { texto: ev.texto, t0: ev.t, k: nNota }; }
    else if (ev.tipo === 'etiqueta') etiquetas.push({ casa: ev.casa, texto: ev.texto, cor: ev.cor, t0: ev.t });
    else if (ev.tipo === 'flash') flash = { cor: ev.cor, t0: ev.t, forte: 0.7 };
    else if (ev.tipo === 'treme') treme = { t0: ev.t, forca: 1 };
    else if (ev.tipo === 'tela') { fechaTela(ev.t); tela = { modelo: ev.modelo, partes: ev.partes, t0: ev.t }; }
    else if (ev.tipo === 'mao') mao = { casa: ev.casa, t0: ev.t, peca: ev.tabuleiro[ev.casa] || '' };
    else if (ev.tipo === 'limpa') { setas = []; marcas = []; etiquetas = []; fechaTela(ev.t); maoSai(ev.t); if (cartaz) { cartazSai = { c: cartaz, t0: ev.t }; cartaz = null; } }
    else if (ev.tipo === 'esconde') { fechaTela(ev.t); if (cartaz) { cartazSai = { c: cartaz, t0: ev.t }; cartaz = null; } }
    else if (ev.tipo === 'mostra') cartaz = { peca: ev.peca, nome: ev.nome, t0: ev.t };
    else if (ev.tipo === 'texto') faixa = { texto: ev.texto, classe: ev.texto.length > 16 ? 'longa' : '', t0: ev.t, dur: 1.6 };
    else if (ev.tipo === 'poe') { xeque = null; if (t - ev.t < DUR_POE) novas = { casas: ev.novas, p: (t - ev.t) / DUR_POE }; }
    else if (ev.tipo === 'tira') xeque = null;
    else if (ev.tipo === 'seta') ev.setas.forEach(s => setas.push({ de: s[0], para: s[1], cor: ev.cor, t0: ev.t }));
    else if (ev.tipo === 'marca') ev.casas.forEach(c => marcas.push({ casa: c, cor: ev.cor, t0: ev.t }));
  }

  // as peças: coluna, linha, altura do pulo e escala
  const pecas = [], pula = {};
  if (andando) andando.ev.movem.forEach(m => { pula[m.para] = true; });
  for (let i = 0; i < 64; i++) {
    if (!tab[i] || pula[i]) continue;
    let e = 1, h = 0;
    if (novas && novas.casas.includes(i)) { e = 0.3 + 0.7 * molinha(Math.min(1, novas.p * 1.4)); h = 1.4 * Math.pow(1 - suave(novas.p), 2); }
    pecas.push({ p: tab[i], c: col(i), l: lin(i), h: n3(h), e: n3(e) });
  }
  if (andando) {
    const p = vaiVem(andando.p), cap = andando.ev.capturada;
    if (cap && andando.p < DUR_ATE_BATER) pecas.push({ p: cap.peca, c: col(cap.casa), l: lin(cap.casa), h: 0, e: 1 });
    andando.ev.movem.forEach(m => {
      const alto = m.peca.toLowerCase() === 'n' ? 0.75 : 0.35;
      pecas.push({ p: m.peca, c: n3(col(m.de) + (col(m.para) - col(m.de)) * p), l: n3(lin(m.de) + (lin(m.para) - lin(m.de)) * p),
        h: n3(alto * Math.sin(Math.PI * andando.p)), e: 1 });
    });
  }
  let maoAgora = null;
  if (mao) {
    const fim = mao.sai != null ? mao.sai : mao.t0 + MAO_SOZINHA;
    if (t < fim + DUR_MAO_VAI) {
      let c = col(mao.casa), l = lin(mao.casa), h = 0;
      if (mao.segue && t >= mao.segue.t) {
        const ev = mao.segue, q = Math.min(1, (t - ev.t) / R.durLance), p = vaiVem(q);
        c = col(ev.de) + (col(ev.para) - col(ev.de)) * p; l = lin(ev.de) + (lin(ev.para) - lin(ev.de)) * p;
        h = (mao.peca.toLowerCase() === 'n' ? 0.75 : 0.35) * Math.sin(Math.PI * q);
      }
      const dv = t - mao.t0, vem = Math.min(1, dv / DUR_MAO_VEM), vai = Math.max(0, (t - fim) / DUR_MAO_VAI);
      // desce de cima, aperta a peça (a mão encolhe um pouco) e sobe de novo ao soltar
      const sobe = 2.4 * (1 - suave(vem)) + 2.4 * suave(vai);
      const aperta = dv > DUR_MAO_VEM && dv < DUR_MAO_VEM + 0.25 ? 0.07 * Math.sin(Math.PI * (dv - DUR_MAO_VEM) / 0.25) : 0;
      const alto = mao.peca.toLowerCase() === 'k' ? 0.95 : mao.peca.toLowerCase() === 'p' ? 0.72 : ALTURA_PINCA;
      // a mão 3D chega aberta, fecha em pinça na peça e abre de novo ao soltar
      const fecha = Math.max(0, Math.min(1, (dv - DUR_MAO_VEM * 0.8) / 0.25)) * (1 - Math.min(1, vai * 3));
      maoAgora = { c: n3(c), l: n3(l), h: n3(h + alto + sobe), o: n3(Math.min(vem * 1.5, 1 - vai)), e: n3(1 - aperta), f: n3(suave(fecha)) };
    }
  }
  let expl = null;
  if (captura && t >= captura.t0 && t - captura.t0 < DUR_EXPLOSAO)
    expl = { casa: captura.casa, peca: captura.peca, p: n3((t - captura.t0) / DUR_EXPLOSAO) };
  let brilho = null;
  if (xeque && t >= xeque.t0) {
    const dx = t - xeque.t0;
    brilho = { casa: xeque.casa, mate: xeque.mate ? 1 : 0, o: dx < 1.2 ? n3(0.55 + 0.45 * Math.cos(dx * Math.PI * 5)) : 1 };
  }
  let fx = null;
  if (faixa && t >= faixa.t0 && t - faixa.t0 < faixa.dur) {
    const df = t - faixa.t0, fim = faixa.dur - df;
    fx = { texto: faixa.texto, classe: faixa.classe, e: n3(df < 0.3 ? 0.4 + 0.6 * molinha(df / 0.3) : 1), o: n3(Math.min(1, df / 0.12, fim / 0.25)) };
  }
  let cz = null;
  if (cartaz) {
    const dc = t - cartaz.t0;
    cz = { peca: cartaz.peca, nome: cartaz.nome, o: n3(Math.min(1, dc / 0.2)), e: n3(dc < 0.45 ? 0.3 + 0.7 * molinha(dc / 0.45) : 1),
      giro: n3((dc * 14) % 360), nomeO: n3(Math.max(0, Math.min(1, (dc - 0.25) / 0.25))) };
  } else if (cartazSai && t - cartazSai.t0 < 0.3) {
    const ds = t - cartazSai.t0;
    cz = { peca: cartazSai.c.peca, nome: cartazSai.c.nome, o: n3(1 - ds / 0.3), e: n3(1 + 0.15 * ds / 0.3),
      giro: n3(((t - cartazSai.c.t0) * 14) % 360), nomeO: n3(1 - ds / 0.3) };
  }
  let leg = null;
  if (R.legenda) R.legendas.forEach((bl, b) => {
    if (t >= bl.ini - 0.08 && t < bl.some) {
      let atual = -1;
      bl.palavras.forEach((w, k) => { if (t >= w.ini - 0.03) atual = k; });
      leg = { b, w: atual };
    }
  });
  // edição "show": texto animado, lance escrito, etiquetas, piscada, tremor e telas
  let man = null, nt = null, fl = null, tr = null, tl = null;
  const etq = [];
  if (show) {
    if (leg) man = { b: leg.b, ws: R.legendas[leg.b].palavras.map((w, k) => Math.max(0, Math.min(1, (t - w.ini + 0.04) / 0.22)))
      .map(p => n3(p)).filter((p, k) => t >= R.legendas[leg.b].palavras[k].ini - 0.04) };
    if (nota) { const d = t - nota.t0; nt = { texto: nota.texto, k: nota.k, e: n3(d < 0.3 ? 0.6 + 0.4 * molinha(d / 0.3) : 1) }; }
    etiquetas.forEach(q => { const d = t - q.t0; if (d < 4.5) etq.push({ casa: q.casa, texto: q.texto, cor: q.cor,
      e: n3(d < 0.35 ? molinha(d / 0.35) : 1), o: n3(Math.min(1, (4.5 - d) / 0.3)) }); });
    if (flash && t >= flash.t0 && t - flash.t0 < 0.55) fl = { cor: flash.cor, o: n3(flash.forte * Math.pow(1 - (t - flash.t0) / 0.55, 2)) };
    if (treme && t >= treme.t0 && t - treme.t0 < 0.45) {
      const d = t - treme.t0, a = 26 * treme.forca * (1 - d / 0.45);
      tr = { x: n3(a * Math.sin(d * 97)), y: n3(a * Math.cos(d * 73)) };
    }
    if (tela) tl = { modelo: tela.modelo, partes: tela.partes, t0: tela.t0, d: n3(Math.min(2.4, t - tela.t0)), o: n3(Math.min(1, (t - tela.t0) / 0.18)) };
    else if (telaSai && t - telaSai.t0 < 0.22) tl = { modelo: telaSai.tl.modelo, partes: telaSai.tl.partes, t0: telaSai.tl.t0, d: 2.4, o: n3(1 - (t - telaSai.t0) / 0.22), sai: 1 };
  }
  return {
    man, nota: nt, etq, flash: fl, treme: tr, tela: tl,
    cam: cameraEm(t), pecas, veio, foi, expl, brilho, faixa: fx, cartaz: cz, leg, mao: maoAgora,
    setas: setas.map(s => ({ de: s.de, para: s.para, cor: s.cor, p: n3(suave(Math.min(1, (t - s.t0) / DUR_SETA))) })),
    marcas: marcas.map(m => ({ casa: m.casa, cor: m.cor, o: n3(Math.min(1, (t - m.t0) / DUR_MARCA)) }))
  };
}

// ---------------------------------------------------------------- desenhar um estado
const elLegenda = document.getElementById('legenda'), elFaixa = document.getElementById('faixa'), elCartaz = document.getElementById('cartaz');
function imagemDaPeca(p) {
  return p === 'logo' ? '../img/logo.svg' : '../img/pecas-express/' + (p === p.toUpperCase() ? 'w' : 'b') + p.toLowerCase() + '.svg';
}
let sombraFeita = null;
function desenha3d(e) {
  poeCamera(e.cam);
  const sombra = JSON.stringify([e.pecas, e.expl]);
  if (sombra !== sombraFeita) { render.shadowMap.needsUpdate = true; sombraFeita = sombra; }

  // peças
  Object.values(filas).forEach(f => f.forEach(g => { g.visible = false; }));
  const usadas = {};
  e.pecas.forEach(q => {
    const k = usadas[q.p] = (usadas[q.p] || 0) + 1, g = pecaDaFila(q.p, k - 1);
    g.visible = q.e > 0.01;
    g.position.set(mundoX(q.c), TOPO + q.h, mundoZ(q.l));
    g.scale.setScalar(Math.max(0.001, q.e));
  });

  // placas: último lance, marcas, xeque
  filaPlacas.forEach(m => { m.visible = false; });
  let k = 0;
  const poePlaca = (casa, cor, opac, brilho, alt) => {
    const m = placa(k++, cor, opac, brilho);
    m.position.set(mundoX(col(casa)), TOPO + 0.016 + (alt || 0), mundoZ(lin(casa)));
  };
  if (e.veio >= 0) poePlaca(e.veio, 0xffd36b, 0.3, 0.2);
  if (e.foi >= 0) poePlaca(e.foi, 0xffd36b, 0.5, 0.35);
  e.marcas.forEach(m => poePlaca(m.casa, CORES[m.cor], 0.62 * m.o, 0.6, 0.004));
  if (e.brilho) {
    const cor = e.brilho.mate ? 0xffb53d : 0xff3c5a;
    poePlaca(e.brilho.casa, cor, 0.85 * e.brilho.o, 1.2, 0.008);
    luzXeque.color.setHex(cor); luzXeque.intensity = 6 * e.brilho.o;
    luzXeque.position.set(mundoX(col(e.brilho.casa)), TOPO + 0.6, mundoZ(lin(e.brilho.casa)));
  } else luzXeque.intensity = 0;

  // setas
  filaSetas.forEach(m => { m.visible = false; });
  e.setas.forEach((s, i) => seta(i, s));

  // explosão
  clarao.visible = onda.visible = false; faiscas.forEach(f => { f.visible = false; });
  if (e.expl) {
    const x = mundoX(col(e.expl.casa)), z = mundoZ(lin(e.expl.casa)), p = e.expl.p;
    // a peça capturada incha e some no clarão
    if (p < 0.4) {
      const g = pecaDaFila(e.expl.peca, (usadas[e.expl.peca] || 0));
      const q = p / 0.4;
      g.visible = true; g.position.set(x, TOPO + 0.3 * q, z); g.scale.setScalar(Math.max(0.001, q < 0.3 ? 1 + q : 1.3 * (1 - (q - 0.3) / 0.7)));
    }
    if (p < 0.55) { clarao.visible = true; clarao.position.set(x, TOPO + 0.45, z); clarao.scale.setScalar(0.6 + 2.4 * suave(p / 0.55)); clarao.material.opacity = 1 - p / 0.55; }
    onda.visible = true; onda.position.set(x, TOPO + 0.03, z); onda.scale.setScalar(0.6 + 3.2 * suave(p)); onda.material.opacity = 1 - p;
    faiscas.forEach((f, i) => {
      const s = e.expl.casa * 31 + i, ang = i / faiscas.length * Math.PI * 2 + acaso(s) * 0.6;
      const vel = 1.6 + 1.6 * acaso(s + 7), sobe = 1.2 + 2 * acaso(s + 13), tt = p * DUR_EXPLOSAO;
      const tam = (0.7 + 0.8 * acaso(s + 3)) * (1 - p);
      if (tam < 0.05) return;
      f.visible = true; f.scale.setScalar(tam);
      f.position.set(x + Math.cos(ang) * vel * tt, TOPO + 0.35 + sobe * tt - 4.5 * tt * tt, z + Math.sin(ang) * vel * tt);
      f.material.opacity = 1 - p * 0.7;
    });
  }

  filaEtiquetas.forEach(sp => { sp.visible = false; });
  e.etq.forEach((q, k) => {
    const sp = etiquetaDaFila(k), tx = texturaEtiqueta(q.texto, q.cor);
    if (sp.material.map !== tx.tx) { sp.material.map = tx.tx; sp.material.needsUpdate = true; }
    sp.visible = q.e > 0.01; sp.material.opacity = q.o;
    const alto = 0.78 * q.e;
    sp.scale.set(alto * tx.prop, alto, 1);
    sp.position.set(mundoX(col(q.casa)), TOPO + 1.4, mundoZ(lin(q.casa)));
  });
  const temMao = !!e.mao && e.mao.o > 0.01;
  if (mao3d) {
    mao.visible = false; mao3d.g.visible = temMao;
    if (temMao) {
      poseMao(e.mao.f);
      // a mão vem pela esquerda, de perfil para a câmera (o polegar e o indicador à vista),
      // com os dedos inclinados para baixo
      mao3d.g.position.set(mundoX(e.mao.c), TOPO + e.mao.h, mundoZ(e.mao.l));
      mao3d.giro.rotation.set(0, R.pretasEmbaixo ? Math.PI : 0, 0);
      mao3d.giro.rotateZ(-MAO3D.inclina);
      mao3d.pele.opacity = e.mao.o; mao3d.pele.depthWrite = e.mao.o > 0.98;
    }
  }
  mao.visible = !mao3d && temMao;
  if (mao.visible) {
    mao.position.set(mundoX(e.mao.c), TOPO + e.mao.h, mundoZ(e.mao.l));
    mao.scale.setScalar(TAM_MAO * e.mao.e); mao.material.opacity = e.mao.o;
  }

  render.render(cena, camera);
}

// legenda, faixa e cartaz (HTML por cima do 3D)
function desenhaHtml(e) {
  elLegenda.textContent = '';
  if (e.leg) R.legendas[e.leg.b].palavras.forEach((w, i) => {
    const s = document.createElement('span'); s.textContent = w.texto;
    if (i === e.leg.w) s.className = 'dita'; else if (i > e.leg.w) s.className = 'falta';
    elLegenda.appendChild(s);
  });
  elFaixa.hidden = !e.faixa;
  if (e.faixa) {
    elFaixa.textContent = e.faixa.texto; elFaixa.className = 'faixa ' + e.faixa.classe;
    elFaixa.style.transform = 'translate(-50%,-50%) scale(' + e.faixa.e + ')'; elFaixa.style.opacity = e.faixa.o;
  }
  elCartaz.hidden = !e.cartaz;
  if (e.cartaz) {
    elCartaz.style.opacity = e.cartaz.o;
    elCartaz.classList.toggle('logo', e.cartaz.peca === 'logo');
    const im = document.getElementById('cartazPeca');
    im.src = imagemDaPeca(e.cartaz.peca); im.style.transform = 'scale(' + e.cartaz.e + ')';
    document.getElementById('cartazRaios').style.transform = 'rotate(' + e.cartaz.giro + 'deg)';
    const nm = document.getElementById('cartazNome'); nm.textContent = e.cartaz.nome; nm.style.opacity = e.cartaz.nomeO;
  }
}

// ---------------------------------------------------------------- edição "show" (HTML por cima do 3D)
const elMan = document.getElementById('manchete'), elNota = document.getElementById('nota'), elFlash = document.getElementById('flash');
const elTela = document.getElementById('tela'), elHud = document.getElementById('hud');
const COR_FLASH = { amarela: '255,190,80', verde: '88,226,58', vermelha: '255,60,100', azul: '46,200,255' };
const FUNDO_TELA = { numero: 'radial-gradient(900px 900px at 50% 55%,#4a2cc0,#140a45 70%,#07041a)',
  alerta: 'repeating-linear-gradient(135deg,#ff4f78 0 70px,#c2133f 70px 140px)',
  carimbo: 'radial-gradient(900px 900px at 50% 55%,#2a1f7a,#0b0624)', medidor: 'radial-gradient(900px 900px at 50% 60%,#1f1566,#07041a)',
  lista: 'radial-gradient(900px 900px at 50% 55%,#2a1f7a,#0b0624)', frase: 'linear-gradient(160deg,#ffb53d,#ff7a2e 55%,#d9431f)' };
let telaFeita = null;
const esc = x => String(x).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
function montaTela(tl) {
  const [a = '', b = '', c = ''] = tl.partes;
  let meio = '';
  if (tl.modelo === 'numero') meio = '<div class="t-numero">' + esc(a) + '</div><div class="t-legenda">' + esc(b) + '</div>' +
    (/^\d+$/.test(a) && +a <= 12 ? '<div class="t-pontos">' + '<i></i>'.repeat(+a) + '</div>' : '');
  else if (tl.modelo === 'alerta') meio = '<div class="t-alerta">' + esc(a) + '</div>' + (b ? '<div class="t-sub">' + esc(b) + '</div>' : '');
  else if (tl.modelo === 'carimbo') meio = '<div class="t-papel"><h2>' + esc(c || 'XADREZ EXPRESS') + '</h2><h3>' + esc(a) + '</h3>' +
    '<p style="width:92%"></p><p style="width:78%"></p><p style="width:85%"></p><p style="width:60%"></p><div class="t-carimbo">' + esc(b) + '</div></div>';
  else if (tl.modelo === 'medidor') meio = '<svg class="t-medidor" viewBox="0 0 820 440"><path d="M70 410 A340 340 0 0 1 750 410" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="56" stroke-linecap="round"/>' +
    '<path class="t-arco" d="M70 410 A340 340 0 0 1 750 410" fill="none" stroke="url(#gm)" stroke-width="56" stroke-linecap="round" pathLength="100" stroke-dasharray="0 100"/>' +
    '<defs><linearGradient id="gm"><stop offset="0" stop-color="#58e23a"/><stop offset=".55" stop-color="#ffd36b"/><stop offset="1" stop-color="#ff4f78"/></linearGradient></defs>' +
    '<g class="t-agulha" transform="rotate(-90 410 410)"><path d="M402 410 L410 110 L418 410 Z" fill="#fff"/></g><circle cx="410" cy="410" r="30" fill="#fff"/></svg>' +
    '<div class="t-valor">0%</div><div class="t-legenda">' + esc(b) + '</div>';
  else if (tl.modelo === 'lista') meio = '<div class="t-lista">' + tl.partes.map(x => {
    const m = x.match(/^(.*?)\s*(✓|✗|\?)$/), txt = m ? m[1] : x, k = m ? m[2] : '✓';
    return '<div class="t-item"><b class="' + (k === '✗' ? 'nao' : k === '?' ? 'duvida' : '') + '">' + k + '</b><span>' + esc(txt) + '</span></div>';
  }).join('') + '</div>';
  else if (tl.modelo === 'frase') meio = '<div class="t-frase">' + (b ? '<em>' + esc(a) + '</em>' + esc(b) : esc(a)) + '</div>';
  elTela.innerHTML = '<i class="t-fundo" style="background:' + FUNDO_TELA[tl.modelo] + '"></i><div class="t-meio">' + meio + '</div>';
}
function animaTela(tl) {
  const d = tl.d, entra = Math.min(1, d / 0.3), m = elTela.querySelector('.t-meio');
  m.style.transform = 'translateY(' + n3(60 * (1 - suave(entra))) + 'px) scale(' + n3(0.92 + 0.08 * molinha(entra)) + ')';
  if (tl.modelo === 'numero') elTela.querySelector('.t-numero').style.transform = 'scale(' + n3(d < 0.45 ? 0.3 + 0.7 * molinha(d / 0.45) : 1) + ')';
  if (tl.modelo === 'carimbo') {
    const q = Math.max(0, Math.min(1, (d - 0.55) / 0.22)), cb = elTela.querySelector('.t-carimbo');
    cb.style.opacity = q > 0 ? 1 : 0; cb.style.transform = 'rotate(-12deg) scale(' + n3(2.4 - 1.4 * suave(q)) + ')';
  }
  if (tl.modelo === 'medidor') {
    const alvo = Math.max(0, Math.min(100, parseFloat(tl.partes[0]) || 0)), q = suave(Math.min(1, Math.max(0, (d - 0.15) / 0.9))), v = alvo * q;
    elTela.querySelector('.t-agulha').setAttribute('transform', 'rotate(' + n3(-90 + 180 * v / 100) + ' 410 410)');
    elTela.querySelector('.t-arco').setAttribute('stroke-dasharray', n3(v) + ' 100');
    elTela.querySelector('.t-valor').textContent = Math.round(v) + '%';
  }
  if (tl.modelo === 'lista') elTela.querySelectorAll('.t-item').forEach((it, k) => {
    const q = Math.max(0, Math.min(1, (d - 0.15 - k * 0.35) / 0.25));
    it.style.opacity = q; it.style.transform = 'translateX(' + n3(-80 * (1 - suave(q))) + 'px)';
  });
}
function desenhaShow(e) {
  elMan.hidden = !e.man;
  if (e.man) {
    const pal = R.legendas[e.man.b].palavras;
    elMan.innerHTML = e.man.ws.map((p, k) => '<span class="' + (pal[k].destaque ? 'forte' : '') + '" style="opacity:' + n3(Math.min(1, p * 2)) +
      ';transform:translateY(' + n3(26 * (1 - suave(p))) + 'px) scale(' + n3(pal[k].destaque ? 0.7 + 0.3 * molinha(p) : 1) + ')">' + esc(pal[k].texto) + '</span>').join('');
  }
  // o lance escrito some enquanto uma tela gráfica ou um cartaz cobrem o tabuleiro
  elNota.hidden = !e.nota || !!(e.tela && e.tela.o > 0.5) || !!(e.cartaz && e.cartaz.o > 0.5);
  if (e.nota) { elNota.textContent = e.nota.texto; elNota.style.transform = 'translateX(-50%) scale(' + e.nota.e + ')';
    document.getElementById('hudLance').textContent = 'Lance ' + String(e.nota.k).padStart(2, '0') + ' / ' + String(R.totalNotas).padStart(2, '0'); }
  else document.getElementById('hudLance').textContent = '';
  elFlash.hidden = !e.flash;
  if (e.flash) elFlash.style.background = 'radial-gradient(circle at 50% 55%,rgba(' + COR_FLASH[e.flash.cor] + ',' + e.flash.o + '),rgba(' + COR_FLASH[e.flash.cor] + ',' + n3(e.flash.o * 0.45) + ') 70%)';
  document.getElementById('cena3d').style.transform = e.treme ? 'translate(' + e.treme.x + 'px,' + e.treme.y + 'px)' : '';
  elTela.hidden = !e.tela;
  if (e.tela) {
    const chaveTela = e.tela.t0 + e.tela.modelo;
    if (chaveTela !== telaFeita) { montaTela(e.tela); telaFeita = chaveTela; }
    elTela.style.opacity = e.tela.o; animaTela(e.tela);
  }
}

// ---------------------------------------------------------------- o que o gera.js chama
async function prepara(roteiro) {
  R = roteiro;
  const num = document.getElementById('numero'), tit = document.getElementById('titulo');
  if (R.numero) { num.hidden = false; num.querySelector('span').textContent = 'Lição ' + String(R.numero).padStart(2, '0'); }
  tit.textContent = R.titulo; tit.classList.toggle('longo', R.titulo.length > 30);
  if (R.edicao === 'show') {
    document.getElementById('palco').classList.add('show'); elHud.hidden = false;
    document.getElementById('hudNome').textContent = R.numero ? 'Lição ' + String(R.numero).padStart(2, '0') : (R.titulo || 'Xadrez Express');
    R.totalNotas = R.eventos.filter(ev => ev.tipo === 'nota').length;
  }
  elLegenda.hidden = !R.legenda;
  await document.fonts.load('700 84px "Chakra Petch"');
  await document.fonts.ready;
  await Promise.all('kqrbnpKQRBNPL'.split('').map(p => {
    const im = new Image(); im.src = imagemDaPeca(p === 'L' ? 'logo' : p); return im.decode().catch(() => {});
  }));
  poeEtiquetas();
  await carregaMao();
  await carregaMao3d();
  planejaCamera();
  render.compile(cena, camera);
  return true;
}
// O 3D só é redesenhado quando algo do 3D muda: a palavra da legenda trocando, por exemplo,
// não custa um desenho novo do tabuleiro. Com o cartaz cobrindo tudo, o 3D fica parado.
let ultima3d = null, ultimaHtml = null;
function quadro(t) {
  const e = estado(t);
  const a3d = JSON.stringify([e.cam, e.pecas, e.veio, e.foi, e.marcas, e.setas, e.brilho, e.expl, e.mao, e.etq]);
  const aHtml = JSON.stringify([e.leg, e.faixa, e.cartaz, e.man, e.nota, e.flash, e.treme, e.tela]);
  const muda3d = a3d !== ultima3d && !(e.cartaz && e.cartaz.o >= 1) && !(e.tela && e.tela.o >= 1);
  if (!muda3d && aHtml === ultimaHtml) return false;
  if (muda3d) { ultima3d = a3d; desenha3d(e); }
  if (aHtml !== ultimaHtml) { ultimaHtml = aHtml; desenhaHtml(e); if (R.edicao === 'show') desenhaShow(e); }
  // espera o navegador pôr o quadro novo na tela antes da foto
  return new Promise(r => requestAnimationFrame(() => r(true)));
}
window.XEV = { prepara, quadro };
window.XEV_PRONTO = true;
