// Servidor estático mínimo para probar la app en local (sin dependencias).
//   npm start   ->   http://localhost:8000
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const PUERTO = Number(process.env.PUERTO || 8000);
const RAIZ = import.meta.dirname;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

createServer(async (peticion, respuesta) => {
  const ruta = decodeURIComponent(new URL(peticion.url, 'http://localhost').pathname);
  const pedida = ruta === '/' ? 'index.html' : ruta.slice(1);
  const relativa = normalize(pedida);
  try {
    if (pedida.includes('..')) throw new Error('ruta no permitida');
    const contenido = await readFile(join(RAIZ, relativa));
    respuesta.writeHead(200, {
      'Content-Type': TIPOS[extname(relativa)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    respuesta.end(contenido);
  } catch {
    respuesta.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    respuesta.end('No encontrado');
  }
}).listen(PUERTO, () => console.log(`Gastos en http://localhost:${PUERTO}`));
