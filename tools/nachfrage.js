// Vergleicht die Nachfrage-Grundlagen der Mod-Städte mit allen Originalstädten.
//   node tools/nachfrage.js [Spielordner]
// Gelesen werden die Stadtwerte (Citydata.cif) und die Karten (.mmp) aus dem unveränderten Archiv
// mission.res.orig bzw. mission.res, die Mod-Städte aus staedte.json und karten/.
// Kennzahlen:
//   Figuren   Fußgänger auf der Karte (Laufkundschaft), Feld 0x3e der Stadtdaten
//   Wohnhäuser  Haushalte, aus denen telefonisch bestellt wird
//   Kaufkraft   Faktor auf die Zahlungsbereitschaft
//   Index     (Figuren + Wohnhäuser) x Kaufkraft, normiert auf die beste Originalstadt = 100
'use strict';
const fs = require('fs'), path = require('path');
const { readArchive } = require('./resarchive');
const I = require('./citygen/iso');

const gameDir = process.argv[2] || 'C:\\Pizza Syndicate';
const resDir = path.join(gameDir, 'Resource');
const src = fs.existsSync(path.join(resDir, 'mission.res.orig')) ? 'mission.res.orig' : 'mission.res';
const BS = '\\';
const entries = [...readArchive(path.join(resDir, src)), ...readArchive(path.join(resDir, 'isodaten.res'))];
const rel = e => e.name.replace(/^[A-Za-z]:\\pizza2\\/i, '').toLowerCase();
const byRel = new Map(); for (const e of entries) if (!byRel.has(rel(e))) byRel.set(rel(e), e.data);
const T = require('./citygen/cache/tiles.json');

function countBuildings(buf) {
  const M = I.loadMap(buf); const n = { alle: 0, WOHN: 0, LEER: 0, HOTE: 0, STAD: 0 };
  for (let r = 0; r < I.ACTIVE_H; r++) for (let c = 0; c < I.ACTIVE_W; c++) {
    const g = T.gfx[M.L2[I.idx(c, r)] & 0xfff]; if (!g || g.typ < 7) continue;
    n.alle++; const k = g.name.replace(/[0-9]*[A-C]?$/, ''); if (k in n) n[k]++;
  }
  return n;
}
const rows = [];
for (const k of byRel.keys()) {
  const m = k.match(/^world\\cities\\([a-z0-9]+)\\citydata\.cif$/); if (!m) continue;
  const cif = byRel.get(k), code = m[1];
  const map = byRel.get(`isokarten${BS}${code}.mmp`); if (!map) continue;
  rows.push({ stadt: cif.toString('latin1', 0, 30).replace(/\0.*$/s, ''), code: code.toUpperCase(), mod: false,
    figuren: cif.readUInt16LE(0x3e), kaufkraft: cif.readDoubleLE(0x50), touristen: cif[0x5c], ...countBuildings(map) });
}
const spec = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'staedte.json'), 'utf8'));
for (const s of spec.staedte) rows.push({ stadt: s.name, code: s.kuerzel, mod: true, figuren: s.einwohner, kaufkraft: s.kaufkraft, touristen: s.touristen,
  ...countBuildings(fs.readFileSync(path.join(__dirname, '..', s.karte))) });
for (const r of rows) r.roh = (r.figuren + r.WOHN) * r.kaufkraft;
const best = Math.max(...rows.filter(r => !r.mod).map(r => r.roh));
for (const r of rows) r.index = Math.round(r.roh / best * 100);
rows.sort((a, b) => b.index - a.index);
const pad = (v, n) => String(v).padStart(n);
console.log('Stadt            Kürzel  Figuren  Wohnh.  Gebäude  Läden  Hotels  Stadien  Kaufkr.  Touris  Index');
for (const r of rows) console.log(`${(r.mod ? '* ' : '  ') + r.stadt.padEnd(15)}${pad(r.code, 6)}${pad(r.figuren, 9)}${pad(r.WOHN, 8)}${pad(r.alle, 9)}${pad(r.LEER, 7)}${pad(r.HOTE, 8)}${pad(r.STAD, 9)}${pad(r.kaufkraft.toFixed(2), 9)}${pad(r.touristen, 8)}${pad(r.index, 7)}`);
console.log('* = Mod-Stadt. Index: (Figuren + Wohnhäuser) x Kaufkraft, beste Originalstadt = 100.');
