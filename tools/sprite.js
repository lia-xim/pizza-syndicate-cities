// Sprite-Format von Pizza Syndicate (IsoDaten, 8 Bit mit Palette aus palette.db).
// Aufbau (aus dem Ladecode des Spiels, Funktion bei 0x4a43c0):
//   0x00 u32  Länge der Bilddaten (w*h)
//   0x04 u8   0x48
//   0x05 u8   Flags (0x06 bei Gebäuden; Bit 0x10 = nicht vorab umrechnen)
//   0x06 u8   0x48 = 8 Bit, Bit 0x40: Palette steht in palette.db (Index am Dateiende)
//   0x07 u16  Breite, 0x09 u16 Höhe, 0x0b u16 / 0x0d u16 Ankerpunkt (x, y)
//   0x0f ...  weitere Felder bis 0x20 (meist 0, ab 0x14: 01 00 01, ab 0x19: Länge noch einmal)
//   0x21      Bildpunkte, zeilenweise, 1 Byte je Punkt (0 = durchsichtig)
//   Ende      u32 Index der Palette in palette.db
// palette.db: u32 Anzahl, dann je Palette 256 Farben als B, G, R (readPalettes liefert [R, G, B]).
'use strict';
const HEADER = 0x21;
function readSprite(b) {
  const n = b.readUInt32LE(0), w = b.readUInt16LE(7), h = b.readUInt16LE(9);
  const db = (b[6] & 0x40) !== 0;
  return { w, h, ox: b.readUInt16LE(11), oy: b.readUInt16LE(13), header: b.slice(0, HEADER), px: b.slice(HEADER, HEADER + n), pal: db ? b.readUInt32LE(HEADER + n) : null, flags: [b[4], b[5], b[6]] };
}
function writeSprite({ w, h, ox, oy, px, pal, template }) {
  const hd = Buffer.from(template); hd.writeUInt32LE(w * h, 0); hd.writeUInt16LE(w, 7); hd.writeUInt16LE(h, 9); hd.writeUInt16LE(ox, 11); hd.writeUInt16LE(oy, 13);
  hd.writeUInt32LE(w * h, 0x19);
  const tail = Buffer.alloc(4); tail.writeUInt32LE(pal, 0);
  return Buffer.concat([hd, px, tail]);
}
function readPalettes(b) { const n = b.readUInt32LE(0); const out = []; for (let k = 0; k < n; k++) { const p = []; for (let i = 0; i < 256; i++) { const o = 4 + k * 768 + i * 3; p.push([b[o + 2], b[o + 1], b[o]]); } out.push(p); } return out; }
function writePalettes(list) { const b = Buffer.alloc(4 + list.length * 768); b.writeUInt32LE(list.length, 0); list.forEach((p, k) => p.forEach(([r, g, bl], i) => { const o = 4 + k * 768 + i * 3; b[o] = bl; b[o + 1] = g; b[o + 2] = r; })); return b; }
module.exports = { HEADER, readSprite, writeSprite, readPalettes, writePalettes };
