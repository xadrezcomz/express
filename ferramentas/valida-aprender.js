#!/usr/bin/env node
// Confere todas as lições da seção Aprender (content/aprender/) pelas regras do xadrez.
// Roda sozinho antes de cada publicação (.github/workflows/publica.yml): lição com erro
// não vai ao ar. Para rodar à mão:
//   node ferramentas/valida-aprender.js
//
// O que é conferido (as regras estão explicadas em content/aprender/README.md):
//   1. Posições, lances animados, lances pedidos e soluções são legais.
//   2. Setas de movimento (todas menos as vermelhas, que mostram o que NÃO pode) terminam numa casa
//      que a peça alcança e, para torre, bispo e dama, vão até a última casa daquela direção.
//   3. Quando o texto diz "N casas", as casas destacadas (ou cobertas pelas setas) somam N.
//   4. "Toque numa casa onde a peça pode ir": a pergunta tem `origem`, e a resposta são TODAS as casas
//      que a peça alcança (nem mais, nem menos).
//   5. "Capture o/a X": só existe uma peça daquele tipo para capturar (a resposta não é ambígua).
//   6. Exercícios de mate terminam em mate; "xeque, mate ou afogamento?" bate com as regras.
//   7. Toda pose e todo avatar usados existem em assets/aprender/avatar/.
//   9. Cada lado tem no máximo um rei, e, se houver peças, um rei de cada cor (nada de dois reis pretos).
//   8. Pergunta ou passo em que o aluno age sobre o tabuleiro e cita uma peça diz a cor dela
//      ("o rei branco", "a torre preta"); com `origem`, a cor tem que ser a da peça daquela casa.
'use strict';
const fs = require('fs');
const path = require('path');
const RAIZ = path.join(__dirname, '..');
const X = require(path.join(RAIZ, 'js', 'xadrez.js'));
const PASTA = path.join(RAIZ, 'content', 'aprender');
const FEN = { vazio: '8/8/8/8/8/8/8/8 w - - 0 1', inicial: X.INICIO };
const fen = f => FEN[f] || f || FEN.vazio;
const COL = 'abcdefgh';
const NOMES = { peão: 'p', peao: 'p', cavalo: 'n', bispo: 'b', torre: 'r', dama: 'q', rei: 'k' };
const POSES_DO_SITE = ['apresentando', 'comemorando', 'curioso', 'explicando', 'surpreso', 'pensativo', 'atencao', 'aprovando', 'curso'];

const erros = [];
let licoesVistas = 0;
const casaOk = c => /^[a-h][1-8]$/.test(c);

// casas que a peça da casa `c` alcança, jogando com a cor dela (a casa de um rei nunca conta)
function alcance(f, c) {
  const pos = X.deFEN(fen(f)), i = X.casaParaIndice(c), p = pos.casas[i];
  if (!p) return null;
  pos.vez = X.corDa(p);
  return new Set(X.lances(pos).filter(l => l.de === i && !/k/i.test(l.captura || '')).map(l => X.indiceParaCasa(l.para)));
}
function linha(de, para) {
  const dx = COL.indexOf(para[0]) - COL.indexOf(de[0]), dy = Number(para[1]) - Number(de[1]);
  if (!(dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy))) return null;
  return [Math.sign(dx), Math.sign(dy), Math.max(Math.abs(dx), Math.abs(dy))];
}
function joga(f, lances, onde) {
  let pos = X.deFEN(fen(f));
  for (const u of lances || []) {
    const l = X.deUCI(pos, u);
    if (!l) { erros.push(onde + ': lance ilegal ' + u); return null; }
    pos = X.joga(pos, l);
  }
  return pos;
}

function confereSetas(p, onde) {
  for (const s of p.setas || []) {
    if (!casaOk(s.de) || !casaOk(s.para)) { erros.push(onde + ': seta com casa inválida'); continue; }
    if (s.cor === 'vermelho') continue;
    const pos = X.deFEN(fen(p.fen)), peca = pos.casas[X.casaParaIndice(s.de)];
    if (!peca) continue;                                  // seta sem peça: ilustração do tabuleiro
    const vai = alcance(p.fen, s.de);
    if (!vai.has(s.para)) { erros.push(onde + ': a seta ' + s.de + '→' + s.para + ' vai para uma casa que a peça não alcança'); continue; }
    const t = peca.toLowerCase(), l = linha(s.de, s.para);
    if ('rbq'.includes(t) && l) {
      const x = COL.indexOf(s.para[0]) + l[0], y = Number(s.para[1]) + l[1], seguinte = x >= 0 && x < 8 && y >= 1 && y <= 8 ? COL[x] + y : null;
      if (seguinte && vai.has(seguinte)) erros.push(onde + ': a seta ' + s.de + '→' + s.para + ' para antes do fim (a peça ainda alcança ' + seguinte + ')');
    }
  }
}

function confereContagem(p, onde) {
  const m = /\*?\*?(\d+) casas/.exec(p.texto || '');
  if (!m) return;
  const n = Number(m[1]);
  const destacadas = new Set();
  (p.destaques || []).filter(d => d.cor === 'verde' || !d.cor).forEach(d => d.casas.forEach(c => destacadas.add(c)));
  if (destacadas.size) {
    if (destacadas.size !== n) erros.push(onde + ': o texto diz ' + n + ' casas, mas há ' + destacadas.size + ' destacadas');
    return;
  }
  const pos = X.deFEN(fen(p.fen));
  const setas = (p.setas || []).filter(s => s.cor !== 'vermelho' && pos.casas[X.casaParaIndice(s.de)]);
  if (!setas.length) return;
  const total = setas.reduce((soma, s) => soma + ((linha(s.de, s.para) || [0, 0, 1])[2]), 0);
  if (total !== n) erros.push(onde + ': o texto diz ' + n + ' casas, mas as setas cobrem ' + total);
}

function confereReis(f, onde) {
  const casas = X.deFEN(fen(f)).casas, brancos = casas.filter(p => p === 'K').length, pretos = casas.filter(p => p === 'k').length;
  if (brancos > 1 || pretos > 1) erros.push(onde + ': há ' + (brancos > 1 ? brancos + ' reis brancos' : pretos + ' reis pretos') + ' no tabuleiro');
  else if (casas.some(p => p) && (brancos !== 1 || pretos !== 1)) erros.push(onde + ': a posição precisa ter um rei de cada cor');
}
const PECA = /\b(rei|dama|torre|bispo|cavalo|peão|peao)\b/i, COR = /\b(branc[oa]s?|pret[oa]s?)\b/i;
function confereCor(texto, onde, f, origem) {
  if (!texto || !PECA.test(texto)) return;
  if (!COR.test(texto)) { erros.push(onde + ': "' + texto + '" cita uma peça sem dizer a cor (branca ou preta)'); return; }
  if (origem) {
    const p = X.deFEN(fen(f)).casas[X.casaParaIndice(origem)], branca = p && p === p.toUpperCase();
    const nome = PECA.exec(texto)[1], depois = texto.slice(texto.search(PECA) + nome.length, texto.search(PECA) + nome.length + 8);
    if (/branc/i.test(depois) !== branca) erros.push(onde + ': "' + texto + '" diz a cor errada da peça de ' + origem);
  }
}
function confereItem(x, onde) {
  if (x.fen) confereReis(x.fen, onde);
  if (x.tipo === 'casa' && x.origem) confereCor(x.pergunta, onde, x.fen, x.origem);
  if (x.tipo === 'autoral' || (x.tipo === 'multipla' && x.fen)) confereCor(x.pergunta, onde);
  if (x.tipo === 'casa') {
    if (!(x.resposta || []).length || !x.resposta.every(casaOk)) erros.push(onde + ': resposta vazia ou com casa inválida');
    if (/pode ir|promover/i.test(x.pergunta || '') && !x.origem) erros.push(onde + ': pergunta sobre o movimento de uma peça precisa de "origem"');
    if (x.origem) {
      const vai = alcance(x.fen, x.origem);
      if (!vai) erros.push(onde + ': não há peça na origem ' + x.origem);
      else {
        const certo = [...vai].sort().join(','), dado = [...new Set(x.resposta)].sort().join(',');
        if (certo !== dado) erros.push(onde + ': a resposta deveria ser todas as casas que a peça alcança (' + certo + '), mas é ' + dado);
      }
    }
  } else if (x.tipo === 'autoral' || x.tipo === 'lichess') {
    const ln = x.tipo === 'lichess' ? x.lances : x.solucao;
    if (!ln || !ln.length) { erros.push(onde + ': sem solução'); return; }
    const fim = joga(x.fen, ln, onde);
    if (!fim) return;
    if ((/mate/i.test(x.pergunta || '') || (x.temas || []).includes('mate')) && !X.ehMate(fim)) erros.push(onde + ': a solução não termina em mate');
    const m = /^Capture (?:o|a) (peão|peao|cavalo|bispo|torre|dama)/i.exec(x.pergunta || '');
    if (m && x.tipo === 'autoral') {
      const pos = X.deFEN(x.fen), alvo = NOMES[m[1].toLowerCase()];
      const alvos = new Set(X.lances(pos).filter(l => l.captura && l.captura.toLowerCase() === alvo).map(l => l.para));
      if (alvos.size !== 1) erros.push(onde + ': "' + x.pergunta + '" tem ' + alvos.size + ' peças desse tipo para capturar');
    }
  } else if (x.tipo === 'multipla') {
    if (!(x.correta >= 0 && x.correta < (x.opcoes || []).length)) erros.push(onde + ': "correta" fora das opções');
    if (x.fen && /xeque, mate ou afogamento/i.test(x.pergunta || '')) {
      const pos = X.deFEN(x.fen), sem = X.lances(pos).length === 0, xq = X.emXeque(pos);
      const certo = xq && sem ? 'Xeque-mate' : (xq ? 'Xeque' : (sem ? 'Empate por afogamento' : 'nenhum'));
      if (x.opcoes[x.correta] !== certo) erros.push(onde + ': pelas regras é "' + certo + '", mas a resposta marcada é "' + x.opcoes[x.correta] + '"');
    }
  } else erros.push(onde + ': tipo desconhecido "' + x.tipo + '"');
  if (x.fen && x.tipo !== 'lichess') { try { X.deFEN(fen(x.fen)); } catch (e) { erros.push(onde + ': posição inválida'); } }
}

function poses() {
  const pasta = path.join(RAIZ, 'assets', 'aprender', 'avatar');
  return new Set(fs.readdirSync(pasta).filter(f => f.endsWith('.webp')).map(f => f.replace(/\.webp$/, '')));
}
const existentes = poses();
// as variações sorteadas pelo site também precisam existir
const js = fs.readFileSync(path.join(RAIZ, 'js', 'aprender.js'), 'utf8');
(js.match(/'([a-z]+(?:-[a-z]+)*)'/g) || []).map(s => s.slice(1, -1))
  .filter(n => /^(gesto-|peca-)/.test(n) || POSES_DO_SITE.includes(n))
  .forEach(n => { if (!existentes.has(n)) erros.push('js/aprender.js: a pose "' + n + '" não existe em assets/aprender/avatar/'); });

const colecoes = JSON.parse(fs.readFileSync(path.join(PASTA, 'colecoes.json'), 'utf8')).colecoes;
for (const c of colecoes) for (const slug of c.cards) {
  const dirCard = path.join(PASTA, 'cards', slug);
  const card = JSON.parse(fs.readFileSync(path.join(dirCard, 'card.json'), 'utf8'));
  for (const item of card.licoes) {
    const arq = path.join(dirCard, item.id + '.json');
    if (!fs.existsSync(arq)) { erros.push(slug + ': falta o arquivo ' + item.id + '.json'); continue; }
    let L;
    try { L = JSON.parse(fs.readFileSync(arq, 'utf8')); } catch (e) { erros.push(item.id + ': JSON inválido (' + e.message + ')'); continue; }
    licoesVistas++;
    const base = slug + '/' + item.id;
    if (L.avatar && !existentes.has(L.avatar)) erros.push(base + ': avatar "' + L.avatar + '" não existe');
    (L.teoria || []).forEach((p, i) => {
      const onde = base + ' teoria ' + (i + 1);
      if (p.pose && !existentes.has(p.pose)) erros.push(onde + ': pose "' + p.pose + '" não existe');
      try { X.deFEN(fen(p.fen)); } catch (e) { erros.push(onde + ': posição inválida'); return; }
      confereReis(p.fen, onde);
      const depois = joga(p.fen, p.animacao, onde);
      (p.destaques || []).forEach(d => d.casas.forEach(c => { if (!casaOk(c)) erros.push(onde + ': destaque com casa inválida ' + c); }));
      if (p.interativo) {
        if (p.interativo.lance && depois && !X.deUCI(depois, p.interativo.lance)) erros.push(onde + ': o lance pedido ' + p.interativo.lance + ' é ilegal');
        if (p.interativo.lance) confereCor(p.texto, onde);
        if (p.interativo.casa && !casaOk(p.interativo.casa)) erros.push(onde + ': casa pedida inválida');
      }
      if (!(p.animacao || []).length) { confereSetas(p, onde); confereContagem(p, onde); }
    });
    ((L.exercicios || {}).itens || []).forEach((x, i) => confereItem(x, base + ' exercício ' + (i + 1)));
    (L.avaliacao || []).forEach((x, i) => confereItem(x, base + ' avaliação ' + (i + 1)));
  }
}

if (erros.length) {
  console.log('Lições com problema (' + erros.length + '):\n  ' + erros.join('\n  '));
  process.exit(1);
}
console.log('OK: ' + licoesVistas + ' lições conferidas, nenhum problema.');
