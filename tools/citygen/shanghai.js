// Shanghai: der Huangpu windet sich als breiter Fluss durch die Stadt, zwei Brücken (Dämme) verbinden die Ufer.
// Puxi (links): der Bund mit Uferpromenade und Prachtbauten, People's Square mit großem Park, die Nanjing Road als
// Fußgängerzone voller Läden, die Altstadt am Yu-Garten in ihrem Straßenring, Stadion und Universität. Pudong (rechts): Lujiazui mit Hochhäusern, zentralem Park und Fernsehturm, Century Avenue.
'use strict';
const O = require('./organic');
const L = require('./layout');
const { K } = require('./generate');

module.exports = function shanghai(d) {
  const nz = O.noise(d, 7);
  // ---- Wasser ----
  O.carve(d, [[0.63, -0.02], [0.6, 0.14], [0.68, 0.3], [0.64, 0.46], [0.56, 0.6], [0.62, 0.78], [0.74, 0.9], [0.82, 1.03]], 3.6, 'W');
  O.tidy(d, { minLand: 30 });
  const RIVER = new Set([...d.cls].filter(([, c]) => c === 'W').map(([k]) => k));
  // ---- Grünflächen ----
  const blob = (x0, y0, rx, ry) => O.paint(d, (x, y, p, q) => d.get(p, q) === 'S' && ((x - x0) / rx) ** 2 + ((y - y0) / ry) ** 2 + (nz(p, q) - 0.5) * 0.5 < 1 ? 'P' : null);
  blob(0.31, 0.45, 0.045, 0.07);    // People's Park
  blob(0.79, 0.4, 0.04, 0.06);      // Lujiazui Central Park
  blob(0.45, 0.63, 0.018, 0.03);    // Yu-Garten

  // ---- Plätze ----
  const PEOPLE = O.rectAt(0.37, 0.49, 3), TOWER = O.rectAt(0.74, 0.47, 3), STADION = O.rectAt(0.16, 0.74, 6), UNI = O.rectAt(0.18, 0.12, 5), EKZ = O.rectAt(0.85, 0.24, 5), XINTIANDI = O.rectAt(0.3, 0.6, 3);
  const plazas = [
    { rect: PEOPLE, landmark: 'S_NY2' },
    { rect: TOWER, landmark: 'S_ZSH3' },                 // Oriental Pearl Tower (eigene Grafik)
    { rect: STADION, center: 'STAD', leer: 3, extras: ['CLUB', 'FZZ', 'KAUF'] },
    { rect: UNI, center: 'UNIV', leer: 2, extras: ['FZZ', 'CLUB'] },
    { rect: EKZ, center: 'EKZ', leer: 3, extras: ['BUER', 'HOTE', 'KAUF'] },
    { rect: XINTIANDI, center: 'CLUB', leer: 3, extras: ['FZZ', 'KAUF', 'HOTE'], mix: ['CLUB', 'KAUF', 'FZZ'] },
  ];
  for (const pl of plazas) d.rect(...pl.rect, 'S');
  // Nanjing Road: Fußgängerzone (gepflasterte Gasse ohne Autos, Läden auf beiden Seiten)
  const [np0, nq0] = O.S2PQ(0.37, 0.44), NANJING = [np0, nq0, np0 + 1, nq0 + 16];
  // Altstadt: Ring um den Yu-Garten
  const [yp, yq] = O.S2PQ(0.45, 0.63), YU = [yp - 11, yq - 11, yp + 11, yq + 11];

  // ---- Straßen ----
  const blocked = L.nearWater(d);
  const parkRect = (x, y, h) => O.rectAt(x, y, h);
  const grid = L.irregularGrid(d, { pFrom: -2, pTo: 128, qFrom: -66, qTo: 66, gap: [12, 16], drop: 0.08, blocked,
    reserved: [...plazas.map(p => p.rect), NANJING, YU, parkRect(0.31, 0.45, 9), parkRect(0.79, 0.4, 8)] });
  // Altstadtring (achteckig) um den Yu-Garten
  const ring = []; for (let i = 0; i <= 8; i++) { const a = i / 8 * 2 * Math.PI; ring.push([0.45 + 0.085 * Math.cos(a), 0.63 + 0.15 * Math.sin(a)]); }
  O.route(d, ring);
  // Century Avenue in Pudong
  O.route(d, [[0.71, 0.5], [0.85, 0.58], [0.98, 0.66]]);
  // Zwei Brücken über den Huangpu (Nanpu im Süden, Yangpu im Norden), jeweils bis zur nächsten Straße verlängert
  const bridges = [O.bridge(d, 'Q', 87, -26, 0), O.bridge(d, 'P', 32, 34, 56)];
  // Nanjing Road bleibt autofrei und unbebaut
  for (let p = NANJING[0]; p <= NANJING[2]; p++) for (let q = NANJING[1]; q <= NANJING[3]; q++) { if (d.get(p, q) === 'R') d.set(p, q, 'S'); d.noBuild.add(K(p, q)); }
  O.finishRoads(d, plazas.map(p => p.rect), { dropped: grid.dropped, clip: RIVER, bridges });
  L.quayify(d);
  d.stegEvery = 9;
  // Uferpromenade am Bund und in Pudong: Grünstreifen am Fluss
  const dw = O.distanceTo(d, ['W', 'L', 'U']);
  for (const [p, q] of O.cells(d)) { const [x, y] = O.PQ2S(p, q); if (d.get(p, q) === 'S' && x > 0.45 && x < 0.8 && y > 0.15 && y < 0.6 && dw(p, q) === 1 && ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => d.get(p + a, q + b) === 'R')) d.set(p, q, 'P'); }

  const pudong = l => { const [x, y] = O.PQ2S(l.p, l.q); return x > 0.66 && y < 0.75; };
  const bund = l => { const [x, y] = O.PQ2S(l.p, l.q); return x > 0.47 && x < 0.6 && y > 0.18 && y < 0.5; };
  return O.furnish(d, {
    plazas, gardens: 5,
    special: (d, lots, near, got, taken) => {
      // Nanjing Road: freie Ladenlokale und Geschäfte dicht an dicht
      const nj = lots.filter(l => !l.used && l.p >= NANJING[0] - 4 && l.p <= NANJING[2] + 4 && l.q >= NANJING[1] - 1 && l.q <= NANJING[3] + 1).sort((a, b) => a.q - b.q);
      let n = 0; for (const l of nj) { const k = n % 3 === 0 ? 'LEER' : ['KAUF', 'CLUB'][n % 2]; if (k === 'LEER' && !taken.every(t => L.dist(t, l) >= 5)) continue; if (L.put(d, l, k)) { got[k] = (got[k] || 0) + 1; if (k === 'LEER') taken.push(l); n++; } }
      // Der Bund: Banken und Hotels; Pudong: Bürotürme
      let h = 0; for (const l of near.filter(l => !l.used && bund(l))) if (h < 8 && L.put(d, l, h % 2 ? 'HOTE' : 'BUER')) { got[h % 2 ? 'HOTE' : 'BUER'] = (got[h % 2 ? 'HOTE' : 'BUER'] || 0) + 1; h++; }
      let b = 0; for (const l of lots.filter(l => !l.used && pudong(l)).sort(() => d.rand() - 0.5)) if (b < 16 && L.put(d, l, 'BUER')) b++;
      got.BUER = (got.BUER || 0) + b;
    },
    leer: 44, nearKinds: { HOTE: 4 }, commerce: { UNIV: 0, HOTE: 4, KAUF: 8, CLUB: 8, FZZ: 3, FABR: 4, EKZ: 1 },
    wohn: 238, bigShare: l => pudong(l) ? 1 : 0.6, mixCap: 18, mix: ['BUER', 'KAUF', 'CLUB', 'HOTE'],
  });
};
