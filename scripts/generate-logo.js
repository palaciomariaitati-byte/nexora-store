import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// Generador de PNG RGBA puro usando zlib nativo de Node.js
function createPng(width, height, getPixel) {
  const rowSize = width * 4;
  const rawData = Buffer.alloc((rowSize + 1) * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (rowSize + 1);
    rawData[rowOffset] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // CRC32 helper
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) {
        c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
      }
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const crcVal = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crcVal, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = chunk('IHDR', ihdrData);

  // IDAT
  const idatChunk = chunk('IDAT', compressed);

  // IEND
  const iendChunk = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Dimensiones: 512 x 256
const width = 512;
const height = 256;

const pngBuf = createPng(width, height, (x, y) => {
  // Coordenadas normalizadas
  const nx = x / width;
  const ny = y / height;

  // Centro
  const cx = width / 2;
  const cy = height / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Borde redondeado del holograma
  const marginX = 24;
  const marginY = 16;
  if (x < marginX || x > width - marginX || y < marginY || y > height - marginY) {
    return [0, 0, 0, 0];
  }

  // Fondo gradiente translúcido cibernético
  const bgGrad = (1 - (dist / (width * 0.55)));
  let alpha = Math.max(0, Math.min(220, Math.round(bgGrad * 120)));
  let r = 8;
  let g = 24;
  let b = 48;

  // Marco exterior brillante cian (#00f2fe)
  const isBorder = (x >= marginX && x <= marginX + 3) ||
                   (x <= width - marginX && x >= width - marginX - 3) ||
                   (y >= marginY && y <= marginY + 3) ||
                   (y <= height - marginY && y >= height - marginY - 3);

  if (isBorder) {
    return [0, 242, 254, 240];
  }

  // Destellos angulares en esquinas
  if ((x < marginX + 24 || x > width - marginX - 24) && (y < marginY + 24 || y > height - marginY - 24)) {
    return [0, 180, 255, 180];
  }

  // Monograma central / isotipo NX en el medio superior
  const isoCx = cx;
  const isoCy = 80;
  const isoDist = Math.hypot(x - isoCx, y - isoCy);
  if (isoDist < 36 && isoDist > 30) {
    return [0, 242, 254, 255];
  }
  if (isoDist <= 30) {
    // Gradiente interior del hexágono / escudo
    return [0, 112, 243, 200];
  }

  // Barra de acento cian central
  if (y >= 140 && y <= 144 && Math.abs(x - cx) < 180) {
    return [0, 242, 254, 230];
  }

  // Puntos de telemetría perimetrales
  if ((Math.abs(x - cx) === 160 || Math.abs(x - cx) === 120) && Math.abs(y - 142) < 4) {
    return [255, 255, 255, 255];
  }

  return [r, g, b, alpha];
});

const outPath = path.join(process.cwd(), 'public', 'brand', 'nexora-logo.png');
fs.writeFileSync(outPath, pngBuf);
console.log('Logo guardado con éxito en:', outPath);
