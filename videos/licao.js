// Lê o arquivo de uma lição (videos/licoes/*.txt) e monta a linha do tempo do vídeo:
// em que segundo cada lance, seta e marca acontece, e qual legenda está na tela.
//
// O arquivo é o texto falado, com as ordens para o tabuleiro entre colchetes no ponto
// da fala em que elas acontecem. O formato completo está em videos/LEIA-ME.md.
'use strict';

const Xadrez = require('../js/xadrez.js');   // as regras do site: só para reconhecer xeque e mate

const COLUNAS = 'abcdefgh';
const NOMES = { peao: 'Peão', rei: 'Rei', dama: 'Dama', rainha: 'Rainha', torre: 'Torre', bispo: 'Bispo', cavalo: 'Cavalo' };
const INICIAL = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
const PECAS = { rei: 'k', dama: 'q', rainha: 'q', torre: 'r', bispo: 'b', cavalo: 'n', peao: 'p' };
const CORES = {
  amarela: 'amarela', amarelo: 'amarela', ouro: 'amarela', verde: 'verde',
  vermelha: 'vermelha', vermelho: 'vermelha', azul: 'azul', ciano: 'azul'
};
const DUR_LANCE = 0.45;      // segundos que a peça leva para andar
const ENTRE_LANCES = 0.75;   // intervalo entre os lances de um mesmo [lance a b c]

function semAcento(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function chave(s) { return semAcento(String(s).toLowerCase()).replace(/[^a-z0-9]/g, ''); }
function ehCasa(s) { return /^[a-h][1-8]$/.test(s); }
function indice(casa) { return (8 - Number(casa[1])) * 8 + COLUNAS.indexOf(casa[0]); }

function casasDeFEN(fen) {
  const casas = [];
  for (const ch of fen.trim().split(/\s+/)[0]) {
    if (ch === '/') continue;
    if (ch >= '1' && ch <= '8') for (let k = 0; k < Number(ch); k++) casas.push('');
    else casas.push(ch);
  }
  if (casas.length !== 64) throw new Error('Posição (FEN) inválida: ' + fen);
  return casas;
}
function posicao(valor) {
  const v = chave(valor);
  if (v === 'inicial' || v === '') return casasDeFEN(INICIAL);
  if (v === 'vazio' || v === 'vazia') return new Array(64).fill('');
  return casasDeFEN(valor);
}

// "cavalo branco d4, rei preto e8" -> [{ peca: 'N', casa: 27 }, ...]
function listaDePecas(texto, onde) {
  return texto.split(',').map(s => s.trim()).filter(Boolean).map(item => {
    const partes = item.split(/\s+/).map(chave);
    const tipo = PECAS[partes[0]], casa = partes[partes.length - 1];
    const preta = partes.slice(1, -1).some(p => /^pret/.test(p));
    if (!tipo || !ehCasa(casa)) throw new Error(onde + ': não entendi a peça "' + item + '" (ex.: cavalo branco d4)');
    return { peca: preta ? tipo : tipo.toUpperCase(), casa: indice(casa) };
  });
}

// "g1f3 g1 h3" -> [['g1','f3'], ['g1','h3']]
function paresDeCasas(partes, onde) {
  const casas = [];
  partes.forEach(p => {
    const m = p.match(/^([a-h][1-8])-?([a-h][1-8])$/);
    if (m) casas.push(m[1], m[2]);
    else if (ehCasa(p)) casas.push(p);
    else throw new Error(onde + ': "' + p + '" não é uma casa');
  });
  if (!casas.length || casas.length % 2) throw new Error(onde + ': cada lance ou seta precisa de duas casas (de onde, para onde)');
  const pares = [];
  for (let i = 0; i < casas.length; i += 2) pares.push([casas[i], casas[i + 1]]);
  return pares;
}

// Uma ordem entre colchetes vira um ou mais acontecimentos (ainda sem o segundo exato).
function leOrdem(texto, onde) {
  let partes = texto.trim().split(/\s+/), aos = null;
  const fixo = partes[partes.length - 1].match(/^@(\d+(?:[.,]\d+)?)$/);   // [lance e2e4 @12.5]
  if (fixo) { aos = Number(fixo[1].replace(',', '.')); partes = partes.slice(0, -1); }
  let nome = chave(partes[0]);
  let resto = partes.slice(1);
  if (/^[a-h][1-8]-?[a-h][1-8]$/.test(partes[0].toLowerCase())) { nome = 'lance'; resto = partes; }   // [e2e4]
  const minus = resto.map(p => p.toLowerCase());
  let cor = null;
  const semCor = minus.filter(p => { const c = CORES[chave(p)]; if (c) cor = c; return !c; });
  const acoes = [];

  if (nome === 'lance' || nome === 'lances') {
    let promo = null;
    const casas = semCor.filter(p => { const t = PECAS[chave(p)]; if (t) promo = t; return !t; });
    paresDeCasas(casas, onde).forEach((par, k) => {
      acoes.push({ tipo: 'lance', de: indice(par[0]), para: indice(par[1]), promo: promo, atraso: k * ENTRE_LANCES });
    });
  } else if (nome === 'seta' || nome === 'setas') {
    acoes.push({ tipo: 'seta', setas: paresDeCasas(semCor, onde).map(p => [indice(p[0]), indice(p[1])]), cor: cor || 'amarela' });
  } else if (nome === 'marca' || nome === 'marcas') {
    semCor.forEach(p => { if (!ehCasa(p)) throw new Error(onde + ': "' + p + '" não é uma casa'); });
    if (!semCor.length) throw new Error(onde + ': diga quais casas marcar');
    acoes.push({ tipo: 'marca', casas: semCor.map(indice), cor: cor || 'verde' });
  } else if (nome === 'limpa') {
    acoes.push({ tipo: 'limpa' });
  } else if (nome === 'posicao') {
    acoes.push({ tipo: 'posicao', casas: posicao(resto.join(' ')) });
  } else if (nome === 'poe') {
    acoes.push({ tipo: 'poe', pecas: listaDePecas(resto.join(' '), onde) });
  } else if (nome === 'mostra' && chave(resto[0] || '') === 'logo') {   // [mostra logo]
    acoes.push({ tipo: 'mostra', peca: 'logo', nome: 'Xadrez Express' });
  } else if (nome === 'mostra') {                       // [mostra bispo] ou [mostra cavalo preto]
    const tipo = PECAS[chave(resto[0] || '')];
    if (!tipo) throw new Error(onde + ': diga qual peça mostrar (ex.: [mostra bispo])');
    const preta = resto.slice(1).some(p => /^pret/.test(chave(p)));
    acoes.push({ tipo: 'mostra', peca: preta ? tipo : tipo.toUpperCase(), nome: NOMES[chave(resto[0])] });
  } else if (nome === 'esconde') {
    acoes.push({ tipo: 'esconde' });
  } else if (nome === 'texto') {                        // [texto Garfo!]
    if (!resto.length) throw new Error(onde + ': diga o texto (ex.: [texto Garfo!])');
    acoes.push({ tipo: 'texto', texto: resto.join(' ') });
  } else if (nome === 'tira') {
    semCor.forEach(p => { if (!ehCasa(p)) throw new Error(onde + ': "' + p + '" não é uma casa'); });
    acoes.push({ tipo: 'tira', casas: semCor.map(indice) });
  } else {
    throw new Error(onde + ': não conheço a ordem [' + texto + ']. As ordens são: lance, seta, marca, limpa, posicao, poe, tira, mostra, esconde, texto.');
  }
  acoes.forEach(a => { a.aos = aos; });
  return acoes;
}

// Lê o arquivo: cabeçalho ("chave: valor") e depois a fala com as ordens.
function le(texto, nomeArquivo) {
  const linhas = texto.replace(/\r/g, '').split('\n');
  const cab = {};
  let i = 0;
  for (; i < linhas.length; i++) {
    const l = linhas[i].trim();
    if (l === '' && !Object.keys(cab).length) continue;
    if (/^-{3,}$/.test(l)) { i++; break; }
    const m = l.match(/^([A-Za-zÀ-ÿ]+)\s*:\s*(.*)$/);
    if (!m || !/^(licao|titulo|posicao|pecas|lado|legenda|voz)$/.test(chave(m[1]))) break;
    cab[chave(m[1])] = m[2].trim();
  }
  const onde = nomeArquivo || 'lição';
  let casas = posicao(cab.posicao || 'inicial');
  if (cab.pecas) listaDePecas(cab.pecas, onde + ' (pecas)').forEach(p => { casas[p.casa] = p.peca; });

  // a fala: palavras e, entre elas, as ordens (cada ordem guarda antes de qual palavra ela vem)
  const palavras = [], ordens = [];
  const corpo = linhas.slice(i).filter(l => !/^\s*(#|\/\/)/.test(l)).join('\n');
  corpo.split(/(\[[^\]]*\])/).forEach(pedaco => {
    if (pedaco[0] === '[' && pedaco[pedaco.length - 1] === ']') {
      leOrdem(pedaco.slice(1, -1), onde).forEach(a => { a.antesDe = palavras.length; ordens.push(a); });
    } else {
      pedaco.split('\n').forEach((linha, n) => {
        if (n > 0 && palavras.length) palavras[palavras.length - 1].fimDeLinha = true;
        linha.split(/\s+/).filter(Boolean).forEach(p => {
          if (chave(p) === '' && palavras.length) palavras[palavras.length - 1].texto += ' ' + p;   // um travessão solto
          else if (chave(p) !== '') palavras.push({ texto: p });
        });
      });
    }
  });
  if (!palavras.length) throw new Error(onde + ': a lição está sem o texto da fala');

  return {
    numero: cab.licao || '', titulo: cab.titulo || '', voz: cab.voz || '',
    pretasEmbaixo: /^pret/.test(chave(cab.lado || '')),
    legenda: !/^(nao|n|off|0)$/.test(chave(cab.legenda || 'sim')),
    casas: casas, palavras: palavras, ordens: ordens,
    fala: palavras.map(p => p.texto).join(' ')
  };
}

// ---------------------------------------------------------------- os segundos de cada palavra

// Sem áudio, ou sem reconhecimento de fala: reparte o tempo pelo tamanho das palavras,
// com um respiro depois da pontuação. Serve para a prévia e como último recurso.
function temposEstimados(palavras, inicio, fim) {
  const pesos = palavras.map(p => {
    let w = chave(p.texto).length + 1.5;
    if (/[.!?…:]$/.test(p.texto)) w += 6; else if (/[,;]$/.test(p.texto)) w += 3;
    return w;
  });
  const total = pesos.reduce((a, b) => a + b, 0);
  if (fim == null) fim = inicio + total / 17;      // ~17 letras por segundo: ritmo de fala de aula
  let t = inicio;
  return palavras.map((p, k) => {
    const d = (fim - inicio) * pesos[k] / total, fala = d * (chave(p.texto).length + 1.5) / pesos[k];
    const r = { ini: t, fim: t + fala };
    t += d;
    return r;
  });
}

// Com as palavras que o reconhecimento de fala ouviu (e o segundo de cada uma): casa o
// texto da lição com o que foi dito. O que não casar fica entre as vizinhas que casaram.
function temposOuvidos(palavras, ouvidas, duracao) {
  const A = palavras.map(p => chave(p.texto)), B = ouvidas.map(o => chave(o.p));
  const n = A.length, m = B.length;
  const T = [];
  for (let i = 0; i <= n; i++) T.push(new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
    T[i][j] = A[i] === B[j] ? T[i + 1][j + 1] + 1 : Math.max(T[i + 1][j], T[i][j + 1]);
  }
  const tempos = new Array(n).fill(null);
  let i = 0, j = 0, casadas = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { tempos[i] = { ini: ouvidas[j].ini, fim: ouvidas[j].fim }; casadas++; i++; j++; }
    else if (T[i + 1][j] >= T[i][j + 1]) i++; else j++;
  }
  // os buracos: reparte o tempo entre a palavra casada de antes e a de depois
  const comeco = ouvidas.length ? ouvidas[0].ini : 0, final = ouvidas.length ? ouvidas[m - 1].fim : duracao;
  for (let a = 0; a < n; a++) {
    if (tempos[a]) continue;
    let b = a;
    while (b < n && !tempos[b]) b++;
    const t0 = a > 0 ? tempos[a - 1].fim : comeco, t1 = b < n ? tempos[b].ini : final;
    const est = temposEstimados(palavras.slice(a, b), t0, Math.max(t0, t1));
    for (let k = a; k < b; k++) tempos[k] = est[k - a];
    a = b;
  }
  return { tempos: tempos, casadas: casadas / n };
}

// ---------------------------------------------------------------- a linha do tempo

// Aplica um lance sem conferir regra nenhuma (as lições usam posições de ensino, às vezes
// sem rei): a peça de `de` vai para `para`. Roque, en passant e promoção são reconhecidos.
function aplicaLance(casas, a, onde) {
  const peca = casas[a.de];
  if (!peca) throw new Error(onde + ': não há peça em ' + COLUNAS[a.de % 8] + (8 - (a.de >> 3)) + ' para o lance');
  const depois = casas.slice(), tipo = peca.toLowerCase(), dx = (a.para % 8) - (a.de % 8);
  const movem = [{ peca: peca, de: a.de, para: a.para }];
  let capturada = casas[a.para] ? { peca: casas[a.para], casa: a.para } : null;
  depois[a.de] = ''; depois[a.para] = peca;
  if (tipo === 'k' && Math.abs(dx) === 2) {                                   // roque: a torre vem junto
    const linha = a.de - (a.de % 8), tDe = linha + (dx > 0 ? 7 : 0), tPara = a.de + (dx > 0 ? 1 : -1);
    if (depois[tDe]) { movem.push({ peca: depois[tDe], de: tDe, para: tPara }); depois[tPara] = depois[tDe]; depois[tDe] = ''; }
  }
  if (tipo === 'p' && dx !== 0 && !capturada) {                               // en passant
    const alvo = (a.de - (a.de % 8)) + (a.para % 8);
    if (depois[alvo]) { capturada = { peca: depois[alvo], casa: alvo }; depois[alvo] = ''; }
  }
  const fila = a.para >> 3;
  if (tipo === 'p' && (fila === 0 || fila === 7)) {                           // promoção (dama, se não disser)
    const nova = a.promo || 'q';
    depois[a.para] = peca === 'P' ? nova.toUpperCase() : nova;
  }
  return { depois: depois, movem: movem, capturada: capturada };
}

// Depois de um lance: o rei do outro lado ficou em xeque? É mate? (Só com os dois reis no tabuleiro.)
function xequeDepois(casas, peca) {
  const cor = peca === peca.toUpperCase() ? 'w' : 'b', outro = cor === 'w' ? 'b' : 'w';
  const rei = casas.indexOf(outro === 'w' ? 'K' : 'k');
  if (rei < 0 || casas.indexOf(cor === 'w' ? 'K' : 'k') < 0) return {};
  const pos = { casas: casas, vez: outro, roque: '', ep: -1 };
  if (!Xadrez.emXeque(pos, outro)) return {};
  return { xeque: rei, mate: Xadrez.ehMate(pos) };
}

// Junta lição + segundos das palavras no roteiro que o palco (videos/palco.js) desenha.
function roteiro(licao, tempos, duracao) {
  const n = licao.palavras.length;
  const fimDaFala = tempos[n - 1].fim;
  let casas = licao.casas.slice();
  const inicial = casas.slice();
  const eventos = [];
  let ultimo = 0;
  licao.ordens.forEach(a => {
    // a ordem acontece quando começa a palavra que vem depois dela
    let t = a.aos != null ? a.aos : (a.antesDe < n ? tempos[a.antesDe].ini : fimDaFala + 0.15);
    if (a.antesDe === 0 && a.aos == null) t = 0;
    t = Math.max(t + (a.atraso || 0), ultimo);
    const ev = { t: Math.round(t * 1000) / 1000, tipo: a.tipo };
    if (a.tipo === 'lance') {
      const r = aplicaLance(casas, a, 'lance aos ' + t.toFixed(1) + 's');
      ev.movem = r.movem; ev.capturada = r.capturada; ev.de = a.de; ev.para = a.para;
      casas = r.depois;
      Object.assign(ev, xequeDepois(casas, r.movem[0].peca));
      ultimo = ev.t + DUR_LANCE;
    } else if (a.tipo === 'posicao') { casas = a.casas.slice(); ultimo = ev.t; }
    else if (a.tipo === 'poe') { casas = casas.slice(); a.pecas.forEach(p => { casas[p.casa] = p.peca; }); ev.novas = a.pecas.map(p => p.casa); ultimo = ev.t; }
    else if (a.tipo === 'mostra') { ev.peca = a.peca; ev.nome = a.nome; ultimo = ev.t; }
    else if (a.tipo === 'texto') { ev.texto = a.texto; ultimo = ev.t; }
    else if (a.tipo === 'tira') { casas = casas.slice(); a.casas.forEach(c => { casas[c] = ''; }); ultimo = ev.t; }
    else if (a.tipo === 'seta') { ev.setas = a.setas; ev.cor = a.cor; ultimo = ev.t; }
    else if (a.tipo === 'marca') { ev.casas = a.casas; ev.cor = a.cor; ultimo = ev.t; }
    else ultimo = ev.t;
    ev.tabuleiro = casas.slice();
    eventos.push(ev);
  });

  // legendas: blocos curtos, que cabem em duas linhas; quebram na pontuação
  const legendas = [];
  let bloco = null;
  licao.palavras.forEach((p, k) => {
    if (!bloco) { bloco = { ini: tempos[k].ini, palavras: [], letras: 0 }; legendas.push(bloco); }
    bloco.palavras.push({ texto: p.texto, ini: tempos[k].ini, fim: tempos[k].fim });
    bloco.letras += p.texto.length + 1;
    bloco.fim = tempos[k].fim;
    const prox = licao.palavras[k + 1];
    const cheia = prox && bloco.letras + prox.texto.length > 34;
    if (p.fimDeLinha || /[.!?…]$/.test(p.texto) || cheia || (/[,;:]$/.test(p.texto) && bloco.letras > 12)) bloco = null;
  });
  // cada legenda fica na tela até a próxima começar (ou um pouco depois do fim, numa pausa longa)
  legendas.forEach((b, k) => {
    const prox = legendas[k + 1];
    b.some = prox ? Math.min(prox.ini, b.fim + 1.2) : b.fim + 1.2;
  });

  // um efeito que começa perto do fim precisa de tempo para aparecer inteiro
  let efeitos = 0;
  eventos.forEach(ev => {
    if (ev.tipo === 'texto') efeitos = Math.max(efeitos, ev.t + 1.6);
    if (ev.xeque != null) efeitos = Math.max(efeitos, ev.t + DUR_LANCE + 1.4);
    if (ev.capturada) efeitos = Math.max(efeitos, ev.t + DUR_LANCE + 0.6);
    if (ev.tipo === 'mostra') efeitos = Math.max(efeitos, ev.t + 1.2);
  });
  const fim = Math.max(fimDaFala, ultimo, efeitos, duracao || 0);
  return {
    numero: licao.numero, titulo: licao.titulo, pretasEmbaixo: licao.pretasEmbaixo,
    legenda: licao.legenda, inicial: inicial, eventos: eventos, legendas: legendas,
    durLance: DUR_LANCE, duracao: fim
  };
}

module.exports = { le, temposEstimados, temposOuvidos, roteiro, chave };
