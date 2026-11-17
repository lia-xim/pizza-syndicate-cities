// Prüft in den fertigen Mod-Karten (karten/*.mmp/.wlk) jeden Gebäudeeingang, unabhängig vom Generator.
// Der Eingang liegt bei jedem Gebäude (auch gespiegelt, auch Stadion) auf der Zelle (p+1, q-1) vor dem Anker,
// das zeigen alle Originalkarten (tueren_original.js).
//   node pruefe_tueren.js [kürzel ...] [--detail]
'use strict';
const fs = require('fs'), path = require('path');
const I = require('./iso');
const { readWlk } = require('./wlk');
const T = require('./cache/tiles.json');
{ const f = path.join(__dirname, '..', '..', 'gfx', 'eintraege.json'); if (fs.existsSync(f)) for (const e of JSON.parse(fs.readFileSync(f, 'utf8')).eintraege) T.gfx[e.id] = { id: e.id, typ: e.typ, w: e.w, h: e.h, name: e.name }; }

const args = process.argv.slice(2); const detail = args.includes('--detail');
const want = args.filter(a => !a.startsWith('--'));
const dir = path.join(__dirname, '..', '..', 'karten');
const codes = fs.readdirSync(dir).filter(f => f.endsWith('.mmp')).map(f => f.slice(0, -4)).filter(c => !want.length || want.includes(c));
const K = (p, q) => p + ',' + q;
let fehlerGesamt = 0;
for (const code of codes) {
  const M = I.loadMap(fs.readFileSync(path.join(dir, code + '.mmp')));
  const [, people] = readWlk(fs.readFileSync(path.join(dir, code + '.wlk')));
  const at = (p, q) => { const [c, r] = I.fromPQ(p, q); return I.inMap(c, r) ? I.idx(c, r) : -1; };
  const l1 = (p, q) => { const i = at(p, q); return i < 0 ? 0 : M.L1[i]; };
  const l2 = (p, q) => { const i = at(p, q); return i < 0 ? 0 : M.L2[i]; };
  const typ = v => { const g = T.gfx[v & 0xfff]; return g ? g.typ : -1; };
  const walkable = (p, q) => { const v = l1(p, q), id = v & 0xfff; if (id === I.FOOTPRINT || id === I.FILLER || !id) return false; return [2, 3, 5].includes(typ(v)) || (v & 0x4000) !== 0 || typ(v) === 6; };
  // Wegpunkte je Zelle, Hauptkomponente
  const node = new Map(); people.forEach((n, i) => { const r = Math.round(n.y / 16), c = Math.round((n.x - (r % 2 === 0 ? 32 : 0)) / 64); node.set(K(...I.toPQ(c, r)), i); });
  const comp = new Array(people.length).fill(-1); let best = -1, bestN = 0;
  for (let s = 0; s < people.length; s++) { if (comp[s] >= 0) continue; const st = [s]; comp[s] = s; let n = 0; while (st.length) { const v = st.pop(); n++; for (const w of people[v].next) if (comp[w] < 0) { comp[w] = s; st.push(w); } } if (n > bestN) { bestN = n; best = s; } }
  const probleme = {}; const liste = []; const hinweise = [];
  let n = 0;
  for (let r = 0; r < I.ACTIVE_H; r++) for (let c = 0; c < I.ACTIVE_W; c++) {
    // Häfen haben einen eigenen Anleger statt einer Ladentür; Wahrzeichen sind keine Läden
    const o = M.L2[I.idx(c, r)], g = T.gfx[o & 0xfff]; if (!g || g.typ < 7 || /^S_|^HAFE/.test(g.name)) continue;
    n++;
    const [p, q] = I.toPQ(c, r); const dp = p + 1, dq = q - 1; const fehler = [];
    if (!walkable(dp, dq)) fehler.push('Eingangsfeld nicht begehbar');
    const ob = l2(dp, dq); if (ob) fehler.push('Objekt auf dem Eingang: ' + (T.gfx[ob & 0xfff] ? T.gfx[ob & 0xfff].name : ob));
    const ni = node.get(K(dp, dq));
    if (ni === undefined) fehler.push('kein Wegpunkt am Eingang');
    else if (comp[ni] !== best) fehler.push('Eingang nicht mit dem Wegnetz verbunden');
    // Weg vom Eingang weg: mindestens eine Kante, deren Zellen bis zum Nachbarpunkt alle begehbar sind
    // (gerade Zwischenpunkte sind beim Verdichten entfallen, deshalb die Strecke abschreiten)
    if (ni !== undefined) {
      const zelle = n => { const r = Math.round(n.y / 16), c = Math.round((n.x - (r % 2 === 0 ? 32 : 0)) / 64); return I.toPQ(c, r); };
      const ok = people[ni].next.filter(j => { const [pb, qb] = zelle(people[j]); const s = Math.max(Math.abs(pb - dp), Math.abs(qb - dq)); for (let t = 1; t <= s; t++) { const pp = dp + Math.round((pb - dp) * t / s), qq = dq + Math.round((qb - dq) * t / s); if (!walkable(pp, qq)) return false; } return true; });
      // Endet ein Steg (Fußweg über einen Kanal) am Eingang, ist das gewollt begehbar, nur eben über Wasser
      const steg = people[ni].next.some(j => { const [pb, qb] = zelle(people[j]); const s = Math.max(Math.abs(pb - dp), Math.abs(qb - dq)); for (let t = 1; t < s; t++) { const v = l1(dp + Math.round((pb - dp) * t / s), dq + Math.round((qb - dq) * t / s)); if (typ(v) === 4 || /^UFER/.test((T.gfx[v & 0xfff] || {}).name || '')) return true; } return false; });
      if (!ok.length && !steg) fehler.push('kein freier Weg vom Eingang weg');
      if (!ok.length && steg) hinweise.push(`${g.name} bei (${p},${q}): nur über einen Steg erreichbar`);
      if (detail && people[ni].next.length > 2) fehler.push(`Eingang ist Kreuzungspunkt (${people[ni].next.length} Wege)`);
    }
    // Bäume, Laternen und Tafeln auf dem Vorplatz (Eingangszelle und Nachbarn, ohne Grundflächen)
    let vorplatz = 0; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const v = l2(dp + a, dq + b); if (v && typ(v) < 7 && (l1(dp + a, dq + b) & 0xfff) !== I.FOOTPRINT && !/^S_/.test((T.gfx[v & 0xfff] || {}).name || '')) vorplatz++; }
    if (vorplatz) fehler.push(`Vorplatz zugestellt (${vorplatz} Objekte)`);
    // Läden mit gespiegelter Grafik: gemalte Tür unten rechts statt unten links
    if ((o & 0x8000) && !/^(WOHN|BUER|FABR|FEUE|GEFA|SCHU|UNIV|VERW)/.test(g.name)) fehler.push('gespiegelt, Tür auf der falschen Seite');
    // Objekte (Bäume, Laternen, Gebäude) direkt neben dem Eingang, die den Zugang verstellen
    const zu = [[1, 0], [0, -1], [1, -1]].filter(([a, b]) => { const v = l2(dp + a, dq + b); return v && typ(v) >= 7; });
    if (zu.length === 3) fehler.push('Eingang von Gebäuden zugebaut');
    if (fehler.length) { for (const f of fehler) probleme[f.replace(/:.*/, '')] = (probleme[f.replace(/:.*/, '')] || 0) + 1; liste.push(`${g.name} bei (${p},${q}): ${fehler.join('; ')}`); }
  }
  fehlerGesamt += liste.length;
  console.log(`${code}: ${n} Gebäude, ${liste.length} mit Eingangsproblem ${JSON.stringify(probleme)}`);
  if (detail) for (const l of liste) console.log('   ' + l);
  for (const h of hinweise) console.log("   Hinweis: " + h);
}
process.exitCode = fehlerGesamt ? 1 : 0;
