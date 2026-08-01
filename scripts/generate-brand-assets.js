// Generates the site's favicon set from pure pixel math — no image libraries,
// no network fetch. The mark is a ripple ring, the site's signature motif,
// echoing the house's one true rarity: a private pool. The OG share image is
// a real photo (images/og-image.jpg) and isn't touched by this script.
// Re-run with `node scripts/generate-brand-assets.js` after changing palette below.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const INK = [27, 38, 34];       // --ink
const POOL = [76, 156, 147];    // --pool-bright
const POOL_DEEP = [46, 110, 104]; // --pool
const SAND = [243, 238, 228];   // --sand

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgbaPixels) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0; // no filter
    rgbaPixels.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const idat = zlib.deflateSync(raw, { level: 9 });
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function mixHex(a, b, t) {
  return [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * t));
}

// Draws the ripple mark into a square RGBA buffer of side `size`.
// Background: ink. Motif: 3 concentric pool-colored rings off-center,
// evoking water disturbed by a single drop — the private pool, once.
function drawRippleMark(size) {
  const buf = Buffer.alloc(size * size * 4);
  const cx = size * 0.5;
  const cy = size * 0.56;
  const rings = [0.5, 0.335, 0.17].map(f => f * size * 0.5);
  const strokeW = Math.max(1, size * 0.045);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      let color = INK;
      // soft vignette toward pool-deep at the corners for depth
      const cornerDist = Math.sqrt((x - size / 2) ** 2 + (y - size / 2) ** 2) / (size * 0.75);
      color = mixHex(INK, POOL_DEEP, Math.min(cornerDist * 0.18, 0.18));

      for (const r of rings) {
        const ringDist = Math.abs(d - r);
        if (ringDist < strokeW) {
          const t = 1 - ringDist / strokeW;
          color = mixHex(color, POOL, Math.min(t, 1));
        }
      }
      // solid dot at center = the drop itself
      if (d < strokeW * 1.1) {
        const t = 1 - d / (strokeW * 1.1);
        color = mixHex(color, SAND, Math.min(t, 1));
      }

      const idx = (y * size + x) * 4;
      buf[idx] = color[0];
      buf[idx + 1] = color[1];
      buf[idx + 2] = color[2];
      buf[idx + 3] = 255;
    }
  }
  return buf;
}

// Wraps a 32x32 PNG buffer in a minimal single-image ICO container.
function wrapICO(png32) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // 1 image
  const entry = Buffer.alloc(16);
  entry[0] = 32; // width
  entry[1] = 32; // height
  entry[2] = 0; entry[3] = 0;
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32BE ? null : null;
  entry.writeUInt32LE(png32.length, 8);
  entry.writeUInt32LE(header.length + entry.length, 12);
  return Buffer.concat([header, entry, png32]);
}

const iconsDir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

for (const size of [16, 32, 180, 512]) {
  const png = encodePNG(size, size, drawRippleMark(size));
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), png);
}
fs.copyFileSync(path.join(iconsDir, 'icon-180.png'), path.join(iconsDir, 'apple-touch-icon.png'));
fs.writeFileSync(path.join(__dirname, '..', 'favicon.ico'), wrapICO(encodePNG(32, 32, drawRippleMark(32))));

console.log('Favicon set written to /icons and /favicon.ico');
