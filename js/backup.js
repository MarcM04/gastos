// Copia de seguridad: construir el archivo y leerlo de vuelta.
// Son funciones puras (no tocan el disco ni la base) para poder probarlas.

import { CATEGORIAS_POR_DEFECTO } from './repo.js';

export const VERSION_COPIA = 1;

const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** El objeto que se guarda en el archivo .json. */
export function construirCopia({ movimientos = [], categorias = [] }, cuando = new Date()) {
  return {
    aplicacion: 'gastos',
    version: VERSION_COPIA,
    exportado: cuando.toISOString(),
    movimientos,
    categorias,
  };
}

/** Nombre del archivo: gastos-2026-11-20.json */
export function nombreArchivo(cuando = new Date()) {
  const dos = (n) => String(n).padStart(2, '0');
  const fecha = `${cuando.getFullYear()}-${dos(cuando.getMonth() + 1)}-${dos(cuando.getDate())}`;
  return `gastos-${fecha}.json`;
}

function movimientoValido(m) {
  return (
    m !== null &&
    typeof m === 'object' &&
    (m.tipo === 'gasto' || m.tipo === 'ingreso') &&
    Number.isFinite(Number(m.importe)) &&
    Number(m.importe) >= 0 &&
    typeof m.fecha === 'string' &&
    ES_FECHA.test(m.fecha) &&
    typeof m.categoria === 'string' &&
    m.categoria !== ''
  );
}

/** Las categorías que hacen falta para que todo movimiento tenga la suya. */
function categoriasDeRescate(movimientos) {
  const categorias = CATEGORIAS_POR_DEFECTO.map((c, orden) => ({ ...c, orden }));
  for (const movimiento of movimientos) {
    const existe = categorias.some(
      (c) => c.tipo === movimiento.tipo && c.nombre === movimiento.categoria,
    );
    if (!existe) {
      categorias.push({
        tipo: movimiento.tipo,
        nombre: movimiento.categoria,
        orden: categorias.length,
      });
    }
  }
  return categorias;
}

/**
 * Lee el texto de un archivo de copia y devuelve { movimientos, categorias }.
 * Lanza un Error con un mensaje en español si el archivo no sirve: más vale
 * no importar nada que importar la mitad.
 */
export function leerCopia(texto, nuevoId = () => 'id-' + Math.random().toString(16).slice(2)) {
  let datos;
  try {
    datos = JSON.parse(texto);
  } catch {
    throw new Error('El archivo no es una copia de seguridad válida (no es un JSON).');
  }

  if (!datos || typeof datos !== 'object' || !Array.isArray(datos.movimientos)) {
    throw new Error('El archivo no tiene movimientos: ¿seguro que es una copia de esta app?');
  }

  const malos = datos.movimientos.filter((m) => !movimientoValido(m)).length;
  if (malos > 0) {
    throw new Error(`El archivo tiene ${malos} movimiento(s) con datos raros. No se ha importado nada.`);
  }

  const movimientos = datos.movimientos.map((m) => ({
    id: typeof m.id === 'string' && m.id ? m.id : nuevoId(),
    tipo: m.tipo,
    importe: Math.round(Number(m.importe)),
    fecha: m.fecha,
    categoria: m.categoria,
    nota: typeof m.nota === 'string' ? m.nota : '',
    creadoEn: typeof m.creadoEn === 'string' ? m.creadoEn : new Date().toISOString(),
  }));

  const categoriasDelArchivo = Array.isArray(datos.categorias)
    ? datos.categorias.filter(
        (c) => c && (c.tipo === 'gasto' || c.tipo === 'ingreso') && typeof c.nombre === 'string' && c.nombre,
      )
    : [];

  const categorias = (categoriasDelArchivo.length
    ? categoriasDelArchivo
    : categoriasDeRescate(movimientos)
  ).map((c, orden) => ({
    id: typeof c.id === 'string' && c.id ? c.id : nuevoId(),
    tipo: c.tipo,
    nombre: c.nombre,
    orden: Number.isFinite(Number(c.orden)) ? Number(c.orden) : orden,
  }));

  return { movimientos, categorias };
}
