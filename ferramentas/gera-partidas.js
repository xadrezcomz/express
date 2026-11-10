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
['Pillsbury','Lasker','1896','','A obra-prima de Pillsbury'],
['Glucksberg','Najdorf','','','A Imortal Polonesa'],
['Morphy','Anderssen','1858',17,'Morphy contra Anderssen'],
['Bird','Morphy','1858','','A torre de Morphy'],
['Kasparov','Portisch','1983','','Os dois bispos de Kasparov'],
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
['Spassky','Fischer','1972',27,'Fischer empata o match'],
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
const FORA = /blitz|rapid|simul|blind|odds|exh|internet|960|armageddon|bullet|online|titled|chess\.com|lichess|\bsim|consult|\bBl\b|\brap\b|g\/\d|\bg\d|\bTV\b|Tour\b|Challenge|Lindores|sports|Crypto|MrDodgy|Play Live|Prelim|GCT|corr\b|training|Tetraktys|NC World|Castling|Carlsen vs|Hotel Bali|FSIM|Trophy|Solidarity|Disney|Express|PCA|Chess\d|Classic GpD|Veterans/i;

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
  return p.length === 2 ? (p[1].trim().replace(/\s+(Sr|Jr)\.?$/, '') + ' ' + p[0].trim()).replace(/\s+[A-Z]\.?$/, '').trim() : n;
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
      jogos.push({ w: h.White, b: h.Black, d: h.Date || '', e: h.Event || '', s: h.Site || '', r: h.Result || '', rd: h.Round || '', eco: h.ECO || '', m: mov });
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

// ---------------------------------------------------------------- a curiosidade de cada partida
// Para as famosas, a frase é escrita à mão (CURIOSIDADES, pelo apelido). Para as outras,
// é montada só com o que o PGN diz: evento, lugar, ano, abertura e como terminou.
const CURIOSIDADES = {
  'A Imortal': 'Partida amistosa em Londres, num intervalo do torneio de 1851. Anderssen entrega as duas torres, um bispo e a dama antes do mate.',
  'A Sempre-Viva': 'Amistosa em Berlim, 1852. Steinitz a chamou de "sempre-viva" na coroa de louros de Anderssen.',
  'A Partida da Ópera': 'Jogada num camarote da Ópera de Paris, em 1858, durante uma apresentação. Morphy enfrentou dois nobres que jogavam juntos.',
  'O sacrifício de dama de Morphy': 'Final do primeiro Congresso Americano, Nova York, 1857. Morphy entrega a dama por um bispo e vence no ataque.',
  'A joia de Hastings': 'Hastings, 1895. Conta-se que von Bardeleben saiu da sala sem abandonar, e Steinitz mostrou depois o mate que viria.',
  'O sacrifício dos dois bispos': 'Amsterdã, 1889. A primeira partida famosa com os dois bispos entregues em h7 e g7.',
  'A Imortal de Rubinstein': 'Lodz, 1907. Rubinstein entrega a dama e uma torre, uma atrás da outra.',
  'A chuva de moedas de ouro': 'Breslau, 1912. Diz a lenda que o público cobriu o tabuleiro de moedas de ouro depois de 23...Dg3.',
  'A Partida do Século': 'Torneio Rosenwald, Nova York, 1956. Fischer tinha 13 anos e entregou a dama.',
  'A obra-prima de Fischer': 'Campeonato dos Estados Unidos de 1963/64, que Fischer venceu com 11 vitórias em 11 partidas.',
  'A Imortal de Kasparov': 'Wijk aan Zee, 1999. Depois da torre entregue em d4, o rei preto é levado a atravessar o tabuleiro.',
  'A máquina vence o campeão': 'Última partida do match de 1997, em Nova York. Pela primeira vez um campeão mundial perdia um match para um computador.',
  'A Imortal do Zugzwang': 'Copenhague, 1923. No fim, as brancas têm o tabuleiro cheio de peças e nenhum lance que não perca alguma coisa.',
  'A caminhada do rei': 'Tilburg, 1991. O rei branco sai de g1 e caminha até h6, no meio do jogo, para ajudar no mate.',
  'A obra-prima de Alekhine em Hastings': 'Hastings, 1922. Alekhine entrega torres para promover peões mais de uma vez.',
  'A combinação de Baden-Baden': 'Baden-Baden, 1925. Alekhine contava esta entre as suas melhores partidas.',
  'A aula de final de torres': 'Nova York, 1924. Capablanca entrega peões para o rei entrar, e o final virou lição de livro.',
  'O fim da invencibilidade de Capablanca': 'Nova York, 1924. A primeira derrota de Capablanca em oito anos.',
  'A joia do torneio AVRO': 'Torneio AVRO, Holanda, 1938. O lance 30.Ba3 abre a combinação mais famosa de Botvinnik.',
  'A torre que não parou': 'Monte Carlo, 1968. A torre branca entra em c7 e não pode ser capturada.',
  'O cavalo de Tal': 'Sexta partida do Mundial de 1960, em Moscou. Tal entrega um cavalo em f4, e o barulho da plateia fez o jogo mudar de sala.',
  'O sacrifício intuitivo de Tal': 'Décima partida da semifinal de Candidatos de 1965, em Bled. Era a partida que decidia o match.',
  'O mago de Riga': 'Olimpíada de Varna, 1962. Tal deixa a dama e mais peças atacadas ao mesmo tempo.',
  'O Gambito do Rei de Spassky': 'Campeonato Soviético de 1960, em Leningrado. O final aparece no filme "Moscou contra 007".',
  'A miniatura do século': 'URSS contra o Resto do Mundo, Belgrado, 1970. Spassky vence de pretas em 17 lances.',
  'A Imortal de Nezhmetdinov': 'Sochi, 1958. Nezhmetdinov entrega a dama para caçar o rei branco no meio do tabuleiro.',
  'O cavalo-polvo de Kasparov': '16ª partida do Mundial de 1985, em Moscou. Um cavalo preto em d3 paralisa o jogo das brancas.',
  'O ataque de Yusupov em Bruxelas': 'Desempate do match de Candidatos de 1991, em Bruxelas.',
  'O lance mais incrível: ...Bh3!!': 'Linares, 1998. Num final de bispos, Shirov entrega o dele com 47...Bh3 e vence.',
  'A Imortal de Anand': 'Wijk aan Zee, 2013. Anand vence de pretas em 23 lances.',
  'Dama entregue pelo título mundial': 'Última partida do desempate do Mundial de 2016, em Nova York, no dia em que Carlsen fez 26 anos. Termina com a dama entregue.',
  'O aperto de Karpov': 'Olimpíada de Nice, 1974. Um bispo em a7 tranca a coluna e deixa as pretas sem ar.',
  'O sacrifício de qualidade de Petrosian': 'Décima partida do Mundial de 1966, em Moscou. Petrosian entrega a qualidade duas vezes.',
  'O canhão de Alekhine': 'San Remo, 1930. As duas torres e a dama em fila na coluna c ganharam o nome de "canhão de Alekhine".',
  'Os dois bispos de Tarrasch': 'São Petersburgo, 1914. Tarrasch repete o sacrifício dos dois bispos de Lasker.',
  'A Imortal de Zukertort': 'Londres, 1883. Zukertort oferece a dama e, em seguida, uma torre.',
  'A Pérola de Zandvoort': '26ª partida do Mundial de 1935, em Zandvoort, na Holanda.',
  'A torre de Euwe em Zurique': 'Torneio de Candidatos de Zurique, 1953. Euwe entrega uma torre em h8 para tirar a dama branca do jogo.',
  'A sexta partida de Reykjavik': 'Sexta partida do Mundial de 1972, em Reykjavik. Fischer abriu com o peão da dama, raridade para ele, e Spassky aplaudiu no final.',
  'Fischer empata o match': 'Quinta partida do Mundial de 1972, em Reykjavik. Com 27...Bxa4 Fischer iguala o placar.',
  'O lance 19.Tf6!!': 'Campeonato dos Estados Unidos de 1963/64. A torre em f6 trava o peão e o mate fica inevitável.',
  'Fischer finalmente vence Tal': 'Bled, 1961. A primeira vitória de Fischer sobre Tal, depois de quatro derrotas seguidas em 1959.',
  'A dama que Fischer entregou': 'Olimpíada de Leipzig, 1960. Termina com a dama entregue em f4.',
  'O ataque de Fischer em Buenos Aires': 'Buenos Aires, 1970, torneio que Fischer venceu com folga.',
  'O mate de Fischer em Sousse': 'Interzonal de Sousse, 1967. Fischer liderava quando abandonou o torneio.',
  'A simplificação de Fischer': 'Sétima partida da final de Candidatos de 1971, em Buenos Aires. Fischer troca o seu melhor cavalo por um bispo ruim, e era o lance certo.',
  'A estreia do Ataque Marshall': 'Nova York, 1918. Marshall estreou aqui o gambito que leva o seu nome, e Capablanca refutou no tabuleiro.',
  'A lição de Lasker em São Petersburgo': 'São Petersburgo, 1914. Lasker precisava vencer para alcançar Capablanca, e escolheu a tranquila variante das trocas.',
  'A obra-prima de Pillsbury': 'Nuremberg, 1896. Pillsbury vence o campeão mundial entregando um peão atrás do outro.',
  'A Imortal Polonesa': 'Varsóvia, começo dos anos 1930. Najdorf entrega as quatro peças menores.',
  'Morphy contra Anderssen': 'Match de Paris, 1858, entre os dois melhores do mundo. Morphy precisou de 17 lances.',
  'A torre de Morphy': 'Londres, 1858. Morphy entrega uma torre em f2 e ainda põe a dama em a3.',
  'Os dois bispos de Kasparov': 'Niksic, 1983. O sacrifício dos dois bispos em versão moderna.',
  'A partida do título de Anand': '12ª e última partida do Mundial de 2010, em Sófia. Anand vence de pretas e mantém o título.',
  'Carlsen conquista a coroa': 'Nona partida do Mundial de 2013, em Chennai. Com esta vitória Carlsen ficou a meio ponto do título.',
  'O cavalo de Judit em Buenos Aires': 'Buenos Aires, 1994, num torneio só de Defesa Siciliana em homenagem a Polugaevsky.',
  'Alekhine vence o invencível': 'Primeira partida do Mundial de 1927, em Buenos Aires. Foi a primeira vitória de Alekhine sobre Capablanca.',
  'A técnica de Capablanca': 'Terceira partida do Mundial de 1927, em Buenos Aires.',
  'A clareza de Capablanca': 'Nova York, 1927. Levou um prêmio de beleza do torneio.',
  'A final de torres de Rubinstein': 'São Petersburgo, 1909. Rubinstein vence o campeão mundial num final de torres.',
  'O duelo de Havana': 'Primeira partida do Mundial de 1892, em Havana.',
  'O ataque de Steinitz em Havana': 'Quarta partida do Mundial de 1892, em Havana.',
  'Spassky a caminho do título': 'Décima partida das quartas de final de Candidatos de 1965, em Riga.',
  'A dama de Smyslov': 'Nona partida do Mundial de 1954, em Moscou. Smyslov entrega a dama por três peças.',
  'A torre de Bronstein em Petrópolis': 'Interzonal de Petrópolis, 1973, disputado no Brasil.',
  'O jovem Tal no Torneio de Candidatos': 'Torneio de Candidatos de 1959, na Iugoslávia. Tal tinha 22 anos e venceu o torneio.',
  'A primeira vitória de Tal pelo título': 'Primeira partida do Mundial de 1960, em Moscou.',
  'A miniatura de Stein': 'Interzonal de Estocolmo, 1962.',
  'A dama de Larsen': 'Copa Piatigorsky, Santa Monica, 1966. Larsen entrega a dama contra o campeão mundial.',
  'Spassky campeão do mundo': '19ª partida do Mundial de 1969, em Moscou.',
  'O ataque iugoslavo de Karpov': 'Segunda partida da final de Candidatos de 1974, em Moscou. O vencedor do match virou campeão mundial sem enfrentar Fischer.',
  'Karpov supera Spassky': 'Nona partida da semifinal de Candidatos de 1974, em Leningrado.',
  'Mequinho, o brasileiro entre os melhores': 'Las Palmas, 1975. Mequinho chegou a ser o terceiro do ranking mundial.'
};

const CIDADES = { 'London': 'Londres', 'Vienna': 'Viena', 'Moscow': 'Moscou', 'New York': 'Nova York', 'New Orleans': 'Nova Orleans',
  'Zuerich': 'Zurique', 'Zurich': 'Zurique', 'Warsaw': 'Varsóvia', 'St Petersburg': 'São Petersburgo', 'Leningrad': 'Leningrado',
  'Berlin': 'Berlim', 'Munich': 'Munique', 'Amsterdam': 'Amsterdã', 'Copenhagen': 'Copenhague', 'Belgrade': 'Belgrado',
  'Prague': 'Praga', 'Brussels': 'Bruxelas', 'Stockholm': 'Estocolmo', 'Gothenburg': 'Gotemburgo', 'Sofia': 'Sófia',
  'Sao Paulo': 'São Paulo', 'Mexico City': 'Cidade do México', 'Hamburg': 'Hamburgo', 'Cologne': 'Colônia', 'Vienna AUT': 'Viena',
  'Wijk aan Zee': 'Wijk aan Zee', 'Geneva': 'Genebra', 'Lisbon': 'Lisboa', 'Athens': 'Atenas', 'Milan': 'Milão', 'Rome': 'Roma',
  'Venice': 'Veneza', 'Turin': 'Turim', 'Naples': 'Nápoles', 'The Hague': 'Haia', 'Haag': 'Haia', 'Thessaloniki': 'Tessalônica',
  'Havana': 'Havana', 'La Habana': 'Havana', 'Beijing': 'Pequim', 'Tbilisi': 'Tbilisi', 'Kiev': 'Kiev', 'Bucharest': 'Bucareste',
  'Budapest': 'Budapeste', 'Dresden': 'Dresden', 'Nuremberg': 'Nuremberg', 'Marienbad': 'Marienbad', 'Karlsbad': 'Karlsbad' };
function cidade(s) {
  s = s.replace(/\?/g, '').replace(/\s+[A-Z]{3}$/, '').trim();
  return CIDADES[s] || s;
}

// a família da abertura, pelo código ECO do PGN
const ABERTURAS = [
  ['A00', 'A03', 'uma abertura irregular'], ['A04', 'A09', 'a Abertura Réti'], ['A10', 'A39', 'a Abertura Inglesa'],
  ['A40', 'A44', 'uma defesa pouco comum contra o peão da dama'], ['A45', 'A49', 'uma abertura do peão da dama'],
  ['A50', 'A79', 'uma Defesa Índia'], ['A80', 'A99', 'a Defesa Holandesa'],
  ['B00', 'B00', 'uma defesa rara contra 1.e4'], ['B01', 'B01', 'a Defesa Escandinava'], ['B02', 'B05', 'a Defesa Alekhine'],
  ['B06', 'B09', 'a Defesa Pirc'], ['B10', 'B19', 'a Defesa Caro-Kann'], ['B20', 'B99', 'a Defesa Siciliana'],
  ['C00', 'C19', 'a Defesa Francesa'], ['C20', 'C20', 'uma abertura do peão do rei'], ['C21', 'C22', 'a Abertura Central'],
  ['C23', 'C24', 'a Abertura do Bispo'], ['C25', 'C29', 'a Abertura Vienense'], ['C30', 'C39', 'o Gambito do Rei'],
  ['C40', 'C40', 'um gambito raro'], ['C41', 'C41', 'a Defesa Philidor'], ['C42', 'C43', 'a Defesa Petrov'],
  ['C44', 'C44', 'uma abertura aberta'], ['C45', 'C45', 'a Abertura Escocesa'], ['C46', 'C49', 'a Abertura dos Quatro Cavalos'],
  ['C50', 'C50', 'a Abertura Italiana'], ['C51', 'C52', 'o Gambito Evans'], ['C53', 'C54', 'a Abertura Italiana'],
  ['C55', 'C59', 'a Defesa dos Dois Cavalos'], ['C60', 'C99', 'a Abertura Espanhola'],
  ['D00', 'D05', 'uma abertura do peão da dama'], ['D06', 'D09', 'o Gambito da Dama'], ['D10', 'D19', 'a Defesa Eslava'],
  ['D20', 'D29', 'o Gambito da Dama Aceito'], ['D30', 'D69', 'o Gambito da Dama Recusado'], ['D70', 'D99', 'a Defesa Grünfeld'],
  ['E00', 'E09', 'a Abertura Catalã'], ['E10', 'E19', 'a Defesa Índia da Dama'], ['E20', 'E59', 'a Defesa Nimzo-Índia'],
  ['E60', 'E99', 'a Defesa Índia do Rei']
];
function abertura(eco) {
  if (!/^[A-E]\d\d$/.test(eco)) return '';
  const a = ABERTURAS.find(x => eco >= x[0] && eco <= x[1]);
  return a ? a[2] : '';
}

// o evento em português, só quando o nome do PGN deixa claro o que foi
function evento(g) {
  const e = g.e, ano = g.d.slice(0, 4);
  if (/World Champ|^WCh\b|^Wch\b(?! U)/i.test(e) && !/U\d/.test(e)) return 'Partida do Campeonato Mundial';
  if (/Wch U(\d+)/i.test(e)) return 'Campeonato Mundial sub-' + /U(\d+)/.exec(e)[1];
  if (/Candidat/i.test(e)) return 'Torneio de Candidatos';
  if (/Interzonal|\bizt\b/i.test(e)) return 'Torneio Interzonal';
  if (/\bol\b|\bolm\b|Olympiad/i.test(e)) return 'Olimpíada de Xadrez';
  if (/^URS-ch\d*$/.test(e)) return 'Campeonato Soviético';
  if (/^USA-ch/.test(e)) return 'Campeonato dos Estados Unidos';
  if (/(^|\s)(m|mt|match)\d*$/i.test(e) || /\sm\d*$/.test(e)) return 'Partida de um match';
  if (/\bmem\b|Memorial/i.test(e)) return 'Memorial ' + e.replace(/\s*(mem|Memorial).*$/i, '').replace(/^\d+\w*\s*/, '');
  if (/Hoogovens|Tata Steel/.test(e)) return 'Torneio de Wijk aan Zee';
  return '';
}
function curiosidade(g, r, titulo) {
  if (titulo && CURIOSIDADES[titulo]) return CURIOSIDADES[titulo];
  const ano = g.d.slice(0, 4).replace(/\?/g, ''), onde = cidade(g.s), ev = evento(g), ab = abertura(g.eco);
  const n = Math.ceil(r.san.length / 2), brancas = g.r === '1-0';
  const quem = nome(brancas ? g.w : g.b).replace(/\s*\(.*\)/, '').split(' ').slice(-1)[0];
  let lugar = [onde, ano].filter(Boolean).join(', ');
  let frase = ev ? ev + (lugar ? ', ' + lugar : '') : lugar;
  frase = frase ? frase + '. ' : '';
  frase += (ab ? 'Saiu d' + ab + ', e ' : '') + quem + ' vence de ' + (brancas ? 'brancas' : 'pretas') + ' em ' + n + ' lances' + (r.mate ? ', com mate no tabuleiro.' : '.');
  return frase;
}

function ficha(g, r, titulo) {
  const o = { b: nome(g.w), p: nome(g.b), a: g.d.slice(0, 4).replace(/\?/g, ''), l: cidade(g.s), r: g.r, m: r.san.join(' ') };
  if (titulo) o.t = titulo;
  const c = curiosidade(g, r, titulo);
  if (c) o.c = c;
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
    '// b: brancas, p: pretas, a: ano, l: local, r: resultado, t: apelido da partida, c: curiosidade, m: lances.\n' +
    'window.XE_PARTIDAS = [\n' + linhas.join(',\n') + '\n];\n');
  console.log('famosas:', famosas.length, ' outras:', comuns.length, ' total:', todas.length);
}
main();
