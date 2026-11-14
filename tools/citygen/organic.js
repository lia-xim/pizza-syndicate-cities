// Baukasten für natürlich wirkende Stadtgrundrisse: geschwungene Küsten und Flüsse, Inseln,
// Treppenzug-Straßen entlang beliebiger Linien, Häfen an passenden Uferstellen, Aufräumen schmaler Splitter.
// Koordinaten in Bildschirmanteilen (x 0..1 von links, y 0..1 von oben) werden in Iso-Zellen (p, q) umgerechnet.
'use strict';
const { K } = require('./generate');
const L = require('./layout');

const S2PQ = (x, y) => [Math.round((x * 126 + y * 127) / 2), Math.round((x * 126 - y * 127) / 2)];
const PQ2S = (p, q) => [(p + q) / 126, (p - q) / 127];
const cells = d => [...d.cls.keys()].map(k => k.split(',').map(Number));

// Glattes Wertrauschen auf einem groben Gitter (Maßstab in Zellen)
function noise(d, scale) {
  const g = new Map(); const v = (i, j) => { const k = i + ',' + j; if (!g.has(k)) g.set(k, d.rand()); return g.get(k); };
  const s = t => t * t * (3 - 2 * t);
  return (p, q) => { const x = p / scale, y = q / scale, i = Math.floor(x), j = Math.floor(y), fx = s(x - i), fy = s(y - j); const a = v(i, j), b = v(i + 1, j), c = v(i, j + 1), e = v(i + 1, j + 1); return a + (b - a) * fx + (c - a) * fy + (a - b - c + e) * fx * fy; };
}

// Jede Zelle nach einer Funktion der Bildschirmposition einfärben: f(x, y, p, q) liefert eine Klasse oder null
function paint(d, f) { for (const [p, q] of cells(d)) { const [x, y] = PQ2S(p, q); const k = f(x, y, p, q); if (k) d.set(p, q, k); } }

// Weiche Kurve (Catmull-Rom) durch Bildschirmpunkte; ruft fn(p, q) für jeden Punkt im Abstand hw um die Kurve auf
function alongCurve(ptsS, hw, fn) {
  const pts = ptsS.map(([x, y]) => S2PQ(x, y)); const R = Math.ceil(hw) + 1;
  for (let i = 0; i + 1 < pts.length; i++) {
    const P = j => pts[Math.max(0, Math.min(pts.length - 1, j))]; const [a, b, c, e] = [P(i - 1), P(i), P(i + 1), P(i + 2)];
    const n = Math.ceil(Math.hypot(c[0] - b[0], c[1] - b[1]) * 3);
    for (let t = 0; t <= n; t++) {
      const u = t / n; const cr = k => 0.5 * ((2 * b[k]) + (-a[k] + c[k]) * u + (2 * a[k] - 5 * b[k] + 4 * c[k] - e[k]) * u * u + (-a[k] + 3 * b[k] - 3 * c[k] + e[k]) * u * u * u);
      const cp = cr(0), cq = cr(1);
      for (let dp = -R; dp <= R; dp++) for (let dq = -R; dq <= R; dq++) if (Math.hypot(dp, dq) <= hw) fn(Math.round(cp + dp), Math.round(cq + dq));
    }
  }
}
const carve = (d, ptsS, hw, k = 'W', only = null) => alongCurve(ptsS, hw, (p, q) => { if (!only || only.includes(d.get(p, q))) d.set(p, q, k); });

// Straße als Treppenzug durch Bildschirmpunkte: je Abschnitt erst entlang p, dann entlang q
// Brücke (Damm) als gerade Straße entlang p (axis 'P', bei q=c) bzw. q, die an beiden Enden bis zur nächsten Straße verlängert wird
function bridge(d, axis, c, a, b) {
  const isR = x => axis === 'P' ? d.get(x, c) === 'R' || d.get(x, c + 1) === 'R' : d.get(c, x) === 'R' || d.get(c + 1, x) === 'R';
  let lo = a, hi = b; while (lo > a - 40 && !isR(lo)) lo--; while (hi < b + 40 && !isR(hi)) hi++;
  if (axis === 'P') L.segP(d, c, lo, hi); else L.segQ(d, c, lo, hi);
  return axis === 'P' ? [lo, c - 1, hi, c + 2] : [c - 1, lo, c + 2, hi];
}
// Kanal als Treppenzug (Breite w Zellen) durch Bildschirmpunkte
function canalRoute(d, ptsS, w = 2) {
  const pts = ptsS.map(([x, y]) => S2PQ(x, y));
  for (let i = 0; i + 1 < pts.length; i++) { const [p0, q0] = pts[i], [p1, q1] = pts[i + 1]; d.rect(p0, q0, p1 + w - 1, q0 + w - 1, 'W'); d.rect(p1, q0, p1 + w - 1, q1, 'W'); }
}
function route(d, ptsS) {
  const pts = ptsS.map(([x, y]) => S2PQ(x, y));
  for (let i = 0; i + 1 < pts.length; i++) {
    const [p0, q0] = pts[i], [p1, q1] = pts[i + 1];
    if (p0 !== p1) L.segP(d, q0, p0, p1 + (p1 > p0 ? 1 : 0));
    if (q0 !== q1) L.segQ(d, p1, q0, q1 + (q1 > q0 ? 1 : 0));
  }
}
// Diagonale Allee: viele kurze Stufen (wirkt auf dem Bildschirm wie eine schräge Straße)
function diagonal(d, xa, ya, xb, yb, step = 5) {
  const [p0, q0] = S2PQ(xa, ya), [p1, q1] = S2PQ(xb, yb);
  const n = Math.max(1, Math.round(Math.max(Math.abs(p1 - p0), Math.abs(q1 - q0)) / step));
  const pts = []; for (let i = 0; i <= n; i++) { const p = Math.round(p0 + (p1 - p0) * i / n), q = Math.round(q0 + (q1 - q0) * i / n); pts.push(PQ2S(p, q)); }
  route(d, pts);
}

// Zusammenhängende Flächen einer Klassenliste
function comps(d, cls) {
  const seen = new Set(), out = [];
  for (const k of d.cls.keys()) {
    if (seen.has(k) || !cls.includes(d.cls.get(k))) continue; const m = [k]; seen.add(k);
    for (let i = 0; i < m.length; i++) { const [p, q] = m[i].split(',').map(Number); for (const [a, b] of [[p + 1, q], [p - 1, q], [p, q + 1], [p, q - 1]]) { const t = K(a, b); if (!seen.has(t) && cls.includes(d.cls.get(t))) { seen.add(t); m.push(t); } } }
    out.push(m);
  }
  return out;
}
// Schmale Splitter entfernen: Land (S) bleibt nur, wo es zu einem 3x3-Landblock gehört; kleine Inseln und Tümpel weg
function tidy(d, { minLand = 30, minWater = 4, keepRects = [] } = {}) {
  const land = (p, q) => d.get(p, q) === 'S';
  const keepR = (p, q) => keepRects.some(([a, b, c, e]) => p >= a && p <= c && q >= b && q <= e);
  for (let pass = 0; pass < 2; pass++) {
    const keep = new Set();
    for (const [p, q] of cells(d)) { let all = true; for (let a = 0; a < 3 && all; a++) for (let b = 0; b < 3; b++) if (!land(p + a, q + b)) { all = false; break; } if (all) for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) keep.add(K(p + a, q + b)); }
    for (const [p, q] of cells(d)) if (land(p, q) && !keep.has(K(p, q)) && !keepR(p, q)) d.set(p, q, 'W');
    for (const m of comps(d, ['S'])) if (m.length < minLand) for (const k of m) d.cls.set(k, 'W');
    for (const m of comps(d, ['W'])) if (m.length < minWater) for (const k of m) d.cls.set(k, 'S');
  }
}

// Abstand (in Zellen, 4er-Nachbarschaft) jeder Zelle zur nächsten Zelle der Klassen cls
function distanceTo(d, cls) {
  const dist = new Map(), qu = [];
  for (const [p, q] of cells(d)) if (cls.includes(d.get(p, q))) { dist.set(K(p, q), 0); qu.push([p, q]); }
  for (let i = 0; i < qu.length; i++) { const [p, q] = qu[i], dd = dist.get(K(p, q)); for (const [a, b] of [[p + 1, q], [p - 1, q], [p, q + 1], [p, q - 1]]) { const t = K(a, b); if (d.valid(a, b) && !dist.has(t)) { dist.set(t, dd + 1); qu.push([a, b]); } } }
  return (p, q) => dist.has(K(p, q)) ? dist.get(K(p, q)) : 1e9;
}

// Häfen mit Schiff an geraden Uferstücken, an denen das Wasser auf der +p-Seite liegt (wie in Lissabon)
function autoHarbors(d, n, minDist = 12, filter = () => true) {
  const T = require('./generate').T; const placed = [];
  const cand = cells(d).filter(([p, q]) => [-2, -1, 0, 1, 2].every(o => d.get(p + 3, q + o) === 'U' && d.get(p + 4, q + o) === 'L' && d.get(p + 5, q + o) === 'W') && filter(p, q));
  for (const [p, q] of cand.sort(() => d.rand() - 0.5)) {
    if (placed.length >= n) break;
    if (placed.some(([a, b]) => Math.abs(a - p) + Math.abs(b - q) < minDist)) continue;
    if ([[-1, -2], [0, -2], [1, -1], [1, 0], [1, 1], [2, -1], [2, 0], [2, 1]].some(([a, b]) => d.get(p + a, q + b) !== 'S')) continue;
    if (d.harbor(p, q)) placed.push([p, q]);
  }
  return placed.length;
}

module.exports = { sccIds, bridge, canalRoute, S2PQ, PQ2S, cells, noise, paint, alongCurve, carve, route, diagonal, comps, tidy, distanceTo, autoHarbors };

// ---------- Fertigstellen einer frei gestalteten Stadt ----------
// Kennung der stark zusammenhängenden Komponente für jede Spurzelle (Kosaraju)
function sccIds(g) {
  const keys = [...g.keys()], idx = new Map(keys.map((k, i) => [k, i])), n = keys.length;
  const nxt = keys.map(k => g.get(k).filter(t => idx.has(t)).map(t => idx.get(t))), rev = keys.map(() => []);
  nxt.forEach((ns, i) => ns.forEach(j => rev[j].push(i)));
  const order = [], seen = new Array(n).fill(false);
  for (let s = 0; s < n; s++) { if (seen[s]) continue; const st = [[s, 0]]; seen[s] = true; while (st.length) { const t = st[st.length - 1]; if (t[1] < nxt[t[0]].length) { const w = nxt[t[0]][t[1]++]; if (!seen[w]) { seen[w] = true; st.push([w, 0]); } } else { order.push(t[0]); st.pop(); } } }
  const comp = new Array(n).fill(-1); let c = 0;
  for (let i = order.length - 1; i >= 0; i--) { const s = order[i]; if (comp[s] >= 0) continue; const st = [s]; comp[s] = c; while (st.length) { const v = st.pop(); for (const w of rev[v]) if (comp[w] < 0) { comp[w] = c; st.push(w); } } c++; }
  return new Map(keys.map((k, i) => [k, comp[i]]));
}
const inRect = (p, q, [a, b, c, e], m = 0) => p >= a - m && p <= c + m && q >= b - m && q <= e + m;
const rectAt = (x, y, h) => { const [p, q] = S2PQ(x, y); return [p - h, q - h, p + h, q + h]; };

// Straßennetz bereinigen: keine Fahrbahn auf Plätzen, keine Doppelstraßen, Dämme über Wasser, nur das zusammenhängende Netz
function finishRoads(d, freeRects = [], { dropped = [], clip = false, clipZone = false, bridges = [] } = {}) {
  // clipZone: auch der Uferstreifen (Abstand wie in nearWater) bleibt frei, damit Dämme das Gewässer nicht zerstückeln
  const water = new Set(clip || []);
  if (clip && clipZone) { const z = new Set(clip); for (const k of clip) { const [p, q] = k.split(',').map(Number); for (let a = -3; a <= 1; a++) for (let b = -1; b <= 3; b++) z.add(K(p + a, q + b)); } clip = z; }
  const { laneGraph, largestScc } = require('./generate');
  for (const [p, q] of cells(d)) if (d.get(p, q) === 'R' && freeRects.some(r => inRect(p, q, r, 1))) d.set(p, q, 'S');
  // Straßen am Wasser abschneiden (außer auf Brücken), damit Flüsse nicht zugeschüttet werden

  // clip: Wasserzellen (z. B. Fluss), auf denen keine Straße liegen darf, außer auf Brücken; mit clipZone auch der Uferstreifen
  const clipIt = () => { if (clip) for (const k of clip) { const [p, q] = k.split(',').map(Number); if (d.get(p, q) === 'R' && !bridges.some(r => inRect(p, q, r))) d.set(p, q, water.has(k) ? 'W' : 'S'); } };
  clipIt();
  // Ausgelassene Rasterstücke wieder einfügen, solange sie Teile des Netzes verbinden
  const sz = () => { const g = laneGraph(d); return [largestScc(g).size, g.size]; };
  let [best, total] = sz();

  for (const add of dropped) {
    if (best === total) break;
    const before = new Map(d.cls), rp = d.roadsP.length, rq = d.roadsQ.length;
    add(); clipIt();
    const [b2, t2] = sz();
    if (b2 > best && b2 - best > (t2 - total) * 0.5) { best = b2; total = t2; } else { d.cls = before; d.roadsP.length = rp; d.roadsQ.length = rq; }
  }
  // Einmündungen, an denen Teilnetze nur aneinanderstoßen, in beide Richtungen befahrbar machen:
  // zwischen zwei benachbarten Fahrbahnzellen verschiedener Teilnetze ein kurzes Verbindungsstück (zwei Spuren) eintragen
  for (let guard = 0; guard < 300; guard++) {
    const id = sccIds(laneGraph(d)); let fixed = false;
    const R = (a, b) => d.get(a, b) === 'R';
    for (const [k, c] of id) {
      const [p, q] = k.split(',').map(Number);
      for (const [dp, dq] of [[1, 0], [0, 1]]) {
        const t = K(p + dp, q + dq); if (!id.has(t) || id.get(t) === c) continue;
        if (dp) { for (const q0 of [q, q - 1]) if (R(p, q0) && R(p, q0 + 1) && R(p + 1, q0) && R(p + 1, q0 + 1) && !d.roadsP.some(r => r.q0 === q0 && r.pFrom <= p && r.pTo >= p + 1)) { L.segP(d, q0, p, p + 1); fixed = true; break; } }
        else { for (const p0 of [p, p - 1]) if (R(p0, q) && R(p0 + 1, q) && R(p0, q + 1) && R(p0 + 1, q + 1) && !d.roadsQ.some(r => r.p0 === p0 && r.qFrom <= q && r.qTo >= q + 1)) { L.segQ(d, p0, q, q + 1); fixed = true; break; } }
        if (fixed) break;
      }
      if (fixed) break;
    }
    if (!fixed) break;
  }
  // Abgetrennte größere Teilnetze mit einer kurzen geraden Straße an ein anderes Teilnetz anschließen (nicht über Wasser oder Plätze).
  // Erst ohne, dann mit Straßen parallel daneben; jedes Teilnetz ab 30 Spurzellen wird versucht.
  for (let guard = 0; guard < 120; guard++) {
    const id = sccIds(laneGraph(d)); const groups = new Map(); for (const [k, v] of id) { if (!groups.has(v)) groups.set(v, []); groups.get(v).push(k); }
    const sorted = [...groups.values()].sort((a, b) => b.length - a.length); if (sorted.length < 2 || sorted[1].length < 30) break;
    const free = (p, q) => { const c = d.get(p, q); return (c === 'S' || c === 'R' || c === 'P') && !freeRects.some(r => inRect(p, q, r, 1)) && !(clip && clip.has(K(p, q))); };
    let best = null;
    for (const strict of [true, false]) {
      for (const comp of sorted.slice(1).filter(c => c.length >= 30)) {
        const own = new Set(comp);
        for (const k of comp) {
          const [p, q] = k.split(',').map(Number);
          for (const [dp, dq] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let t = 1; t <= 32; t++) {
            const a = p + dp * t, b = q + dq * t, a2 = a + (dq ? 1 : 0), b2 = b + (dp ? 1 : 0);
            const other = x => id.has(x) && !own.has(x);
            if (other(K(a, b)) && other(K(a2, b2))) { if (t > 1 && (!best || t < best.t)) best = { p, q, dp, dq, t }; break; }
            const side = (x, y) => d.get(x + (dq ? -1 : 0), y + (dp ? -1 : 0)) === 'R' || d.get(x + (dq ? 2 : 0), y + (dp ? 2 : 0)) === 'R';
            if (!free(a, b) || !free(a2, b2) || own.has(K(a, b)) || (strict && (d.get(a, b) === 'R' || side(a, b)))) break;
          }
        }
        if (best) break;
      }
      if (best) break;
    }
    if (!best) break;
    const { p, q, dp, dq, t } = best;
    if (dp) L.segP(d, q, Math.min(p, p + dp * t), Math.max(p, p + dp * t)); else L.segQ(d, p, Math.min(q, q + dq * t), Math.max(q, q + dq * t));
  }
  L.dedupeRoads(d);
  L.pruneStubs(d);
  L.fixDams(d);
  const keep = largestScc(laneGraph(d)); for (const [k, c] of d.cls) if (c === 'R' && !keep.has(k)) d.cls.set(k, 'S');
  d.roadNet = { verbunden: [...d.cls.values()].filter(c => c === 'R').length };
}

// Plätze, Wahrzeichen, Läden, Gewerbe und Wohnhäuser verteilen. Häuser fern der Straße sind erlaubt (Kunden kommen
// zu Fuß); Ladenlokale, Lieferanten, Banken und Ämter stehen in Reichweite der Lieferwagen.
// cfg.plazas: [{ rect, center ('STAD'|'UNIV'|'EKZ'|...), extras, mix }] oder [{ rect, landmark, tower: [p, q] }]
function furnish(d, cfg) {
  const { T } = require('./generate'); const I = require('./iso');
  const got = {}; const count = (k, n = 1) => { got[k] = (got[k] || 0) + n; };
  const plazas = cfg.plazas || [];
  // Prachtplätze mit Wahrzeichen: gepflastert, Bäume in den Ecken
  for (const pl of plazas.filter(x => x.landmark)) {
    const [a, b, c, e] = pl.rect;
    for (let p = a; p <= c; p++) for (let q = b; q <= e; q++) d.noBuild.add(K(p, q));
    if (pl.trees !== false) for (const [p0, q0] of [[a, b], [a, e - 1], [c - 1, b], [c - 1, e - 1]]) if ([0, 1].every(i => [0, 1].every(j => d.get(p0 + i, q0 + j) === 'S'))) d.rect(p0, q0, p0 + 1, q0 + 1, 'P');
    let ok = false; const [tp, tq] = pl.tower || [Math.round((a + c) / 2), Math.round((b + e) / 2)];
    for (let r = 0; r <= 4 && !ok; r++) for (let dp = -r; dp <= r && !ok; dp++) for (let dq = -r; dq <= r && !ok; dq++) if (d.landmark(pl.landmark, tp + dp, tq + dq)) ok = true;
    if (!ok) throw new Error('Kein Platz für ' + pl.landmark);
  }
  // Weitere Wahrzeichen in Blöcken nahe einer Bildschirmposition
  for (const [name, x, y] of cfg.landmarks || []) {
    const [pc, qc] = S2PQ(x, y); let ok = false;
    const cand = cells(d).filter(([p, q]) => d.get(p, q) === 'S').sort((u, v) => Math.hypot(u[0] - pc, u[1] - qc) - Math.hypot(v[0] - pc, v[1] - qc)).slice(0, 400);
    for (const [p, q] of cand) if (d.landmark(name, p, q)) { ok = true; break; }
    if (!ok) throw new Error('Kein Platz für ' + name);
  }
  // Kleine Gärten im Inneren großer Blöcke
  for (const r of L.regions(d).filter(r => r.size > 150).sort(() => d.rand() - 0.5).slice(0, cfg.gardens ?? 5)) {
    const p = Math.round(r.pc), q = Math.round(r.qc); if (plazas.some(pl => inRect(p, q, pl.rect, 3))) continue;
    let ok = true; for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) if (d.get(p + a, q + b) !== 'S') ok = false; if (ok) d.rect(p - 1, q - 1, p + 1, q + 1, 'P');
  }
  // Publikumsmagneten auf ihren Plätzen
  const leerTaken = [];
  for (const pl of plazas.filter(x => !x.landmark)) {
    const [a, b, c, e] = pl.rect; const at = [Math.round((a + c) / 2), Math.round((b + e) / 2)];
    const reg = L.regions(d).find(r => r.cells.has(K(...at))); if (!reg) throw new Error('Platz ohne Fläche bei ' + at);
    const res = L.hotspot(d, reg, { center: pl.center, leer: pl.leer ?? 0, extras: pl.extras || [], mix: pl.mix || ['KAUF', 'CLUB', 'FZZ', 'HOTE'], bounds: pl.rect, at });
    for (const l of res.lots) if (l.used && l.kind !== 'LEER' && l.kind !== 'frei') count(l.kind);
    leerTaken.push(...res.leer); count('LEER', res.leer.length);
  }
  // Bauplätze
  const lots = [];
  for (const r of L.regions(d)) lots.push(...L.regionLots(d, r, { pitchP: 3, pitchQ: 3 }).filter(l => !plazas.some(pl => !pl.landmark && inRect(l.p, l.q, pl.rect, 1))));
  const roadPx = [...d.cls].filter(([, c]) => c === 'R').map(([k]) => I.centerPQ(...k.split(',').map(Number)));
  const nearRoad = l => { const [x, y] = I.centerPQ(l.p + 1, l.q - 1); return roadPx.some(([u, v]) => Math.hypot(u - x, v - y) <= 260); };
  const near = lots.filter(nearRoad);
  if (cfg.special) cfg.special(d, lots, near, got, leerTaken);
  const spreadKind = (pool, k, n, min) => count(k, L.spread(d, pool, n, k, [], min).length);
  const leer = L.spread(d, near, Math.max(0, (cfg.leer ?? 26) - leerTaken.length - (got.LEER || 0)), 'LEER', [...leerTaken], 5); count('LEER', leer.length - leerTaken.length);
  for (const [k, n] of Object.entries({ LIE: 4, BANK: 7, FEUE: 1, GEFA: 1, VERW: 1, ...(cfg.nearKinds || {}) })) spreadKind(near, k, n, 7);
  for (const [k, n] of Object.entries({ SCHU: 3, UNIV: 1, ...(cfg.commerce || {}) })) spreadKind(cfg.commercePool ? cfg.commercePool(lots) : lots, k, n, 6);
  const bigIds = d.wohnBig();
  let wohn = 0;
  for (const l of lots.map(l => [d.rand(), l]).sort((u, v) => u[0] - v[0]).map(x => x[1])) {
    if (wohn >= (cfg.wohn ?? 240)) break; if (l.used) continue;
    const big = cfg.bigShare ? (typeof cfg.bigShare === 'function' ? cfg.bigShare(l) : cfg.bigShare) : 0.5;
    if (d.build(l.p, l.q, d.rand() < big ? d.pick(bigIds) : d.pick(d.wohn()))) { l.used = true; l.kind = 'WOHN'; wohn++; }
  }
  count('WOHN', wohn);
  const mix = cfg.mix || ['KAUF', 'CLUB', 'HOTE', 'BUER']; let i = 0;
  for (const l of lots) if (!l.used) { const k = mix[i++ % mix.length]; if ((got[k] || 0) < (cfg.mixCap ?? 45) && L.put(d, l, k)) count(k); }
  d.allowFar = true;
  return got;
}

Object.assign(module.exports, { inRect, rectAt, finishRoads, furnish });
