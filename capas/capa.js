// O que os dois modelos têm em comum: cores dos módulos, estrelas, rastro de luz,
// o foguete e o ajuste do tamanho do título.
var CORES = {
  ciano:   ['#2ee6ff', '#a06bff'],
  ouro:    ['#ffd36b', '#ff9a3d'],
  rosa:    ['#ff4fd8', '#a06bff'],
  roxo:    ['#a06bff', '#2ee6ff'],
  laranja: ['#ff9a3d', '#ff4fd8']
};
function pintaCor(nome) {
  var c = CORES[nome] || CORES.ciano;
  document.documentElement.style.setProperty('--cor', c[0]);
  document.documentElement.style.setProperty('--cor2', c[1]);
  return c;
}
// sorteio que se repete: a mesma capa sai sempre igual
function sorteio(semente) {
  var s = 0; for (var i = 0; i < semente.length; i++) s = (s * 31 + semente.charCodeAt(i)) >>> 0;
  return function () { s = (s + 0x6D2B79F5) >>> 0; var t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function estrelas(canvas, semente) {
  var r = sorteio(semente), c = canvas.getContext('2d');
  canvas.width = 1920; canvas.height = 1080;
  for (var i = 0; i < 230; i++) {
    var x = r() * 1920, y = r() * 1080, t = r(), k = r();
    c.globalAlpha = 0.25 + r() * 0.7;
    c.fillStyle = k > 0.93 ? '#ffe9b8' : (k > 0.86 ? '#bfe6ff' : '#ffffff');
    c.beginPath(); c.arc(x, y, 0.8 + t * t * 2.4, 0, 7); c.fill();
  }
  c.globalAlpha = 0.8; c.strokeStyle = '#fff'; c.lineWidth = 2;      // algumas estrelas em cruz
  for (i = 0; i < 9; i++) { x = r() * 1920; y = r() * 1080; c.beginPath(); c.moveTo(x - 9, y); c.lineTo(x + 9, y); c.moveTo(x, y - 9); c.lineTo(x, y + 9); c.stroke(); }
}
// Rastro de cometa: uma fita que nasce fina em p0, faz a curva por pc e chega larga em p1.
function rastro(svg, p0, pc, p1, largura, cores, semente) {
  var N = 60, esq = [], dir = [], meio = [], r = sorteio(semente || 'r'), id = 'g' + Math.floor(r() * 1e9), i;
  for (i = 0; i <= N; i++) {
    var t = i / N, u = 1 - t;
    var x = u * u * p0[0] + 2 * u * t * pc[0] + t * t * p1[0], y = u * u * p0[1] + 2 * u * t * pc[1] + t * t * p1[1];
    var dx = 2 * u * (pc[0] - p0[0]) + 2 * t * (p1[0] - pc[0]), dy = 2 * u * (pc[1] - p0[1]) + 2 * t * (p1[1] - pc[1]);
    var m = Math.hypot(dx, dy) || 1, nx = -dy / m, ny = dx / m, w = largura / 2 * Math.pow(t, 0.85) * (t > 0.86 ? 1 - 0.75 * Math.pow((t - 0.86) / 0.14, 2) : 1);   // afina de novo na ponta, para sumir atrás da peça
    esq.push([x + nx * w, y + ny * w]); dir.push([x - nx * w, y - ny * w]); meio.push([x, y, nx, ny, w, t]);
  }
  function fita(f) {
    var a = [], b = [];
    for (var j = 0; j <= N; j++) { var q = meio[j]; a.push((q[0] + q[2] * q[4] * f).toFixed(1) + ' ' + (q[1] + q[3] * q[4] * f).toFixed(1)); b.unshift((q[0] - q[2] * q[4] * f).toFixed(1) + ' ' + (q[1] - q[3] * q[4] * f).toFixed(1)); }
    return 'M' + a.concat(b).join('L') + 'Z';
  }
  var pontos = '';
  for (i = 0; i < 46; i++) {
    var q = meio[4 + Math.floor(r() * (N - 6))], lado = (r() * 2 - 1) * 1.7, raio = 2 + r() * 5 * q[5] + 1;
    pontos += '<circle cx="' + (q[0] + q[2] * q[4] * lado).toFixed(1) + '" cy="' + (q[1] + q[3] * q[4] * lado).toFixed(1) + '" r="' + raio.toFixed(1) + '" fill="' + (r() > 0.5 ? cores[0] : '#fff') + '" opacity="' + (0.35 + r() * 0.6 * q[5]).toFixed(2) + '"/>';
  }
  svg.insertAdjacentHTML('beforeend',
    '<defs><linearGradient id="' + id + '" gradientUnits="userSpaceOnUse" x1="' + p0[0] + '" y1="' + p0[1] + '" x2="' + p1[0] + '" y2="' + p1[1] + '">' +
    '<stop offset="0" stop-color="' + cores[1] + '" stop-opacity="0"/><stop offset=".35" stop-color="' + cores[1] + '" stop-opacity=".75"/>' +
    '<stop offset=".75" stop-color="' + cores[0] + '"/><stop offset="1" stop-color="#fff"/></linearGradient>' +
    '<linearGradient id="' + id + 'b" gradientUnits="userSpaceOnUse" x1="' + p0[0] + '" y1="' + p0[1] + '" x2="' + p1[0] + '" y2="' + p1[1] + '">' +
    '<stop offset=".2" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".95"/></linearGradient>' +
    '<filter id="' + id + 'f" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="' + (largura * 0.28).toFixed(0) + '"/></filter></defs>' +
    '<path d="' + fita(1.25) + '" fill="url(#' + id + ')" filter="url(#' + id + 'f)" opacity=".85"/>' +
    '<path d="' + fita(1) + '" fill="url(#' + id + ')"/>' +
    '<path d="' + fita(0.38) + '" fill="url(#' + id + 'b)"/>' + pontos);
}
// O foguete do site (bico vermelho, janela azul), apontando para a direita.
var FOGUETE = '<svg viewBox="-60 -30 96 60"><path d="M-22 0c-12-5-22-3-34 0 12 3 22 5 34 0z" fill="#ffd36b"/><path d="M-22 0c-7-3-13-2-20 0 7 2 13 3 20 0z" fill="#fff"/>' +
  '<path d="M-14-8-28-23-25-5zM-14 8-28 23-25 5z" fill="#e02a2a" stroke="#1b1250" stroke-width="1.6" stroke-linejoin="round"/>' +
  '<path d="M-22-8.5Q5-13.5 15-7V7Q5 13.5-22 8.5Z" fill="#f4f5fb" stroke="#1b1250" stroke-width="1.6"/>' +
  '<path d="M14-7.5Q25-5 31 0 25 5 14 7.5Z" fill="#e02a2a" stroke="#1b1250" stroke-width="1.6" stroke-linejoin="round"/>' +
  '<circle cx="3" cy="0" r="4.6" fill="#35c8ff" stroke="#1b1250" stroke-width="1.6"/></svg>';
// Põe a peça (ou o foguete) na caixa. cx, cy = centro; tam = lado; giro em graus.
function poePeca(caixa, peca, cx, cy, tam, giro) {
  var fog = peca === 'foguete', larg = fog ? tam * 1.25 : tam, alt = fog ? tam * 1.25 * 60 / 96 : tam;
  caixa.style.cssText = 'left:' + (cx - larg / 2) + 'px;top:' + (cy - alt / 2) + 'px;width:' + larg + 'px;height:' + alt + 'px;transform:rotate(' + giro + 'deg)';
  caixa.innerHTML = fog ? FOGUETE : '<img src="../img/pecas-express/' + peca + '.svg" alt="">';
}
// Diminui a letra até o título caber na altura e na largura da caixa (no máximo 3 linhas).
function cabe(el, maximo, minimo, alturaMax) {
  var t = maximo;
  for (; t >= minimo; t -= 2) {
    el.style.fontSize = t + 'px';
    var linhas = Math.round(el.getBoundingClientRect().height / (t * 1.04));
    if (linhas <= 3 && el.scrollHeight <= alturaMax && el.scrollWidth <= el.clientWidth) break;
  }
  return t;
}
