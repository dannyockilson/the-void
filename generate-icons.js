// generate-icons.js — run once with `node generate-icons.js`
// Creates icon-192.png and icon-512.png for The Void PWA.
// Design: deep void background (#010005) with a faint white radial glow at centre.

const zlib = require('zlib');
const fs   = require('fs');

function makeCRCTable() {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
}
const CRC_TABLE = makeCRCTable();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xFF];
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const len  = Buffer.allocUnsafe(4); len.writeUInt32BE(data.length, 0);
  const typB = Buffer.from(type, 'ascii');
  const crc  = Buffer.allocUnsafe(4); crc.writeUInt32BE(crc32(Buffer.concat([typB, data])), 0);
  return Buffer.concat([len, typB, data, crc]);
}

function buildPNG(size) {
  // Draw pixels: RGBA
  const pixels = Buffer.alloc(size * size * 4);
  const cx = size / 2, cy = size / 2;
  const innerR = size * 0.28;  // main glow core
  const outerR = size * 0.48;  // faint outer halo edge

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = Math.hypot(x - cx, y - cy);

      // Core glow (quadratic falloff)
      const core  = Math.max(0, 1 - dist / innerR);
      const glow  = core * core;

      // Outer halo (linear, very faint)
      const halo  = dist < outerR ? Math.max(0, (1 - dist / outerR) * 0.12) : 0;

      const t = Math.min(1, glow + halo);

      // Blend from #010005 (bg) toward #e8e8ff (cold white with slight blue)
      const r = Math.round(1   + t * (232 - 1));
      const g = Math.round(0   + t * (232 - 0));
      const b = Math.round(5   + t * (255 - 5));

      const i = (y * size + x) * 4;
      pixels[i]     = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
      pixels[i + 3] = 255;
    }
  }

  // Filter byte (None = 0) prepended to each row
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.allocUnsafe(1 + size * 4);
    row[0] = 0;
    pixels.copy(row, 1, y * size * 4, (y + 1) * size * 4);
    rows.push(row);
  }
  const compressed = zlib.deflateSync(Buffer.concat(rows), { level: 9 });

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // RGB (no alpha needed; background is solid)
  ihdr[10] = ihdr[11] = ihdr[12] = 0;

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

fs.writeFileSync('icon-192.png', buildPNG(192));
fs.writeFileSync('icon-512.png', buildPNG(512));
console.log('Generated icon-192.png and icon-512.png');
