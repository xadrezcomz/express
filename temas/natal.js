// Tema de Natal: a neve caindo, o selo do topo e os votos do rodapé.
// As cores e os enfeites parados ficam em temas/natal.css.
(function () {
  'use strict';
  function pronto(f) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', f); else f(); }

  pronto(function () {
    var selo = document.querySelector('.hero .selo');
    if (selo) selo.innerHTML = '🎄 Especial de Natal · por <b>@xadrezcomz</b>';
    var rodape = document.querySelector('.rodape .miolo');
    if (rodape) {
      var voto = document.createElement('p');
      voto.className = 'natal-voto'; voto.textContent = '🎅 Feliz Natal e bons lances! 🎄';
      rodape.insertBefore(voto, rodape.children[1] || null);
    }
    neve();
  });

  // Flocos caindo por cima da página inteira. Poucos e leves: é enfeite, não pode pesar no celular.
  function neve() {
    var tela = document.createElement('canvas');
    if (!tela.getContext) return;
    tela.className = 'natal-neve'; tela.setAttribute('aria-hidden', 'true');
    document.body.appendChild(tela);
    var c = tela.getContext('2d'), L = 0, A = 0, dpr = 1, flocos = [], antes = 0, rodando = false;
    var CALMO = window.matchMedia('(prefers-reduced-motion:reduce)').matches;

    function ajusta() {
      L = window.innerWidth; A = window.innerHeight; dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      tela.width = Math.round(L * dpr); tela.height = Math.round(A * dpr);
      var qtd = L < 600 ? 34 : 80;
      while (flocos.length < qtd) flocos.push(novo(true));
      flocos.length = qtd;
    }
    function novo(emQualquerAltura) {
      var perto = Math.random();           // 0 longe (pequeno e lento) ... 1 perto
      return { x: Math.random() * L, y: emQualquerAltura ? Math.random() * A : -12, r: 1.2 + perto * 3.2, v: 26 + perto * 60,
        balanco: Math.random() * 6.28, ritmo: 0.6 + Math.random() * 1.2, alfa: 0.45 + perto * 0.5, estrela: perto > 0.82 };
    }
    function desenha(dt, t) {
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, L, A);
      c.fillStyle = '#fff'; c.strokeStyle = '#fff'; c.lineCap = 'round';
      for (var k = 0; k < flocos.length; k++) {
        var f = flocos[k];
        f.y += f.v * dt; f.x += Math.sin(t * f.ritmo + f.balanco) * 18 * dt;
        if (f.y > A + 12) { flocos[k] = f = novo(false); }
        c.globalAlpha = f.alfa;
        if (f.estrela) {                   // os mais próximos são floquinhos de seis pontas
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
