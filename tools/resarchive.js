// Lesen und Schreiben der Pizza-Syndicate-Ressourcenarchive (*.res).
// Aufbau: u32 Datenbeginn, u32 Anzahl, "Software2000",
// danach je Eintrag: Name\0, u32 Größe, u32 Position (relativ zum Datenbeginn).
// Das Spiel sucht Einträge per Binärsuche ohne Groß-/Kleinschreibung,
// deshalb muss das Inhaltsverzeichnis entsprechend sortiert sein.
'use strict';
const fs = require('fs');

const SIGNATURE = 'Software2000';

function readArchive(file) {
  const buf = fs.readFileSync(file);
  const dataStart = buf.readUInt32LE(0);
  const count = buf.readUInt32LE(4);
  if (buf.toString('latin1', 8, 20) !== SIGNATURE) throw new Error(`${file}: keine Software-2000-Ressourcendatei`);
  let p = 20;
  const entries = [];
  for (let i = 0; i < count; i++) {
    const end = buf.indexOf(0, p);
    const name = buf.toString('latin1', p, end);
    p = end + 1;
    const size = buf.readUInt32LE(p);
    const off = buf.readUInt32LE(p + 4);
    p += 8;
    entries.push({ name, data: buf.subarray(dataStart + off, dataStart + off + size) });
  }
  if (p !== dataStart) throw new Error(`${file}: Inhaltsverzeichnis endet bei ${p}, erwartet ${dataStart}`);
  return entries;
}

// Vergleich wie _stricmp der MSVC-Laufzeit: ASCII-Großbuchstaben werden zu Kleinbuchstaben.
function lowerByte(c) { return c >= 0x41 && c <= 0x5a ? c + 0x20 : c; }
function compareNames(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const d = lowerByte(a.charCodeAt(i)) - lowerByte(b.charCodeAt(i));
    if (d) return d;
  }
  return a.length - b.length;
}

function writeArchive(file, entries) {
  const sorted = [...entries].sort((a, b) => compareNames(a.name, b.name));
  for (let i = 1; i < sorted.length; i++) {
    if (compareNames(sorted[i - 1].name, sorted[i].name) === 0) throw new Error(`Doppelter Eintrag: ${sorted[i].name}`);
  }
  let tocSize = 20;
  for (const e of sorted) tocSize += Buffer.byteLength(e.name, 'latin1') + 1 + 8;
  const total = tocSize + sorted.reduce((s, e) => s + e.data.length, 0);
  const out = Buffer.alloc(total);
  out.writeUInt32LE(tocSize, 0);
  out.writeUInt32LE(sorted.length, 4);
  out.write(SIGNATURE, 8, 'latin1');
  let p = 20, off = 0;
  for (const e of sorted) {
    p += out.write(e.name, p, 'latin1');
    out[p++] = 0;
    out.writeUInt32LE(e.data.length, p);
    out.writeUInt32LE(off, p + 4);
    p += 8;
    e.data.copy(out, tocSize + off);
    off += e.data.length;
  }
  fs.writeFileSync(file, out);
  return sorted.length;
}

module.exports = { readArchive, writeArchive, compareNames };
