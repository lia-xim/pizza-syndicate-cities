// Düsseldorf: der Rhein schwingt in einem großen Bogen von Süden nach Norden durch die Stadt.
// - Ostufer: die Altstadt am Rhein als dichtes Fußgängerviertel voller Kneipen ("längste Theke der Welt"),
//   St. Lambertus am Burgplatz, nebenan die Königsallee mit dem Kö-Graben, Läden und Hotels auf beiden Seiten,
//   der Hofgarten, das Einkaufszentrum am Kö-Bogen
// - Süden: Rheinturm am Ufer, dahinter der Medienhafen mit Hafenbecken und Bürotürmen, die Universität
// - Südosten: Eller als eigenes Wohnviertel mit Stadtteilzentrum und dem Park am Schloss Eller
// - Westufer: Oberkassel mit Altbauten und Rheinwiesen; drei Brücken über den Rhein; Arena im Norden
'use strict';
const O = require('./organic');
const L = require('./layout');
const { T, K } = require('./generate');


module.exports = function duesseldorf(d) {
  const nz = O.noise(d, 8);
  // ---- Wasser: Rhein, Kö-Graben, Hafenbecken im Medienhafen ----
  O.carve(d, [[0.21, -0.03], [0.14, 0.15], [0.19, 0.31], [0.31, 0.45], [0.33, 0.6], [0.28, 0.78], [0.31, 1.03]], 2.7, 'W');
  d.rect(60, 6, 73, 7, 'W');                                   // Kö-Graben (entlang der Königsallee)
  d.rect(62, -28, 77, -26, 'W'); d.rect(62, -37, 75, -35, 'W'); // zwei Hafenbecken
  O.tidy(d, { minLand: 25, keepRects: [[59, 5, 74, 8]] });
  const WATER = new Set([...d.cls].filter(([, c]) => c === 'W').map(([k]) => k));
  // ---- Grün ----
  const blob = (x0, y0, rx, ry) => O.paint(d, (x, y, p, q) => d.get(p, q) === 'S' && ((x - x0) / rx) ** 2 + ((y - y0) / ry) ** 2 + (nz(p, q) - 0.5) * 0.5 < 1 ? 'P' : null);
  blob(0.47, 0.33, 0.04, 0.05);   // Hofgarten
  blob(0.9, 0.88, 0.04, 0.06);    // Schlosspark Eller
  blob(0.58, 0.76, 0.025, 0.04);  // Volksgarten

  // ---- Plätze ----
  const ALTSTADT = [50, -12, 63, 0], KOE = [58, 1, 75, 12], HAFEN = [60, -40, 80, -22];
  const plazas = [
    { rect: O.rectAt(0.37, 0.68, 2), landmark: 'S_ZDU2' },                                                     // Rheinturm (eigene Grafik)
    { rect: O.rectAt(0.4, 0.46, 3), landmark: 'S_MUN1' },                                                       // Burgplatz mit St. Lambertus
    { rect: O.rectAt(0.45, 0.08, 6), center: 'STAD', leer: 3, extras: ['CLUB', 'FZZ', 'KAUF'] },                // Arena
    { rect: O.rectAt(0.62, 0.9, 5), center: 'UNIV', leer: 2, extras: ['FZZ', 'CLUB'] },                         // Heinrich-Heine-Uni
    { rect: O.rectAt(0.56, 0.36, 4), center: 'EKZ', leer: 3, extras: ['HOTE', 'KAUF', 'BUER'] },                // Kö-Bogen
    { rect: O.rectAt(0.83, 0.73, 3), center: 'FZZ', leer: 3, extras: ['KAUF', 'CLUB', 'KAUF'], mix: ['KAUF', 'FZZ', 'CLUB'] }, // Eller Mitte (Gumbertstraße)
  ];
  for (const pl of plazas) d.rect(...pl.rect, 'S');

  // ---- Straßen ----
  const blocked = L.nearWater(d);
  const ELLER = [74, -14, 108, 14], OBERKASSEL = [16, -26, 46, -6];
  const res = [...plazas.map(p => p.rect), ALTSTADT, KOE, O.rectAt(0.47, 0.33, 7), O.rectAt(0.9, 0.88, 7)];
  const grids = [
    L.irregularGrid(d, { pFrom: ELLER[0], pTo: ELLER[2], qFrom: ELLER[1], qTo: ELLER[3], gap: [7, 9], drop: 0.08, reserved: res, blocked }),
    L.irregularGrid(d, { pFrom: OBERKASSEL[0], pTo: OBERKASSEL[2], qFrom: OBERKASSEL[1], qTo: OBERKASSEL[3], gap: [8, 10], drop: 0.08, reserved: res, blocked }),
    L.irregularGrid(d, { pFrom: -4, pTo: 130, qFrom: -66, qTo: 66, gap: [11, 15], drop: 0.15, reserved: [...res, ...[ELLER, OBERKASSEL].map(([a, b, c, e]) => [a + 1, b + 1, c - 1, e - 1])], blocked }),
  ];
  // Königsallee: Straßen beiderseits des Kö-Grabens; Ringstraßen um die Altstadt
  L.segP(d, 2, 58, 76); L.segP(d, 10, 58, 76);
  L.segP(d, -14, 48, 67);
  // Drei Rheinbrücken: Theodor-Heuss (Norden), Oberkasseler Brücke, Rheinkniebrücke (am Landtag)
  const bridges = [O.bridge(d, 'Q', 23, -10, 5), O.bridge(d, 'Q', 46, -15, -2), O.bridge(d, 'P', -17, 52, 67)];
  // Medienhafen: Straße auf dem Pier zwischen den Becken
  L.segP(d, -31, 71, 80); bridges.push([71, -32, 81, -29]);
  O.finishRoads(d, plazas.map(p => p.rect), { dropped: grids.flatMap(g => g.dropped), clip: WATER, clipZone: true, bridges });
  L.quayify(d);
  d.stegEvery = 0;
  // Rheinwiesen in Oberkassel und Rheinuferpromenade an der Altstadt: Grünstreifen am Wasser
  const dw = O.distanceTo(d, ['W', 'L', 'U']);
  for (const [p, q] of O.cells(d)) {
    const [x, y] = O.PQ2S(p, q); if (d.get(p, q) !== 'S' || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => d.get(p + a, q + b) === 'R')) continue;
    if ((x < 0.3 && y > 0.3 && y < 0.7 && dw(p, q) <= 2) || (x > 0.3 && y > 0.36 && y < 0.6 && dw(p, q) === 1 && !O.inRect(p, q, KOE))) d.set(p, q, 'P');
  }
  d.harbors = O.autoHarbors(d, 2, 8, (p, q) => O.inRect(p, q, HAFEN, 2));

  const inR = r => l => O.inRect(l.p, l.q, r);
  const got = O.furnish(d, {
    // Zwei Altbier-Brauhäuser (eigene Grafiken) als Sondergebäude mitten in der Altstadt
    plazas, gardens: 5, landmarks: [['S_ZDU3', 0.41, 0.5], ['S_ZDU4', 0.45, 0.45]],
    special: (d, lots, near, got, taken) => {
      const add = (k, n = 1) => { got[k] = (got[k] || 0) + n; };
      // Altstadt: Kneipe an Kneipe, dazwischen freie Ladenlokale und Geschäfte
      let n = 0; for (const l of lots.filter(l => !l.used && inR(ALTSTADT)(l)).sort(() => d.rand() - 0.5)) {
        const k = n % 4 === 1 ? 'LEER' : n % 4 === 3 ? 'KAUF' : 'CLUB';
        if (k === 'LEER' && !taken.every(t => L.dist(t, l) >= 5)) continue;
        if (n < 26 && L.put(d, l, k)) { add(k); if (k === 'LEER') taken.push(l); n++; }
      }
      // Königsallee: Läden und Hotels zu beiden Seiten des Grabens
      let k2 = 0; for (const l of lots.filter(l => !l.used && inR(KOE)(l))) if (k2 < 14 && L.put(d, l, k2 % 3 === 2 ? 'HOTE' : 'KAUF')) { add(k2 % 3 === 2 ? 'HOTE' : 'KAUF'); k2++; }
      // Medienhafen: Bürotürme an den Becken
      let b = 0; for (const l of lots.filter(l => !l.used && inR(HAFEN)(l)).sort(() => d.rand() - 0.5)) if (b < 10 && L.put(d, l, 'BUER')) b++;
      add('BUER', b);
    },
    leer: 36, nearKinds: { HOTE: 3 }, commerce: { CLUB: 6, KAUF: 6, BUER: 6, HOTE: 3, FZZ: 3, FABR: 2, EKZ: 0, UNIV: 0 },
    wohn: 215, bigShare: l => O.inRect(l.p, l.q, ELLER) ? 0.25 : 0.5, mixCap: 18, mix: ['KAUF', 'CLUB', 'BUER', 'HOTE'],
  });
  return got;
};
