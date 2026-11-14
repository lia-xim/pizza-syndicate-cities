// Gizeh: Großstadt zwischen Wüste und Nil.
// - Westen: kleine Wüstenbucht mit den drei Pyramiden und der Sphinx, oben und unten von Stadtvierteln eingefasst;
//   davor Nazlet el-Samman, die Touristen-Altstadt aus Gassen voller Souvenirläden, Imbisse und kleiner Hotels; am Wüstenrand der Pyramidenplatz mit Hotels und Souvenirläden
// - Pyramidenstraße (Sharia al-Haram): lange gerade Achse vom Pyramidenplatz quer durch die Stadt zum Nil
// - Mitte: dichte Kastenstadt aus engen Blöcken; Imbaba im Norden noch enger und unregelmäßiger, Dokki lockerer
// - Kastenparks: rechteckige Gärten in den Blöcken, Zoo und Orman-Garten an der Universität
// - Osten: der Nil mit Uferpromenade (Corniche), Hotels am Ufer und der Insel Gezira mit dem Kairoer Fernsehturm
// - Zwei Moscheen: osmanisch mit Bleistift-Minaretten in der Stadtmitte, mamlukisch mit gestreiften Mauern an der Altstadt
'use strict';
const O = require('./organic');
const L = require('./layout');
const { T, K } = require('./generate');

module.exports = function gizeh(d) {
  const nz = O.noise(d, 7), nz2 = O.noise(d, 13);
  // ---- Wüste und Nil ----
  // Wüste als Bucht am linken Rand rund um die Pyramiden; oben links und unten links reicht die Stadt bis an den Rand
  O.paint(d, (x, y, p, q) => (((x - 0.0) / 0.16) ** 2 + ((y - 0.56) / 0.19) ** 2 + (nz(p, q) - 0.5) * 0.45 < 1 ? 'N' : null));
  // Der Nil füllt den rechten Rand; das Ostufer (Kairo) liegt jenseits der Karte
  O.paint(d, (x, y, p, q) => (x > 0.835 + 0.02 * Math.sin(y * 6) + (nz2(p, q) - 0.5) * 0.03 ? 'W' : null));
  O.carve(d, [[0.875, 0.3], [0.885, 0.56]], 2.6, 'P', ['W']);       // Nilinsel Gezira mit Park und Kairoer Fernsehturm
  O.tidy(d, { minLand: 25 });
  const WATER = new Set([...d.cls].filter(([, c]) => c === 'W').map(([k]) => k));

  // ---- Pyramiden und Sphinx im Sand ----
  d.landmarkGround = ['S', 'P', 'N'];
  {
    const [pc, qc] = O.S2PQ(0.065, 0.56); let ok = false;
    const cand = O.cells(d).filter(([p, q]) => d.get(p, q) === 'N').sort((u, v) => Math.hypot(u[0] - pc, u[1] - qc) - Math.hypot(v[0] - pc, v[1] - qc));
    for (const [p, q] of cand) if (d.landmark('S_KAI1', p, q)) { ok = true; break; }
    if (!ok) throw new Error('Kein Platz für die Pyramiden');
  }
  // Kairoer Fernsehturm (eigene Grafik) im Park der Nilinsel Gezira
  {
    const [pc, qc] = O.S2PQ(0.875, 0.43); let ok = false;   // die Kamera scrollt nur bis etwa 91 % der Kartenbreite
    const cand = O.cells(d).filter(([p, q]) => d.get(p, q) === 'P').sort((u, v) => Math.hypot(u[0] - pc, u[1] - qc) - Math.hypot(v[0] - pc, v[1] - qc));
    for (const [p, q] of cand) if (d.landmark('S_ZGI2', p, q)) { ok = true; break; }
    if (!ok) throw new Error('Kein Platz für den Kairoer Fernsehturm');
  }

  // ---- Kastenparks vor dem Straßenbau: Zoo und Orman-Garten ----
  const ZOO = [61, 9, 68, 17], ORMAN = [66, -6, 71, 0];
  d.rect(...ZOO, 'P'); d.rect(...ORMAN, 'P');

  // ---- Plätze ----
  const PYR = O.rectAt(0.2, 0.6, 3);
  // Nazlet el-Samman: Touristen-Altstadt am Fuß der Pyramiden, nur Gassen (keine Autostraßen außer der Pyramidenstraße)
  const NAZLET = [36, -32, 62, -8];
  const plazas = [
    { rect: PYR, center: 'HOTE', leer: 3, extras: ['KAUF', 'CLUB', 'FZZ', 'KAUF'], mix: ['KAUF', 'FZZ', 'CLUB'] },   // Pyramidenplatz
    { rect: O.rectAt(0.56, 0.52, 5), center: 'UNIV', leer: 2, extras: ['FZZ', 'CLUB'] },                             // Universität Kairo
    { rect: O.rectAt(0.47, 0.86, 6), center: 'STAD', leer: 3, extras: ['CLUB', 'FZZ', 'KAUF'] },                     // Stadion
    { rect: O.rectAt(0.72, 0.28, 4), center: 'EKZ', leer: 3, extras: ['BUER', 'HOTE', 'KAUF'] },                      // Einkaufszentrum in Dokki
    { rect: O.rectAt(0.66, 0.72, 3), center: 'FZZ', leer: 3, extras: ['KAUF', 'KAUF', 'CLUB'], mix: ['KAUF', 'FZZ', 'CLUB'] }, // Souk
  ];
  for (const pl of plazas) d.rect(...pl.rect, 'S');

  // ---- Straßen: Viertel mit eigener Blockgröße ----
  const blocked = L.nearWater(d);
  // Pyramidenstraße: eine schnurgerade Achse vom Pyramidenplatz quer durch die Stadt Richtung Nil (vor dem Raster gezeichnet,
  // damit das Raster daneben keine Parallelstraße legt)
  { const [hp, hq] = O.S2PQ(0.23, 0.6); let qe = hq; while (qe < 66 && !blocked(hp, qe + 3) && !blocked(hp + 1, qe + 3)) qe++; L.segQ(d, hp, hq, qe); }
  const IMBABA = [22, 8, 62, 46], HARAM = [62, -40, 106, 4], DOKKI = [64, 10, 96, 40];
  const res = [...plazas.map(p => p.rect), ZOO, ORMAN, NAZLET];
  const grids = [
    L.irregularGrid(d, { pFrom: IMBABA[0], pTo: IMBABA[2], qFrom: IMBABA[1], qTo: IMBABA[3], gap: [16, 20], drop: 0.3, reserved: res, blocked }),
    L.irregularGrid(d, { pFrom: HARAM[0], pTo: HARAM[2], qFrom: HARAM[1], qTo: HARAM[3], gap: [13, 15], drop: 0.12, reserved: res, blocked }),
    L.irregularGrid(d, { pFrom: DOKKI[0], pTo: DOKKI[2], qFrom: DOKKI[1], qTo: DOKKI[3], gap: [12, 14], drop: 0.08, reserved: res, blocked }),
    L.irregularGrid(d, { pFrom: -4, pTo: 130, qFrom: -66, qTo: 66, gap: [12, 15], drop: 0.15, blocked,
      reserved: [...res, ...[IMBABA, HARAM, DOKKI].map(([a, b, c, e]) => [a + 1, b + 1, c - 1, e - 1])] }),
  ];
  O.finishRoads(d, plazas.map(p => p.rect), { dropped: grids.flatMap(g => g.dropped), clip: WATER, clipZone: true });
  L.quayify(d);
  d.stegEvery = 0;

  // Corniche: Grünstreifen zwischen Uferstraße und Nil
  const dw = O.distanceTo(d, ['W', 'L', 'U']);
  for (const [p, q] of O.cells(d)) if (d.get(p, q) === 'S' && dw(p, q) <= 2 && O.PQ2S(p, q)[0] > 0.7 && ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => d.get(p + a, q + b) === 'R')) d.set(p, q, 'P');
  // Sandverwehungen: Am Wüstenrand läuft der Sand fleckig in die Blöcke und bis an die Straßen hinein, nach außen immer dünner
  {
    const nzs = O.noise(d, 4), dn = O.distanceTo(d, ['N']); const sand = [];
    for (const [p, q] of O.cells(d)) {
      if (d.get(p, q) !== 'S' || plazas.some(pl => O.inRect(p, q, pl.rect, 1))) continue;
      const t = dn(p, q); if (t > 20) continue;
      const atRoad = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => d.get(p + a, q + b) === 'R');
      if (nzs(p, q) > (atRoad ? 0.42 : 0.24) + t * 0.032 + (O.inRect(p, q, NAZLET) ? 0.18 : 0)) sand.push([p, q]);
    }
    for (const [p, q] of sand) d.set(p, q, 'N');
  }
  // Weitere Kastenparks: rechteckige Gärten in einigen Blöcken (Rand bleibt Gehweg)
  const parks = L.regions(d).filter(r => r.size >= 30 && r.size <= 80 && !plazas.some(pl => O.inRect(Math.round(r.pc), Math.round(r.qc), pl.rect, 2)) && O.PQ2S(r.pc, r.qc)[0] > 0.34);
  const chosen = [];
  for (const r of parks.sort(() => d.rand() - 0.5)) {
    if (chosen.length >= 6 || chosen.some(c => Math.hypot(c.pc - r.pc, c.qc - r.qc) < 18)) continue;
    const cells = [...r.cells].map(k => k.split(',').map(Number)).filter(([p, q]) => [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].every(([a, b]) => d.get(p + a, q + b) === 'S' || d.get(p + a, q + b) === 'P'));
    if (cells.length < 12) continue;
    for (const [p, q] of cells) d.set(p, q, 'P'); chosen.push(r);
  }

  const nile = l => O.PQ2S(l.p, l.q)[0] > 0.74;
  const inNazlet = l => O.inRect(l.p, l.q, NAZLET);
  // Moscheen mit freiem Vorplatz (sonst verdecken die Häuser davor sie): Feld vor dem Eingang unten bleibt unbebaut
  for (const [name, x, y] of [['S_ZGI3', 0.6, 0.36], ['S_ZGI4', 0.29, 0.47]]) {
    const [pc, qc] = O.S2PQ(x, y); let at = null;
    const cand = O.cells(d).filter(([p, q]) => d.get(p, q) === 'S').sort((u, v) => Math.hypot(u[0] - pc, u[1] - qc) - Math.hypot(v[0] - pc, v[1] - qc)).slice(0, 600);
    for (const [p, q] of cand) {
      // Vorplatz 4 x 4 Felder vor der Moschee muss Gehweg sein
      let free = true; for (let a = 1; a <= 4 && free; a++) for (let b = -4; b <= -1; b++) if (d.get(p + a, q + b) !== 'S') { free = false; break; }
      if (free && d.landmark(name, p, q)) { at = [p, q]; break; }
    }
    if (!at) throw new Error('Kein Platz für ' + name);
    for (let a = 1; a <= 4; a++) for (let b = -4; b <= -1; b++) d.noBuild.add(K(at[0] + a, at[1] + b));
    for (const [a, b] of [[4, -4], [1, -4], [4, -1]]) if (d.get(at[0] + a, at[1] + b) === 'S') d.set(at[0] + a, at[1] + b, 'P');
  }
  return O.furnish(d, {
    // Zwei Moscheen (eigene Grafiken): osmanisch in der Stadtmitte, mamlukisch am Rand der Touristen-Altstadt
    plazas, gardens: 0,
    special: (d, lots, near, got, taken) => {
      const add = (k, n = 1) => { got[k] = (got[k] || 0) + n; };
      // Hotels am Nilufer
      let h = 0; for (const l of near.filter(l => !l.used && nile(l)).sort(() => d.rand() - 0.5)) if (h < 10 && L.put(d, l, 'HOTE')) { add('HOTE'); h++; }
      // Nazlet el-Samman: Gasse an Gasse Souvenirläden, Imbisse, kleine Hotels, Cafés und freie Ladenlokale
      const tour = ['KAUF', 'FZZ', 'LEER', 'HOTE', 'KAUF', 'CLUB', 'FZZ', 'LEER', 'KAUF', 'HOTE'];
      let s = 0; for (const l of lots.filter(l => !l.used && inNazlet(l)).sort(() => d.rand() - 0.5)) {
        const k = tour[s % tour.length]; if (s >= 30) break;
        if (k === 'LEER' && !taken.every(t => L.dist(t, l) >= 5)) { s++; continue; }
        if (L.put(d, l, k)) { add(k); if (k === 'LEER') taken.push(l); s++; }
      }
    },
    leer: 40, nearKinds: {}, commerce: { CLUB: 8, KAUF: 8, BUER: 6, HOTE: 2, FZZ: 4, FABR: 3, UNIV: 0 },
    wohn: 248, bigShare: l => O.inRect(l.p, l.q, IMBABA) ? 0.2 : 0.5, mixCap: 18, mix: ['KAUF', 'CLUB', 'FZZ', 'BUER'],
  });
};
