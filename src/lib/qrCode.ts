/**
 * ════════════════════════════════════════════════════════════════════
 *  NEXORA ONE ENGINE — Generador Vectorial de Códigos QR ISO/IEC 18004
 * ────────────────────────────────────────────────────────────────────
 *  Motor robusto estándar internacional de máxima legibilidad óptica.
 *  Corrección de error nivel 'M' (15%) con alto contraste puro.
 *  Compatible con todas las apps de cámara nativa (iOS y Android).
 * ════════════════════════════════════════════════════════════════════
 */

import QRCode from 'qrcode';

export interface QrOptions {
  size?: number;
  fgColor?: string;
  bgColor?: string;
  includeBorder?: boolean;
  margin?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

/**
 * Codifica una cadena de texto en una matriz booleana QR estándar ISO/IEC 18004
 * (true = píxel oscuro, false = píxel claro).
 */
export function generateQrMatrix(
  text: string,
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H' = 'M'
): boolean[][] {
  const qr = QRCode.create(text, { errorCorrectionLevel });
  const dim = qr.modules.size;
  const matrix: boolean[][] = [];

  for (let r = 0; r < dim; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < dim; c++) {
      row.push(qr.modules.get(r, c) === 1);
    }
    matrix.push(row);
  }

  return matrix;
}

/**
 * Genera código SVG vectorial con patrón de posición nítido (sharp edges)
 * y margen perimetral conforme a la norma ISO/IEC 18004.
 */
export function generateQrSvgString(
  text: string,
  options: QrOptions = {}
): string {
  const {
    size = 220,
    fgColor = '#000000',
    bgColor = '#ffffff',
    margin = 3,
    errorCorrectionLevel = 'M'
  } = options;

  const qr = QRCode.create(text, { errorCorrectionLevel });
  const dim = qr.modules.size;
  const totalDim = dim + margin * 2;
  const cellSize = Number((size / totalDim).toFixed(3));

  let rects = '';
  for (let r = 0; r < dim; r++) {
    for (let c = 0; c < dim; c++) {
      if (qr.modules.get(r, c) === 1) {
        const x = Number(((c + margin) * cellSize).toFixed(2));
        const y = Number(((r + margin) * cellSize).toFixed(2));
        rects += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${fgColor}"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="w-full h-auto drop-shadow-[0_4px_16px_rgba(0,0,0,0.18)]" shape-rendering="crispEdges">
    <rect width="${size}" height="${size}" fill="${bgColor}" rx="2"/>
    ${rects}
  </svg>`;
}
