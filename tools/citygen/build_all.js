// Erzeugt alle Mod-Karten nach karten/<kürzel>.mmp/.wlk und Vorschaubilder.
//   node build_all.js [kürzel ...]
'use strict';
const path = require('path'), fs = require('fs');
const { Design, build } = require('./generate');
const { preview } = require('./preview');
const designs = require('./designs');
const CITIES = { zna: ['neapel', 11], zpo: ['porto', 22], zma: ['manchester', 33], zmi: ['miami', 44], zsh: ['shanghai', 55], zdu: ['duesseldorf', 66], zgi: ['gizeh', 77] };
const want = process.argv.slice(2).map(s => s.toLowerCase());
const outDir = path.join(__dirname, '..', '..', 'karten'); fs.mkdirSync(outDir, { recursive: true });
for (const [code, [fn, seed]] of Object.entries(CITIES)) {
  if (want.length && !want.includes(code)) continue;
  if (!designs[fn]) { console.log(`${code}: noch kein Entwurf`); continue; }
  const d = new Design(seed);
  // Wohnhaus-Sätze wie in den Originalstädten der Region (Mittelmeer, England, Amerika, Asien)
  const STYLE = { zna: ['WOHN2', 'WOHN5'], zpo: ['WOHN2', 'WOHN5'], zma: ['WOHN1', 'WOHN5'], zmi: ['WOHN7', 'WOHN8', 'WOHN6', 'WOHN2'], zsh: ['WOHN3', 'WOHN4', 'WOHN8'], zdu: ['WOHN1', 'WOHN5'], zgi: ['WOHN2', 'WOHN7'] }[code];
  if (STYLE) d.wohnStyle = require('./generate').T.buildings.WOHN.filter(id => STYLE.includes(require('./generate').T.gfx[id].name.replace(/[A-C]$/, '')));
  const comp = designs[fn](d);
  const out = path.join(outDir, code);
  const { report } = build(d, out);
  preview(out + '.mmp', out + '.wlk', out + '.png');
  console.log(code, JSON.stringify(comp)); console.log('   ', JSON.stringify(report));
}
