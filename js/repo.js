// Capa de datos. Es la ÚNICA pieza que habla con IndexedDB.
//
// El resto de la app solo usa las funciones de abajo, así que para cambiar
// dónde se guardan los datos (otro almacén local, un servidor, sincronización)
// basta con reescribir este archivo manteniendo los mismos nombres.

const DB_NOMBRE = 'gastos';
const DB_VERSION = 1;
const MOVIMIENTOS = 'movimientos';
const CATEGORIAS = 'categorias';

/** Categorías con las que arranca la app la primera vez. */
export const CATEGORIAS_POR_DEFECTO = [
  { tipo: 'gasto', nombre: 'Supermercado' },
  { tipo: 'gasto', nombre: 'Comida fuera' },
  { tipo: 'gasto', nombre: 'Transporte' },
  { tipo: 'gasto', nombre: 'Ocio' },
  { tipo: 'gasto', nombre: 'Compras' },
  { tipo: 'gasto', nombre: 'Salud' },
  { tipo: 'gasto', nombre: 'Hogar' },
  { tipo: 'gasto', nombre: 'Otros' },
  { tipo: 'ingreso', nombre: 'Nómina' },
  { tipo: 'ingreso', nombre: 'Otros ingresos' },
];

/** Identificador único para un movimiento o una categoría. */
export function nuevoId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}

// --- Fontanería de IndexedDB -------------------------------------------------

let promesaDb = null;

function abrir() {
  if (promesaDb) return promesaDb;
  promesaDb = new Promise((resolver, rechazar) => {
    const peticion = indexedDB.open(DB_NOMBRE, DB_VERSION);

    peticion.onupgradeneeded = () => {
      const db = peticion.result;
      if (!db.objectStoreNames.contains(MOVIMIENTOS)) {
        const almacen = db.createObjectStore(MOVIMIENTOS, { keyPath: 'id' });
        almacen.createIndex('fecha', 'fecha');
      }
      if (!db.objectStoreNames.contains(CATEGORIAS)) {
        const almacen = db.createObjectStore(CATEGORIAS, { keyPath: 'id' });
        almacen.createIndex('tipo', 'tipo');
        // Sembrar las categorías iniciales solo al crear la base.
        CATEGORIAS_POR_DEFECTO.forEach((categoria, orden) => {
          almacen.add({ id: nuevoId(), orden, ...categoria });
        });
      }
    };

    peticion.onsuccess = () => resolver(peticion.result);
    peticion.onerror = () => rechazar(peticion.error);
  });
  return promesaDb;
}

function esperar(peticion) {
  return new Promise((resolver, rechazar) => {
    peticion.onsuccess = () => resolver(peticion.result);
    peticion.onerror = () => rechazar(peticion.error);
  });
}

/** Ejecuta `trabajo(almacenes...)` dentro de una transacción y espera a que termine. */
function transaccion(nombres, modo, trabajo) {
  return abrir().then(
    (db) =>
      new Promise((resolver, rechazar) => {
        const tx = db.transaction(nombres, modo);
        let resultado;
        try {
          resultado = trabajo(...nombres.map((n) => tx.objectStore(n)));
        } catch (error) {
          tx.abort();
          rechazar(error);
          return;
        }
        tx.oncomplete = () => resolver(resultado);
        tx.onerror = () => rechazar(tx.error);
        tx.onabort = () => rechazar(tx.error);
      }),
  );
}

// --- Movimientos -------------------------------------------------------------

export async function listarMovimientos() {
  return transaccion([MOVIMIENTOS], 'readonly', (almacen) => esperar(almacen.getAll()));
}

/** Crea o actualiza un movimiento. Devuelve el movimiento guardado. */
export async function guardarMovimiento(movimiento) {
  const completo = {
    ...movimiento,
    id: movimiento.id || nuevoId(),
    creadoEn: movimiento.creadoEn || new Date().toISOString(),
  };
  await transaccion([MOVIMIENTOS], 'readwrite', (almacen) => almacen.put(completo));
  return completo;
}

export async function borrarMovimiento(id) {
  await transaccion([MOVIMIENTOS], 'readwrite', (almacen) => almacen.delete(id));
}

// --- Categorías --------------------------------------------------------------

export async function listarCategorias() {
  const todas = await transaccion([CATEGORIAS], 'readonly', (almacen) =>
    esperar(almacen.getAll()),
  );
  return todas.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.nombre.localeCompare(b.nombre));
}

export async function guardarCategoria(categoria) {
  const completa = { ...categoria, id: categoria.id || nuevoId() };
  await transaccion([CATEGORIAS], 'readwrite', (almacen) => almacen.put(completa));
  return completa;
}

/**
 * Cambia el nombre de una categoria y, de paso, el de los movimientos que ya
 * la usaban, para que el resumen del mes no se parta en dos.
 */
export function renombrarCategoria(id, nombreNuevo) {
  return transaccion([CATEGORIAS, MOVIMIENTOS], 'readwrite', (almCat, almMov) => {
    const peticion = almCat.get(id);
    peticion.onsuccess = () => {
      const categoria = peticion.result;
      if (!categoria) return;
      const nombreViejo = categoria.nombre;
      almCat.put({ ...categoria, nombre: nombreNuevo });

      const cursor = almMov.openCursor();
      cursor.onsuccess = () => {
        const actual = cursor.result;
        if (!actual) return;
        const movimiento = actual.value;
        if (movimiento.tipo === categoria.tipo && movimiento.categoria === nombreViejo) {
          actual.update({ ...movimiento, categoria: nombreNuevo });
        }
        actual.continue();
      };
    };
  });
}

export async function borrarCategoria(id) {
  await transaccion([CATEGORIAS], 'readwrite', (almacen) => almacen.delete(id));
}

// --- Copia de seguridad ------------------------------------------------------

/** Todo el contenido de la base, tal cual, para exportarlo. */
export async function leerTodo() {
  const [movimientos, categorias] = await Promise.all([
    listarMovimientos(),
    listarCategorias(),
  ]);
  return { movimientos, categorias };
}

/** Reemplaza todo el contenido de la base por el de una copia de seguridad. */
export async function reemplazarTodo({ movimientos = [], categorias = [] }) {
  await transaccion([MOVIMIENTOS, CATEGORIAS], 'readwrite', (almMov, almCat) => {
    almMov.clear();
    almCat.clear();
    movimientos.forEach((m) => almMov.put(m));
    categorias.forEach((c) => almCat.put(c));
  });
}
