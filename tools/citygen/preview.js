// Schemabild einer Karte mit Wegenetzen: node preview.js <karte.mmp> <wege.wlk> <bild.png> [Maßstab]
'use strict';
const fs = require('fs'), path = require('path');
const I = require('./iso'); const { readWlk } = require('./wlk'); const { Img } = require('./png');
const T = JSON.parse(fs.readFileSync(path.join(__dirname, 'cache', 'tiles.json'), 'utf8'));
function preview(mmp, wlk, out, S = 0.3) {
  const M = I.loadMap(fs.readFileSync(mmp));
  const img = new Img(Math.ceil((I.ACTIVE_W * 64 + 32) * S), Math.ceil((I.ACTIVE_H * 16 + 16) * S), [15, 15, 15]);
  const typCol = { 1: [85, 85, 90], 2: [170, 170, 160], 3: [60, 140, 60], 4: [40, 80, 170], 5: [70, 150, 70], 6: [200, 180, 120] };
  const kindCol = { WOHN: [205, 125, 65], LEER: [255, 230, 0], STAD: [255, 0, 255], HOTE: [0, 230, 230], UNIV: [140, 90, 255], EKZ: [255, 120, 160], KAUF: [255, 150, 190], BUER: [120, 160, 255], CLUB: [255, 80, 80], HAFE: [40, 40, 255], BANK: [220, 220, 220], LIE: [140, 70, 20], FZZ: [255, 170, 0] };
  for (let r = 0; r < I.ACTIVE_H; r++) for (let c = 0; c < I.ACTIVE_W; c++) {
    const v = M.L1[I.idx(c, r)] & 0xfff; const [x, y] = I.center(c, r);
    const col = v === I.FOOTPRINT ? [110, 45, 45] : v === I.FILLER ? [0, 0, 0] : (typCol[T.gfx[v] ? T.gfx[v].typ : -1] || [255, 0, 0]);
    img.diamond((x + 32) * S, (y + 8) * S, 32 * S, 16 * S, col);
  }
  for (let r = 0; r < I.ACTIVE_H; r++) for (let c = 0; c < I.ACTIVE_W; c++) {
    const o = M.L2[I.idx(c, r)] & 0xfff; const g = T.gfx[o]; if (!g) continue; const [x, y] = I.center(c, r);
    if (g.typ >= 7) { const kind = g.name.replace(/[0-9]*[A-C]?$/, ''); img.diamond((x + 32) * S, (y + 8 - 16) * S, 40 * S, 20 * S, kindCol[kind] || [230, 230, 230]); }
    else if (/SHIP/.test(g.name)) img.diamond((x + 32) * S, (y + 8) * S, 30 * S, 10 * S, [250, 250, 250]);
  }
  if (wlk) {
    const [cars, people] = readWlk(fs.readFileSync(wlk));
    for (const [nodes, col] of [[cars, [255, 70, 70]], [people, [60, 255, 60]]]) for (const n of nodes) for (const j of n.next) img.line((n.x + 32) * S, (n.y + 8) * S, (nodes[j].x + 32) * S, (nodes[j].y + 8) * S, col);
  }
  img.save(out);
}
module.exports = { preview };
if (require.main === module) preview(process.argv[2], process.argv[3], process.argv[4], +(process.argv[5] || 0.3));
