// Los datos que tienen todas las pantallas a la vista, en un solo sitio.
// Cada pantalla se apunta con `alCambiar(...)` y se vuelve a pintar cuando
// `recargar()` trae datos nuevos del repositorio.

import * as repo from './repo.js';

export const estado = {
  movimientos: [],
  categorias: [],
};

const oyentes = [];

/** Pide que te avisen cada vez que cambien los datos. */
export function alCambiar(oyente) {
  oyentes.push(oyente);
}

/** Vuelve a leer todo del dispositivo y avisa a las pantallas. */
export async function recargar() {
  const [movimientos, categorias] = await Promise.all([
    repo.listarMovimientos(),
    repo.listarCategorias(),
  ]);
  estado.movimientos = movimientos;
  estado.categorias = categorias;
  oyentes.forEach((oyente) => oyente());
}

/** Las categorías de un tipo ('gasto' o 'ingreso'), en orden. */
export function categoriasDe(tipo) {
  return estado.categorias.filter((c) => c.tipo === tipo);
}
