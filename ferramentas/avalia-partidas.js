#!/usr/bin/env node
// Põe em dados/partidas.js a avaliação do Stockfish para cada lance de cada
// partida (o campo "v"), que é o que move a barra de avaliação da partida do dia.
//
// Uso (depois de ferramentas/gera-partidas.js, com o stockfish instalado):
//   node ferramentas/avalia-partidas.js [profundidade] [caminho do stockfish]
//
// "v" tem um número por lance, sempre do ponto de vista das brancas, em décimos
// de peão: 13 = brancas com +1,3. Mate à vista vira 1000 + lances (brancas dão
// mate) ou -1000 - lances (pretas dão mate); xeque-mate no tabuleiro é ±1000.
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const X = require('../js/xadrez.js');

const PROFUNDIDADE = Number(process.argv[2]) || 12;
const MOTOR = process.argv[3] || 'stockfish';
const TRABALHADORES = Math.max(1, require('os').cpus().length);
const ARQUIVO = path.join(__dirname, '..', 'dados', 'partidas.js');

function motor() {
  const p = spawn(MOTOR);
  let resto = '', aoLer = null;
  p.stdout.on('data', d => {
    resto += d; let i;
    while ((i = resto.indexOf('\n')) >= 0) { const l = resto.slice(0, i).trim(); resto = resto.slice(i + 1); if (aoLer) aoLer(l); }
  });
  p.stdin.write('uci\nsetoption name Threads value 1\nsetoption name Hash value 64\nisready\n');
  return {
    // avaliação de quem tem a vez: { cp } ou { mate }
    avalia(fen) {
      return new Promise(ok => {
        let ultima = { cp: 0 };
        aoLer = l => {
          const m = / score (cp|mate) (-?\d+)/.exec(l);
          if (m && !/ (upper|lower)bound/.test(l)) ultima = m[1] === 'cp' ? { cp: Number(m[2]) } : { mate: Number(m[2]) };
          if (l.startsWith('bestmove')) { aoLer = null; ok(ultima); }
        };
        p.stdin.write('position fen ' + fen + '\ngo depth ' + PROFUNDIDADE + '\n');
      });
    },
    fecha() { p.stdin.write('quit\n'); }
  };
}

async function avaliaPartida(m, g) {
  let pos = X.deFEN(X.INICIO); const v = [];
  for (const san of g.m.split(' ')) {
    pos = X.joga(pos, X.deSAN(pos, san));
    const brancas = pos.vez === 'w' ? 1 : -1;
    if (X.ehMate(pos)) { v.push(-1000 * brancas); continue; }
    if (X.lances(pos).length === 0) { v.push(0); continue; }
    const a = await m.avalia(X.paraFEN(pos));
    if (a.mate !== undefined) v.push((a.mate > 0 ? 1000 + a.mate : -1000 + a.mate) * brancas);
    else v.push(Math.max(-999, Math.min(999, Math.round(a.cp / 10))) * brancas);
  }
  g.v = v;
}

async function main() {
  global.window = {};
  require(ARQUIVO);
  const partidas = global.window.XE_PARTIDAS;
  let proxima = 0, feitas = 0;
  await Promise.all(Array.from({ length: TRABALHADORES }, async () => {
    const m = motor();
    while (proxima < partidas.length) {
      const g = partidas[proxima++];
      await avaliaPartida(m, g);
      if (++feitas % 25 === 0) console.log(feitas + ' de ' + partidas.length);
    }
    m.fecha();
  }));
  fs.writeFileSync(ARQUIVO,
    '// Partidas do dia. Gerado por ferramentas/gera-partidas.js e avaliado por ferramentas/avalia-partidas.js (não edite à mão).\n' +
    '// b: brancas, p: pretas, a: ano, l: local, r: resultado, t: apelido da partida, c: curiosidade, m: lances,\n' +
    '// v: avaliação do Stockfish depois de cada lance (décimos de peão, do lado das brancas; ±1000 e além = mate).\n' +
    'window.XE_PARTIDAS = [\n' + partidas.map(o => JSON.stringify(o)).join(',\n') + '\n];\n');
  console.log('avaliadas', partidas.length, 'partidas na profundidade', PROFUNDIDADE);
}
main();
