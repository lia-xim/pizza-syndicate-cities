// Untersucht in den Originalkarten, welche Grundfläche jede Gebäudeart hat und wo der Eingang liegt.
// Eingang = Fußgänger-Wegpunkt (.wlk) mit nur einem Nachbarn direkt an der Grundfläche (Stichweg zur Tür).
//   node tueren_original.js [Spielordner]
'use strict';
const path = require('path');
const { readArchive } = require('../resarchive');
const I = require('./iso');
const { readWlk } = require('./wlk');

const gameDir = process.argv[2] || 'C:\\Pizza Syndicate';
const resDir = path.join(gameDir, 'Resource');
const BS = String.fromCharCode(92);
const fs = require('fs');
const mission = fs.existsSync(path.join(resDir, 'mission.res.orig')) ? 'mission.res.orig' : 'mission.res';
const entries = [...readArchive(path.join(resDir, mission)), ...readArchive(path.join(resDir, 'isodaten.res'))];
const rel = e => e.name.replace(/^[A-Za-z]:\\pizza2\\/i, '').toLowerCase();
const byRel = new Map(); for (const e of entries) if (!byRel.has(rel(e))) byRel.set(rel(e), e.data);
const T = require('./cache/tiles.json');

const cities = T.cities;
const stats = {};   // Art -> { fp: {Muster: n}, door: {dp,dq: n} }
for (const city of cities) {
  const M = I.loadMap(byRel.get(`isokarten${BS}${city}.mmp`));
  const wb = byRel.get(`isokarten${BS}${city}.wlk`); if (!wb) continue;
  let people; try { [, people] = readWlk(wb); } catch (e) { console.log("übersprungen", city, "(Version", wb.readUInt32LE(0).toString(16) + ")"); continue; }
  // Wegpunkte auf Zellen abbilden (x,y = Zellmittelpunkt in Pixeln)
  const node = new Map();
  for (const n of people) {
    const r = Math.round(n.y / 16), c = Math.round((n.x - (r % 2 === 0 ? 32 : 0)) / 64);
    const [p, q] = I.toPQ(c, r); node.set(p + ',' + q, n);
  }
  const fpAt = (p, q) => { const [c, r] = I.fromPQ(p, q); return I.inMap(c, r) && (M.L1[I.idx(c, r)] & 0xfff) === I.FOOTPRINT; };
  for (let r = 0; r < I.ACTIVE_H; r++) for (let c = 0; c < I.ACTIVE_W; c++) {
    const o = M.L2[I.idx(c, r)], g = T.gfx[o & 0xfff]; if (!g || g.typ < 7) continue;
    const kind = g.name.replace(/[0-9]*[A-D]?$/, '');
    const [p, q] = I.toPQ(c, r);
    // Grundfläche: zusammenhängende 0x13d-Zellen im Umkreis 3 um den Anker
    const fp = []; for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) if (fpAt(p + a, q + b)) fp.push([a, b]);
    const s = stats[kind] = stats[kind] || { n: 0, fp: {}, door: {}, mirror: {} };
    s.n++;
    const key = fp.map(x => x.join(',')).join(' ');
    s.fp[key] = (s.fp[key] || 0) + 1;
    // Wegpunkte, die an der Grundfläche liegen (Kantennachbar einer Grundflächenzelle), mit relativer Lage
    const fpSet = new Set(fp.map(([a, b]) => (p + a) + ',' + (q + b)));
    for (let a = -4; a <= 4; a++) for (let b = -4; b <= 4; b++) {
      const k = (p + a) + ',' + (q + b); const n = node.get(k); if (!n || fpSet.has(k)) continue;
      const touches = I.DIRS.some(dir => fpSet.has((p + a + I.DPQ[dir][0]) + ',' + (q + b + I.DPQ[dir][1])));
      if (touches && n.next.length === 1) { const dk = a + ',' + b + (o & 0x8000 ? ' gespiegelt' : ''); s.door[dk] = (s.door[dk] || 0) + 1; }
    }
  }
}
for (const [k, s] of Object.entries(stats).sort()) {
  const top = o => Object.entries(o).sort((x, y) => y[1] - x[1]).slice(0, 4).map(([a, n]) => `[${a}] x${n}`).join('  ');
  console.log(`${k.padEnd(8)} n=${s.n}\n   Grundfläche: ${top(s.fp)}\n   Stichweg-Ende: ${top(s.door)}`);
}
