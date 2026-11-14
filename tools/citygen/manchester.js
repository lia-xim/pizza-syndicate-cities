// Manchester: Industriestadt am Schiffskanal.
// - Manchester Ship Canal windet sich durch den Süden und endet in den Hafenbecken von Salford Quays
//   (Piers mit Lagerhallen, Hafen und Schiffen); Straßen queren den Kanal auf Dämmen
// - Zwei Stadionviertel mit Kneipenstraßen: Old Trafford im Westen am Kanal, Etihad im Osten
// - Innenstadt mit Rathaus (Uhrturm), Piccadilly Gardens, Northern Quarter voller Clubs, Ring (Mancunian Way)
// - Reihenhausviertel: lange, enge Straßen mit Häuserzeilen, in zwei Richtungen; Universität im Süden; Heaton Park
'use strict';
const O = require('./organic');
const L = require('./layout');
const { T, K } = require('./generate');

module.exports = function manchester(d) {
  const nz = O.noise(d, 8);
  // ---- Wasser: Kanal und Hafenbecken ----
  O.carve(d, [[-0.03, 0.6], [0.12, 0.64], [0.25, 0.58], [0.38, 0.64], [0.5, 0.62], [0.58, 0.7]], 1.3, 'W');
  d.rect(80, -27, 101, -2, 'W');                      // Hafenbecken
  d.rect(85, -23, 101, -16, 'S'); d.rect(85, -12, 101, -6, 'S');   // zwei Piers
  O.tidy(d, { minLand: 30 });
  const WATER = new Set([...d.cls].filter(([, c]) => c === 'W').map(([k]) => k));
  // ---- Grün ----
  const blob = (x0, y0, rx, ry) => O.paint(d, (x, y, p, q) => d.get(p, q) === 'S' && ((x - x0) / rx) ** 2 + ((y - y0) / ry) ** 2 + (nz(p, q) - 0.5) * 0.5 < 1 ? 'P' : null);
  blob(0.13, 0.16, 0.07, 0.09);   // Heaton Park
  blob(0.56, 0.43, 0.025, 0.04);  // Piccadilly Gardens

  // ---- Plätze ----
  const plazas = [
    { rect: O.rectAt(0.46, 0.38, 3), landmark: 'S_LON1' },
    { rect: O.rectAt(0.3, 0.77, 6), center: 'STAD', leer: 3, extras: ['CLUB', 'CLUB', 'FZZ'], mix: ['CLUB', 'KAUF', 'FZZ', 'CLUB'] },
    { rect: O.rectAt(0.8, 0.3, 6), center: 'STAD', leer: 3, extras: ['CLUB', 'CLUB', 'FZZ'], mix: ['CLUB', 'KAUF', 'FZZ', 'CLUB'] },
    { rect: O.rectAt(0.66, 0.55, 4), center: 'UNIV', leer: 2, extras: ['FZZ', 'KAUF'] },
    { rect: O.rectAt(0.58, 0.27, 4), center: 'CLUB', leer: 3, extras: ['CLUB', 'FZZ', 'KAUF'], mix: ['CLUB', 'KAUF', 'CLUB'] },
  ];
  for (const pl of plazas) d.rect(...pl.rect, 'S');

  // ---- Straßen: Viertel mit eigenem Straßenmuster ----
  const blocked = L.nearWater(d);
  const CENTER = [42, -8, 70, 20], TERR_N = [24, 22, 62, 52], TERR_W = [14, -36, 44, -12], TERR_E = [74, 4, 104, 30];
  const zones = [CENTER, TERR_N, TERR_W, TERR_E];
  const parkRects = [O.rectAt(0.13, 0.16, 9), O.rectAt(0.56, 0.43, 4)];
  const res = [...plazas.map(p => p.rect), ...parkRects];
  const grids = [
    L.irregularGrid(d, { pFrom: CENTER[0], pTo: CENTER[2], qFrom: CENTER[1], qTo: CENTER[3], gap: [8, 10], drop: 0.1, reserved: res, blocked }),
    L.irregularGrid(d, { pFrom: TERR_N[0], pTo: TERR_N[2], qFrom: TERR_N[1], qTo: TERR_N[3], gapP: [16, 22], gapQ: [6, 7], drop: 0.05, reserved: res, blocked }),
    L.irregularGrid(d, { pFrom: TERR_W[0], pTo: TERR_W[2], qFrom: TERR_W[1], qTo: TERR_W[3], gapP: [6, 7], gapQ: [16, 22], drop: 0.05, reserved: res, blocked }),
    L.irregularGrid(d, { pFrom: TERR_E[0], pTo: TERR_E[2], qFrom: TERR_E[1], qTo: TERR_E[3], gapP: [6, 7], gapQ: [16, 20], drop: 0.05, reserved: res, blocked }),
    L.irregularGrid(d, { pFrom: -4, pTo: 130, qFrom: -66, qTo: 66, gap: [11, 15], drop: 0.15, reserved: [...res, ...zones.map(([a, b, c, e]) => [a + 1, b + 1, c - 1, e - 1])], blocked }),
  ];
  // Mancunian Way: Ring um die Innenstadt
  const ring = []; for (let i = 0; i <= 8; i++) { const a = i / 8 * 2 * Math.PI + 0.3; ring.push([0.5 + 0.17 * Math.cos(a), 0.4 + 0.2 * Math.sin(a)]); }
  O.route(d, ring);
  // Dämme über den Kanal und Straßen auf die Piers
  const bridges = [O.bridge(d, 'Q', 50, -32, -22), O.bridge(d, 'Q', 66, -20, -8)];
  for (const q of [-20, -10]) { L.segP(d, q, 62, 97); bridges.push([62, q - 1, 98, q + 2]); }
  O.finishRoads(d, plazas.map(p => p.rect), { dropped: grids.flatMap(g => g.dropped), clip: WATER, clipZone: true, bridges });
  L.quayify(d);
  d.stegEvery = 10;
  // Hafen und Schiffe in den Becken
  d.harbors = O.autoHarbors(d, 2, 10, (p, q) => p > 70 && q < 0);
  for (const [p, q] of [[90, -25], [96, -14], [92, -4]]) if (d.get(p, q) === 'W') d.object(p, q, d.rand() < 0.5 ? T.objects.SHIP1 : T.objects.SHIP2);

  const dw = O.distanceTo(d, ['W', 'L', 'U']);
  const stadia = plazas.filter(p => p.center === 'STAD').map(p => [(p.rect[0] + p.rect[2]) / 2, (p.rect[1] + p.rect[3]) / 2]);
  return O.furnish(d, {
    plazas, gardens: 4,
    special: (d, lots, near, got) => {
      // Kneipenstraßen rund um beide Stadien
      for (const [sp, sq] of stadia) { let n = 0; for (const l of lots.filter(l => !l.used && Math.abs(l.p - sp) + Math.abs(l.q - sq) <= 16).sort(() => d.rand() - 0.5)) if (n < 7 && L.put(d, l, 'CLUB')) n++; got.CLUB = (got.CLUB || 0) + n; }
      // Lagerhallen und Fabriken am Kanal und auf den Piers
      let f = 0; for (const l of lots.filter(l => !l.used && dw(l.p, l.q) <= 4).sort(() => d.rand() - 0.5)) if (f < 9 && L.put(d, l, 'FABR')) f++;
      got.FABR = (got.FABR || 0) + f;
    },
    leer: 36, nearKinds: {}, commerce: { CLUB: 10, KAUF: 8, BUER: 6, HOTE: 4, FZZ: 2, EKZ: 1, UNIV: 0 },
    wohn: 225, bigShare: 0.4, mixCap: 18, mix: ['CLUB', 'KAUF', 'BUER', 'HOTE'],
  });
};
