// Deja en la carpeta `publicar/` solo los archivos que hacen falta en el
// servidor, sin package.json (si no, Netlify cree que hay que compilar algo)
// ni tests ni scripts.
//   npm run publicar
import { cpSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = join(import.meta.dirname, '..');
const DESTINO = join(RAIZ, 'publicar');
const LO_QUE_VA = ['index.html', 'app.css', 'manifest.webmanifest', 'sw.js', 'js', 'icons'];

rmSync(DESTINO, { recursive: true, force: true });
mkdirSync(DESTINO, { recursive: true });
for (const nombre of LO_QUE_VA) {
  cpSync(join(RAIZ, nombre), join(DESTINO, nombre), { recursive: true });
}
console.log('Listo: arrastra la carpeta', DESTINO);
