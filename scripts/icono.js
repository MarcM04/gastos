// Genera los iconos PNG de la app sin instalar nada: un cuadrado verde con
// un símbolo del euro en blanco, dibujado a mano y guardado como PNG.
//   node scripts/icono.js
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const VERDE = [20, 83, 45];       // #14532d, el mismo color del tema
const BLANCO = [255, 255, 255];
const DESTINO = join(import.meta.dirname, '..', 'icons');

// --- Dibujo ------------------------------------------------------------------

/** ¿Está el punto (x, y) dentro del símbolo del euro? Coordenadas de -1 a 1. */
function dentroDelEuro(x, y) {
  const radio = Math.hypot(x, y);
  const grosor = 0.17;
  // Arco en forma de C, abierto hacia la derecha.
  const enElArco =
    radio > 0.62 - grosor / 2 &&
    radio < 0.62 + grosor / 2 &&
    !(x > 0.18 && Math.abs(y) < 0.52);
  // Las dos barras horizontales.
  const enUnaBarra =
    Math.abs(x + 0.14) < 0.5 &&
    (Math.abs(y + 0.17) < grosor / 2.2 || Math.abs(y - 0.17) < grosor / 2.2);
  return enElArco || enUnaBarra;
}

/** ¿Está el punto dentro del cuadrado redondeado? */
function dentroDelFondo(x, y, redondeado) {
  if (!redondeado) return true;
  const r = 0.42;                  // cuánto se comen las esquinas
  const dx = Math.max(Math.abs(x) - (1 - r), 0);
  const dy = Math.max(Math.abs(y) - (1 - r), 0);
  return Math.hypot(dx, dy) <= r;
}

/**
 * Pinta un icono. `escalaGlifo` encoge el euro para dejar margen en los
 * iconos "maskable", que Android recorta por los bordes.
 */
function pintar(lado, { redondeado = true, escalaGlifo = 0.78 } = {}) {
  const pixeles = Buffer.alloc(lado * lado * 4);
  const MUESTRAS = 3;              // 3x3 muestras por píxel para que no salga dentado

  for (let fila = 0; fila < lado; fila++) {
    for (let columna = 0; columna < lado; columna++) {
      let fondo = 0;
      let glifo = 0;
      for (let sy = 0; sy < MUESTRAS; sy++) {
        for (let sx = 0; sx < MUESTRAS; sx++) {
          const x = ((columna + (sx + 0.5) / MUESTRAS) / lado) * 2 - 1;
          const y = ((fila + (sy + 0.5) / MUESTRAS) / lado) * 2 - 1;
          if (dentroDelFondo(x, y, redondeado)) fondo++;
          if (dentroDelEuro(x / escalaGlifo, y / escalaGlifo)) glifo++;
        }
      }
      const total = MUESTRAS * MUESTRAS;
      const opacidad = fondo / total;
      const mezcla = Math.min(glifo / total, opacidad);

      const destino = (fila * lado + columna) * 4;
      for (let canal = 0; canal < 3; canal++) {
        pixeles[destino + canal] = Math.round(
          VERDE[canal] * (1 - mezcla) + BLANCO[canal] * mezcla,
        );
      }
      pixeles[destino + 3] = Math.round(opacidad * 255);
    }
  }
  return pixeles;
}

// --- Guardar como PNG --------------------------------------------------------

const TABLA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = TABLA_CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function trozo(tipo, datos) {
  const longitud = Buffer.alloc(4);
  longitud.writeUInt32BE(datos.length);
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(cuerpo));
  return Buffer.concat([longitud, cuerpo, crc]);
}

function png(lado, pixeles) {
  const cabecera = Buffer.alloc(13);
  cabecera.writeUInt32BE(lado, 0);
  cabecera.writeUInt32BE(lado, 4);
  cabecera[8] = 8;                 // 8 bits por canal
  cabecera[9] = 6;                 // RGBA
  // Cada fila del PNG lleva delante un byte de filtro (0 = ninguno).
  const filas = [];
  for (let fila = 0; fila < lado; fila++) {
    filas.push(Buffer.from([0]), pixeles.subarray(fila * lado * 4, (fila + 1) * lado * 4));
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    trozo('IHDR', cabecera),
    trozo('IDAT', deflateSync(Buffer.concat(filas), { level: 9 })),
    trozo('IEND', Buffer.alloc(0)),
  ]);
}

// --- Los cuatro iconos que hacen falta ---------------------------------------

mkdirSync(DESTINO, { recursive: true });
const iconos = [
  ['icono-180.png', 180, { redondeado: false }],              // iPhone: iOS ya redondea
  ['icono-192.png', 192, {}],
  ['icono-512.png', 512, {}],
  ['icono-maskable-512.png', 512, { redondeado: false, escalaGlifo: 0.55 }],
];

for (const [nombre, lado, opciones] of iconos) {
  const archivo = join(DESTINO, nombre);
  writeFileSync(archivo, png(lado, pintar(lado, opciones)));
  console.log('escrito', nombre);
}
