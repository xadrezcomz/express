#!/usr/bin/env node
// Monta dados/partidas.js (a "Partida do dia") a partir de arquivos PGN.
//
// Uso:
//   node ferramentas/gera-partidas.js <pasta com arquivos .pgn>
//
// Os PGN usados vieram das coleções por jogador de pgnmentor.com/files.html
// (Morphy.pgn, Fischer.pgn, Kasparov.pgn...). O banco tem duas partes:
//   1. as partidas FAMOSAS da lista abaixo, cada uma com o seu apelido;
//   2. para completar mais de um ano sem repetir, vitórias de grandes mestres
//      que terminam em xeque-mate no tabuleiro.
// Toda partida é rejogada lance a lance pelas regras de js/xadrez.js: só entra
// se todos os lances forem legais. A ordem é fixa (semente), então rodar de
// novo com os mesmos PGN dá o mesmo arquivo.
'use strict';
const fs = require('fs');
const path = require('path');
const X = require('../js/xadrez.js');

const TOTAL = 400;

// [brancas, pretas, ano, filtro, apelido]
//   filtro: número = total de lances; 'r:10' = rodada 10; outro texto = trecho do nome do evento
const FAMOSAS = [
['Anderssen','Kieseritzky','1851','Immortal','A Imortal'],
['Anderssen','Dufresne','1852','','A Sempre-Viva'],
['Morphy','Isouard','1858','','A Partida da Ópera'],
['Paulsen','Morphy','1857',28,'O sacrifício de dama de Morphy'],
['Steinitz','Bardeleben','1895','','A joia de Hastings'],
['Lasker','Bauer','1889',38,'O sacrifício dos dois bispos'],
['Rotlewi','Rubinstein','1907',25,'A Imortal de Rubinstein'],
['Levitsky','Marshall','1912','','A chuva de moedas de ouro'],
['Byrne','Fischer','1956','','A Partida do Século'],
['Byrne','Fischer','1963',21,'A obra-prima de Fischer'],
['Kasparov','Topalov','1999','Hoogovens','A Imortal de Kasparov'],
['Deep Blue','Kasparov','1997',19,'A máquina vence o campeão'],
['Saemisch','Nimzowitsch','1923','Copenhagen','A Imortal do Zugzwang'],
['Short','Timman','1991','Tilburg','A caminhada do rei'],
['Bogoljubow','Alekhine','1922','Hastings','A obra-prima de Alekhine em Hastings'],
['Reti','Alekhine','1925','','A combinação de Baden-Baden'],
['Capablanca','Tartakower','1924','','A aula de final de torres'],
['Reti','Capablanca','1924','','O fim da invencibilidade de Capablanca'],
['Botvinnik','Capablanca','1938','','A joia do torneio AVRO'],
['Botvinnik','Portisch','1968','','A torre que não parou'],
['Botvinnik','Tal','1960',46,'O cavalo de Tal'],
['Tal','Larsen','1965','r:10','O sacrifício intuitivo de Tal'],
['Tal','Hecht','1962','','O mago de Riga'],
['Spassky','Bronstein','1960','','O Gambito do Rei de Spassky'],
['Larsen','Spassky','1970',17,'A miniatura do século'],
['Polugaevsky','Nezhmetdinov','1958','','A Imortal de Nezhmetdinov'],
['Karpov','Kasparov','1985',40,'O cavalo-polvo de Kasparov'],
['Ivanchuk','Jussupow','1991',39,'O ataque de Yusupov em Bruxelas'],
['Topalov','Shirov','1998',53,'O lance mais incrível: ...Bh3!!'],
['Aronian','Anand','2013','','A Imortal de Anand'],
['Carlsen','Karjakin','2016',50,'Dama entregue pelo título mundial'],
['Karpov','Unzicker','1974','','O aperto de Karpov'],
['Petrosian','Spassky','1966',30,'O sacrifício de qualidade de Petrosian'],
['Alekhine','Nimzowitsch','1930','','O canhão de Alekhine'],
['Nimzowitsch','Tarrasch','1914','','Os dois bispos de Tarrasch'],
['Zukertort','Blackburne','1883',33,'A Imortal de Zukertort'],
['Euwe','Alekhine','1935',47,'A Pérola de Zandvoort'],
['Geller','Euwe','1953','','A torre de Euwe em Zurique'],
['Fischer','Spassky','1972',41,'A sexta partida de Reykjavik'],
['Fischer','Benko','1963',21,'O lance 19.Tf6!!'],
['Fischer','Tal','1961','','Fischer finalmente vence Tal'],
['Letelier','Fischer','1960',23,'A dama que Fischer entregou'],
['Fischer','Panno','1970',36,'O ataque de Fischer em Buenos Aires'],
['Fischer','Myagmarsuren','1967','','O mate de Fischer em Sousse'],
['Fischer','Petrosian','1971',34,'A simplificação de Fischer'],
['Capablanca','Marshall','1918','','A estreia do Ataque Marshall'],
['Lasker','Capablanca','1914','','A lição de Lasker em São Petersburgo'],
['Pillsbury','Lasker','1896','','A vingança de Lasker'],
['Glucksberg','Najdorf','','','A Imortal Polonesa'],
['Morphy','Anderssen','1858',17,'Morphy contra Anderssen'],
['Bird','Morphy','1858','','A torre de Morphy'],
['Kasparov','Portisch','1983','','Os dois bispos de Kasparov'],
['Kasparov','Kramnik','1994','','A novidade de Kasparov em Novgorod'],
['Topalov','Anand','2010','r:12','A partida do título de Anand'],
['Anand','Carlsen','2013',28,'Carlsen conquista a coroa'],
['Polgar','Anand','1999','','Judit Polgár contra Anand'],
['Polgar','Shirov','1995','','O ataque de Judit Polgár'],
['Shirov','Polgar','1994',29,'O cavalo de Judit em Buenos Aires'],
['Capablanca','Alekhine','1927',43,'Alekhine vence o invencível'],
['Capablanca','Alekhine','1927',42,'A técnica de Capablanca'],
['Capablanca','Spielmann','1927','','A clareza de Capablanca'],
['Rubinstein','Lasker','1909','','A final de torres de Rubinstein'],
['Marshall','Capablanca','1918','','Capablanca em Nova York'],
['Chigorin','Steinitz','1892',31,'O duelo de Havana'],
['Steinitz','Chigorin','1892',28,'O ataque de Steinitz em Havana'],
['Keres','Spassky','1965',35,'Spassky a caminho do título'],
['Smyslov','Botvinnik','1954',25,'A dama de Smyslov'],
['Bronstein','Ljubojevic','1973','','A torre de Bronstein em Petrópolis'],
['Tal','Smyslov','1959',26,'O jovem Tal no Torneio de Candidatos'],
['Tal','Botvinnik','1960',32,'A primeira vitória de Tal pelo título'],
['Stein','Portisch','1962','','A miniatura de Stein'],
['Larsen','Petrosian','1966',30,'A dama de Larsen'],
['Spassky','Petrosian','1969',24,'Spassky campeão do mundo'],
['Spassky','Fischer','1972',27,'A primeira derrota de Spassky em casa'],
['Karpov','Kortschnoj','1974',27,'O ataque iugoslavo de Karpov'],
['Karpov','Spassky','1974','r:9','Karpov supera Spassky'],
['Mecking','','1975',21,'Mequinho, o brasileiro entre os melhores'],
];

// quem vence as partidas que completam o banco
const LENDAS = ['Morphy', 'Anderssen', 'Steinitz', 'Lasker', 'Capablanca', 'Alekhine', 'Botvinnik', 'Tal', 'Petrosian',
  'Spassky', 'Fischer', 'Karpov', 'Kasparov', 'Kramnik', 'Anand', 'Carlsen', 'Rubinstein', 'Nimzowitsch', 'Reti',
  'Marshall', 'Bronstein', 'Keres', 'Smyslov', 'Euwe', 'Polgar', 'Topalov', 'Shirov', 'Ivanchuk', 'Geller',
  'Kortschnoj', 'Larsen', 'Tarrasch', 'Pillsbury', 'Chigorin', 'Zukertort', 'Blackburne', 'Spielmann', 'Mecking',
  'Najdorf', 'Stein', 'Aronian', 'Caruana', 'Nakamura', 'Tartakower', 'Morozevich'];
const POR_LENDA = 22;
const FORA = /blitz|rapid|simul|blind|odds|exhib|internet|960|armageddon|bullet|online|titled|chess\.com|lichess|\bsim\b|consult/i;

// como os nomes aparecem no site
const NOMES = {
  'Fischer, Robert James': 'Bobby Fischer', 'Kasparov, Gary': 'Garry Kasparov', 'Tal, Mihail': 'Mikhail Tal',
  'Capablanca, Jose Raul': 'José Raúl Capablanca', 'Jussupow, Artur': 'Artur Yusupov',
  'Kortschnoj, Viktor': 'Viktor Korchnoi', 'Comp Deep Blue': 'Deep Blue (computador)',
  'Duke Karl Count Isouard': 'Duque de Brunswick e Conde Isouard', 'Polgar, Judit': 'Judit Polgár',
  'Mecking, Henrique': 'Henrique Mecking (Mequinho)', 'Reti, Richard': 'Richard Réti',
  'Saemisch, Fritz': 'Friedrich Sämisch', 'Byrne, Robert E': 'Robert Byrne', 'NN': 'Amador (NN)'
};
// nomes completos dos grandes mestres (os PGN recentes trazem só a inicial: "Carlsen,M")
const COMPLETOS = ['Magnus Carlsen', 'Alexei Shirov', 'Vassily Ivanchuk', 'Viswanathan Anand', 'Fabiano Caruana',
  'Hikaru Nakamura', 'Veselin Topalov', 'Vladimir Kramnik', 'Levon Aronian', 'Alexander Morozevich', 'Garry Kasparov',
  'Anatoly Karpov', 'Boris Spassky', 'Judit Polgár', 'Sergey Karjakin', 'Boris Gelfand', 'Nigel Short', 'Jan Timman',
  'Peter Svidler', 'Peter Leko', 'Michael Adams', 'Teimour Radjabov', 'Alexander Grischuk', 'Gata Kamsky',
  'Shakhriyar Mamedyarov', 'Henrique Mecking', 'Maxime Vachier-Lagrave', 'Anish Giri', 'Wesley So', 'Ian Nepomniachtchi', 'Ding Liren'];
function nome(n) {
  n = n.trim().replace(/\s+/g, ' ');
  if (NOMES[n]) return NOMES[n];
  const partes = n.split(',').map(x => x.trim());
  if (partes.length === 2 && partes[1]) {
    const sem = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const achado = COMPLETOS.find(c => { const q = sem(c).split(' '); return q[q.length - 1] === partes[0] && q[0][0] === partes[1][0]; });
    if (achado) return achado;
  }
  const p = n.split(',');
  return p.length === 2 ? (p[1].trim() + ' ' + p[0].trim()).replace(/\s+[A-Z]\.?$/, '').trim() : n;
}

function lePGN(pasta) {
  const vistos = new Set(), jogos = [];
  for (const f of fs.readdirSync(pasta).sort()) {
    if (!f.toLowerCase().endsWith('.pgn')) continue;
    const texto = fs.readFileSync(path.join(pasta, f), 'latin1').replace(/\r/g, '');
    for (const bloco of texto.split(/\n(?=\[Event )/)) {
      const h = {}; let m; const re = /^\[(\w+) "(.*)"\]$/gm;
      while ((m = re.exec(bloco))) h[m[1]] = m[2];
      const mov = bloco.replace(/^\[.*\]$/gm, '').replace(/\{[^}]*\}/g, ' ').replace(/\s+/g, ' ').trim();
      if (!h.White || !h.Black || !mov || h.FEN) continue;
      const chave = h.White + '|' + h.Black + '|' + h.Date + '|' + mov.slice(0, 120);
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      jogos.push({ w: h.White, b: h.Black, d: h.Date || '', e: h.Event || '', s: h.Site || '', r: h.Result || '', rd: h.Round || '', m: mov });
    }
  }
  return jogos;
}

const numLances = g => (g.m.match(/\d+\./g) || []).length;

// Rejoga a partida; devolve { san: [...], mate } ou null se algum lance não for legal.
function rejoga(g) {
  const fichas = g.m.replace(/\d+\.(\.\.)?/g, ' ').split(/\s+/).filter(t => t && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t));
  let pos = X.deFEN(X.INICIO); const san = [];
  for (const bruto of fichas) {
    const t = bruto.replace(/[+#!?]/g, '').replace(/0/g, 'O');
    const l = X.deSAN(pos, t);
    if (!l) return null;
    pos = X.joga(pos, l);
    san.push(t + (X.ehMate(pos) ? '#' : (X.emXeque(pos) ? '+' : '')));
  }
  return { san, mate: X.ehMate(pos) };
}

function ficha(g, r, titulo) {
  const o = { b: nome(g.w), p: nome(g.b), a: g.d.slice(0, 4).replace(/\?/g, ''), l: g.s.replace(/\?/g, '').trim(), r: g.r, m: r.san.join(' ') };
  if (titulo) o.t = titulo;
  return o;
}

function main() {
  const pasta = process.argv[2];
  if (!pasta) { console.error('uso: node ferramentas/gera-partidas.js <pasta com .pgn>'); process.exit(1); }
  const jogos = lePGN(pasta);
  const usadas = new Set(), famosas = [], comuns = [];

  for (const [w, b, ano, filtro, titulo] of FAMOSAS) {
    let c = jogos.filter(g => g.w.includes(w) && g.b.includes(b) && g.d.startsWith(ano) && g.r !== '1/2-1/2');
    if (typeof filtro === 'number') c = c.filter(g => numLances(g) === filtro);
    else if (/^r:/.test(filtro)) c = c.filter(g => g.rd === filtro.slice(2));
    else if (filtro) c = c.filter(g => g.e.includes(filtro));
    const r = c.length === 1 ? rejoga(c[0]) : null;
    if (!r) { console.error('FICOU DE FORA:', w, 'x', b, ano, '(' + c.length + ' achadas)'); continue; }
    usadas.add(c[0]);
    famosas.push(ficha(c[0], r, titulo));
  }

  // sorteio com semente fixa
  let semente = 20260105;
  const sorte = () => { semente = (semente * 16807) % 2147483647; return semente / 2147483647; };
  const embaralha = v => { for (let i = v.length - 1; i > 0; i--) { const k = Math.floor(sorte() * (i + 1)); [v[i], v[k]] = [v[k], v[i]]; } return v; };

  const porLenda = {};
  for (const g of embaralha(jogos.slice())) {
    if (comuns.length >= TOTAL - famosas.length) break;
    if (usadas.has(g) || FORA.test(g.e) || FORA.test(g.s) || (g.r !== '1-0' && g.r !== '0-1')) continue;
    const n = numLances(g);
    if (n < 16 || n > 38) continue;
    const vencedor = g.r === '1-0' ? g.w : g.b;
    const lenda = LENDAS.find(x => vencedor.startsWith(x + ','));
    if (!lenda || (porLenda[lenda] || 0) >= POR_LENDA || /^NN|[:\d]/.test(g.w) || /^NN|[:\d]/.test(g.b)) continue;
    const r = rejoga(g);
    if (!r || !r.mate) continue;
    porLenda[lenda] = (porLenda[lenda] || 0) + 1;
    usadas.add(g);
    comuns.push(ficha(g, r));
  }
  // se os mates não bastarem, completa com miniaturas (vitórias em até 25 lances)
  const porLenda2 = {};
  for (const g of embaralha(jogos.slice())) {
    if (comuns.length >= TOTAL - famosas.length) break;
    if (usadas.has(g) || FORA.test(g.e) || FORA.test(g.s) || (g.r !== '1-0' && g.r !== '0-1')) continue;
    const n = numLances(g);
    if (n < 17 || n > 25) continue;
    const vencedor = g.r === '1-0' ? g.w : g.b;
    const lenda = LENDAS.find(x => vencedor.startsWith(x + ','));
    if (!lenda || (porLenda2[lenda] || 0) >= 4 || /^NN|[:\d]/.test(g.w) || /^NN|[:\d]/.test(g.b) || !g.d.slice(0, 4).match(/^\d{4}$/)) continue;
    const r = rejoga(g);
    if (!r) continue;
    porLenda2[lenda] = (porLenda2[lenda] || 0) + 1;
    comuns.push(ficha(g, r));
  }
  embaralha(comuns);

  // as famosas ficam espalhadas por igual entre as outras
  embaralha(famosas);
  const todas = [], passo = (famosas.length + comuns.length) / famosas.length;
  let f = 0, c = 0;
  for (let i = 0; i < famosas.length + comuns.length; i++) {
    if (f < famosas.length && (i >= Math.floor(f * passo) || c >= comuns.length)) todas.push(famosas[f++]);
    else todas.push(comuns[c++]);
  }

  const linhas = todas.map(o => JSON.stringify(o));
  fs.writeFileSync(path.join(__dirname, '..', 'dados', 'partidas.js'),
    '// Partidas do dia. Gerado por ferramentas/gera-partidas.js (não edite à mão).\n' +
    '// b: brancas, p: pretas, a: ano, l: local, r: resultado, t: apelido da partida, m: lances.\n' +
    'window.XE_PARTIDAS = [\n' + linhas.join(',\n') + '\n];\n');
  console.log('famosas:', famosas.length, ' outras:', comuns.length, ' total:', todas.length);
}
main();
