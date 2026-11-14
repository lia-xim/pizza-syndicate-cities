// Porto als Lagunenstadt nach dem Vorbild des Original-Venedigs:
// geschwungene Hauptinsel, gewundener Canal Grande, viele 1 Feld breite Kanäle (Rii), Fußgängerstege,
// Sandbänke in der Lagune und nur eine Straße (Damm vom Kartenrand und eine Schleife durch die Stadt).
// Ohne EXE-Änderung gibt es keine Lieferboote: Häuser fern der Straße bekommen keine Lieferungen,
// deshalb stehen Ladenlokale und Lieferanten an der Straße. Kunden kommen überall zu Fuß.
'use strict';
const { T, K, laneGraph, largestScc } = require('./generate');
const L = require('./layout');
const I = require('./iso');

// Bildschirmposition (0..1) <-> Iso-Koordinaten
const S2PQ = (x, y) => [Math.round((x * 126 + y * 127) / 2), Math.round((x * 126 - y * 127) / 2)];
const PQ2S = (p, q) => [(p + q) / 126, (p - q) / 127];

// Glattes Rauschen (Wertrauschen auf einem groben Gitter)
function noise(d, scale) {
  const g = new Map(); const v = (i, j) => { const k = i + ',' + j; if (!g.has(k)) g.set(k, d.rand()); return g.get(k); };
  const s = t => t * t * (3 - 2 * t);
  return (p, q) => { const x = p / scale, y = q / scale, i = Math.floor(x), j = Math.floor(y), fx = s(x - i), fy = s(y - j); const a = v(i, j), b = v(i + 1, j), c = v(i, j + 1), e = v(i + 1, j + 1); return a + (b - a) * fx + (c - a) * fy + (a - b - c + e) * fx * fy; };
}

function porto(d) {
  const cells = () => [...d.cls.keys()].map(k => k.split(',').map(Number));
  const nz = noise(d, 10), nz2 = noise(d, 4), nzSand = noise(d, 7);

  // ---- 1. Land: Hauptinsel (Fischform) und Giudecca, sonst Lagune ----
  for (const [p, q] of cells()) {
    const [x, y] = PQ2S(p, q);
    const main = ((x - 0.5) / 0.5) ** 2 + ((y - 0.47) / 0.36) ** 2 + (nz(p, q) - 0.5) * 0.7 + (nz2(p, q) - 0.5) * 0.25;
    const giu = ((x - 0.45) / 0.32) ** 2 + ((y - 0.925) / 0.055) ** 2 + (nz2(p, q) - 0.5) * 0.5;
    d.set(p, q, main < 1 || giu < 1 ? 'S' : 'W');
  }
  // Giudecca-Kanal zwischen Hauptinsel und Giudecca freihalten
  for (const [p, q] of cells()) { const [x, y] = PQ2S(p, q); if (y > 0.84 && y < 0.865) d.set(p, q, 'W'); }

  // ---- 2. Canal Grande: gewundene S-Kurve, etwa 3 Felder breit ----
  const CG = [[0.08, 0.40], [0.22, 0.42], [0.32, 0.30], [0.45, 0.36], [0.52, 0.55], [0.62, 0.62], [0.72, 0.70], [0.80, 0.80], [0.86, 0.86]].map(([x, y]) => S2PQ(x, y));
  const carve = (pts, hw) => {
    for (let i = 0; i + 1 < pts.length; i++) {
      const [p0, q0] = pts[i], [p1, q1] = pts[i + 1], n = Math.ceil(Math.hypot(p1 - p0, q1 - q0) * 3);
      for (let t = 0; t <= n; t++) {
        // Catmull-Rom zwischen den Punkten für eine runde Kurve
        const P = j => pts[Math.max(0, Math.min(pts.length - 1, j))];
        const u = t / n, [a, b, c, e] = [P(i - 1), P(i), P(i + 1), P(i + 2)];
        const cr = k => 0.5 * ((2 * b[k]) + (-a[k] + c[k]) * u + (2 * a[k] - 5 * b[k] + 4 * c[k] - e[k]) * u * u + (-a[k] + 3 * b[k] - 3 * c[k] + e[k]) * u * u * u);
        const cp = cr(0), cq = cr(1);
        for (let dp = -3; dp <= 3; dp++) for (let dq = -3; dq <= 3; dq++) if (Math.hypot(dp, dq) <= hw) d.set(Math.round(cp + dp), Math.round(cq + dq), 'W');
      }
    }
  };

  // ---- 3. Plätze reservieren: Stadioncampo und Piazza San Marco ----
  const [sp, sq] = S2PQ(0.4, 0.55); const STAD = [sp - 5, sq - 5, sp + 5, sq + 5];
  const [mp, mq] = S2PQ(0.665, 0.745); const PIAZZA = { rect: [mp - 5, mq - 6, mp + 6, mq + 4], tower: [mp - 2, mq + 1] };
  const inRect = (p, q, [a, b, c, e], m = 0) => p >= a - m && p <= c + m && q >= b - m && q <= e + m;

  // ---- 4. Rii: dünne Kanäle (1 Feld) mit Versätzen, abschnittsweise unterbrochen ----
  const land = (p, q) => d.get(p, q) === 'S';
  const rio = (alongP, fixed, from, to) => {
    let c = fixed, run = 0, skip = d.rand() < 0.2;
    for (let x = from; x <= to; x++) {
      if (run-- <= 0) { run = 7 + Math.floor(d.rand() * 10); skip = d.rand() < 0.22;
        // Versatz: der Kanal springt um 1-2 Felder zur Seite (mit Verbindungsstück)
        if (d.rand() < 0.4) { const nc = c + (d.rand() < 0.5 ? -1 : 1) * (1 + Math.floor(d.rand() * 2)); if (!skip) for (let k = Math.min(c, nc); k <= Math.max(c, nc); k++) put(alongP, x, k); c = nc; } }
      if (!skip) put(alongP, x, c);
    }
  };
  const put = (alongP, x, c) => { const [p, q] = alongP ? [x, c] : [c, x]; if (land(p, q) && !inRect(p, q, STAD, 2) && !inRect(p, q, PIAZZA.rect, 2)) d.set(p, q, 'W'); };
  for (let q = -60 + Math.floor(d.rand() * 6); q < 60; q += 16 + Math.floor(d.rand() * 7)) rio(true, q, 0, 127);
  for (let p = 2 + Math.floor(d.rand() * 6); p < 126; p += 16 + Math.floor(d.rand() * 7)) rio(false, p, -64, 64);
  // Canal Grande zuletzt, damit die Rii an ihm enden; etwa 2 Felder breit
  carve(CG, 0.9);

  // ---- 5. Aufräumen: kleine Landreste weg, kleine Tümpel zuschütten ----
  const comps = cls => { const seen = new Set(), out = []; for (const k of d.cls.keys()) { if (seen.has(k) || !cls.includes(d.cls.get(k))) continue; const m = [k]; seen.add(k); for (let i = 0; i < m.length; i++) { const [p, q] = m[i].split(',').map(Number); for (const [a, b] of [[p + 1, q], [p - 1, q], [p, q + 1], [p, q - 1]]) { const t = K(a, b); if (!seen.has(t) && cls.includes(d.cls.get(t))) { seen.add(t); m.push(t); } } } out.push(m); } return out; };
  for (const m of comps(['S'])) if (m.length < 30) for (const k of m) d.cls.set(k, 'W');
  for (const m of comps(['W'])) if (m.length < 4) for (const k of m) d.cls.set(k, 'S');
  // Landzungen von 1 Feld Breite glätten
  for (let pass = 0; pass < 2; pass++) for (const [p, q] of cells()) if (land(p, q)) { const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => land(p + a, q + b)).length; if (n <= 1) d.set(p, q, 'W'); }
  // Schmale Landsplitter entfernen: Land bleibt nur, wo es zu einem 3x3-Landblock gehört (sonst Kaimauern im Wasser)
  for (let pass = 0; pass < 2; pass++) {
    const keep = new Set();
    for (const [p, q] of cells()) { let all = true; for (let a = 0; a < 3 && all; a++) for (let b = 0; b < 3; b++) if (!land(p + a, q + b)) { all = false; break; } if (all) for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) keep.add(K(p + a, q + b)); }
    for (const [p, q] of cells()) if (land(p, q) && !keep.has(K(p, q))) d.set(p, q, 'W');
    for (const m of comps(['S'])) if (m.length < 30) for (const k of m) d.cls.set(k, 'W');
    for (const m of comps(['W'])) if (m.length < 4) for (const k of m) d.cls.set(k, 'S');
  }
  for (const [p, q] of cells()) if (inRect(p, q, STAD) || inRect(p, q, PIAZZA.rect)) d.set(p, q, 'S');

  // ---- 6. Straße: Damm vom linken Kartenrand, Schleife durch die Stadt ----
  // Wegpunkte (Bildschirm); zwischen zwei Punkten erst entlang p, dann entlang q (Treppenzug).
  const ROUTE = [[0.0, 0.47], [0.13, 0.47], [0.2, 0.62], [0.33, 0.7], [0.55, 0.78], [0.72, 0.62], [0.85, 0.5], [0.78, 0.28], [0.6, 0.18], [0.42, 0.2], [0.28, 0.27], [0.18, 0.36], [0.13, 0.47]].map(([x, y]) => S2PQ(x, y));
  // Querverbindung durch die Mitte über den Canal Grande (Damm)
  const MITTE = [[0.13, 0.47], [0.3, 0.44], [0.42, 0.36], [0.6, 0.4], [0.75, 0.45], [0.85, 0.5]].map(([x, y]) => S2PQ(x, y));
  // Stichstraße auf die Giudecca (Damm über den Giudecca-Kanal)
  const GIUDECCA = [[0.33, 0.7], [0.36, 0.93]].map(([x, y]) => S2PQ(x, y));
  for (const R of [ROUTE, MITTE, GIUDECCA]) for (let i = 0; i + 1 < R.length; i++) {
    const [p0, q0] = R[i], [p1, q1] = R[i + 1];
    if (p0 !== p1) L.segP(d, q0, p0, p1 + (p1 > p0 ? 1 : 0));
    if (q0 !== q1) L.segQ(d, p1, q0, q1 + (q1 > q0 ? 1 : 0));
  }
  // Fahrbahn nicht durch die Plätze
  for (const [p, q] of cells()) if (d.get(p, q) === 'R' && (inRect(p, q, STAD, 1) || inRect(p, q, PIAZZA.rect, 1))) d.set(p, q, 'S');
  L.dedupeRoads(d);
  L.fixDams(d);
  { const keep = largestScc(laneGraph(d)); for (const [k, c] of d.cls) if (c === 'R' && !keep.has(k)) d.cls.set(k, 'S'); }
  d.roadNet = { verbunden: [...d.cls.values()].filter(c => c === 'R').length };

  // ---- 7. Sandbänke in der Lagune (wie im Original), Gärten ----
  { const dist = new Map(); const qu = []; for (const [p, q] of cells()) if (d.get(p, q) !== 'W') { dist.set(K(p, q), 0); qu.push([p, q]); }
    for (let i = 0; i < qu.length; i++) { const [p, q] = qu[i], dd = dist.get(K(p, q)); for (const [a, b] of [[p + 1, q], [p - 1, q], [p, q + 1], [p, q - 1]]) { const t = K(a, b); if (d.valid(a, b) && !dist.has(t)) { dist.set(t, dd + 1); qu.push([a, b]); } } }
    for (const [p, q] of cells()) if (d.get(p, q) === 'W' && dist.get(K(p, q)) >= 4 && nzSand(p, q) > 0.52) d.set(p, q, 'N'); }
  L.quayify(d);
  d.stegEvery = 5;

  // ---- 8. Piazza mit Campanile ----
  { const [a, b, c, e] = PIAZZA.rect; const [pa, pb, pc, pe] = [a + 2, b + 2, c - 1, e - 1];
    for (let p = pa; p <= pc; p++) for (let q = pb; q <= pe; q++) d.noBuild.add(K(p, q));
    for (const [p0, q0] of [[pa, pb], [pa, pe - 1], [pc - 1, pb], [pc - 1, pe - 1]]) d.rect(p0, q0, p0 + 1, q0 + 1, 'P');
    if (!d.landmark('S_VEN1', ...PIAZZA.tower)) throw new Error('Kein Platz für den Campanile'); }
  // Torre dos Clérigos (eigene Grafik): nahe der Piazza auf festem Boden
  { const [a, b, c, e] = PIAZZA.rect; const pc = (a + c) / 2 + 9, qc = (b + e) / 2 - 6; let ok = false;
    const cand = cells().filter(([p, q]) => d.get(p, q) === 'S').sort((u, v) => Math.hypot(u[0] - pc, u[1] - qc) - Math.hypot(v[0] - pc, v[1] - qc)).slice(0, 800);
    for (const [p, q] of cand) if (d.landmark('S_ZPO2', p, q)) { ok = true; break; }
    if (!ok) throw new Error('Kein Platz für den Clérigos-Turm'); }
  // Kleine Gärten (Campi mit Bäumen) im Inneren großer Inseln
  let regs = L.regions(d).filter(r => r.size > 120 && !r.cells.has(K(sp, sq)));
  for (const r of regs.sort(() => d.rand() - 0.5).slice(0, 7)) { const p = Math.round(r.pc), q = Math.round(r.qc); let ok = true; for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) if (d.get(p + a, q + b) !== 'S') ok = false; if (ok) d.rect(p - 1, q - 1, p + 1, q + 1, 'P'); }

  // ---- 9. Stadion auf seinem Campo ----
  const got = {}; const count = (k, n = 1) => { got[k] = (got[k] || 0) + n; };
  regs = L.regions(d);
  const sreg = regs.find(r => r.cells.has(K(sp, sq))); if (!sreg) throw new Error('Kein Stadioncampo');
  const hs = L.hotspot(d, sreg, { center: 'STAD', leer: 0, extras: ['CLUB', 'FZZ'], mix: ['KAUF', 'CLUB', 'FZZ', 'HOTE'], bounds: STAD, at: [sp, sq] });
  for (const l of hs.lots) if (l.used && l.kind !== 'LEER' && l.kind !== 'frei') count(l.kind);

  // ---- 10. Bauplätze, Läden an der Straße, Wohnhäuser überall ----
  const lots = [];
  for (const r of L.regions(d)) lots.push(...L.regionLots(d, r, { pitchP: 3, pitchQ: 3 }).filter(l => !inRect(l.p, l.q, STAD, 1)));
  const roadPx = [...d.cls].filter(([, c]) => c === 'R').map(([k]) => I.centerPQ(...k.split(',').map(Number)));
  const nearRoad = l => { const [x, y] = I.centerPQ(l.p + 1, l.q - 1); return roadPx.some(([a, b]) => Math.hypot(a - x, b - y) <= 260); };
  const near = lots.filter(nearRoad);
  const spreadKind = (pool, k, n, min) => count(k, L.spread(d, pool, n, k, [], min).length);
  // Ladenlokale, Lieferanten, Banken und Ämter an der Straße (Lieferwagen und Lieferanten brauchen sie)
  const leer = L.spread(d, near, 26, 'LEER', [], 5); count('LEER', leer.length);
  for (const [k, n] of Object.entries({ LIE: 4, BANK: 7, FEUE: 1, GEFA: 1, VERW: 1 })) spreadKind(near, k, n, 7);
  // Übriges Gewerbe über die ganze Stadt, Hotels am Canal Grande und an der Piazza
  for (const [k, n] of Object.entries({ SCHU: 3, UNIV: 1, HOTE: 7, KAUF: 8, CLUB: 8, BUER: 4, FZZ: 2, EKZ: 1, FABR: 1 })) spreadKind(lots, k, n, 7);
  const bigIds = d.wohnBig();
  let wohn = 0;
  for (const l of lots.map(l => [d.rand(), l]).sort((a, b) => a[0] - b[0]).map(x => x[1])) {
    if (wohn >= 245) break; if (l.used) continue;
    const id = d.rand() < 0.6 ? d.pick(bigIds) : d.pick(d.wohn());
    if (d.build(l.p, l.q, id)) { l.used = true; l.kind = 'WOHN'; wohn++; }
  }
  count('WOHN', wohn);
  const mix = ['KAUF', 'CLUB', 'HOTE', 'BUER']; let i = 0;
  for (const l of lots) if (!l.used) { const k = mix[i++ % mix.length]; if ((got[k] || 0) < 40 && L.put(d, l, k)) count(k); }
  // Zweites Wahrzeichen, Pflicht ist nur eins
  d.allowFar = true;
  return got;
}

module.exports = { porto };
