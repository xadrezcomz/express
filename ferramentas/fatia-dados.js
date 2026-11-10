#!/usr/bin/env node
// Corta os bancos (dados/puzzles.js, dados/partidas.js, dados/frases.js) em fatias
// pequenas dentro de dados/fatias/. O site baixa só a fatia do dia (js/dados.js),
// em vez do banco inteiro.
//
// Rode sempre que mexer em qualquer um dos três bancos:
//   node ferramentas/fatia-dados.js
'use strict';
const fs = require('fs');
const path = require('path');
const raiz = path.join(__dirname, '..');
const destino = path.join(raiz, 'dados', 'fatias');

global.window = {};
require(path.join(raiz, 'dados', 'puzzles.js'));
require(path.join(raiz, 'dados', 'partidas.js'));
require(path.join(raiz, 'dados', 'frases.js'));

// quantos itens por fatia: o bastante para cada arquivo ficar com poucos KB
const BANCOS = {
  puzzles: { itens: window.XE_PUZZLES, porFatia: 28 },
  partidas: { itens: window.XE_PARTIDAS, porFatia: 8 },
  frases: { itens: window.XE_FRASES, porFatia: 34 }
};

fs.rmSync(destino, { recursive: true, force: true });
fs.mkdirSync(destino, { recursive: true });
const indice = {};
for (const [tipo, b] of Object.entries(BANCOS)) {
  let arquivos = 0;
  for (let i = 0; i < b.itens.length; i += b.porFatia, arquivos++) {
    fs.writeFileSync(path.join(destino, tipo + '-' + arquivos + '.js'),
      'XE_fatia(' + JSON.stringify(tipo) + ',' + arquivos + ',' + JSON.stringify(b.itens.slice(i, i + b.porFatia)) + ');\n');
  }
  indice[tipo] = { total: b.itens.length, porFatia: b.porFatia };
  console.log(tipo + ': ' + b.itens.length + ' itens em ' + arquivos + ' fatias');
}
fs.writeFileSync(path.join(destino, 'indice.js'),
  '// Gerado por ferramentas/fatia-dados.js: quantos itens tem cada banco e quantos vão em cada fatia.\n' +
  'window.XE_FATIAS = ' + JSON.stringify(indice) + ';\n');
