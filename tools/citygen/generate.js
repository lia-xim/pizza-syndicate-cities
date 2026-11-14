// Erzeugt aus einem Entwurf (Klassenraster in Iso-Koordinaten) eine Spielkarte (.mmp) und Wegedatei (.wlk).
// Klassen: R Straße, S Gehweg/Platz, P Park, W Wasser, N Sand, B Gebäudegrundfläche (wird gesetzt), X außerhalb.
'use strict';
const fs = require('fs'), path = require('path');
const I = require('./iso');
const { writeWlk, MAX } = require('./wlk');

const T = JSON.parse(fs.readFileSync(path.join(__dirname, 'cache', 'tiles.json'), 'utf8'));
// Eigene Grafiken der Mod (gfx/eintraege.json, gebaut mit tools/art/build.js): Grafiknummern und Wahrzeichen ergänzen
{
  const f = path.join(__dirname, '..', '..', 'gfx', 'eintraege.json');
  if (fs.existsSync(f)) {
    const g = JSON.parse(fs.readFileSync(f, 'utf8'));
    for (const e of g.eintraege) T.gfx[e.id] = { id: e.id, typ: e.typ, w: e.w, h: e.h, name: e.name };
    for (const [name, w] of Object.entries(g.wahrzeichen)) T.landmarks[name] = { city: w.stadt, eigen: true, cells: w.cells };
  }
}
const K = (p, q) => p + ',' + q;
const SPECIAL_DECO = /TUNNEL|SHIP|HAFE|^WERB|^PARK2_06$|^PARK2_12$|^S_/;

function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

class Design {
  constructor(seed = 1) {
    this.rand = rng(seed); this.cls = new Map(); this.buildings = []; this.objects = []; this.roadsP = []; this.roadsQ = [];
    this.noWalk = new Set(); this.noBuild = new Set(); this.crossEvery = 6;
    for (let r = 0; r < I.ACTIVE_H; r++) for (let c = 0; c < I.ACTIVE_W; c++) { const [p, q] = I.toPQ(c, r); this.cls.set(K(p, q), 'S'); }
  }
  valid(p, q) { return this.cls.has(K(p, q)); }
  get(p, q) { return this.cls.get(K(p, q)) || 'X'; }
  set(p, q, k) { if (this.valid(p, q)) this.cls.set(K(p, q), k); }
  rect(p0, q0, p1, q1, k) { for (let p = Math.min(p0, p1); p <= Math.max(p0, p1); p++) for (let q = Math.min(q0, q1); q <= Math.max(q0, q1); q++) this.set(p, q, k); }
  // Straße entlang p über die Zellen q0 und q0+1; entlang q über p0 und p0+1.
  roadP(q0, pFrom = -200, pTo = 400) { this.rect(pFrom, q0, pTo, q0 + 1, 'R'); this.roadsP.push({ q0, pFrom, pTo }); }
  roadQ(p0, qFrom = -200, qTo = 400) { this.rect(p0, qFrom, p0 + 1, qTo, 'R'); this.roadsQ.push({ p0, qFrom, qTo }); }
  // Gebäude: Grundfläche p-1..p, q..q+1, Anker (p,q). Tür liegt bei (p+1, q-1).
  canBuild(p, q) {
    for (const [dp, dq] of [[0, 0], [-1, 0], [0, 1], [-1, 1]]) if (this.get(p + dp, q + dq) !== 'S' || this.noWalk.has(K(p + dp, q + dq)) || this.noBuild.has(K(p + dp, q + dq)) || this.buildings.some(b => b.p + 1 === p + dp && b.q - 1 === q + dq)) return false;
    return this.get(p + 1, q - 1) === 'S' && !this.noWalk.has(K(p + 1, q - 1));
  }
  build(p, q, id, mirror) {
    if (!this.canBuild(p, q)) return false;
    for (const [dp, dq] of [[0, 0], [-1, 0], [0, 1], [-1, 1]]) this.set(p + dp, q + dq, 'B');
    this.buildings.push({ p, q, id, mirror: mirror === undefined ? this.rand() < 0.5 : mirror });
    return true;
  }
  object(p, q, id) { this.objects.push({ p, q, id }); }
  // Hafen wie in Lissabon: Grundfläche p-1..p, q-1..q+1 (ohne p,q+1), Anleger bei (p, q-2),
  // Kaimauer bei p+3, Schiff bei p+4 im Wasser. Wasser muss ab p+3 bereits gesetzt sein.
  harbor(p, q, withShip = true) {
    const cells = [[-1, -1], [0, -1], [-1, 0], [0, 0], [-1, 1]];
    if (cells.some(([dp, dq]) => this.get(p + dp, q + dq) !== 'S') || this.get(p + 1, q - 1) !== 'S') return false;
    for (const [dp, dq] of cells) this.set(p + dp, q + dq, 'B');
    this.buildings.push({ p, q, id: T.buildings.HAFE[0], mirror: false });
    this.object(p, q - 2, T.objects.HAFE1B);
    if (withShip && ['W', 'L'].includes(this.get(p + 4, q))) this.object(p + 4, q, this.rand() < 0.5 ? T.objects.SHIP1 : T.objects.SHIP2);
    return true;
  }
  // Wahrzeichen aus einer Originalkarte übernehmen (Pflicht: mindestens eins je Stadt).
  // Alle betroffenen Zellen samt Rand müssen Gehweg oder Park sein.
  landmark(name, p, q) {
    const lm = T.landmarks[name]; if (!lm) throw new Error('Wahrzeichen unbekannt: ' + name);
    const ground = this.landmarkGround || ['S', 'P'];   // Gizeh: Pyramiden stehen auf Sand ('N')
    // Aufgesetzte Teile hoher Türme (nur Bild, ohne Grundfläche, weit oberhalb des Ankerfelds) brauchen nur ein freies Feld
    const top = c => c.l2 && !c.fp && T.gfx[c.l2 & 0xfff].typ < 7;
    const busy = new Set(this.objects.map(o => K(o.p, o.q)));
    for (const c of lm.cells) {
      if (top(c)) { const k = this.get(p + c.dp, q + c.dq); if (!k || k === 'B' || k === 'X' || busy.has(K(p + c.dp, q + c.dq))) return false; continue; }
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (!ground.includes(this.get(p + c.dp + a, q + c.dq + b))) return false;
    }
    for (const c of lm.cells) {
      // Über dem Turm nichts bauen: Gebäude in den Feldern dazwischen würden über den aufgesetzten Teil gezeichnet
      if (top(c)) { const n = Math.max(Math.abs(c.dp), Math.abs(c.dq)); for (let j = 1; j <= n; j++) for (const [a, b] of [[0, 0], [1, 0], [0, -1], [-1, 0], [0, 1]]) this.noBuild.add(K(p - j + a, q + j + b)); }
      if (c.fp) this.set(p + c.dp, q + c.dq, 'B');
      if (c.l2) this.object(p + c.dp, q + c.dq, c.l2);
      // Sockel des Gebäudeteils nicht begehen, auch wo das Original dort normalen Boden hat
      if (c.l2 && T.gfx[c.l2 & 0xfff].typ >= 7) for (const [a, b] of [[-1, 0], [0, 0], [-1, 1], [0, 1]]) this.noWalk.add(K(p + c.dp + a, q + c.dq + b));
    }
    (this.landmarks = this.landmarks || []).push(name);
    return true;
  }
  // Straßenraster: Linien in p und q, liefert die Blöcke (Gehwegflächen zwischen den Straßen).
  grid(pLines, qLines, { pRange = [-200, 400], qRange = [-200, 400] } = {}) {
    for (const q of qLines) this.roadP(q, pRange[0], pRange[1]);
    for (const p of pLines) this.roadQ(p, qRange[0], qRange[1]);
    const ps = [pRange[0] - 2, ...pLines, pRange[1] + 1], qs = [qRange[0] - 2, ...qLines, qRange[1] + 1];
    const blocks = [];
    for (let i = 0; i + 1 < ps.length; i++) for (let j = 0; j + 1 < qs.length; j++) blocks.push({ pmin: ps[i] + 2, pmax: ps[i + 1] - 1, qmin: qs[j] + 2, qmax: qs[j + 1] - 1, i, j });
    return blocks;
  }
  // Füllt einen Block (Gehwegfläche zwischen Straßen, Grenzen inklusive) mit Gebäudereihen.
  // Ein Rand von 1 Zelle bleibt Gehweg. Reihen: 2 Zellen Gebäude + rowGap Zellen Gehweg (Türreihe).
  // kind(pa, qa, row, col) liefert eine Gebäudekennung oder null.
  fillBlock(pmin, pmax, qmin, qmax, kind, { colGap = 1, rowGap = 1, margin = 1 } = {}) {
    let n = 0, row = 0;
    for (let qTop = qmax - margin; qTop - 1 >= qmin + margin; qTop -= 2 + rowGap, row++) {
      const qa = qTop - 1; if (qa - 1 < qmin) break;
      let col = 0;
      for (let pa = pmin + margin + 1; pa + 1 <= pmax; pa += 2 + colGap, col++) {
        if (pa > pmax - margin) break;
        const id = kind(pa, qa, row, col); if (id == null) continue;
        if (this.build(pa, qa, id)) n++;
      }
    }
    return n;
  }
  pick(list) { return list[Math.floor(this.rand() * list.length)]; }
  // Wohnhäuser im Stil der Region (wohnStyle), große Häuser daraus für dichte Viertel
  wohn() { return this.wohnStyle || T.buildings.WOHN; }
  wohnBig() { const w = this.wohn(), big = w.filter(id => T.gfx[id].h >= 168); if (big.length) return big; const hs = w.map(id => T.gfx[id].h).sort((a, b) => a - b); return w.filter(id => T.gfx[id].h >= hs[Math.floor(hs.length / 2)]); }
  // Bauplätze eines Blocks sammeln, ohne zu bauen (gleiches Raster wie fillBlock).
  lots(pmin, pmax, qmin, qmax, opts = {}) {
    const out = []; const saved = this.build; this.build = (p, q) => { if (this.canBuild(p, q)) { out.push({ p, q }); } return false; };
    this.fillBlock(pmin, pmax, qmin, qmax, () => 0, opts); this.build = saved; return out;
  }
  // Verteilt eine Zusammensetzung {Art: Anzahl} zufällig auf Bauplätze; Rest wird mit fill (z. B. WOHN) belegt, bis max erreicht.
  assign(lots, comp, B, fill = 'WOHN', max = Infinity) {
    const kinds = []; for (const [k, n] of Object.entries(comp)) for (let i = 0; i < n; i++) kinds.push(k);
    const order = lots.map((l, i) => [this.rand(), i]).sort((a, b) => a[0] - b[0]).map(x => lots[x[1]]);
    let placed = 0; const counts = {};
    for (const lot of order) {
      if (placed >= max) break;
      const k = kinds.length ? kinds.shift() : fill; if (!k) break;
      if (this.build(lot.p, lot.q, this.pick(B[k]))) { placed++; counts[k] = (counts[k] || 0) + 1; }
    }
    return counts;
  }
}
// Zusammensetzung wie in einer typischen Originalstadt (ohne Wohnhäuser).
const STANDARD = { BANK: 7, BUER: 5, CLUB: 6, EKZ: 2, FABR: 5, FEUE: 1, FZZ: 3, GEFA: 1, HOTE: 5, KAUF: 8, LEER: 20, LIE: 4, SCHU: 3, UNIV: 1, VERW: 1 };

// ---------- Boden automatisch kacheln ----------
const groundByClass = {};
for (const [key, vals] of Object.entries(T.ground)) (groundByClass[key[0]] = groundByClass[key[0]] || []).push([key.slice(2), vals]);
const WEIGHT = { N: 1, NE: 3, E: 1, SE: 3, S: 1, SW: 3, W: 1, NW: 3 };
// Zebrastreifen (STREIFEN_04..07) und abgesenkte Bordsteine daneben (BORDSTEIN_08/11) gibt es nur paarweise an Überwegen.
// Sie werden gezielt an den Überwegen des Fußwegnetzes gesetzt, nie einzeln aus der Umgebung gewählt.
const ZEBRA = [0x26, 0x27, 0x29], CROSS_TILES = new Set([0x19, 0x1a, 0x26, 0x27, 0x28, 0x29]);
function chooseValue(vals, rand) {
  let e = Object.entries(vals).map(([v, n]) => [+v, n]);
  const clean = e.filter(([v]) => !CROSS_TILES.has(v & 0xfff)); if (clean.length) e = clean; else return null;
  const mx = Math.max(...e.map(x => x[1]));
  const ok = e.filter(x => x[1] >= mx * 0.3); const tot = ok.reduce((a, b) => a + b[1], 0);
  let r = rand() * tot; for (const [v, n] of ok) { if ((r -= n) < 0) return v; } return ok[0][0];
}
function groundTile(d, p, q, stats) {
  const c0 = d.get(p, q);
  const nb = I.DIRS.map(dir => { const k = d.get(p + I.DPQ[dir][0], q + I.DPQ[dir][1]); return k; }).join('');
  const key = c0 + ':' + nb;
  if (T.ground[key]) { const v = chooseValue(T.ground[key], d.rand); if (v !== null) return v; }
  // Gebäudeflächen sind für Gehwegkacheln wie Gehweg: zweiter Versuch mit B -> S
  const keyS = c0 + ':' + nb.replace(/B/g, 'S');
  if (c0 === 'S' && T.ground[keyS]) { const v = chooseValue(T.ground[keyS], d.rand); if (v !== null) { stats.subst = (stats.subst || 0) + 1; return v; } }
  stats.miss = (stats.miss || 0) + 1; (stats.inexact = stats.inexact || new Set()).add(K(p, q)); (stats.keys = stats.keys || {})[key] = (stats.keys[key] || 0) + 1;
  let best = null, bd = 1e9;
  for (const [k, vals] of groundByClass[c0] || []) {
    if (Object.keys(vals).every(v => CROSS_TILES.has(+v & 0xfff))) continue;
    let dist = 0; for (let i = 0; i < 8; i++) if (k[i] !== nb[i]) dist += WEIGHT[I.DIRS[i]] * (k[i] === 'X' || nb[i] === 'X' ? 0.5 : 1);
    const n = Object.values(vals).reduce((a, b) => a + b, 0);
    dist -= Math.min(n, 1000) / 100000; // bei Gleichstand häufige Umgebung
    if (dist < bd) { bd = dist; best = vals; }
  }
  if (bd >= 6) stats.bad = (stats.bad || 0) + 1;
  return chooseValue(best || T.classTiles[c0], d.rand) ?? 1;
}

// ---------- Wegenetze ----------
function laneGraph(d) {
  const isR = (p, q) => d.get(p, q) === 'R';
  const dirs = new Map(); const add = (p, q, mv) => { if (!isR(p, q)) return; const k = K(p, q); if (!dirs.has(k)) dirs.set(k, new Set()); dirs.get(k).add(mv); };
  for (const r of d.roadsP) for (let p = r.pFrom; p <= r.pTo; p++) { add(p, r.q0, '+p'); add(p, r.q0 + 1, '-p'); }
  for (const r of d.roadsQ) for (let q = r.qFrom; q <= r.qTo; q++) { add(r.p0, q, '-q'); add(r.p0 + 1, q, '+q'); }
  const step = { '+p': [1, 0], '-p': [-1, 0], '+q': [0, 1], '-q': [0, -1] };
  const opp = { '+p': [0, 1], '-p': [0, -1], '+q': [-1, 0], '-q': [1, 0] }; // Gegenspur
  const out = new Map();
  for (const [k, set] of dirs) {
    const [p, q] = k.split(',').map(Number); const nx = [];
    for (const mv of set) { const [dp, dq] = step[mv]; if (dirs.has(K(p + dp, q + dq))) nx.push(K(p + dp, q + dq)); }
    if (!nx.length) for (const mv of set) { const [dp, dq] = opp[mv]; if (dirs.has(K(p + dp, q + dq))) nx.push(K(p + dp, q + dq)); }
    out.set(k, [...new Set(nx)]);
  }
  return out;
}
function carGraph(d) {
  const out = laneGraph(d);
  // Nur die größte stark zusammenhängende Komponente behalten (Autos dürfen nirgends steckenbleiben)
  const keep = largestScc(out);
  for (const k of [...out.keys()]) if (!keep.has(k)) out.delete(k);
  for (const [k, nx] of out) out.set(k, nx.filter(t => out.has(t)));
  return compress(out, 3);
}
function largestScc(g) {
  const keys = [...g.keys()], id = new Map(keys.map((k, i) => [k, i])), n = keys.length;
  const nxt = keys.map(k => g.get(k).filter(t => id.has(t)).map(t => id.get(t))), rev = keys.map(() => []);
  nxt.forEach((ns, i) => ns.forEach(j => rev[j].push(i)));
  const order = [], seen = new Array(n).fill(false);
  for (let s = 0; s < n; s++) {
    if (seen[s]) continue; const st = [[s, 0]]; seen[s] = true;
    while (st.length) { const t = st[st.length - 1]; if (t[1] < nxt[t[0]].length) { const w = nxt[t[0]][t[1]++]; if (!seen[w]) { seen[w] = true; st.push([w, 0]); } } else { order.push(t[0]); st.pop(); } }
  }
  const comp = new Array(n).fill(-1); const members = [];
  for (let i = order.length - 1; i >= 0; i--) {
    const s = order[i]; if (comp[s] >= 0) continue; const c = members.length; const m = []; const st = [s]; comp[s] = c;
    while (st.length) { const v = st.pop(); m.push(v); for (const w of rev[v]) if (comp[w] < 0) { comp[w] = c; st.push(w); } }
    members.push(m);
  }
  members.sort((a, b) => b.length - a.length);
  return new Set((members[0] || []).map(i => keys[i]));
}
function peopleGraph(d) {
  const walk = (p, q) => { const k = d.get(p, q); return (k === 'S' || k === 'P' || k === 'L') && !d.noWalk.has(K(p, q)); };
  // Stege: kurze Fußwege über schmale Kanäle (wie in Venedig), gleichmäßig verteilt
  const steg = [];
  if (d.stegEvery) {
    const water = (p, q) => { const k = d.get(p, q); return k === 'W' || k === 'U' || k === 'L'; };
    const cand = [];
    for (const k of d.cls.keys()) {
      const [p, q] = k.split(',').map(Number); if (!['S', 'P'].includes(d.get(p, q))) continue;
      for (const [dp, dq] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        if (d.get(p + dp, q + dq) !== 'W' && d.get(p + dp, q + dq) !== 'U' && d.get(p + dp, q + dq) !== 'L') continue;
        let t = 1, sawW = false; while (t <= 6 && water(p + dp * t, q + dq * t)) { if (d.get(p + dp * t, q + dq * t) === 'W') sawW = true; t++; }
        if (sawW && t <= 6 && ['S', 'P'].includes(d.get(p + dp * t, q + dq * t))) cand.push([k, K(p + dp * t, q + dq * t), p, q]);
      }
    }
    for (const c of cand.sort(() => d.rand() - 0.5)) if (steg.every(s => Math.abs(s[2] - c[2]) + Math.abs(s[3] - c[3]) >= d.stegEvery)) steg.push(c);
  }
  const doors = new Set(d.buildings.map(b => K(b.p + 1, b.q - 1)));
  const adj = new Map();
  const link = (a, b) => { adj.get(a).add(b); adj.get(b).add(a); };
  // Gerüst: Gehwegzellen am Fahrbahnrand, Türen und die kürzesten Wege von jeder Tür zum Fahrbahnrand.
  const nb4 = (p, q) => [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dp, dq]) => [p + dp, q + dq]);
  const nb8 = (p, q) => I.DIRS.map(dir => [p + I.DPQ[dir][0], q + I.DPQ[dir][1]]);
  const skel = new Set();
  for (const k of d.cls.keys()) { const [p, q] = k.split(',').map(Number); if (walk(p, q) && nb8(p, q).some(([a, b]) => d.get(a, b) === 'R')) skel.add(k); }
  for (const k of d.extraWalk || []) skel.add(k);
  for (const [a, b] of steg) { skel.add(a); skel.add(b); }
  const parent = new Map(); const queue = [...skel]; for (const k of queue) parent.set(k, null);
  for (let i = 0; i < queue.length; i++) { const [p, q] = queue[i].split(',').map(Number); for (const [a, b] of nb4(p, q)) { const t = K(a, b); if (!parent.has(t) && walk(a, b)) { parent.set(t, queue[i]); queue.push(t); } } }
  for (const dk of doors) { let k = dk; while (k && !skel.has(k)) { skel.add(k); k = parent.get(k); } }
  for (const k of skel) { const [p, q] = k.split(',').map(Number); if (walk(p, q)) adj.set(k, new Set()); }
  for (const k of adj.keys()) { const [p, q] = k.split(',').map(Number); for (const [dp, dq] of [[1, 0], [0, 1]]) { const t = K(p + dp, q + dq); if (adj.has(t)) link(k, t); } }
  for (const [a, b] of steg) if (adj.has(a) && adj.has(b) && adj.get(a).size < 4 && adj.get(b).size < 4) link(a, b);
  d.stegCount = steg.length;
  // Überwege über Straßen: Gehwegzellen links und rechts einer Fahrbahn verbinden
  const crossings = [];
  for (const r of d.roadsP) for (let p = r.pFrom; p <= r.pTo; p++) { const a = K(p, r.q0 - 1), b = K(p, r.q0 + 2); if (adj.has(a) && adj.has(b) && d.get(p, r.q0) === 'R' && d.get(p, r.q0 + 1) === 'R') crossings.push([a, b, p]); }
  for (const r of d.roadsQ) for (let q = r.qFrom; q <= r.qTo; q++) { const a = K(r.p0 - 1, q), b = K(r.p0 + 2, q); if (adj.has(a) && adj.has(b) && d.get(r.p0, q) === 'R' && d.get(r.p0 + 1, q) === 'R') crossings.push([a, b, q]); }
  // Je Straßenabschnitt ein Überweg am Anfang und danach alle crossEvery Zellen
  const ckey = c => c[0] + '|' + c[1];
  const set = new Set(crossings.map(ckey));
  // Ein Überweg braucht eine gerade Stelle: Fahrbahn läuft beidseitig weiter, an beiden Enden gerader Gehweg (Rampe).
  let since = Infinity; d.zebras = [];
  for (const c of crossings) {
    const [a, b] = c; const [pa, qa] = a.split(',').map(Number), [pb, qb] = b.split(',').map(Number);
    const alongQ = pa === pb - 3; // a und b liegen in p auseinander -> Straße entlang q
    const along = alongQ ? [0, 1] : [1, 0];
    const prev = K(pa - along[0], qa - along[1]) + '|' + K(pb - along[0], qb - along[1]);
    if (!set.has(prev)) since = Infinity;
    const road = alongQ ? [[pa + 1, qa], [pa + 2, qa]] : [[pa, qa + 1], [pa, qa + 2]];
    const straight = [-1, 1].every(s => road.every(([p, q]) => d.get(p + along[0] * s, q + along[1] * s) === 'R')
      && [[pa, qa], [pb, qb]].every(([p, q]) => d.get(p + along[0] * s, q + along[1] * s) !== 'R'))
      && d.get(pa, qa) === 'S' && d.get(pb, qb) === 'S';
    if (straight && since >= d.crossEvery && adj.get(a).size < 4 && adj.get(b).size < 4) {
      link(a, b); since = 0;
      // Straße entlang p (a/b unterscheiden sich in q): Kacheln ungespiegelt, Rampe 0x19 auf der NO-Seite (q groß).
      // Straße entlang q: gespiegelt, Rampe 0x8019 auf der NW-Seite (p klein).
      d.zebras.push(alongQ
        ? { road, mirror: true, rampA: [pa, qa, 0x8019], rampB: [pb, qb, 0x1a] }
        : { road, mirror: false, rampA: [pb, qb, 0x19], rampB: [pa, qa, 0x801a] });
    } else since++;
  }
  for (const k of doors) if (!adj.has(k)) throw new Error('Tür nicht begehbar: ' + k);
  // Getrennte Teilnetze über Gehwegflächen verbinden (z. B. Inseln auf großen Plätzen)
  for (let guard = 0; guard < 200; guard++) {
    const comp = new Map(); let id = 0; const sizes = [];
    for (const s of adj.keys()) { if (comp.has(s)) continue; const st = [s]; comp.set(s, id); let n = 0; while (st.length) { const v = st.pop(); n++; for (const w of adj.get(v)) if (!comp.has(w)) { comp.set(w, id); st.push(w); } } sizes.push(n); id++; }
    if (sizes.length <= 1) break;
    const main = sizes.indexOf(Math.max(...sizes));
    // Breitensuche von der Hauptkomponente über begehbare Zellen bis zu einer anderen Komponente
    const par = new Map(); const qu = [];
    for (const [k, c] of comp) if (c === main) { par.set(k, null); qu.push(k); }
    let hit = null;
    for (let i = 0; i < qu.length && !hit; i++) {
      const [p, q] = qu[i].split(',').map(Number);
      for (const [a, b] of nb4(p, q)) { const t = K(a, b); if (par.has(t) || !walk(a, b)) continue; par.set(t, qu[i]); if (comp.has(t) && comp.get(t) !== main) { hit = t; break; } qu.push(t); }
    }
    if (!hit) break;
    let k = hit; while (par.get(k)) { const pk = par.get(k); if (!adj.has(pk)) adj.set(pk, new Set()); if (adj.get(k).size < 4 && adj.get(pk).size < 4) link(k, pk); else break; k = pk; }
  }
  // Größte zusammenhängende Fläche behalten; jede Tür muss darin liegen
  const seen = new Map(); let best = null;
  for (const s of adj.keys()) {
    if (seen.has(s)) continue; const m = [s]; seen.set(s, m); const st = [s];
    while (st.length) { const v = st.pop(); for (const w of adj.get(v)) if (!seen.has(w)) { seen.set(w, m); m.push(w); st.push(w); } }
    if (!best || m.length > best.length) best = m;
  }
  const main = new Set(best);
  d.unreachableDoors = [...doors].filter(k => !main.has(k));
  for (const k of [...adj.keys()]) if (!main.has(k)) adj.delete(k);
  const g = new Map([...adj].map(([k, s]) => [k, [...s]]));
  return compress(g, 4, doors, true);
}
// Entfernt gerade Zwischenpunkte, damit das Netz unter 2500 Punkten bleibt. Kanten bleiben als Gerade erhalten.
function compress(g, maxLen, keep = new Set(), undirected = false) {
  const inc = new Map([...g.keys()].map(k => [k, []])); for (const [a, ns] of g) for (const b of ns) inc.get(b).push(a);
  const pq = k => k.split(',').map(Number);
  const removable = k => {
    if (keep.has(k)) return null; const o = g.get(k), i = inc.get(k);
    if (undirected) { if (o.length !== 2) return null; const [a, b] = o; const [pa, qa] = pq(a), [pk, qk] = pq(k), [pb, qb] = pq(b); if ((pk - pa) * (qb - qk) !== (qk - qa) * (pb - pk)) return null; return [a, b]; }
    if (o.length !== 1 || i.length !== 1) return null; const a = i[0], b = o[0]; if (a === b) return null;
    const [pa, qa] = pq(a), [pk, qk] = pq(k), [pb, qb] = pq(b); if ((pk - pa) * (qb - qk) !== (qk - qa) * (pb - pk)) return null; return [a, b];
  };
  const len = (a, b) => { const [pa, qa] = pq(a), [pb, qb] = pq(b); return Math.max(Math.abs(pa - pb), Math.abs(qa - qb)); };
  let changed = true;
  while (changed) {
    changed = false;
    for (const k of [...g.keys()]) {
      if (!g.has(k)) continue; const r = removable(k); if (!r) continue; const [a, b] = r; if (len(a, b) > maxLen) continue;
      if (undirected) { g.set(a, g.get(a).map(x => x === k ? b : x)); g.set(b, g.get(b).map(x => x === k ? a : x)); inc.set(a, g.get(a)); inc.set(b, g.get(b)); }
      else { g.set(a, g.get(a).map(x => x === k ? b : x)); inc.set(b, inc.get(b).map(x => x === k ? a : x)); }
      g.delete(k); inc.delete(k); changed = true;
    }
  }
  return g;
}
function toNodes(g) {
  const keys = [...g.keys()].filter(k => g.get(k).length); const index = new Map(keys.map((k, i) => [k, i]));
  return keys.map(k => { const [p, q] = k.split(',').map(Number); const [x, y] = I.centerPQ(p, q); return { key: k, x, y, next: [...new Set(g.get(k))].filter(t => index.has(t)).map(t => index.get(t)) }; });
}
function components(nodes, undirected) {
  const adj = nodes.map(n => new Set(n.next)); if (undirected) nodes.forEach((n, i) => n.next.forEach(j => adj[j].add(i)));
  const seen = new Array(nodes.length).fill(-1); let c = 0; const sizes = [];
  for (let s = 0; s < nodes.length; s++) { if (seen[s] >= 0) continue; const st = [s]; seen[s] = c; let n = 0; while (st.length) { const v = st.pop(); n++; for (const w of adj[v]) if (seen[w] < 0) { seen[w] = c; st.push(w); } } sizes.push(n); c++; }
  return sizes.sort((a, b) => b - a);
}
function strongOk(nodes) { // Jeder Punkt erreicht Punkt 0 und umgekehrt
  const fw = Array(nodes.length).fill(false), bw = Array(nodes.length).fill(false); const rev = nodes.map(() => []); nodes.forEach((n, i) => n.next.forEach(j => rev[j].push(i)));
  const walk = (start, nb, seen) => { const st = [start]; seen[start] = true; while (st.length) { const v = st.pop(); for (const w of nb(v)) if (!seen[w]) { seen[w] = true; st.push(w); } } };
  walk(0, v => nodes[v].next, fw); walk(0, v => rev[v], bw);
  return nodes.filter((_, i) => !(fw[i] && bw[i])).length;
}

// Große leere Gehwegflächen begrünen: Zellen, deren Nachbarn alle Gehweg oder Park sind (keine Gebäude, Türen, Straßen, Wasser),
// werden Park (begehbar, mit Bäumen). Dämme bekommen Grünstreifen neben der Fahrbahn. Plätze mit Bauverbot bleiben gepflastert.
function beautify(d) {
  const doors = new Set(d.buildings.map(b => K(b.p + 1, b.q - 1)));
  const green = [];
  for (const k of d.cls.keys()) {
    if (d.cls.get(k) !== 'S' || doors.has(k) || d.noBuild.has(k) || d.noWalk.has(k)) continue;
    const [p, q] = k.split(',').map(Number); let ok = true;
    for (let a = -1; a <= 1 && ok; a++) for (let b = -1; b <= 1; b++) { const c = d.get(p + a, q + b); if ((c !== 'S' && c !== 'P') || doors.has(K(p + a, q + b))) { ok = false; break; } }
    if (ok) green.push(k);
  }
  // Nur zusammenhängende Grünflächen ab 6 Feldern, keine einzelnen Rasenflecken
  { const set = new Set(green), seen = new Set(), keep = [];
    for (const k of green) { if (seen.has(k)) continue; const m = [k]; seen.add(k); for (let i = 0; i < m.length; i++) { const [p, q] = m[i].split(',').map(Number); for (const t of [K(p + 1, q), K(p - 1, q), K(p, q + 1), K(p, q - 1)]) if (set.has(t) && !seen.has(t)) { seen.add(t); m.push(t); } } if (m.length >= 6) keep.push(...m); }
    green.length = 0; green.push(...keep); }
  for (const k of d.damCells || []) { if (d.cls.get(k) !== 'S' || doors.has(k)) continue; const [p, q] = k.split(',').map(Number); if (![[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([a, b]) => d.get(p + a, q + b) === 'R')) green.push(k); }
  for (const k of green) d.cls.set(k, 'P');
  return green.length;
}

function build(d, outBase) {
  const stats = {};
  stats.begruent = d.noBeautify ? 0 : beautify(d);
  // Gebäude, deren Tür nicht ans Fußwegnetz angebunden ist (z. B. in Kartenecken), wieder entfernen
  const removed = [];
  for (let pass = 0; pass < 3; pass++) {
    peopleGraph(d); if (!d.unreachableDoors.length) break;
    const bad = new Set(d.unreachableDoors);
    d.buildings = d.buildings.filter(b => {
      if (!bad.has(K(b.p + 1, b.q - 1))) return true;
      const cells = b.id === T.buildings.HAFE[0] ? [[-1, -1], [0, -1], [-1, 0], [0, 0], [-1, 1]] : [[0, 0], [-1, 0], [0, 1], [-1, 1]];
      for (const [dp, dq] of cells) d.set(b.p + dp, b.q + dq, 'S');
      removed.push(T.gfx[b.id].name); return false;
    });
  }
  // Fußgängerstädte (d.allowFar): Häuser fern der Straße bleiben, Kunden kommen zu Fuß; nur Lieferungen erreichen sie nicht
  if (!d.allowFar) {
    const cars0 = toNodes(carGraph(d));
    d.buildings = d.buildings.filter(b => {
      if (b.id === T.buildings.HAFE[0]) return true;
      const [bx, by] = I.centerPQ(b.p + 1, b.q - 1);
      if (cars0.some(n => Math.hypot(n.x - bx, n.y - by) <= 330)) return true;
      for (const [dp, dq] of [[0, 0], [-1, 0], [0, 1], [-1, 1]]) d.set(b.p + dp, b.q + dq, 'S');
      removed.push(T.gfx[b.id].name + '(fern)'); return false;
    });
  }
  stats.removed = removed;
  const peopleG = peopleGraph(d);
  const L1 = new Uint16Array(I.W * I.H).fill(I.FILLER), L2 = new Uint16Array(I.W * I.H);
  for (const k of d.cls.keys()) {
    const [p, q] = k.split(',').map(Number); const [c, r] = I.fromPQ(p, q);
    L1[I.idx(c, r)] = d.get(p, q) === 'B' ? I.FOOTPRINT : groundTile(d, p, q, stats);
  }
  const setTile = (p, q, v) => { const [c, r] = I.fromPQ(p, q); L1[I.idx(c, r)] = v; };
  for (const z of d.zebras) {
    for (const [p, q] of z.road) setTile(p, q, ZEBRA[Math.floor(d.rand() * ZEBRA.length)] | (z.mirror ? 0x8000 : 0));
    for (const [p, q, v] of [z.rampA, z.rampB]) setTile(p, q, v);
  }
  stats.zebras = d.zebras.length;
  // Dekoration (Laternen, Bäume, Uferkanten) nach Bodenkachel wie in den Originalkarten
  const doorCells = new Set(d.buildings.map(b => K(b.p + 1, b.q - 1)));
  for (const k of d.cls.keys()) {
    const [p, q] = k.split(',').map(Number); const [c, r] = I.fromPQ(p, q); const v = L1[I.idx(c, r)];
    const dist = T.deco[v]; if (!dist || (d.get(p, q) === 'W' && I.DIRS.every(dir => ['W', 'X'].includes(d.get(p + I.DPQ[dir][0], q + I.DPQ[dir][1])))) || doorCells.has(k) || d.noDeco && d.noDeco(p, q)) continue;
    // Ersatzkacheln an Wasser und Kai: keine Uferobjekte (Geländer, Mauerstücke), die sonst frei im Wasser stehen
    if (stats.inexact && stats.inexact.has(k) && ['W', 'U', 'L', 'N'].includes(d.get(p, q))) continue;
    const tot = Object.values(dist).reduce((a, b) => a + b, 0); let x = d.rand() * tot;
    for (const [o, n] of Object.entries(dist)) { if ((x -= n) < 0) { const g = T.gfx[+o & 0xfff]; if (+o && g && !SPECIAL_DECO.test(g.name)) L2[I.idx(c, r)] = +o; break; } }
  }
  for (const o of d.objects) { const [c, r] = I.fromPQ(o.p, o.q); L2[I.idx(c, r)] = o.id; }
  // Pflichtobjekte wie in jeder Originalkarte: 8 Werbetafeln (Werbeplätze), je 3 Parkobjekte PARK2_06/PARK2_12
  const reserved = new Set(d.objects.map(o => K(o.p, o.q)));
  for (const [re, want] of [[/^WERB/, 8], [/^PARK2_06$/, 3], [/^PARK2_12$/, 3]]) {
    const cand = [];
    for (const k of d.cls.keys()) {
      if (doorCells.has(k) || reserved.has(k)) continue;
      const [p, q] = k.split(',').map(Number); const [c, r] = I.fromPQ(p, q); const i = I.idx(c, r);
      if (L2[i]) continue; const dist = T.deco[L1[i]]; if (!dist) continue;
      const ids = Object.entries(dist).filter(([o]) => T.gfx[+o & 0xfff] && re.test(T.gfx[+o & 0xfff].name));
      const w = ids.reduce((a, b) => a + b[1], 0); if (w) cand.push({ i, k, ids, w: w / Object.values(dist).reduce((a, b) => a + b, 0) });
    }
    let placed = 0;
    while (placed < want && cand.length) {
      const tot = cand.reduce((a, b) => a + b.w, 0); let x = d.rand() * tot; let j = 0;
      for (; j < cand.length - 1; j++) if ((x -= cand[j].w) < 0) break;
      const ch = cand.splice(j, 1)[0]; const sum = ch.ids.reduce((a, b) => a + b[1], 0); let y = d.rand() * sum;
      let id = ch.ids[0][0]; for (const [o, n] of ch.ids) if ((y -= n) < 0) { id = o; break; }
      L2[ch.i] = +id; reserved.add(ch.k); placed++;
    }
    stats.pflicht = Object.assign(stats.pflicht || {}, { [re.source]: placed });
  }
  for (const b of d.buildings) { const [c, r] = I.fromPQ(b.p, b.q); L2[I.idx(c, r)] = b.id | (b.mirror ? 0x8000 : 0); }
  // Wegenetze
  const cars = toNodes(carGraph(d)), people = toNodes(peopleG);
  const report = {
    gebaeude: d.buildings.length, begruent: stats.begruent, ueberwege: stats.zebras, strassennetz: d.roadNet, stege: d.stegCount || 0,
    strasseAmWasser: [...d.cls.keys()].filter(k => { if (d.cls.get(k) !== 'R') return false; const [p, q] = k.split(',').map(Number); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (['W', 'U', 'L', 'N'].includes(d.get(p + a, q + b))) return true; return false; }).length, autoPunkte: cars.length, leutePunkte: people.length,
    fehlendeUmgebungen: stats.miss || 0, schlechteUmgebungen: stats.bad || 0,
    leuteKomponenten: components(people, true).slice(0, 5), autoNichtStark: strongOk(cars),
    unerreichbareTueren: d.unreachableDoors.length, entfernt: stats.removed, wahrzeichen: d.landmarks || [], pflicht: stats.pflicht, missKeys: Object.entries(stats.keys || {}).sort((a, b) => b[1] - a[1]).slice(0, 15),
  };
  // Lieferfahrzeuge suchen den nächsten Autopunkt im Umkreis von 350 Pixeln
  let far = 0; for (const b of d.buildings) { const [bx, by] = I.centerPQ(b.p + 1, b.q - 1); const m = Math.min(...cars.map(n => Math.hypot(n.x - bx, n.y - by))); if (m > 300) far++; }
  report.gebaeudeFernVonStrasse = far;
  // Doppelte Fahrbahnen (zwei Straßen direkt nebeneinander) erkennen: 3x3 Zellen nur Fahrbahn gibt es sonst nicht
  let wide = 0; for (const k of d.cls.keys()) { const [p, q] = k.split(',').map(Number); let all = true; for (let a = 0; a < 3 && all; a++) for (let b = 0; b < 3; b++) if (d.get(p + a, q + b) !== 'R') { all = false; break; } if (all) wide++; }
  report.doppelStrasse = wide;
  if (!(d.landmarks || []).length) throw new Error('Kein Wahrzeichen gesetzt: das Spiel stürzt ohne Sehenswürdigkeit ab.');
  // Feste Listen im Spiel: je Gebäudesorte höchstens 256 Einträge (Wohnung/Arbeitsplatz-Suche), Banken höchstens 11.
  const perKind = {}; for (const b of d.buildings) { const k = T.gfx[b.id].name.replace(/[0-9]*[A-C]?$/, ''); perKind[k] = (perKind[k] || 0) + 1; }
  report.sorten = perKind;
  for (const [k, n] of Object.entries(perKind)) if (n > 250) throw new Error(`Zu viele ${k}: ${n} (Spielgrenze 256 je Sorte)`);
  if ((perKind.BANK || 0) > 11) throw new Error('Mehr als 11 Banken stürzen das Spiel ab.');
  if (cars.length > MAX || people.length > MAX) throw new Error('Zu viele Wegpunkte: ' + JSON.stringify(report));
  fs.writeFileSync(outBase + '.mmp', I.saveMap({ L1, L2 }));
  fs.writeFileSync(outBase + '.wlk', writeWlk(cars, people));
  // Wahrzeichen und ihre Herkunftsstadt: der Installer kopiert das passende Infobild (house\<Kürzel>T<n>.spr)
  fs.writeFileSync(outBase + '.json', JSON.stringify({ wahrzeichen: (d.landmarks || []).map(n => ({ gruppe: n, stadt: T.landmarks[n].city })) }, null, 2));
  return { report, L1, L2, cars, people };
}

module.exports = { Design, build, T, K, STANDARD, laneGraph, largestScc };
