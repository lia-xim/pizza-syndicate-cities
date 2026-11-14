// Neapel: Stadt am halbmondförmigen Golf, ohne Straßenraster.
// - Wenige prägende Hauptstraßen: Spaccanapoli schnurgerade quer über die Stadt, Via Toledo senkrecht hinunter zum Hafen,
//   Corso Vittorio Emanuele in Serpentinen am Vomero, Uferstraße (Via Caracciolo) entlang der Bucht
// - Dazwischen dichte Fußgängerviertel (Vicoli), in denen Haus an Haus steht
// - Castel dell'Ovo: Felseninsel in der Bucht mit Festung, über einen Damm erreichbar
// - Villa Comunale: Grünstreifen am Ufer; Vomero mit großem Park; Häfen mit Schiffen
// - Piazza del Plebiscito mit Wahrzeichen, Stadion in Fuorigrotta, Universität am Vomero, Einkaufszentrum im Osten
'use strict';
const O = require('./organic');

module.exports = function neapel(d) {
  const nz = O.noise(d, 9), nz2 = O.noise(d, 5);
  // ---- Land und Wasser ----
  O.paint(d, (x, y, p, q) => (((x - 0.98) / 0.53) ** 2 + ((y - 1.1) / 0.5) ** 2 + (nz(p, q) - 0.5) * 0.3 < 1 ? 'W' : 'S'));
  O.carve(d, [[0.69, 0.865], [0.73, 0.9]], 4.6, 'S', ['W']);          // Castel dell'Ovo
  O.carve(d, [[0.46, 0.9], [0.49, 0.95]], 2.0, 'W');                  // Mergellina-Bucht
  // Vomero-Park (Villa Floridiana) als grüner Hügel oben links
  O.paint(d, (x, y, p, q) => (((x - 0.12) / 0.08) ** 2 + ((y - 0.3) / 0.12) ** 2 + (nz2(p, q) - 0.5) * 0.6 < 1 ? 'P' : null));
  O.tidy(d, { minLand: 25 });

  // ---- Plätze ----
  const PLEBISCITO = O.rectAt(0.52, 0.6, 4), STADION = O.rectAt(0.16, 0.66, 6), UNI = O.rectAt(0.27, 0.15, 5), EKZ = O.rectAt(0.84, 0.24, 5), GARIBALDI = O.rectAt(0.72, 0.4, 4);
  const plazas = [
    { rect: PLEBISCITO, landmark: 'S_ROM1' },
    { rect: STADION, center: 'STAD', leer: 3, extras: ['CLUB', 'FZZ', 'KAUF'] },
    { rect: UNI, center: 'UNIV', leer: 2, extras: ['FZZ', 'CLUB'] },
    { rect: EKZ, center: 'EKZ', leer: 3, extras: ['BUER', 'HOTE', 'KAUF'] },
    { rect: GARIBALDI, center: 'FZZ', leer: 3, extras: ['CLUB', 'KAUF', 'HOTE'], mix: ['KAUF', 'CLUB', 'HOTE'] },
  ];
  for (const pl of plazas) d.rect(...pl.rect, 'S');

  // ---- Hauptstraßen als Netz: Knoten (Bildschirm) und Verbindungen, je Verbindung zwei lange gerade Stücke ----
  const N = {
    A: [0.0, 0.47], B: [0.22, 0.47], C: [0.42, 0.45], D: [0.66, 0.44], E: [1.0, 0.36],     // Spaccanapoli und Corso Garibaldi
    F: [0.42, 0.02], R: [0.42, 0.24], G: [0.42, 0.66],                                      // Via Toledo
    H: [0.72, 0.02], T: [0.72, 0.2], S: [1.0, 0.14],                                        // Via Foria, Capodimonte
    Q0: [0.0, 0.22], Q1: [0.14, 0.15], Q2: [0.28, 0.26],                                    // Corso Vittorio Emanuele
    J: [0.3, 0.8], K: [0.55, 0.68], M: [0.8, 0.5], P: [0.0, 0.76], NN: [0.22, 1.0],         // Ufer, Fuorigrotta
    KC: [0.56, 0.77], CO: [0.69, 0.86],                                                     // Damm zum Castel dell'Ovo
  };
  const EDGES = ['A-B', 'B-C', 'C-D', 'D-E', 'F-R', 'R-C', 'C-G', 'G-K', 'J-K', 'K-M', 'M-E', 'H-T', 'T-D', 'R-T', 'T-S', 'B-NN', 'P-J', 'Q0-Q1', 'Q1-Q2', 'Q2-R', 'K-KC', 'KC-CO'];
  for (const e of EDGES) { const [a, b] = e.split('-'); O.route(d, [N[a], N[b]]); }
  O.finishRoads(d, plazas.map(p => p.rect));

  L.quayify(d);
  d.stegEvery = 0;
  // Villa Comunale: Grünstreifen am Ufer zwischen Straße und Wasser
  const dw = O.distanceTo(d, ['W', 'L', 'U']);
  for (const [p, q] of O.cells(d)) { const [x, y] = O.PQ2S(p, q); if (d.get(p, q) === 'S' && x > 0.45 && x < 0.9 && y < 0.8 && dw(p, q) >= 1 && dw(p, q) <= 2 && ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => d.get(p + a, q + b) === 'R')) d.set(p, q, 'P'); }
  d.harbors = O.autoHarbors(d, 3, 14);

  return O.furnish(d, {
    plazas, landmarks: [['S_LIS1', 0.71, 0.88], ['S_ZNA2', 0.6, 0.66]], gardens: 6,   // Castel Nuovo (eigene Grafik) am Hafen
    special: (d, lots, near, got, taken) => {
      // Ladenstraßen: Spaccanapoli und Via Toledo
      const onAxis = l => { const [x, y] = O.PQ2S(l.p, l.q); return Math.abs(y - (0.47 - 0.045 * x)) < 0.035 || Math.abs(x - 0.42) < 0.03; };
      let n = 0; for (const l of near.filter(onAxis).sort(() => d.rand() - 0.5)) if (n < 14 && taken.every(t => L.dist(t, l) >= 6) && L.put(d, l, 'LEER')) { taken.push(l); n++; }
      got.LEER = (got.LEER || 0) + n;
    },
    leer: 34, nearKinds: { HOTE: 4 }, commerce: { HOTE: 3, KAUF: 10, CLUB: 10, BUER: 6, FZZ: 3, FABR: 2 },
    wohn: 238, bigShare: 0.55, mixCap: 20, mix: ['KAUF', 'CLUB', 'BUER', 'HOTE', 'FZZ'],
  });
};
const L = require('./layout');
