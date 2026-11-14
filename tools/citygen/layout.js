// Bausteine für abwechslungsreiche Stadtgrundrisse.
// Das Spiel kennt nur Straßen in zwei Richtungen (entlang p und q). Abwechslung entsteht durch
// unregelmäßige Abstände, unterbrochene Straßen (T-Kreuzungen), Treppen-Alleen, Ringstraßen um Plätze
// und Blöcke beliebiger Form.
'use strict';
const { T, K } = require('./generate');
const B = T.buildings;

// Straßenzug entlang p (Zellen q0, q0+1) bzw. q (Zellen p0, p0+1) zwischen zwei Koordinaten.
const segP = (d, q0, a, b) => d.roadP(q0, Math.min(a, b), Math.max(a, b));
const segQ = (d, p0, a, b) => d.roadQ(p0, Math.min(a, b), Math.max(a, b));

// Unregelmäßiges Raster: Linien mit zufälligen Abständen, einzelne Abschnitte fallen weg (T-Kreuzungen).
// reserved: Rechtecke [p0,q0,p1,q1], die frei bleiben (Plätze, Altstadt, Wasser).
// gapP/gapQ: eigene Abstände je Richtung (z. B. lange Reihenhausstraßen: eng in einer, weit in der anderen Richtung)
function irregularGrid(d, { pFrom, pTo, qFrom, qTo, gap = [9, 15], gapP = gap, gapQ = gap, drop = 0.18, reserved = [], blocked = () => false }) {
  const lines = (a, b, g) => { const out = []; let x = a + 2 + Math.floor(d.rand() * 4); while (x < b - 4) { out.push(x); x += g[0] + Math.floor(d.rand() * (g[1] - g[0] + 1)); } return out; };
  const ps = [pFrom, ...lines(pFrom, pTo, gapP), pTo], qs = [qFrom, ...lines(qFrom, qTo, gapQ), qTo];
  const inRes = (p, q) => blocked(p, q) || reserved.some(([a, b, c, e]) => p >= a && p <= c && q >= b && q <= e);
  // Abschnitt zeichnen, aber reservierte Flächen aussparen (Straße endet dort und stößt an deren Rand)
  // Keine Straße direkt neben einer parallelen Straße (sonst entstehen vierspurige Doppelstraßen)
  const R = (p, q) => d.get(p, q) === 'R';
  const parP = (p, q) => [-2, 3].some(o => [-2, -1, 0, 1, 2].every(x => R(p + x, q + o)));
  const parQ = (p, q) => [-2, 3].some(o => [-2, -1, 0, 1, 2].every(x => R(p + o, q + x)));
  const drawP = (q, a, b) => { let s = null; for (let p = a; p <= b + 1; p++) { const free = p <= b && !inRes(p, q) && !inRes(p, q + 1) && !parP(p, q); if (free && s === null) s = p; if (!free && s !== null) { if (p - 1 - s >= 2) segP(d, q, s, p - 1); s = null; } } };
  const drawQ = (p, a, b) => { let s = null; for (let q = a; q <= b + 1; q++) { const free = q <= b && !inRes(p, q) && !inRes(p + 1, q) && !parQ(p, q); if (free && s === null) s = q; if (!free && s !== null) { if (q - 1 - s >= 2) segQ(d, p, s, q - 1); s = null; } } };
  const dropped = [];
  // Außenlinien bleiben vollständig, innere Abschnitte fallen mit Wahrscheinlichkeit drop weg (T-Kreuzungen)
  for (let j = 0; j < qs.length; j++) for (let i = 0; i + 1 < ps.length; i++) {
    if (j > 0 && j < qs.length - 1 && d.rand() < drop) { dropped.push(() => drawP(qs[j], ps[i], ps[i + 1] + 1)); continue; }
    drawP(qs[j], ps[i], ps[i + 1] + 1);
  }
  for (let i = 0; i < ps.length; i++) for (let j = 0; j + 1 < qs.length; j++) {
    if (i > 0 && i < ps.length - 1 && d.rand() < drop) { dropped.push(() => drawQ(ps[i], qs[j], qs[j + 1] + 1)); continue; }
    drawQ(ps[i], qs[j], qs[j + 1] + 1);
  }
  return { ps, qs, dropped };
}

// Ringstraße um einen Platz: innen (p0..p1, q0..q1) bleibt frei, die Straße läuft außen herum.
function ring(d, p0, q0, p1, q1) {
  segP(d, q0 - 2, p0 - 2, p1 + 3); segP(d, q1 + 1, p0 - 2, p1 + 3);
  segQ(d, p0 - 2, q0 - 2, q1 + 2); segQ(d, p1 + 1, q0 - 2, q1 + 2);
}

// Treppen-Allee: abwechselnd ein Stück entlang p und eins entlang q. Wirkt auf dem Bildschirm wie eine Schrägstraße.
function stairs(d, p, q, stepP, stepQ, n) {
  for (let i = 0; i < n; i++) {
    segP(d, q, p, p + stepP + 1); p += stepP;
    segQ(d, p, q, q + stepQ + 1); q += stepQ;
  }
}

// Zusammenhängende Gehwegflächen (Blöcke) zwischen den Straßen.
function regions(d, cls = 'S') {
  const seen = new Set(), out = [];
  for (const k of d.cls.keys()) {
    if (seen.has(k) || d.cls.get(k) !== cls) continue;
    const cells = [k]; seen.add(k);
    for (let i = 0; i < cells.length; i++) {
      const [p, q] = cells[i].split(',').map(Number);
      for (const [a, b] of [[p + 1, q], [p - 1, q], [p, q + 1], [p, q - 1]]) { const t = K(a, b); if (!seen.has(t) && d.cls.get(t) === cls) { seen.add(t); cells.push(t); } }
    }
    const pq = cells.map(c => c.split(',').map(Number));
    out.push({ cells: new Set(cells), size: cells.length, pmin: Math.min(...pq.map(x => x[0])), pmax: Math.max(...pq.map(x => x[0])), qmin: Math.min(...pq.map(x => x[1])), qmax: Math.max(...pq.map(x => x[1])), pc: pq.reduce((a, x) => a + x[0], 0) / pq.length, qc: pq.reduce((a, x) => a + x[1], 0) / pq.length });
  }
  return out;
}

// Bauplätze in einer Fläche: Raster mit Abstand pitch, Grundfläche und Tür in der Fläche,
// rundherum mindestens eine Zelle Abstand zu Straße und Wasser.
function regionLots(d, reg, { pitchP = 3, pitchQ = 3 } = {}) {
  // Dichte Packung: Zeilen von oben (hohes q) nach unten, jeder Bauplatz hält gapP/gapQ Zellen Abstand zum nächsten.
  const gapP = pitchP - 2, gapQ = pitchQ - 2;
  const lots = [];
  const ok = (p, q) => reg.cells.has(K(p, q));
  const hard = (p, q) => { const k = d.get(p, q); return k === 'R' || k === 'W' || k === 'X' || k === 'U' || k === 'L'; };
  const taken = new Set();
  const fp = [[0, 0], [-1, 0], [0, 1], [-1, 1]];
  for (let qa = reg.qmax - 2; qa >= reg.qmin + 1; qa--) {
    for (let pa = reg.pmin + 2; pa <= reg.pmax - 1; pa++) {
      if (!fp.every(([a, b]) => ok(pa + a, qa + b))) continue;
      if (!ok(pa + 1, qa - 1) || taken.has(K(pa + 1, qa - 1))) continue;
      let clear = true;
      for (const [a, b] of fp) for (let x = -1; x <= 1 && clear; x++) for (let y = -1; y <= 1; y++) if (hard(pa + a + x, qa + b + y)) { clear = false; break; }
      if (!clear) continue;
      // Abstand zu bereits vergebenen Grundflächen
      for (let x = -1 - gapP; x <= gapP && clear; x++) for (let y = -gapQ; y <= 1 + gapQ; y++) if (taken.has(K(pa + x, qa + y))) { clear = false; break; }
      if (!clear) continue;
      for (const [a, b] of fp) taken.add(K(pa + a, qa + b));
      lots.push({ p: pa, q: qa });
    }
  }
  return lots;
}

// Gebäude bauen (Bauplatz als belegt markieren)
// Freie Ladenlokale: meist klein (LEER1), seltener mittel (LEER2), selten groß (LEER3).
function pickId(d, kind) { if (kind === 'WOHN') return d.pick(d.wohn()); if (kind !== 'LEER') return d.pick(B[kind]); const r = d.rand(); return B.LEER[r < 0.6 ? 0 : r < 0.9 ? 1 : 2]; }
// Freie Ladenlokale bekommen einen Vorplatz: die 3x3 Zellen unter der Tür (der Eingang liegt unten) bleiben unbebaut,
// damit Kunden den Laden sehen und erreichen und er nicht ringsum eingebaut wird.
const FRONT = []; for (let a = 1; a <= 3; a++) for (let b = -3; b <= -1; b++) FRONT.push([a, b]);
function put(d, lot, kind) {
  if (lot.used) return false;
  if (kind === 'LEER' && FRONT.some(([a, b]) => d.get(lot.p + a, lot.q + b) === 'B')) return false;
  if (!d.build(lot.p, lot.q, pickId(d, kind))) return false;
  if (kind === 'LEER') for (const [a, b] of FRONT) d.noBuild.add(K(lot.p + a, lot.q + b));
  lot.used = true; lot.kind = kind; return true;
}
const dist = (a, b) => Math.abs(a.p - b.p) + Math.abs(a.q - b.q);

// Freie Ladenlokale gleichmäßig verteilen: immer der Bauplatz, der am weitesten von allen bisherigen Läden entfernt ist.
function spread(d, lots, n, kind = 'LEER', taken = [], minDist = 7) {
  const pts = [...taken]; let placed = 0;
  // Ladenlokale nicht an den Kartenrand: dort ist das Einzugsgebiet am kleinsten. Ganz außen keine, im Randstreifen nur ungern.
  const edge = l => Math.min(l.p + l.q, 126 - l.p - l.q, l.p - l.q, 127 - l.p + l.q);
  const free = lots.filter(l => !l.used && (kind !== 'LEER' || edge(l) >= 10));
  while (placed < n && free.length) {
    let best = -1, bd = -1;
    for (let i = 0; i < free.length; i++) {
      const l = free[i]; let m = 1e9; for (const t of pts) m = Math.min(m, Math.abs(t.p - l.p) + Math.abs(t.q - l.q));
      const score = (pts.length ? m : 0) + d.rand() * 2 - (kind === 'LEER' ? Math.max(0, 22 - edge(l)) * 1.5 : 0);
      if (score > bd) { bd = score; best = i; }
    }
    const l = free.splice(best, 1)[0];
    if (kind === 'LEER' && pts.length && bd + Math.max(0, 22 - edge(l)) * 1.5 < minDist) break; // Karte voll: lieber weniger Läden als Läden direkt nebeneinander
    if (put(d, l, kind)) { pts.push(l); placed++; }
  }
  return pts;
}

// Hotspot: Anziehungspunkt in der Mitte eines Platzes, darum Läden und Publikumsmagneten.
function hotspot(d, reg, { center = 'STAD', leer = 4, extras = [], mix = ['KAUF', 'CLUB', 'FZZ', 'BUER', 'KAUF', 'CLUB'], bounds, at } = {}) {
  // Nur Bauplätze innerhalb des Platzes (falls die Fläche über den Platz hinaus reicht)
  const inB = l => !bounds || (l.p >= bounds[0] && l.p <= bounds[2] + 1 && l.q >= bounds[1] - 1 && l.q <= bounds[3]);
  const lots = regionLots(d, reg, { pitchP: 3, pitchQ: 3 }).filter(inB);
  const byC = [...lots].sort((a, b) => Math.hypot(a.p - reg.pc, a.q - reg.qc) - Math.hypot(b.p - reg.pc, b.q - reg.qc));
  const got = [];
  const c = byC[0];
  if (center && c) {
    put(d, c, center); got.push(c);
    // Großer Publikumsmagnet (Stadion) braucht Platz drumherum, sonst kommen die Leute nicht rein und raus
    // Nur vor dem Eingang (Tür liegt bei +p/-q) bleibt ein Vorplatz frei, rundherum wird gebaut
    if (center === 'STAD') for (const l of lots) if (!l.used && l.p - c.p >= 0 && l.p - c.p <= 3 && c.q - l.q >= 0 && c.q - l.q <= 3) { l.used = true; l.kind = 'frei'; }
  }
  // Laufachsen: vom Mittelpunkt in alle vier Richtungen bis zur Ringstraße bleibt ein breiter Weg frei,
  // gebaut wird in den vier Ecken des Platzes. So kommen die Leute überall hin und wieder heraus.
  const m = center && c ? c : at ? { p: at[0], q: at[1] } : null;
  if (m) for (const l of lots) if (!l.used && (Math.abs(l.q - m.q) <= 2 || Math.abs(l.p - m.p) <= 2)) { l.used = true; l.kind = 'frei'; }
  const rest = byC.filter(l => !l.used);
  const leerLots = [];
  for (const l of rest) { if (leerLots.length >= leer) break; if (leerLots.every(x => dist(x, l) >= 6) && put(d, l, 'LEER')) { leerLots.push(l); got.push(l); } }
  for (const k of extras) { const l = rest.find(x => !x.used && leerLots.every(y => dist(x, y) >= 3)) || rest.find(x => !x.used); if (l) put(d, l, k); }
  // Platz voll bebauen: Publikumsmagneten und Geschäfte
  let i = 0; for (const l of rest) if (!l.used) put(d, l, mix[i++ % mix.length]);
  return { lots, leer: leerLots };
}

// Kanal entlang p (Wasser in q0..q0+w-1) mit Brücken an den Stellen bridges (Straße entlang q, Gehweg daneben)
function canalP(d, q0, w, pFrom, pTo) { d.rect(pFrom, q0, pTo, q0 + w - 1, 'W'); }
function bridgesQ(d, q0, w, ps) {
  for (const p of ps) {
    // Straße über das Wasser und bis zur nächsten Straße auf beiden Seiten
    let lo = q0 - 1, hi = q0 + w;
    while (lo > q0 - 40 && d.get(p, lo) !== 'R' && d.get(p, lo) !== 'X') lo--;
    while (hi < q0 + w + 40 && d.get(p, hi) !== 'R' && d.get(p, hi) !== 'X') hi++;
    if (d.get(p, lo) !== 'R' || d.get(p, hi) !== 'R') continue;
    segQ(d, p, lo, hi + 1);
    for (let q = q0; q < q0 + w; q++) { d.set(p - 1, q, 'S'); d.set(p + 2, q, 'S'); }
  }
}

// Zellen, die zu nah an Wasser oder Marsch liegen, um dort eine Straße zu bauen (Platz für Kaimauer und Gehweg).
// Auf der -p- und +q-Seite eines Gewässers braucht es Uferweg, Mauer und Gehweg (3 Zellen), sonst nur Gehweg (1 Zelle).
function nearWater(d) {
  const out = new Set();
  for (const k of d.cls.keys()) {
    const c = d.cls.get(k); if (c !== 'W' && c !== 'N') continue;
    const [p, q] = k.split(',').map(Number);
    for (let a = -3; a <= 1; a++) for (let b = -1; b <= 3; b++) out.add(K(p + a, q + b));
  }
  return (p, q) => out.has(K(p, q));
}

// Wasserkanten wie in den Originalen: An der -p- und +q-Seite eines Gewässers liegt zuerst der abgesenkte
// Uferweg (L), dahinter die Kaimauer (U). An den anderen Seiten stößt Gehweg direkt ans Wasser.
function quayify(d) {
  const land = (p, q) => d.get(p, q) === 'S';
  const water = [...d.cls.keys()].filter(k => d.cls.get(k) === 'W').map(k => k.split(',').map(Number));
  for (const [p, q] of water) {
    if (land(p - 1, q)) { d.set(p - 1, q, 'L'); if (land(p - 2, q)) d.set(p - 2, q, 'U'); }
    if (land(p, q + 1)) { d.set(p, q + 1, 'L'); if (land(p, q + 2)) d.set(p, q + 2, 'U'); }
  }
  // Ecken: dort, wo Uferweg in p- und q-Richtung zusammenstoßen, Uferweg und Mauer schließen
  for (const [p, q] of water) if (land(p - 1, q + 1) && (d.get(p - 1, q) === 'L' || d.get(p, q + 1) === 'L')) { d.set(p - 1, q + 1, 'L'); for (const [a, b] of [[-2, 1], [-1, 2], [-2, 2]]) if (land(p + a, q + b)) d.set(p + a, q + b, 'U'); }
  // Mauer muss lückenlos zwischen Uferweg und Gehweg liegen
  for (const k of [...d.cls.keys()]) { if (d.cls.get(k) !== 'L') continue; const [p, q] = k.split(',').map(Number); for (const [a, b] of [[-1, 0], [0, 1], [-1, 1]]) if (land(p + a, q + b)) d.set(p + a, q + b, 'U'); }
}

// Straße über Wasser: Wasser, das zu nah an einer Straße liegt, wird Land. So entsteht ein Damm mit Gehweg
// und Kaimauer (das Spiel hat keine Brückengrafik für Straßen). Abstände wie in nearWater.
function fixDams(d) {
  const road = new Set(); for (const [k, c] of d.cls) if (c === 'R') road.add(k);
  for (const [k, c] of [...d.cls]) {
    if (c !== 'W' && c !== 'N') continue;
    const [p, q] = k.split(',').map(Number); let hit = false;
    for (let a = -3; a <= 1 && !hit; a++) for (let b = -1; b <= 3; b++) if (road.has(K(p + a, q + b))) { hit = true; break; }
    if (hit) { d.set(p, q, 'S'); (d.damCells = d.damCells || new Set()).add(k); }
  }
}

// Parallele Straßen, die enger als minGap nebeneinander liegen, ergeben vier- oder sechsspurige Fahrbahnen.
// Die später gezeichnete Straße wird auf dem gemeinsamen Stück entfernt, aber nur, wenn das Straßennetz danach
// nicht weiter zerfällt. Fahrbahnzellen ohne Straße werden Gehweg.
function dedupeRoads(d, minGap = 4) {
  const { laneGraph, largestScc } = require('./generate');
  // Maß: Größe des stark zusammenhängenden Hauptnetzes und Zahl der getrennten Fahrbahnflächen
  const areas = () => { const seen = new Set(); let n = 0; for (const [k, c] of d.cls) { if (c !== 'R' || seen.has(k)) continue; n++; const st = [k]; seen.add(k); while (st.length) { const [p, q] = st.pop().split(',').map(Number); for (const t of [K(p + 1, q), K(p - 1, q), K(p, q + 1), K(p, q - 1)]) if (!seen.has(t) && d.cls.get(t) === 'R') { seen.add(t); st.push(t); } } } return n; };
  const roadCount = () => { let n = 0; for (const c of d.cls.values()) if (c === 'R') n++; return n; };
  const state = () => { const g = laneGraph(d); return { scc: largestScc(g).size, areas: areas(), roads: roadCount() }; };
  const sync = () => {
    const on = new Set();
    for (const r of d.roadsP) for (let p = r.pFrom; p <= r.pTo; p++) { on.add(K(p, r.q0)); on.add(K(p, r.q0 + 1)); }
    for (const r of d.roadsQ) for (let q = r.qFrom; q <= r.qTo; q++) { on.add(K(r.p0, q)); on.add(K(r.p0 + 1, q)); }
    for (const [k, c] of d.cls) if (c === 'R' && !on.has(k)) d.cls.set(k, 'S');
  };
  let base = state(), removed = 0;
  const skip = new Set();
  for (const [name, o, a, b] of [['roadsP', 'q0', 'pFrom', 'pTo'], ['roadsQ', 'p0', 'qFrom', 'qTo']]) {
    for (let changed = true; changed;) {
      changed = false;
      const list = d[name];
      outer: for (let i = 1; i < list.length; i++) for (let j = 0; j < i; j++) {
        const r = list[i], s = list[j], gap = Math.abs(s[o] - r[o]);
        if (gap === 0 || gap >= minGap) continue;
        const lo = Math.max(r[a], s[a] - 1), hi = Math.min(r[b], s[b] + 1); if (lo > hi) continue;
        const key = [r[o], r[a], r[b], s[o], s[a], s[b]].join(); if (skip.has(key)) continue;
        const pieces = []; if (lo - 1 >= r[a] + 1) pieces.push({ ...r, [b]: lo - 1 }); if (hi + 1 <= r[b] - 1) pieces.push({ ...r, [a]: hi + 1 });
        const savedList = list.slice(), savedCls = new Map(d.cls);
        d[name] = [...list.slice(0, i), ...pieces, ...list.slice(i + 1)]; sync();
        // Nur entfernen, wenn kein Netzteil abreißt: Hauptnetz verliert höchstens die entfernten Zellen, keine neue Trennung
        const now = state();
        if (now.areas <= base.areas && now.scc >= base.scc - (base.roads - now.roads)) { base = now; removed++; changed = true; break outer; }
        d[name] = savedList; d.cls = savedCls; skip.add(key);
      }
    }
  }
  return removed;
}

// Kurze Sackgassen entfernen: Straßenstücke bis maxLen Zellen, deren eines Ende an keine andere Straße stößt.
// Nur wenn das Hauptnetz dadurch nicht zerfällt (wie bei dedupeRoads).
function pruneStubs(d, maxLen = 10) {
  const { laneGraph, largestScc } = require('./generate');
  const cellsOf = (r, P) => { const out = []; if (P) for (let p = r.pFrom; p <= r.pTo; p++) out.push(K(p, r.q0), K(p, r.q0 + 1)); else for (let q = r.qFrom; q <= r.qTo; q++) out.push(K(r.p0, q), K(r.p0 + 1, q)); return out; };
  const sync = () => { const on = new Set(); for (const r of d.roadsP) for (const k of cellsOf(r, true)) on.add(k); for (const r of d.roadsQ) for (const k of cellsOf(r, false)) on.add(k); for (const [k, c] of d.cls) if (c === 'R' && !on.has(k)) d.cls.set(k, 'S'); };
  const areas = () => { const seen = new Set(); let n = 0; for (const [k, c] of d.cls) { if (c !== 'R' || seen.has(k)) continue; n++; const st = [k]; seen.add(k); while (st.length) { const [p, q] = st.pop().split(',').map(Number); for (const t of [K(p + 1, q), K(p - 1, q), K(p, q + 1), K(p, q - 1)]) if (!seen.has(t) && d.cls.get(t) === 'R') { seen.add(t); st.push(t); } } } return n; };
  const state = () => { const g = laneGraph(d); let roads = 0; for (const c of d.cls.values()) if (c === 'R') roads++; return { scc: largestScc(g).size, areas: areas(), roads }; };
  let base = state(), removed = 0;
  for (let changed = true; changed;) {
    changed = false;
    const count = new Map(); for (const r of d.roadsP) for (const k of cellsOf(r, true)) count.set(k, (count.get(k) || 0) + 1); for (const r of d.roadsQ) for (const k of cellsOf(r, false)) count.set(k, (count.get(k) || 0) + 1);
    for (const [name, P] of [['roadsP', true], ['roadsQ', false]]) {
      for (let i = 0; i < d[name].length && !changed; i++) {
        const r = d[name][i], len = P ? r.pTo - r.pFrom + 1 : r.qTo - r.qFrom + 1; if (len > maxLen) continue;
        // Ende frei: keine Zelle der beiden Endreihen gehört zu einer anderen Straße, und dahinter ist keine Fahrbahn
        const endCells = x => P ? [K(x, r.q0), K(x, r.q0 + 1)] : [K(r.p0, x), K(r.p0 + 1, x)];
        const free = (x0, x1, beyond) => [...endCells(x0), ...endCells(x1)].every(k => (count.get(k) || 0) <= 1) && endCells(beyond).every(k => d.cls.get(k) !== 'R');
        const a = P ? r.pFrom : r.qFrom, b = P ? r.pTo : r.qTo;
        if (!free(a, a + 1, a - 1) && !free(b, b - 1, b + 1)) continue;
        const saved = d[name].slice(), savedCls = new Map(d.cls);
        d[name] = d[name].filter((_, j) => j !== i); sync();
        const now = state();
        if (now.areas <= base.areas && now.scc >= base.scc - (base.roads - now.roads)) { base = now; removed++; changed = true; }
        else { d[name] = saved; d.cls = savedCls; }
      }
    }
  }
  return removed;
}

module.exports = { pruneStubs, dedupeRoads, fixDams, nearWater, quayify, canalP, bridgesQ, dist, pickId, segP, segQ, irregularGrid, ring, stairs, regions, regionLots, put, spread, hotspot };
