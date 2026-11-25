// "Do peão ao rei": uma peça de xadrez em 3D, desenhada com letras e símbolos.
// A placa de vídeo desenha a peça (luz, sombra, reflexo); depois cada casinha da imagem
// vira o caractere de formato mais parecido, medido em 6 regiões (2 colunas x 3 linhas).
// A peça gira e vai virando a próxima: peão, torre, bispo, dama, rei.
//
// Só desenha enquanto está na tela. Sem WebGL ou com "reduzir movimento", fica a imagem parada.
(function () {
  'use strict';
  var caixa = document.getElementById('pecaAscii');
  if (!caixa) return;
  var tela = caixa.querySelector('canvas'), rotulo = document.getElementById('pecaAsciiNome');
  var CALMO = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  var gl3 = document.createElement('canvas');
  var gl = !CALMO && gl3.getContext('webgl', { preserveDrawingBuffer: true, antialias: false });
  if (!gl) return;                                           // fica a imagem parada que já está no HTML

  // ================================================================ as peças (perfil Staunton)
  var BASE = [[0, 0], [.40, 0], [.405, .03], [.39, .05], [.36, .06], [.36, .085], [.33, .095], [.31, .115], [.32, .13], [.29, .145]];
  var PERFIS = {
    peao:  BASE.concat([[.24, .16], [.19, .19], [.155, .25], [.13, .33], [.12, .38], [.20, .395], [.205, .42], [.19, .435], [.11, .445],
                        [.125, .475], [.145, .52], [.15, .565], [.14, .61], [.115, .65], [.075, .68], [0, .695]]),
    torre: BASE.concat([[.27, .16], [.23, .19], [.205, .26], [.19, .45], [.19, .52], [.22, .545], [.26, .555], [.26, .585], [.235, .595],
                        [.235, .62], [.25, .635], [.26, .75], [.255, .79], [0, .79]]),
    bispo: BASE.concat([[.26, .16], [.2, .19], [.15, .28], [.115, .42], [.105, .55], [.20, .565], [.205, .59], [.19, .605], [.10, .615],
                        [.125, .65], [.155, .71], [.165, .77], [.15, .83], [.115, .89], [.065, .93], [.045, .945], [.065, .965], [.06, .99], [0, 1.0]]),
    dama:  BASE.concat([[.27, .16], [.21, .19], [.16, .3], [.125, .48], [.115, .6], [.215, .615], [.22, .645], [.20, .66], [.115, .675],
                        [.135, .72], [.185, .82], [.225, .885], [.23, .9], [.19, .91], [.12, .925], [.08, .95], [.065, .975], [0, .985]]),
    rei:   BASE.concat([[.27, .16], [.21, .19], [.16, .3], [.125, .48], [.115, .6], [.215, .615], [.22, .645], [.20, .66], [.115, .675],
                        [.14, .72], [.19, .81], [.215, .86], [.215, .885], [.17, .895], [.09, .905], [.05, .915], [0, .92]])
  };
  var ORDEM = ['peao', 'torre', 'bispo', 'dama', 'rei'], NOMES = { peao: 'Peão', torre: 'Torre', bispo: 'Bispo', dama: 'Dama', rei: 'Rei' };
  var N = 48;
  function reamostra(pts) {                                 // N pontos igualmente espaçados no contorno: uma peça vira a outra
    var L = [0], i, k;
    for (i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    var tot = L[L.length - 1], out = [];
    for (k = 0; k < N; k++) {
      var s = tot * k / (N - 1); i = 1;
      while (i < L.length - 1 && L[i] < s) i++;
      var t = (s - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
      out.push(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t);
    }
    return out;
  }
  var FORMAS = {}; ORDEM.forEach(function (n) { FORMAS[n] = reamostra(PERFIS[n]); });
  var ALTURAS = { peao: .70, torre: .80, bispo: 1.0, dama: 1.04, rei: 1.18 };   // até o topo, com a cruz do rei

  // ================================================================ a peça na placa de vídeo
  var VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  var FS = [
    'precision highp float;',
    'uniform vec2 uRes;uniform vec2 uP[' + N + '];',
    'uniform float uTorre,uBispo,uDama,uRei;uniform vec3 uCam,uAlvo;',
    'float seg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}',
    'float cruza(vec2 q,vec2 a,vec2 b){bool c1=q.y>=a.y,c2=q.y<b.y;if((c1&&c2)||(!c1&&!c2)){float x=a.x+(q.y-a.y)*(b.x-a.x)/(b.y-a.y);if(q.x<x)return -1.;}return 1.;}',
    'float perfil(vec2 q){float d=1e9;float s=1.;',
    ' for(int i=0;i<' + (N - 1) + ';i++){vec2 a=uP[i],b=uP[i+1];d=min(d,seg(q,a,b));s*=cruza(q,a,b);}',
    ' vec2 a=uP[' + (N - 1) + '],b=uP[0];d=min(d,seg(q,a,b));s*=cruza(q,a,b);',
    ' return s*d;}',
    'float caixa(vec3 p,vec3 b){vec3 q=abs(p)-b;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.);}',
    'float peca(vec3 p){',
    ' float lim=length(vec2(max(length(p.xz)-.42,0.),max(abs(p.y-.58)-.62,0.)));if(lim>.1)return lim;',
    ' vec2 q=vec2(length(p.xz),p.y);float d=perfil(q);',
    ' if(uTorre>.01){float an=atan(p.z,p.x);float k=6.2832/6.;float a2=mod(an+k*.5,k)-k*.5;vec2 r=vec2(cos(a2),sin(a2))*length(p.xz);',
    '  float e=caixa(vec3(r.x-.25,p.y-.79,r.y),vec3(.08,.075*uTorre,.04*uTorre));d=max(d,-e);}',
    ' if(uBispo>.01){vec3 n=normalize(vec3(.8,.6,0.));float pl=abs(dot(p-vec3(.03,.83,0.),n))-.02*uBispo;pl=max(pl,-p.x);d=max(d,-pl);}',
    ' if(uDama>.01){float an=atan(p.z,p.x);float k=6.2832/9.;float a2=mod(an,k)-k*.5;vec2 r=vec2(cos(a2),sin(a2))*length(p.xz);',
    '  d=min(d,length(vec3(r.x-.215,p.y-.915,r.y))-.036*uDama);d=min(d,length(p-vec3(0.,1.005,0.))-.055*uDama);}',
    ' if(uRei>.01){float s=uRei;d=min(d,caixa(p-vec3(0.,.92+.13*s,0.),vec3(.035,.13,.035)*s)-.008);d=min(d,caixa(p-vec3(0.,.99+.08*s,0.),vec3(.1,.032,.035)*s)-.008);}',
    ' return d;}',
    'vec3 normal(vec3 p){vec2 e=vec2(.0015,0.);return normalize(vec3(peca(p+e.xyy)-peca(p-e.xyy),peca(p+e.yxy)-peca(p-e.yxy),peca(p+e.yyx)-peca(p-e.yyx)));}',
    'float sombra(vec3 o,vec3 r){float s=1.,t=.02;for(int i=0;i<28;i++){float h=peca(o+r*t);s=min(s,10.*h/t);t+=clamp(h,.02,.15);if(s<.01||t>2.5)break;}return clamp(s,0.,1.);}',
    'void main(){',
    ' vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;',
    ' vec3 f=normalize(uAlvo-uCam),r=normalize(cross(f,vec3(0.,1.,0.))),u=cross(r,f);',
    ' vec3 rd=normalize(f*2.3+uv.x*r+uv.y*u),ro=uCam;',
    ' vec3 L=normalize(vec3(-.6,.9,-.45));vec3 col=vec3(0.);',
    ' float t=0.;bool acertou=false;',
    ' for(int i=0;i<96;i++){float h=peca(ro+rd*t);if(h<.0008){acertou=true;break;}t+=h*.9;if(t>8.)break;}',
    ' float tc=-ro.y/rd.y;',
    ' if(acertou&&(tc<0.||t<tc)){vec3 p=ro+rd*t,n=normal(p);',
    '  float dif=max(dot(n,L),0.)*sombra(p+n*.003,L);',
    '  float esp=pow(max(dot(reflect(rd,n),L),0.),28.);',
    '  float aro=pow(1.-max(dot(n,-rd),0.),2.5);',
    '  float ao=clamp(.45+.55*n.y,0.,1.)*clamp(p.y*3.+.35,0.,1.);',
    '  col=vec3(1.,.83,.55)*(.07+.95*dif)+vec3(1.,.97,.9)*esp*.9+vec3(.55,.35,1.)*aro*.75+vec3(.25,.18,.5)*ao*.25;',
    ' } else if(tc>0.){vec3 p=ro+rd*tc;vec2 g=floor(p.xz/.36);float cl=mod(g.x+g.y,2.);',
    '  float fade=clamp(1.-length(p.xz)/1.55,0.,1.);',
    '  col=mix(vec3(.10,.07,.30),vec3(.42,.34,.85),cl)*(.25+.75*sombra(p+vec3(0.,.002,0.),L))*fade*fade;',
    ' }',
    ' gl_FragColor=vec4(col,1.);}'
  ].join('\n');
  function compila(tipo, src) { var s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; }
  var vs = compila(gl.VERTEX_SHADER, VS), fs = compila(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return;
  var prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  var vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var la = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(la); gl.vertexAttribPointer(la, 2, gl.FLOAT, false, 0, 0);
  var U = {}; ['uRes', 'uP', 'uTorre', 'uBispo', 'uDama', 'uRei', 'uCam', 'uAlvo'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

  // ================================================================ caracteres escolhidos pelo formato
  var FONTE = '700 Xpx ui-monospace,Menlo,Consolas,"DejaVu Sans Mono",monospace';
  var LETRAS = " .,:;'`\"^-_~=+*!|/\\()[]{}<>il1tfjrxnuvczXYUJCLQ0OZmwqpdbkhao#MW&8%B@$";
  var GW = 20, GH = 38, FORMAG = [];
  (function mede() {
    var cv = document.createElement('canvas'); cv.width = GW; cv.height = GH; var g = cv.getContext('2d', { willReadFrequently: true });
    var maior = 0, k;
    for (k = 0; k < LETRAS.length; k++) {
      g.fillStyle = '#000'; g.fillRect(0, 0, GW, GH); g.fillStyle = '#fff';
      g.font = FONTE.replace('X', GH * 0.86); g.textBaseline = 'middle'; g.textAlign = 'center';
      g.fillText(LETRAS[k], GW / 2, GH / 2 + 1);
      var px = g.getImageData(0, 0, GW, GH).data, v = [0, 0, 0, 0, 0, 0];
      for (var y = 0; y < GH; y++) for (var x = 0; x < GW; x++) v[Math.min(2, Math.floor(y / GH * 3)) * 2 + (x < GW / 2 ? 0 : 1)] += px[(y * GW + x) * 4];
      for (var j = 0; j < 6; j++) { v[j] /= 255 * (GW * GH / 6); maior = Math.max(maior, v[j]); }
      FORMAG.push(v);
    }
    FORMAG.forEach(function (v) { for (var j = 0; j < 6; j++) v[j] /= maior; });
  })();
  // as letras em ordem de quantidade de tinta, para as áreas lisas
  var DENS = LETRAS.split('').map(function (l, k) { var v = FORMAG[k]; return [l, v[0] + v[1] + v[2] + v[3] + v[4] + v[5]]; })
    .sort(function (a, b) { return a[1] - b[1]; }).filter(function (x, k, arr) { return k % 2 === 0 || k === arr.length - 1; }).map(function (x) { return x[0]; });
  var memo = new Map();
  function letraPara(s) {
    var chave = 0, j;
    for (j = 0; j < 6; j++) chave = chave * 16 + Math.min(15, Math.round(s[j] * 15));
    var r = memo.get(chave); if (r !== undefined) return r;
    var melhor = 0, md = 1e9;
    for (var k = 0; k < FORMAG.length; k++) { var g = FORMAG[k], d = 0; for (j = 0; j < 6; j++) { var e = g[j] - s[j]; d += e * e; } if (d < md) { md = d; melhor = k; } }
    r = LETRAS[melhor]; memo.set(chave, r); return r;
  }

  // ================================================================ tamanho
  var c = tela.getContext('2d');
  var COLS = 0, LINS = 0, cw = 0, chh = 0, dpr = 1, SX = 2, SY = 3, SUB = 2, RX = 0, RY = 0, px = null;
  var CELULAR = window.matchMedia('(max-width:799px),(hover:none)').matches;
  if (CELULAR) SUB = 1;                                     // metade do trabalho para a placa do celular
  function ajusta() {
    var L = tela.clientWidth, A = tela.clientHeight;
    if (!L || !A) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    COLS = L < 380 ? 76 : 88; cw = L / COLS; chh = cw * 1.9; LINS = Math.floor(A / chh);
    tela.width = Math.round(L * dpr); tela.height = Math.round(A * dpr);
    RX = COLS * SX * SUB; RY = LINS * SY * SUB; gl3.width = RX; gl3.height = RY;
    gl.viewport(0, 0, RX, RY); px = new Uint8Array(RX * RY * 4);
  }

  // ================================================================ um quadro
  function suave(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
  var nomeAtual = '';
  function desenha(t) {
    if (!COLS) return;
    var ciclo = t / 5.5, i0 = Math.floor(ciclo) % ORDEM.length, f = ciclo - Math.floor(ciclo), m = suave((f - 0.8) / 0.2);
    var A = ORDEM[i0], B = ORDEM[(i0 + 1) % ORDEM.length], P = new Float32Array(N * 2);
    for (var k = 0; k < N * 2; k++) P[k] = FORMAS[A][k] + (FORMAS[B][k] - FORMAS[A][k]) * m;
    function peso(n) { return (A === n ? 1 - m : 0) + (B === n ? m : 0); }
    var nome = NOMES[m < 0.5 ? A : B];
    if (rotulo && nome !== nomeAtual) { nomeAtual = nome; rotulo.textContent = nome; }

    // a câmera chega mais perto das peças baixas, para a peça sempre ocupar o quadro
    var h = ALTURAS[A] + (ALTURAS[B] - ALTURAS[A]) * m, z = h / 1.18;
    var giro = t * 0.55, raio = 3.35 * (0.45 + 0.55 * z), alt = (1.2 + 0.12 * Math.sin(t * 0.3)) * (0.5 + 0.5 * z);
    gl.uniform2f(U.uRes, RX, RY); gl.uniform2fv(U.uP, P);
    gl.uniform1f(U.uTorre, peso('torre')); gl.uniform1f(U.uBispo, peso('bispo')); gl.uniform1f(U.uDama, peso('dama')); gl.uniform1f(U.uRei, peso('rei'));
    gl.uniform3f(U.uCam, Math.cos(giro) * raio, alt, Math.sin(giro) * raio); gl.uniform3f(U.uAlvo, 0, 0.56 * (0.35 + 0.65 * z), 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.readPixels(0, 0, RX, RY, gl.RGBA, gl.UNSIGNED_BYTE, px);

    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, tela.width, tela.height);
    c.font = FONTE.replace('X', (chh * 0.86).toFixed(2));
    c.textBaseline = 'middle'; c.textAlign = 'center';
    var s = [0, 0, 0, 0, 0, 0], rw = SX * SUB, rh = SY * SUB, area = SUB * SUB;
    for (var cy = 0; cy < LINS; cy++) for (var cx = 0; cx < COLS; cx++) {
      var R = 0, G = 0, Bc = 0, soma = 0, j;
      for (j = 0; j < 6; j++) {
        var ox = cx * rw + (j & 1) * SUB, oy = (LINS - 1 - cy) * rh + (2 - (j >> 1)) * SUB, l = 0;   // a placa entrega a imagem de cabeça para baixo
        for (var yy = 0; yy < SUB; yy++) for (var xx = 0; xx < SUB; xx++) {
          var q = ((oy + yy) * RX + ox + xx) * 4; R += px[q]; G += px[q + 1]; Bc += px[q + 2];
          l += 0.3 * px[q] + 0.59 * px[q + 1] + 0.11 * px[q + 2];
        }
        s[j] = l / (area * 255); soma += s[j];
      }
      if (soma < 0.12) continue;
      var media = soma / 6, mn = 1, mx = 0, ch;
      for (j = 0; j < 6; j++) { mn = Math.min(mn, s[j]); mx = Math.max(mx, s[j]); }
      if (mx - mn < 0.1) ch = DENS[Math.min(DENS.length - 1, Math.floor(Math.pow(media, 0.9) * DENS.length))];
      else { for (j = 0; j < 6; j++) s[j] = Math.max(0, Math.min(1, media + (s[j] - media) * 1.5)); ch = letraPara(s); }
      if (ch === ' ') continue;
      var n = 6 * area, br = Math.max(R, G, Bc) / n, ganho = br > 1 ? Math.min(3, 235 / br) : 1;
      c.fillStyle = 'rgb(' + Math.min(255, R / n * ganho | 0) + ',' + Math.min(255, G / n * ganho | 0) + ',' + Math.min(255, Bc / n * ganho | 0) + ')';
      c.fillText(ch, cx * cw + cw / 2, cy * chh + chh / 2);
    }
  }

  // ================================================================ laço: só com a peça na tela
  var rodando = false, naTela = false, t = 0, antes = 0, ultimo = 0, lentos = 0;
  var INTERVALO = CELULAR ? 40 : 33;                       // até 25 quadros por segundo no celular, 30 no computador
  function quadro(agora) {
    if (!rodando) return;
    requestAnimationFrame(quadro);
    if (agora - ultimo < INTERVALO) return;
    t += Math.min(0.1, (agora - antes) / 1000); antes = agora; ultimo = agora;
    var t0 = performance.now();
    desenha(t);
    // aparelho que não dá conta: menos caracteres, em vez de travar a página
    if (performance.now() - t0 > 45) { if (++lentos > 8 && SUB > 1) { SUB = 1; lentos = 0; ajusta(); } } else lentos = 0;
  }
  function liga() { if (rodando || !naTela || document.hidden) return; rodando = true; antes = ultimo = performance.now(); caixa.classList.add('viva'); requestAnimationFrame(quadro); }
  function desliga() { rodando = false; }

  ajusta();
  window.addEventListener('resize', ajusta);
  document.addEventListener('visibilitychange', function () { if (document.hidden) desliga(); else liga(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { naTela = es[0].isIntersecting; if (naTela) liga(); else desliga(); }, { threshold: 0.1 }).observe(caixa);
  } else { naTela = true; liga(); }
  window.XE_PECA_ASCII = { tempo: function (x) { t = x; desenha(t); } };   // para testes
})();
