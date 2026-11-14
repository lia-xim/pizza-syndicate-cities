// Kartengeometrie von Pizza Syndicate.
// Karten sind 100 x 200 Zellen groß, bespielt werden Spalten 0..63 und Zeilen 0..127.
// Versetztes Rautenraster: Zellmittelpunkt x = 64*c + (gerade Zeile ? 32 : 0), y = 16*r.
// Für den Entwurf nutzen wir Iso-Koordinaten: p wächst nach rechts unten (SO), q nach rechts oben (NO).
'use strict';
const W = 100, H = 200, ACTIVE_W = 64, ACTIVE_H = 128;
const FILLER = 0x140, FOOTPRINT = 0x13d;
const idx = (c, r) => r * W + c;
const inMap = (c, r) => c >= 0 && r >= 0 && c < W && r < H;
const inActive = (c, r) => c >= 0 && r >= 0 && c < ACTIVE_W && r < ACTIVE_H;
const even = r => (r & 1) === 0;
function toPQ(c, r) { const a = 2 * c + (even(r) ? 1 : 0); return [(a + r - 1) / 2, (a - r - 1) / 2]; }
function fromPQ(p, q) { const r = p - q; const a = p + q + 1; return [(a - (even(r) ? 1 : 0)) / 2, r]; }
const center = (c, r) => [c * 64 + (even(r) ? 32 : 0), r * 16];
const centerPQ = (p, q) => center(...fromPQ(p, q));
// Nachbarn in Bildschirmrichtungen; Kantennachbarn NO/SO/SW/NW, Eckennachbarn N/O/S/W.
const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const DPQ = { N: [-1, 1], NE: [0, 1], E: [1, 1], SE: [1, 0], S: [1, -1], SW: [0, -1], W: [-1, -1], NW: [-1, 0] };
function loadMap(buf) {
  if (buf.readUInt16LE(0) !== W || buf.readUInt16LE(2) !== H) throw new Error('Kartengröße unerwartet');
  const L1 = new Uint16Array(W * H), L2 = new Uint16Array(W * H);
  for (let i = 0; i < W * H; i++) { L1[i] = buf.readUInt16LE(4 + i * 2); L2[i] = buf.readUInt16LE(4 + (W * H + i) * 2); }
  return { L1, L2 };
}
function saveMap(m) {
  const b = Buffer.alloc(4 + W * H * 4); b.writeUInt16LE(W, 0); b.writeUInt16LE(H, 2);
  for (let i = 0; i < W * H; i++) { b.writeUInt16LE(m.L1[i], 4 + i * 2); b.writeUInt16LE(m.L2[i], 4 + (W * H + i) * 2); }
  return b;
}
module.exports = { W, H, ACTIVE_W, ACTIVE_H, FILLER, FOOTPRINT, idx, inMap, inActive, toPQ, fromPQ, center, centerPQ, DIRS, DPQ, loadMap, saveMap };
