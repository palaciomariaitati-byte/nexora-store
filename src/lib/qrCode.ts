/**
 * ════════════════════════════════════════════════════════════════════
 *  NEXORA ONE ENGINE — Generador Autónomo Vectorial de Códigos QR
 * ────────────────────────────────────────────────────────────────────
 *  Generador puro TypeScript sin dependencias externas ni llamadas a APIs.
 *  Soporta codificación Byte (8-bit) con corrección de errores Reed-Solomon.
 * ════════════════════════════════════════════════════════════════════
 */

// Tablas de Galois Field GF(256) para Reed-Solomon
const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);

(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    EXP_TABLE[i + 255] = x;
    LOG_TABLE[x] = i;
    x <<= 1;
    if (x & 256) x ^= 0x11d;
  }
})();

function gMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP_TABLE[LOG_TABLE[a] + LOG_TABLE[b]];
}

function rsGeneratorPoly(numEcBytes: number): number[] {
  let poly = [1];
  for (let i = 0; i < numEcBytes; i++) {
    const factor = [1, EXP_TABLE[i]];
    const nextPoly = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      nextPoly[j] ^= poly[j];
      nextPoly[j + 1] ^= gMul(poly[j], factor[1]);
    }
    poly = nextPoly;
  }
  return poly;
}

function calcReedSolomon(data: number[], numEcBytes: number): number[] {
  const gen = rsGeneratorPoly(numEcBytes);
  const result = new Array(data.length + numEcBytes).fill(0);
  for (let i = 0; i < data.length; i++) {
    result[i] = data[i];
  }

  for (let i = 0; i < data.length; i++) {
    const lead = result[i];
    if (lead !== 0) {
      for (let j = 0; j < gen.length; j++) {
        result[i + j] ^= gMul(gen[j], lead);
      }
    }
  }
  return result.slice(data.length);
}

// Configuración versión 3 (29x29) y versión 4 (33x33) con ECC Low / Medium
interface QrConfig {
  version: number;
  size: number;
  totalDataBytes: number;
  dataEcBytes: number;
  alignPos: number[];
}

const QR_CONFIGS: Record<number, QrConfig> = {
  3: { version: 3, size: 29, totalDataBytes: 70, dataEcBytes: 15, alignPos: [6, 22] },
  4: { version: 4, size: 33, totalDataBytes: 100, dataEcBytes: 20, alignPos: [6, 26] },
  5: { version: 5, size: 37, totalDataBytes: 134, dataEcBytes: 26, alignPos: [6, 30] },
};

/**
 * Codifica una cadena de texto en una matriz booleana QR (true = pixel negro, false = pixel blanco)
 */
export function generateQrMatrix(text: string): boolean[][] {
  const encoder = new TextEncoder();
  const rawBytes = encoder.encode(text);
  const dataLen = rawBytes.length;

  // Seleccionar la versión mínima adecuada
  let conf = QR_CONFIGS[3];
  if (dataLen > 50) conf = QR_CONFIGS[4];
  if (dataLen > 75) conf = QR_CONFIGS[5];

  const size = conf.size;
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));
  const isFunction = Array.from({ length: size }, () => Array(size).fill(false));

  // 1. Finder patterns (7x7) en las esquinas
  function putFinder(row: number, col: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r;
        const nc = col + c;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          isFunction[nr][nc] = true;
          if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
            matrix[nr][nc] = (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
          } else {
            matrix[nr][nc] = false;
          }
        }
      }
    }
  }

  putFinder(0, 0);
  putFinder(0, size - 7);
  putFinder(size - 7, 0);

  // 2. Alignment patterns para versión >= 2
  if (conf.alignPos.length > 0) {
    for (const r of conf.alignPos) {
      for (const c of conf.alignPos) {
        if (isFunction[r][c]) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            isFunction[nr][nc] = true;
            matrix[nr][nc] = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
          }
        }
      }
    }
  }

  // 3. Timing patterns (líneas alternadas fila 6 y columna 6)
  for (let i = 8; i < size - 8; i++) {
    if (!isFunction[6][i]) {
      matrix[6][i] = i % 2 === 0;
      isFunction[6][i] = true;
    }
    if (!isFunction[i][6]) {
      matrix[i][6] = i % 2 === 0;
      isFunction[i][6] = true;
    }
  }

  // Dark module
  matrix[4 * conf.version + 9][8] = true;
  isFunction[4 * conf.version + 9][8] = true;

  // Formato / función reservada alrededor de finders
  for (let i = 0; i < 9; i++) {
    if (i < size) {
      isFunction[8][i] = true;
      isFunction[i][8] = true;
      isFunction[8][size - 1 - i] = true;
      isFunction[size - 1 - i][8] = true;
    }
  }

  // 4. Preparar Stream de Bits (Byte mode = 0100)
  const bitStream: number[] = [];
  function pushBits(val: number, len: number) {
    for (let i = len - 1; i >= 0; i--) {
      bitStream.push((val >> i) & 1);
    }
  }

  pushBits(0b0100, 4); // Byte mode indicator
  pushBits(dataLen, 8); // Longitud
  for (let i = 0; i < dataLen; i++) {
    pushBits(rawBytes[i], 8);
  }

  // Terminator (hasta 4 ceros)
  const capacityBits = (conf.totalDataBytes - conf.dataEcBytes) * 8;
  const termLen = Math.min(4, capacityBits - bitStream.length);
  for (let i = 0; i < termLen; i++) bitStream.push(0);

  // Relleno a múltiplo de 8
  while (bitStream.length % 8 !== 0) bitStream.push(0);

  // Bytes de relleno alternados 0xEC, 0x11
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bitStream.length < capacityBits) {
    pushBits(padBytes[padIdx % 2], 8);
    padIdx++;
  }

  // Convertir bitStream a arreglo de bytes
  const dataBytes: number[] = [];
  for (let i = 0; i < bitStream.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | bitStream[i + j];
    }
    dataBytes.push(b);
  }

  // 5. Reed-Solomon Error Correction
  const ecBytes = calcReedSolomon(dataBytes, conf.dataEcBytes);
  const finalSequence = [...dataBytes, ...ecBytes];

  // Convertir finalSequence a bits para colocar en la matriz
  const allBits: number[] = [];
  for (const b of finalSequence) {
    for (let i = 7; i >= 0; i--) {
      allBits.push((b >> i) & 1);
    }
  }

  // 6. Colocar los bits en la matriz con recorrido en zigzag de 2 columnas
  let bitIdx = 0;
  let upwards = true;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--; // Saltar timing pattern vertical
    const cols = [right, right - 1];

    const rows = upwards
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const r of rows) {
      for (const c of cols) {
        if (!isFunction[r][c]) {
          const bit = bitIdx < allBits.length ? allBits[bitIdx++] : 0;
          // Aplicar máscara estándar Mask 0: (row + col) % 2 == 0
          const mask = (r + c) % 2 === 0;
          matrix[r][c] = (bit === 1) !== mask;
        }
      }
    }
    upwards = !upwards;
  }

  // 7. Información de Formato fija (Mask 0, ECC Low/Medium)
  // Cadena fija estándar precalculada con BCH para Mask 0
  const formatBits = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0];
  for (let i = 0; i < 6; i++) matrix[8][i] = formatBits[i] === 1;
  matrix[8][7] = formatBits[6] === 1;
  matrix[8][8] = formatBits[7] === 1;
  matrix[7][8] = formatBits[8] === 1;
  for (let i = 9; i < 15; i++) matrix[14 - i][8] = formatBits[i] === 1;

  for (let i = 0; i < 7; i++) matrix[size - 1 - i][8] = formatBits[i] === 1;
  for (let i = 7; i < 15; i++) matrix[8][size - 15 + i] = formatBits[i] === 1;

  return matrix.map((row) => row.map((cell) => cell ?? false));
}

/**
 * Genera código SVG listo para incrustar directamente en la UI
 */
export function generateQrSvgString(
  text: string,
  options: {
    size?: number;
    fgColor?: string;
    bgColor?: string;
    includeBorder?: boolean;
  } = {}
): string {
  const { size = 220, fgColor = '#00f2fe', bgColor = '#050b14', includeBorder = true } = options;
  const matrix = generateQrMatrix(text);
  const dim = matrix.length;
  const margin = includeBorder ? 2 : 1;
  const totalDim = dim + margin * 2;
  const cellSize = (size / totalDim).toFixed(3);

  let rects = '';
  for (let r = 0; r < dim; r++) {
    for (let c = 0; c < dim; c++) {
      if (matrix[r][c]) {
        const x = ((c + margin) * (size / totalDim)).toFixed(2);
        const y = ((r + margin) * (size / totalDim)).toFixed(2);
        rects += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${fgColor}" rx="1"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="w-full h-auto drop-shadow-[0_0_15px_rgba(0,242,254,0.35)]">
    <rect width="${size}" height="${size}" fill="${bgColor}" rx="12"/>
    ${rects}
  </svg>`;
}

