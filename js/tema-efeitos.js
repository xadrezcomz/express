// O que todo tema de data faz na página: troca o selo do topo, põe os votos no
// rodapé e faz cair do céu o que o tema pedir (neve, confete ou símbolos).
// Só é baixado quando há um tema no ar. Os dados de cada tema estão em js/temas.js.
(function () {
  'use strict';
  var TEMA = window.XE_TEMA || {};
  function pronto(f) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', f); else f(); }

  pronto(function () {
    var selo = document.querySelector('.hero .selo');
    if (selo && TEMA.selo) { selo.textContent = TEMA.selo + ' · por '; var b = document.createElement('b'); b.textContent = '@xadrezcomz'; selo.appendChild(b); }
    var rodape = document.querySelector('.rodape .miolo');
    if (rodape && TEMA.voto) {
      var voto = document.createElement('p');
      voto.className = 'tema-voto'; voto.textContent = TEMA.voto;
      rodape.insertBefore(voto, rodape.children[1] || null);
    }
    if (TEMA.chuva) chuva();
  });

  // Coisas caindo por cima da página inteira. Poucas e leves: é enfeite, não pode pesar no celular.
  function chuva() {
    var tela = document.createElement('canvas');
    if (!tela.getContext) return;
    tela.className = 'tema-chuva'; tela.setAttribute('aria-hidden', 'true');
    document.body.appendChild(tela);
    var c = tela.getContext('2d'), L = 0, A = 0, dpr = 1, itens = [], antes = 0, rodando = false;
    var CALMO = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
    var tipo = typeof TEMA.chuva === 'string' ? TEMA.chuva : 'simbolos', simbolos = tipo === 'simbolos' ? TEMA.chuva : null;
    var cores = TEMA.cores || ['#ffffff'];

    function ajusta() {
      L = window.innerWidth; A = window.innerHeight; dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      tela.width = Math.round(L * dpr); tela.height = Math.round(A * dpr);
      var qtd = tipo === 'simbolos' ? (L < 600 ? 12 : 24) : (L < 600 ? 34 : 80);
      while (itens.length < qtd) itens.push(novo(true));
      itens.length = qtd;
    }
    function novo(emQualquerAltura) {
      var perto = Math.random(), k = Math.floor(Math.random() * 1000);   // perto: 0 longe (pequeno e lento) ... 1 perto
      return { x: Math.random() * L, y: emQualquerAltura ? Math.random() * A : -24, r: 1.2 + perto * 3.2, v: 26 + perto * 60, perto: perto,
        balanco: Math.random() * 6.28, ritmo: 0.6 + Math.random() * 1.2, alfa: 0.45 + perto * 0.5,
        cor: cores[k % cores.length], simbolo: simbolos ? simbolos[k % simbolos.length] : null };
    }
    function desenha(dt, t) {
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, L, A);
      c.lineCap = 'round'; c.textAlign = 'center'; c.textBaseline = 'middle';
      for (var k = 0; k < itens.length; k++) {
        var f = itens[k];
        f.y += f.v * dt; f.x += Math.sin(t * f.ritmo + f.balanco) * 18 * dt;
        if (f.y > A + 24) { itens[k] = f = novo(false); }
        c.globalAlpha = f.alfa; c.fillStyle = c.strokeStyle = f.cor;
        if (tipo === 'simbolos') {
          c.globalAlpha = 0.5 + f.perto * 0.4;
          c.font = Math.round(13 + f.perto * 13) + 'px system-ui,"Apple Color Emoji","Noto Color Emoji",sans-serif';
          c.save(); c.translate(f.x, f.y); c.rotate(Math.sin(t * f.ritmo + f.balanco) * 0.35); c.fillText(f.simbolo, 0, 0); c.restore();
        } else if (tipo === 'confete') {
          var g = 4 + f.perto * 6;
          c.save(); c.translate(f.x, f.y); c.rotate(t * f.ritmo * 2 + f.balanco);
          c.fillRect(-g / 2, -g / 4, g, g / 2 * (0.4 + Math.abs(Math.sin(t * 3 * f.ritmo + f.balanco)))); c.restore();
        } else if (f.perto > 0.82) {          // neve: os flocos mais próximos têm seis pontas
          c.lineWidth = 1.4; c.beginPath();
          for (var a = 0; a < 3; a++) {
            var ang = a * 1.047 + t * 0.4 + f.balanco, dx = Math.cos(ang) * f.r * 1.8, dy = Math.sin(ang) * f.r * 1.8;
            c.moveTo(f.x - dx, f.y - dy); c.lineTo(f.x + dx, f.y + dy);
          }
          c.stroke();
        } else { c.beginPath(); c.arc(f.x, f.y, f.r, 0, 6.2832); c.fill(); }
      }
      c.globalAlpha = 1;
    }
    function quadro(agora) {
      if (!rodando) return;
      var dt = Math.min(0.05, (agora - antes) / 1000); antes = agora;
      desenha(dt, agora / 1000);
      requestAnimationFrame(quadro);
    }
    function liga() { if (rodando || CALMO || document.hidden) return; rodando = true; antes = performance.now(); requestAnimationFrame(quadro); }

    ajusta();
    window.addEventListener('resize', function () { ajusta(); if (CALMO) desenha(0, 0); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) rodando = false; else liga(); });
    if (CALMO) desenha(0, 0); else liga();
  }
})();
