// Baut die eigenen Grafiken der Mod aus Blender-Renders (tools/art/out/*.rgba) im Format des Spiels.
//   node tools/art/build.js            rendert fehlende Modelle mit Blender und erzeugt gfx/
// Ergebnis in gfx/ (wird mit der Mod ausgeliefert, enthält nur selbst gerenderte Bilder):
//   gfx/sprites/<NAME>.SPR   Gebäudeteile (8 Bit, Palette in palette.db)
//   gfx/house/<NAME>.spr     Infobilder (8 Bit, Palette eingebettet)
//   gfx/paletten.bin         neue Paletten (je 256 x B,G,R), werden an palette.db angehängt
//   gfx/eintraege.json       neue Einträge für MASTERGFX.iso und die Wahrzeichen-Definitionen für den Kartengenerator
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const S = require('../sprite');
const { readRgba } = require('./rgba2png');

const BLENDER = process.env.BLENDER || 'C:/Users/matth/Tools/blender-4.2.23-windows-x64/blender.exe';
const ART = __dirname, OUT = path.join(ART, 'out'), GFX = path.join(ART, '..', '..', 'gfx');
const FIRST_ID = 1600;                    // höchste Nummer im Original (MASTERGFX.iso der Mission-CD in mission.res): 1560
const FIRST_PAL = 453;                    // palette.db hat 453 Paletten

// Neue Objekte. parts: Teile von unten nach oben; cell = Feld relativ zum Ankerfeld (dp, dq), rows = Zeilen des Renders.
// Vorlage = Originalteil, dessen Grafiklisten-Felder (Typ, Flags) übernommen werden.
const OBJEKTE = [
  { name: 'S_ZDU2', modell: 'rheinturm.py', hoehe: 512, anker: 448, stadt: 'ZDU', info: 'ZDUT2',
    parts: [{ s: 'A', cell: [0, 0], rows: [256, 512], vorlage: { typ: 0x0f, r0: 2, r1: 0, r5: 0x30003 } },
            { s: 'B', cell: [-8, 8], rows: [0, 256], vorlage: { typ: 0x00, r0: 2, r1: 0, r5: 0x30003 } }] },
  // Altbier-Brauhäuser der Düsseldorfer Altstadt als Sondergebäude (anklickbar, Ziel für Besucher). Als Kneipe gehen sie
  // nicht: das Spiel erkennt Gebäudearten an fest eingebauten Grafiknummern (Kneipe = 297).
  ...[['S_ZDU3', 'brauhaus1.py', 'ZDUT3'], ['S_ZDU4', 'brauhaus2.py', 'ZDUT4']].map(([name, modell, info]) => ({ name, modell, hoehe: 256, anker: 192, stadt: 'ZDU', info,
    parts: [{ s: '', cell: [0, 0], rows: [0, 256], vorlage: { typ: 0x0f, r0: 2, r1: 0, r5: 0x30003 } }] })),
  // Gizeh: Kairoer Fernsehturm (zweiteilig wie der Rheinturm) und zwei Moscheen, alle als Sondergebäude
  { name: 'S_ZGI2', modell: 'kairoturm.py', hoehe: 512, anker: 448, stadt: 'ZGI', info: 'ZGIT2',
    parts: [{ s: 'A', cell: [0, 0], rows: [256, 512], vorlage: { typ: 0x0f, r0: 2, r1: 0, r5: 0x30003 } },
            { s: 'B', cell: [-8, 8], rows: [0, 256], vorlage: { typ: 0x00, r0: 2, r1: 0, r5: 0x30003 } }] },
  ...[['S_ZGI3', 'moschee1.py', 'ZGIT3'], ['S_ZGI4', 'moschee2.py', 'ZGIT4']].map(([name, modell, info]) => ({ name, modell, hoehe: 256, anker: 192, stadt: 'ZGI', info,
    parts: [{ s: '', cell: [0, 0], rows: [0, 256], vorlage: { typ: 0x0f, r0: 2, r1: 0, r5: 0x30003 } }] })),
  // Wahrzeichen der übrigen Städte: Perlturm (Shanghai) und Clérigos-Turm (Porto) zweiteilig, die anderen einteilig
  ...[['S_ZSH3', 'perlturm.py', 'ZSH', 'ZSHT3'], ['S_ZPO2', 'clerigos.py', 'ZPO', 'ZPOT2']].map(([name, modell, stadt, info]) => ({ name, modell, hoehe: 512, anker: 448, stadt, info,
    parts: [{ s: 'A', cell: [0, 0], rows: [256, 512], vorlage: { typ: 0x0f, r0: 2, r1: 0, r5: 0x30003 } },
            { s: 'B', cell: [-8, 8], rows: [0, 256], vorlage: { typ: 0x00, r0: 2, r1: 0, r5: 0x30003 } }] })),
  ...[['S_ZNA2', 'castelnuovo.py', 'ZNA', 'ZNAT2'], ['S_ZMA2', 'spinnerei.py', 'ZMA', 'ZMAT2'], ['S_ZMI2', 'artdeco.py', 'ZMI', 'ZMIT2']].map(([name, modell, stadt, info]) => ({ name, modell, hoehe: 256, anker: 192, stadt, info,
    parts: [{ s: '', cell: [0, 0], rows: [0, 256], vorlage: { typ: 0x0f, r0: 2, r1: 0, r5: 0x30003 } }] })),
];

// ---- Farbreduktion: Median-Cut auf höchstens n Farben ----
function medianCut(colors, n) {
  let boxes = [colors.slice()];   // Kopie: die Boxen werden beim Teilen sortiert
  while (boxes.length < n) {
    let bi = -1, best = 0, axis = 0;
    boxes.forEach((b, i) => { if (b.length < 2) return; for (let a = 0; a < 3; a++) { let lo = 255, hi = 0; for (const c of b) { if (c[a] < lo) lo = c[a]; if (c[a] > hi) hi = c[a]; } const r = (hi - lo) * Math.sqrt(b.length); if (r > best) { best = r; bi = i; axis = a; } } });
    if (bi < 0) break;
    const b = boxes[bi].sort((u, v) => u[axis] - v[axis]); const m = b.length >> 1;
    boxes.splice(bi, 1, b.slice(0, m), b.slice(m));
  }
  return boxes.map(b => [0, 1, 2].map(a => Math.round(b.reduce((s, c) => s + c[a], 0) / b.length)));
}
function makePalette(pixels) {
  const pal = medianCut(pixels, 254);
  const full = [[0, 255, 0], [0, 0, 0], ...pal]; while (full.length < 256) full.push([0, 0, 0]);
  const cache = new Map();
  const index = c => { const k = (c[0] << 16) | (c[1] << 8) | c[2]; if (cache.has(k)) return cache.get(k); let bi = 2, bd = 1e9; for (let i = 2; i < 2 + pal.length; i++) { const p = full[i]; const dd = (p[0] - c[0]) ** 2 * 0.3 + (p[1] - c[1]) ** 2 * 0.59 + (p[2] - c[2]) ** 2 * 0.11; if (dd < bd) { bd = dd; bi = i; } } cache.set(k, bi); return bi; };
  return { full, index };
}

// Teil aus dem Render schneiden: Zeilen rows[0]..rows[1] des Renders bilden die 256er-Leinwand des Teils
function cutPart(r, rows, pal) {
  const H = rows[1] - rows[0]; const canvasTop = 256 - H;   // Teile kürzer als 256: oben auffüllen
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  const val = (x, y) => { const o = ((rows[0] + y) * r.w + x) * 4; if (r.px[o + 3] === 255) return pal.index([r.px[o], r.px[o + 1], r.px[o + 2]]); if (r.px[o] === 255) return (x + y) % 2 ? 1 : 0; return 0; };
  for (let y = 0; y < H; y++) for (let x = 0; x < r.w; x++) if (val(x, y)) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  if (x1 < 0) return null;
  const w = x1 - x0 + 1, h = y1 - y0 + 1, px = Buffer.alloc(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px[y * w + x] = val(x0 + x, y0 + y);
  return { w, h, ox: x0, oy: canvasTop + y0, px };
}

// Kopf der Gebäude-Sprites wie S_MUN1A/S_LON1A: 0x48 06 48 (8 Bit, Palette aus palette.db), Bytes 20 und 22 = 1
const HEAD_ISO = Buffer.alloc(0x21); HEAD_ISO[4] = 0x48; HEAD_ISO[5] = 0x06; HEAD_ISO[6] = 0x48; HEAD_ISO[20] = 1; HEAD_ISO[22] = 1;
// Kopf der Infobilder wie BERT1, aber unkomprimiert (Flags 0x06 statt 0x07) mit eingebetteter Palette (0x08 statt 0x48).
// Bytes 15..22 wie in allen Original-Infobildern: Position 0x284/0x82 und Leinwand 0x88 x 0x8f (136 x 143)
const HEAD_INFO = Buffer.alloc(0x21); HEAD_INFO[4] = 0x08; HEAD_INFO[5] = 0x06; HEAD_INFO[6] = 0x08;
HEAD_INFO.writeUInt16LE(0x284, 15); HEAD_INFO.writeUInt16LE(0x82, 17); HEAD_INFO.writeUInt16LE(0x88, 19); HEAD_INFO.writeUInt16LE(0x8f, 21);

function render(o) {
  const file = path.join(OUT, o.modell.replace(/\.py$/, '.rgba'));
  const src = path.join(ART, o.modell);
  if (!fs.existsSync(file) || fs.statSync(file).mtimeMs < Math.max(fs.statSync(src).mtimeMs, fs.statSync(path.join(ART, 'render.py')).mtimeMs)) {
    console.log('Blender rendert', o.modell);
    execFileSync(BLENDER, ['-b', '-P', path.join(ART, 'render.py'), '--', src, file, String(o.hoehe), ...(o.anker ? [String(o.anker)] : [])], { stdio: 'ignore' });
  }
  return readRgba(file);
}
function renderInfo(o) {
  const file = path.join(OUT, o.modell.replace(/\.py$/, '.info.rgba'));
  const src = path.join(ART, o.modell);
  if (!fs.existsSync(file) || fs.statSync(file).mtimeMs < Math.max(fs.statSync(src).mtimeMs, fs.statSync(path.join(ART, 'info.py')).mtimeMs)) {
    console.log('Blender rendert Infobild', o.modell);
    execFileSync(BLENDER, ['-b', '-P', path.join(ART, 'info.py'), '--', src, file], { stdio: 'ignore' });
  }
  return readRgba(file);
}

function main() {
  for (const d of ['sprites', 'house']) { fs.rmSync(path.join(GFX, d), { recursive: true, force: true }); fs.mkdirSync(path.join(GFX, d), { recursive: true }); }
  const palettes = [], eintraege = [], wahrzeichen = {};
  let id = FIRST_ID;
  for (const o of OBJEKTE) {
    const r = render(o);
    const opaque = []; for (let i = 0; i < r.w * r.h; i++) if (r.px[i * 4 + 3] === 255) opaque.push([r.px[i * 4], r.px[i * 4 + 1], r.px[i * 4 + 2]]);
    const pal = makePalette(opaque); const palIndex = FIRST_PAL + palettes.length; palettes.push(pal.full);
    const cells = [];
    for (const p of o.parts) {
      const part = cutPart(r, p.rows, pal); if (!part) continue;
      const name = o.name + p.s;
      const buf = S.writeSprite({ ...part, pal: palIndex, template: HEAD_ISO });
      fs.writeFileSync(path.join(GFX, 'sprites', name + '.SPR'), buf);
      // Grafiklisten-Größe wie im Original: Gebäude 192 breit und bis zum Leinwandboden hoch, Wahrzeichenteile = Bildgröße
      const gw = o.stadt ? part.w : 192, gh = o.stadt ? part.h : 256 - part.oy;
      eintraege.push({ id, name, typ: p.vorlage.typ, w: gw, h: gh, r0: p.vorlage.r0, r1: p.vorlage.r1, r5: p.vorlage.r5, pfad: `P:\\Grafik\\Stadt\\IsoH\\${name}.spr` });
      cells.push({ dp: p.cell[0], dq: p.cell[1], l2: id, name, typ: p.vorlage.typ });
      console.log(`${name}: Nummer ${id}, ${part.w}x${part.h}, Anker ${part.ox},${part.oy}, Palette ${palIndex}`);
      id++;
    }
    if (!o.stadt) continue;   // kein Wahrzeichen
    // Grundfläche 2x2 wie bei Gebäuden und beim Münchner Rathaus (S_MUN1): Ankerfeld und die Felder links, oben, rechts davon.
    // Der Turm ist dafür wie ein Gebäude gerendert (Mitte der Grundfläche 64 Pixel über dem Leinwandboden).
    for (const [dp, dq] of [[0, 0], [-1, 0], [-1, 1], [0, 1]]) { const c = cells.find(c => c.dp === dp && c.dq === dq); if (c) c.fp = true; else cells.push({ dp, dq, fp: true }); }
    wahrzeichen[o.name] = { stadt: o.stadt.toLowerCase(), info: o.info, cells };
    // Infobild
    if (o.info) {
      const ir = renderInfo(o); const ipx = []; for (let i = 0; i < ir.w * ir.h; i++) ipx.push([ir.px[i * 4], ir.px[i * 4 + 1], ir.px[i * 4 + 2]]);
      const ipal = makePalette(ipx); const px = Buffer.alloc(ir.w * ir.h); for (let i = 0; i < px.length; i++) px[i] = ipal.index(ipx[i]);
      const hd = Buffer.from(HEAD_INFO); hd.writeUInt32LE(px.length, 0); hd.writeUInt16LE(ir.w, 7); hd.writeUInt16LE(ir.h, 9); hd.writeUInt32LE(px.length, 0x19);
      const palBuf = Buffer.alloc(768); ipal.full.forEach(([R, G, B], i) => { palBuf[i * 3] = B; palBuf[i * 3 + 1] = G; palBuf[i * 3 + 2] = R; });
      fs.writeFileSync(path.join(GFX, 'house', o.info + '.spr'), Buffer.concat([hd, px, palBuf]));
      console.log(`Infobild ${o.info}: ${ir.w}x${ir.h}`);
    }
  }
  fs.writeFileSync(path.join(GFX, 'paletten.bin'), S.writePalettes(palettes).slice(4));
  fs.writeFileSync(path.join(GFX, 'eintraege.json'), JSON.stringify({ ersteNummer: FIRST_ID, erstePalette: FIRST_PAL, eintraege, wahrzeichen }, null, 2));
  console.log(`Fertig: ${eintraege.length} Grafiken, ${palettes.length} Paletten -> ${GFX}`);
}
main();
