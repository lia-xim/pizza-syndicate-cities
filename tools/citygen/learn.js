// Lernt aus den Originalkarten im Spielarchiv, welche Bodenkachel in welcher Umgebung liegt.
// Ergebnis: cache/tiles.json (wird nur zum Erzeugen der Karten gebraucht, nicht zum Installieren).
//   node learn.js [Spielordner]
'use strict';
const fs = require('fs'), path = require('path');
const { readArchive } = require('../resarchive');
const I = require('./iso');

const gameDir = process.argv[2] || 'C:\\Pizza Syndicate';
const resDir = path.join(gameDir, 'Resource');
const BS = String.fromCharCode(92);

// Archive einlesen; mission.res.orig bevorzugen (unverändertes Original).
const mission = fs.existsSync(path.join(resDir, 'mission.res.orig')) ? 'mission.res.orig' : 'mission.res';
const entries = [...readArchive(path.join(resDir, mission)), ...readArchive(path.join(resDir, 'isodaten.res'))];
const rel = e => e.name.replace(/^[A-Za-z]:\\pizza2\\/i, '').toLowerCase();
const byRel = new Map(); for (const e of entries) if (!byRel.has(rel(e))) byRel.set(rel(e), e.data);

// Kacheldefinitionen aus MASTERGFX.iso: vor jedem Pfad "P:\..." stehen u16 id, u16 typ, u32 w, u32 h, u32 x.
function parseGfx(b) {
  const s = b.toString('latin1'); const out = {}; let i = 0;
  while ((i = s.indexOf('P:' + BS, i)) >= 0) {
    const e = s.indexOf('\0', i), p = i - 0x10;
    const id = b.readUInt16LE(p);
    out[id] = { id, typ: b.readUInt16LE(p + 2), w: b.readUInt32LE(p + 4), h: b.readUInt32LE(p + 8), name: s.slice(i, e).split(BS).pop().replace(/\.spr$/i, '').toUpperCase() };
    i = e;
  }
  return out;
}
const gfx = parseGfx(byRel.get('isokarten' + BS + 'mastergfx.iso'));

function cls(v) {
  const id = v & 0xfff;
  if (id === I.FILLER) return 'X';
  if (id === I.FOOTPRINT) return 'B';
  if (id === 0) return 'X';
  // Wasserkanten: U = Kaimauer (UFER-Kacheln), L = abgesenkter Uferweg (Kachel mit Flag 0x4000)
  if (gfx[id] && /^UFER/.test(gfx[id].name)) return 'U';
  if (v & 0x4000) return 'L';
  const t = gfx[id] ? gfx[id].typ : -1;
  return { 1: 'R', 2: 'S', 3: 'P', 4: 'W', 5: 'P', 6: 'N' }[t] || '?';
}

const cities = [...byRel.keys()].filter(k => /^isokarten\\[a-z]{2,3}\.mmp$/.test(k)).map(k => k.slice(10, -4)).filter(c => c !== 'kop' || true);
const ground = {}, deco = {}, classTiles = {};
for (const city of cities) {
  const M = I.loadMap(byRel.get(`isokarten${BS}${city}.mmp`));
  const at = (p, q) => { const [c, r] = I.fromPQ(p, q); return I.inMap(c, r) ? cls(M.L1[I.idx(c, r)]) : 'X'; };
  for (let r = 0; r < I.ACTIVE_H; r++) for (let c = 0; c < I.ACTIVE_W; c++) {
    const v = M.L1[I.idx(c, r)]; const k0 = cls(v); if (k0 === 'X' || k0 === '?') continue;
    const [p, q] = I.toPQ(c, r);
    const key = k0 + ':' + I.DIRS.map(d => at(p + I.DPQ[d][0], q + I.DPQ[d][1])).join('');
    (ground[key] = ground[key] || {})[v] = (ground[key][v] || 0) + 1;
    (classTiles[k0] = classTiles[k0] || {})[v] = (classTiles[k0][v] || 0) + 1;
    const o = M.L2[I.idx(c, r)]; const og = gfx[o & 0xfff];
    if (!og || og.typ < 7) { const d = deco[v] = deco[v] || {}; d[o] = (d[o] || 0) + 1; }
  }
}
// Wahrzeichen (S_xxx): Teile und Grundfläche relativ zum ersten Teil, zum Übernehmen in neue Karten.
// Ohne Wahrzeichen stürzt das Spiel ab, sobald Bewohner eine Sehenswürdigkeit als Ziel wählen.
const landmarks = {};
for (const city of cities) {
  const M = I.loadMap(byRel.get(`isokarten${BS}${city}.mmp`));
  const parts = [];
  for (let r = 0; r < I.ACTIVE_H; r++) for (let c = 0; c < I.ACTIVE_W; c++) {
    const o = M.L2[I.idx(c, r)], g = gfx[o & 0xfff];
    if (g && /^S_/.test(g.name)) { const [p, q] = I.toPQ(c, r); parts.push({ p, q, o, group: g.name.replace(/[A-Z]$/, '') }); }
  }
  const groups = {}; for (const x of parts) (groups[x.group] = groups[x.group] || []).push(x);
  for (const [name, ps] of Object.entries(groups)) {
    // Teile, die weit auseinander liegen (z. B. zweimal S_LIS1B), getrennt halten: nur Teile nahe dem ersten
    const base = ps[0]; const mine = ps.filter(x => Math.abs(x.p - base.p) <= 8 && Math.abs(x.q - base.q) <= 8);
    const cells = new Map();
    const at = (p, q) => { const [c, r] = I.fromPQ(p, q); return I.inMap(c, r) ? I.idx(c, r) : -1; };
    for (const x of mine) cells.set(x.p + ',' + x.q, { l2: x.o });
    // Grundfläche: 0x13d-Zellen unter dem Teil selbst (2x2 wie bei jedem Gebäude: p-1..p, q..q+1).
    // Nicht weiter suchen: sonst kommen Grundflächen der Nachbarhäuser mit, die in der neuen Karte ohne Haus als Grafikmüll erscheinen.
    for (const x of mine) for (let dp = -1; dp <= 0; dp++) for (let dq = 0; dq <= 1; dq++) {
      const i = at(x.p + dp, x.q + dq); if (i < 0 || (M.L1[i] & 0xfff) !== I.FOOTPRINT) continue;
      const k = (x.p + dp) + ',' + (x.q + dq); cells.set(k, Object.assign(cells.get(k) || {}, { fp: true }));
    }
    if (!landmarks[name]) landmarks[name] = { city, cells: [...cells].map(([k, v]) => { const [p, q] = k.split(',').map(Number); return { dp: p - base.p, dq: q - base.q, ...v }; }) };
  }
}

// Gebäudekennungen nach Art (für den Entwurf)
const buildings = {};
for (const g of Object.values(gfx)) if (g.typ >= 7) { const kind = g.name.replace(/[0-9]*[A-C]?$/, ''); (buildings[kind] = buildings[kind] || []).push(g.id); }
const objects = {};
for (const g of Object.values(gfx)) if (g.typ === 0) objects[g.name] = g.id;

fs.mkdirSync(path.join(__dirname, 'cache'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'cache', 'tiles.json'), JSON.stringify({ cities, ground, deco, classTiles, buildings, objects, gfx, landmarks }));
console.log(`Gelernt aus ${cities.length} Karten: ${Object.keys(ground).length} Umgebungen, ${Object.keys(deco).length} Dekorationsregeln.`);
