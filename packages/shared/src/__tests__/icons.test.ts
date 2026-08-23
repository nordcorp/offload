import { describe, it, expect } from 'vitest';
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

function generateAppIconPng(size: number): Buffer {
  const width = size;
  const height = size;
  const rawBytesPerRow = width * 4 + 1;
  const rawData = Buffer.alloc(rawBytesPerRow * height);

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrChunk = createPngChunk('IHDR', ihdrData);

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createPngChunk('IDAT', compressed);
  const iendChunk = createPngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

describe('PNG icon generation', () => {
  it('generates a valid PNG buffer with proper signature and chunks', () => {
    const png192 = generateAppIconPng(192);
    expect(png192.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

    // Check IHDR length and dimensions
    const ihdrLen = png192.readUInt32BE(8);
    expect(ihdrLen).toBe(13);
    const ihdrType = png192.subarray(12, 16).toString('ascii');
    expect(ihdrType).toBe('IHDR');
    const width = png192.readUInt32BE(16);
    const height = png192.readUInt32BE(20);
    expect(width).toBe(192);
    expect(height).toBe(192);
  });

  it('generates 512x512 icon correctly', () => {
    const png512 = generateAppIconPng(512);
    const width = png512.readUInt32BE(16);
    const height = png512.readUInt32BE(20);
    expect(width).toBe(512);
    expect(height).toBe(512);
  });
});
