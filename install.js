// Installiert die Städte aus staedte.json in Pizza Syndicate.
//   node install.js [Spielordner] [--dry-run=<Zieldatei>]
//   node install.js [Spielordner] --uninstall
// Beim ersten Lauf wird Resource\mission.res als mission.res.orig gesichert.
// Gebaut wird immer aus dieser unveränderten Sicherung, ein erneuter Lauf ersetzt also die alte Mod-Version.
// Die Mod liefert keine Originaldateien aus: Karten-Vorlagen werden aus dem Archiv des Nutzers übernommen.
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { readArchive, writeArchive, compareNames } = require('./tools/resarchive');

const args = process.argv.slice(2);
const gameDir = args.find(a => !a.startsWith('--')) || 'C:\\Pizza Syndicate';
const dryRun = (args.find(a => a.startsWith('--dry-run=')) || '').slice('--dry-run='.length);
const uninstall = args.includes('--uninstall');

const resFile = path.join(gameDir, 'Resource', 'mission.res');
const backup = resFile + '.orig';
const BS = '\\';
const PREFIX = 'F:' + BS + 'Pizza2' + BS;

function fail(msg) { console.error('FEHLER: ' + msg); process.exit(1); }

function gameRunning() {
  try {
    return /Pizza_Mission\.exe/i.test(execSync('tasklist /FI "IMAGENAME eq Pizza_Mission.exe" /NH', { encoding: 'utf8' }));
  } catch { return false; }
}

if (!fs.existsSync(resFile)) fail(`Nicht gefunden: ${resFile}`);
if (!dryRun && gameRunning()) fail('Pizza Syndicate läuft noch. Bitte das Spiel zuerst beenden.');
// Die Installation legt mission.res schreibgeschützt ab; das Attribut muss vor dem Ersetzen weg.
if (!dryRun) fs.chmodSync(resFile, 0o666);

if (uninstall) {
  if (!fs.existsSync(backup)) fail('Keine Sicherung gefunden, die Mod ist offenbar nicht installiert.');
  fs.copyFileSync(backup, resFile);
  fs.unlinkSync(backup);
  console.log('Originalzustand wiederhergestellt.');
  process.exit(0);
}

if (!dryRun && !fs.existsSync(backup)) {
  fs.copyFileSync(resFile, backup);
  console.log(`Sicherung angelegt: ${backup}`);
}
const source = fs.existsSync(backup) ? backup : resFile;
const entries = readArchive(source);
const byName = new Map(entries.map(e => [e.name.toLowerCase(), e]));
const find = n => byName.get((PREFIX + n).toLowerCase());

// Grafiken der Vorlagestädte liegen teils in anderen Archiven (z. B. sprites.res mit Präfix E:\pizza2\).
// Gesucht wird deshalb über alle Archive nach dem Pfad hinter "Pizza2\".
const assetIndex = new Map();
function indexArchive(list) {
  for (const e of list) {
    const m = e.name.toLowerCase().match(/^[a-z]:\\pizza2\\(.*)$/);
    if (m && !assetIndex.has(m[1])) assetIndex.set(m[1], e.data);
  }
}
indexArchive(entries);
for (const f of fs.readdirSync(path.dirname(resFile))) {
  if (/\.res$/i.test(f) && f.toLowerCase() !== 'mission.res') indexArchive(readArchive(path.join(path.dirname(resFile), f)));
}
const findAsset = rel => assetIndex.get(rel.toLowerCase());

const spec = JSON.parse(fs.readFileSync(path.join(__dirname, 'staedte.json'), 'utf8'));
const added = [];

function put(name, data) {
  const full = PREFIX + name;
  if (byName.has(full.toLowerCase())) fail(`Eintrag existiert bereits im Original: ${name}`);
  added.push({ name: full, data });
}

function writeFixed(buf, off, len, text) {
  buf.fill(0, off, off + len);
  buf.write(text.slice(0, len - 1), off, 'latin1');
}

for (const s of spec.staedte) {
  const code = s.kuerzel.toUpperCase();
  if (!/^Z[A-Z0-9]{1,2}$/.test(code)) fail(`${code}: Kürzel muss mit Z beginnen und 2–3 Zeichen haben.`);
  const tpl = s.vorlage.toUpperCase();
  const tplCif = find(`World${BS}CITIES${BS}${tpl}${BS}Citydata.cif`);
  const tplMap = find(`Isokarten${BS}${tpl.toLowerCase()}.mmp`);
  const tplWlk = find(`Isokarten${BS}${tpl.toLowerCase()}.wlk`);
  if (!tplCif || !tplMap || !tplWlk) fail(`${code}: Vorlage ${tpl} unvollständig im Archiv.`);

  const cif = Buffer.from(tplCif.data);
  writeFixed(cif, 0x00, 30, s.name);
  writeFixed(cif, 0x1e, 4, code);
  writeFixed(cif, 0x3a, 4, s.land);
  cif.writeDoubleLE(s.kosten_kauf, 0x40);
  cif.writeDoubleLE(s.kosten_miete, 0x48);
  cif.writeDoubleLE(s.kaufkraft, 0x50);
  cif[0x5c] = s.touristen;
  // Einwohner (Figuren auf der Straße): in allen Originalstädten 100. Grenze des Spiels: 500 Figuren je Karte insgesamt.
  if (s.einwohner !== undefined) { if (s.einwohner < 50 || s.einwohner > 400) fail(`${code}: Einwohner müssen zwischen 50 und 400 liegen.`); cif.writeUInt16LE(s.einwohner, 0x3e); }
  if (s.gruppen.length !== 7 || s.gruppen.reduce((a, b) => a + b, 0) !== 100) fail(`${code}: Gruppen müssen 7 Werte mit Summe 100 sein.`);
  s.gruppen.forEach((v, i) => { cif[0x62 + i] = v; });
  cif.writeUInt32LE(s.weltkarte.x, 0x78);
  cif.writeUInt32LE(s.weltkarte.y, 0x7c);
  writeFixed(cif, 0x80, 0x200, s.name);

  const mapData = s.karte ? fs.readFileSync(path.join(__dirname, s.karte)) : tplMap.data;
  const wlkData = s.wege ? fs.readFileSync(path.join(__dirname, s.wege)) : tplWlk.data;

  put(`World${BS}CITIES${BS}${code}${BS}Citydata.cif`, cif);
  put(`Isokarten${BS}${code.toLowerCase()}.mmp`, mapData);
  put(`Isokarten${BS}${code.toLowerCase()}.wlk`, wlkData);

  // Stadtsymbol (misc\<kürzel>.spr, misc\<kürzel>_k.spr) und Stadtfotos (HouseInfo\city<kürzel><n>.jpg).
  // Das Spiel setzt die Dateinamen aus dem Stadtkürzel zusammen, ohne Kopie fehlt das Symbol.
  const sym = (s.symbol_vorlage || tpl).toLowerCase();
  const lc = code.toLowerCase();
  for (const suffix of ['', '_k']) {
    const data = findAsset(`Sprites${BS}Misc${BS}${sym}${suffix}.spr`);
    if (!data) fail(`${code}: Symbol ${sym}${suffix}.spr nicht gefunden.`);
    put(`Sprites${BS}Misc${BS}${lc}${suffix}.spr`, data);
  }
  let photos = 0;
  for (let i = 1; i <= 9; i++) {
    const data = findAsset(`Sprites${BS}HouseInfo${BS}city${sym}${i}.jpg`);
    if (!data) break;
    put(`Sprites${BS}HouseInfo${BS}city${lc}${i}.jpg`, data);
    photos++;
  }
  // Infobilder der Wahrzeichen: das Spiel lädt house\<Kürzel>T<n>.spr, n = Nummer des Wahrzeichens (S_LIS2 -> 2).
  // Fehlt das Bild, stürzt das Spiel beim Anklicken des Wahrzeichens ab.
  if (s.karte) {
    const meta = path.join(__dirname, s.karte.replace(/\.mmp$/i, '.json'));
    if (fs.existsSync(meta)) {
      const done = new Set();
      for (const w of JSON.parse(fs.readFileSync(meta, 'utf8')).wahrzeichen) {
        const n = (w.gruppe.match(/(\d+)$/) || [, '1'])[1]; if (done.has(n)) continue;
        const src = { los: 'la', sid: 'syd' }[w.stadt] || w.stadt;
        const data = findAsset(`Sprites${BS}House${BS}${src.toUpperCase()}T${n}.spr`);
        if (!data) fail(`${code}: Infobild ${src.toUpperCase()}T${n}.spr fehlt.`);
        put(`Sprites${BS}House${BS}${code}T${n}.spr`, data); done.add(n);
      }
    }
  }
  console.log(`+ ${s.name} (${code}), ${s.karte ? 'eigene Karte' : 'Karte nach Vorlage ' + tpl}, Stadtwerte nach ${tpl}, Symbol und ${photos} Foto(s) von ${sym.toUpperCase()}`);
}

const target = dryRun || resFile + '.tmp';
const n = writeArchive(target, [...entries, ...added]);

// Prüfen: neu einlesen, Sortierung und alle Inhalte vergleichen.
const check = readArchive(target);
for (let i = 1; i < check.length; i++) if (compareNames(check[i - 1].name, check[i].name) >= 0) fail('Sortierung fehlerhaft.');
const want = new Map([...entries, ...added].map(e => [e.name, e.data]));
for (const e of check) if (!want.get(e.name) || !want.get(e.name).equals(e.data)) fail(`Inhalt weicht ab: ${e.name}`);
if (check.length !== want.size) fail('Anzahl der Einträge weicht ab.');

if (!dryRun) fs.renameSync(target, resFile);
console.log(`Fertig: ${n} Einträge (${added.length} neu) -> ${dryRun || resFile}`);
