import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i];
    crc ^= byte;
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createPngChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

export function generateAppIconPng(size: number): Buffer {
  const width = size;
  const height = size;

  // Raw uncompressed RGBA pixel buffer: (width * 4 + 1) per row (1 byte filter prefix)
  const rawBytesPerRow = width * 4 + 1;
  const rawData = Buffer.alloc(rawBytesPerRow * height);

  const radius = size * 0.22;
  const cx = size / 2;
  const cy = size / 2;

  // Check distance to rounded rect
  const inRoundedRect = (x: number, y: number, w: number, h: number, r: number) => {
    const minX = r;
    const maxX = w - r;
    const minY = r;
    const maxY = h - r;

    if (x >= minX && x <= maxX && y >= 0 && y <= h) return true;
    if (y >= minY && y <= maxY && x >= 0 && x <= w) return true;

    const dx = x < minX ? minX - x : x > maxX ? x - maxX : 0;
    const dy = y < minY ? minY - y : y > maxY ? y - maxY : 0;
    return dx * dx + dy * dy <= r * r;
  };

  // Check if point is inside a line segment with width
  const distToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  };

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rawBytesPerRow;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      if (!inRoundedRect(x, y, width, height, radius)) {
        // Transparent outside rounded icon
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
        continue;
      }

      // Checkmark icon coordinates
      // Segment 1: from (0.32*s, 0.52*s) to (0.45*s, 0.66*s)
      // Segment 2: from (0.45*s, 0.66*s) to (0.70*s, 0.36*s)
      const strokeWidth = size * 0.08;
      const d1 = distToSegment(x, y, size * 0.32, size * 0.52, size * 0.45, size * 0.66);
      const d2 = distToSegment(x, y, size * 0.45, size * 0.66, size * 0.70, size * 0.36);
      const minD = Math.min(d1, d2);

      if (minD <= strokeWidth / 2) {
        // Crisp White Checkmark
        rawData[pixelOffset] = 255;
        rawData[pixelOffset + 1] = 255;
        rawData[pixelOffset + 2] = 255;
        rawData[pixelOffset + 3] = 255;
      } else {
        // Vibrant Royal Blue Gradient Background (#2563eb to #1d4ed8)
        const t = y / height;
        const r = Math.round(37 * (1 - t) + 29 * t);
        const g = Math.round(99 * (1 - t) + 78 * t);
        const b = Math.round(235 * (1 - t) + 216 * t);

        rawData[pixelOffset] = r;
        rawData[pixelOffset + 1] = g;
        rawData[pixelOffset + 2] = b;
        rawData[pixelOffset + 3] = 255;
      }
    }
  }

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 6; // Color type: 6 (RGBA)
  ihdrData[10] = 0; // Compression method: 0
  ihdrData[11] = 0; // Filter method: 0
  ihdrData[12] = 0; // Interlace method: 0
  const ihdrChunk = createPngChunk('IHDR', ihdrData);

  // IDAT chunk
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createPngChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = createPngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

export function ensureIconsExist(baseDir?: string) {
  try {
    const candidates = [
      baseDir ? path.resolve(baseDir, 'public') : null,
      path.resolve(process.cwd(), 'public'),
      path.resolve(process.cwd(), 'apps/web/public'),
    ].filter((p): p is string => Boolean(p));

    for (const publicDir of candidates) {
      // If we are in monorepo root and checking 'public', skip if apps/web exists
      if (publicDir.endsWith('/offload/public') && fs.existsSync(path.resolve(process.cwd(), 'apps/web'))) {
        continue;
      }

      const iconsDir = path.resolve(publicDir, 'icons');
      if (!fs.existsSync(iconsDir)) {
        fs.mkdirSync(iconsDir, { recursive: true });
      }

      const icon192Path = path.join(iconsDir, 'icon-192.png');
      const icon512Path = path.join(iconsDir, 'icon-512.png');

      if (!fs.existsSync(icon192Path)) {
        const png192 = generateAppIconPng(192);
        fs.writeFileSync(icon192Path, png192);
      }

      if (!fs.existsSync(icon512Path)) {
        const png512 = generateAppIconPng(512);
        fs.writeFileSync(icon512Path, png512);
      }
    }
  } catch (err) {
    console.warn('Could not generate icons:', err);
  }
}
