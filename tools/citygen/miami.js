// Miami: Festland mit Straßengitter (Little Havana, Downtown, Brickell), davor die Biscayne Bay mit den kleinen
// Venetian Islands und der Hafeninsel (Kreuzfahrtschiffe), drei Dämme hinüber nach Miami Beach.
// Miami Beach: schmale Insel mit Collins Avenue, Ocean Drive, Hotelreihe, Lummus Park und Sandstrand am Atlantik.
'use strict';
const O = require('./organic');
const L = require('./layout');
const { T, K } = require('./generate');

module.exports = function miami(d) {
  const nz = O.noise(d, 9);
  const wave = (k, q, a) => Math.round((nz(k, q) - 0.5) * a);
  // Grenzen entlang p, abhängig von q (gewellt): Festlandufer, Inselwestufer, Strand, Ozean
  const COAST = q => 70 + wave(0, q, 6), ISLAND = q => 88 + wave(30, q, 3), BEACH = q => 103 + wave(60, q, 2), OCEAN = q => BEACH(q) + 4;
  O.paint(d, (x, y, p, q) => p >= OCEAN(q) ? 'W' : p >= BEACH(q) ? 'N' : p >= ISLAND(q) ? 'S' : p >= COAST(q) ? 'W' : 'S');
  // Hafeninsel (Dodge Island) und die Kette der Venetian Islands in der Bucht
  O.carve(d, [[0.57, 0.66], [0.62, 0.72]], 3.2, 'S', ['W']);
  for (const p of [76, 81]) d.rect(p - 1, 7, p + 1, 13, 'S');
  // Nordspitze von Miami Beach mit Lagune
  O.tidy(d, { minLand: 20 });

  // ---- Plätze ----
  const STADION = O.rectAt(0.18, 0.6, 6), BAYSIDE = O.rectAt(0.5, 0.48, 4), CIVIC = O.rectAt(0.26, 0.25, 4), ARTDECO = O.rectAt(0.82, 0.62, 3);
  const plazas = [
    { rect: STADION, center: 'STAD', leer: 3, extras: ['CLUB', 'FZZ', 'KAUF'] },
    { rect: BAYSIDE, center: 'EKZ', leer: 4, extras: ['HOTE', 'CLUB', 'KAUF'], mix: ['KAUF', 'CLUB', 'HOTE'] },
    { rect: CIVIC, center: 'UNIV', leer: 2, extras: ['FZZ', 'KAUF'] },
    { rect: ARTDECO, landmark: 'S_LAS1' },
  ];
  for (const pl of plazas) d.rect(...pl.rect, 'S');

  // ---- Straßen ----
  // Festland: Gitter mit unregelmäßigen Abständen, Biscayne Boulevard am Ufer
  const blocked = L.nearWater(d);
  L.irregularGrid(d, { pFrom: -2, pTo: 64, qFrom: -66, qTo: 66, gap: [11, 15], drop: 0.22, reserved: plazas.map(p => p.rect), blocked });
  L.segQ(d, 64, -60, 60);
  // Dämme über die Bucht: MacArthur über die Hafeninsel, Venetian Causeway über die Inseln
  L.segP(d, -8, 60, 100);
  L.segP(d, 9, 60, 100);
  // Miami Beach: Collins Avenue, Ocean Drive, Querstraßen
  L.segQ(d, 92, -22, 26); L.segQ(d, 98, -20, 22);
  for (const q of [-17, 0, 16]) L.segP(d, q, 88, 99);
  L.fixDams(d);
  O.finishRoads(d, plazas.map(p => p.rect));
  L.quayify(d);
  d.stegEvery = 0;

  // Lummus Park: Grünstreifen zwischen Ocean Drive und Strand
  for (const [p, q] of O.cells(d)) if (d.get(p, q) === 'S' && p > 99 && d.get(p + 1, q) !== 'R' && [1, 2, 3].some(o => d.get(p + o, q) === 'N')) d.set(p, q, 'P');
  // Kreuzfahrtschiffe am Hafen und vor der Küste
  d.harbors = O.autoHarbors(d, 2, 8, (p, q) => q < -10 && p > 70);
  for (const [x, y] of [[0.66, 0.74], [0.62, 0.79], [0.97, 0.58], [0.93, 0.72]]) { const [p, q] = O.S2PQ(x, y); if (d.get(p, q) === 'W') d.object(p, q, d.rand() < 0.5 ? T.objects.SHIP1 : T.objects.SHIP2); }

  const onBeach = l => l.p >= 88;
  const downtown = l => { const [x, y] = O.PQ2S(l.p, l.q); return x > 0.35 && x < 0.62 && y > 0.3 && y < 0.65; };
  return O.furnish(d, {
    plazas, landmarks: [['S_LOS1', 0.35, 0.18], ['S_ZMI2', 0.84, 0.5]], gardens: 4,   // Art-déco-Hotel am Ocean Drive (eigene Grafik)
    special: (d, lots, near, got) => {
      // Hotelmeile: Hotels in den Reihen an Collins Avenue und Ocean Drive
      let n = 0; for (const l of lots.filter(l => !l.used && onBeach(l)).sort(() => d.rand() - 0.5)) if (n < 18 && L.put(d, l, 'HOTE')) n++;
      got.HOTE = (got.HOTE || 0) + n;
      // Downtown und Brickell: Bürotürme
      let b = 0; for (const l of near.filter(l => !l.used && downtown(l)).sort(() => d.rand() - 0.5)) if (b < 12 && L.put(d, l, 'BUER')) b++;
      got.BUER = (got.BUER || 0) + b;
    },
    leer: 32, nearKinds: {}, commerce: { CLUB: 12, KAUF: 8, FZZ: 3, EKZ: 1, FABR: 2 },
    wohn: 200, bigShare: l => downtown(l) ? 1 : 0.35, mixCap: 16, mix: ['KAUF', 'CLUB', 'BUER', 'HOTE'],
  });
};
