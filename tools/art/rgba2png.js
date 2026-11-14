// Vorschau eines Blender-Renders (.rgba) als PNG, vergrößert, mit der 2x2-Grundraute als Hilfslinie.
//   node rgba2png.js <in.rgba> <out.png> [Zoom]
'use strict';
const fs = require('fs'); const { Img } = require('../citygen/png');
function readRgba(file) { const b = fs.readFileSync(file); const w = b.readUInt32LE(0), h = b.readUInt32LE(4); return { w, h, px: b.slice(8) }; }
module.exports = { readRgba };
if (require.main === module) {
  const [inp, out, z = '2'] = process.argv.slice(2); const Z = +z; const r = readRgba(inp);
  const img = new Img(r.w * Z, r.h * Z, [120, 120, 120]);
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
    const o = (y * r.w + x) * 4; let c = null;
    if (r.px[o + 3] === 255) c = [r.px[o], r.px[o + 1], r.px[o + 2]]; else if (r.px[o] === 255) c = (x + y) % 2 ? [0, 0, 0] : null;
    if (c) for (let a = 0; a < Z; a++) for (let b = 0; b < Z; b++) img.px(x * Z + a, y * Z + b, c);
  }
  const H = r.h, L = (x0, y0, x1, y1) => img.line(x0 * Z, y0 * Z, x1 * Z, y1 * Z, [255, 255, 0]);
  L(128, H - 1, 64, H - 32); L(64, H - 32, 128, H - 64); L(128, H - 64, 192, H - 32); L(192, H - 32, 128, H - 1);
  img.save(out);
}
