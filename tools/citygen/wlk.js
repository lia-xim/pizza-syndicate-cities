// Wegedateien (.wlk) von Pizza Syndicate.
// Version 0x67: u32 0x67, dann zwei Blöcke (Autos, dann Fußgänger) zu je 2500 Datensätzen à 28 Byte,
// gefolgt von u16 Anzahl, u16 0, u32 0, u32 0.
// Datensatz: i32 x, i32 y, u8 0, u8 0, u16 Nachbarn[4] (1-basiert), u8 0, u8 Anzahl Nachbarn,
// u16 u16 Verknüpfung Auto<->Fußgänger (Zebrastreifen, optional), u8[4] Laufzeitfelder.
// Autos fahren gerichtet, Fußgängerkanten sind beidseitig eingetragen.
'use strict';
const MAX = 2500, REC = 28, BLOCK = MAX * REC + 12;
function writeWlk(cars, people) {
  const buf = Buffer.alloc(4 + 2 * BLOCK);
  buf.writeUInt32LE(0x67, 0);
  [cars, people].forEach((nodes, b) => {
    if (nodes.length > MAX) throw new Error(`Zu viele Wegpunkte: ${nodes.length} > ${MAX}`);
    const base = 4 + b * BLOCK;
    nodes.forEach((n, i) => {
      const o = base + i * REC;
      if (!n.next.length || n.next.length > 4) throw new Error(`Wegpunkt ${i + 1} hat ${n.next.length} Nachbarn`);
      buf.writeInt32LE(Math.round(n.x), o); buf.writeInt32LE(Math.round(n.y), o + 4);
      n.next.forEach((j, k) => { if (j < 0 || j >= nodes.length) throw new Error('Nachbar außerhalb'); buf.writeUInt16LE(j + 1, o + 10 + 2 * k); });
      buf[o + 0x13] = n.next.length;
    });
    buf.writeUInt16LE(nodes.length, base + MAX * REC);
  });
  return buf;
}
function readWlk(buf) {
  if (buf.readUInt32LE(0) !== 0x67) throw new Error('Nur Version 0x67 wird gelesen');
  return [0, 1].map(b => {
    const base = 4 + b * BLOCK, n = buf.readUInt16LE(base + MAX * REC), out = [];
    for (let i = 0; i < n; i++) {
      const o = base + i * REC; const cnt = buf[o + 0x13];
      out.push({ x: buf.readInt32LE(o), y: buf.readInt32LE(o + 4), next: [0, 1, 2, 3].slice(0, cnt).map(k => buf.readUInt16LE(o + 10 + 2 * k) - 1) });
    }
    return out;
  });
}
module.exports = { writeWlk, readWlk, MAX };
