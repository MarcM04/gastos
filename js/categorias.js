// Pantalla "Ajustes": añadir, renombrar y borrar categorías de gastos y de ingresos.

import * as repo from './repo.js';
import { estado, recargar, categoriasDe, alCambiar } from './estado.js';
import { $, crear, mostrarError } from './comun.js';

const vista = {
  gasto: $('cat-gasto'),
  ingreso: $('cat-ingreso'),
  error: $('error-cat'),
};

// Id de la categoría que se está renombrando ahora mismo (null si ninguna).
let renombrando = null;

function cuantosMovimientos(categoria) {
  return estado.movimientos.filter(
    (m) => m.tipo === categoria.tipo && m.categoria === categoria.nombre,
  ).length;
}

function filaNormal(categoria) {
  const fila = crear(
    'li',
    { clase: 'categoria-fila' },
    crear('span', { clase: 'categoria-nombre', texto: categoria.nombre }),
    crear(
      'div',
      { clase: 'botones' },
      crear('button', { type: 'button', clase: 'icono', 'data-accion': 'renombrar', 'aria-label': `Renombrar ${categoria.nombre}`, texto: '✏️' }),
      crear('button', { type: 'button', clase: 'icono', 'data-accion': 'borrar', 'aria-label': `Borrar ${categoria.nombre}`, texto: '🗑️' }),
    ),
  );
  fila.dataset.id = categoria.id;
  return fila;
}

function filaRenombrando(categoria) {
  const campo = crear('input', {
    type: 'text',
    clase: 'categoria-campo',
    value: categoria.nombre,
    maxlength: '40',
    'aria-label': 'Nuevo nombre',
  });
  const fila = crear(
    'li',
    { clase: 'categoria-fila' },
    campo,
    crear(
      'div',
      { clase: 'botones' },
      crear('button', { type: 'button', clase: 'icono', 'data-accion': 'confirmar', 'aria-label': 'Guardar nombre', texto: '✔️' }),
      crear('button', { type: 'button', clase: 'icono', 'data-accion': 'cancelar', 'aria-label': 'Cancelar', texto: '✖️' }),
    ),
  );
  fila.dataset.id = categoria.id;
  return fila;
}

function pintar() {
  for (const tipo of ['gasto', 'ingreso']) {
    vista[tipo].replaceChildren(
      ...categoriasDe(tipo).map((categoria) =>
        categoria.id === renombrando ? filaRenombrando(categoria) : filaNormal(categoria),
      ),
    );
  }
  const campo = document.querySelector('.categoria-campo');
  if (campo) {
    campo.focus();
    campo.select();
  }
}

/** Comprueba que el nombre sirve: ni vacío ni repetido dentro del mismo tipo. */
function nombreValido(tipo, nombre, idQueSeExcluye = null) {
  if (!nombre) {
    mostrarError(vista.error, 'Escribe un nombre.');
    return false;
  }
  const repetida = categoriasDe(tipo).some(
    (c) => c.id !== idQueSeExcluye && c.nombre.toLowerCase() === nombre.toLowerCase(),
  );
  if (repetida) {
    mostrarError(vista.error, `Ya tienes una categoría que se llama "${nombre}".`);
    return false;
  }
  mostrarError(vista.error, '');
  return true;
}

async function anadir(evento) {
  evento.preventDefault();
  const tipo = evento.currentTarget.dataset.tipo;
  const campo = evento.currentTarget.querySelector('input');
  const nombre = campo.value.trim();
  if (!nombreValido(tipo, nombre)) return;

  const orden = Math.max(0, ...estado.categorias.map((c) => c.orden ?? 0)) + 1;
  await repo.guardarCategoria({ tipo, nombre, orden });
  campo.value = '';
  await recargar();
}

async function alPulsar(evento) {
  const boton = evento.target.closest('button[data-accion]');
  if (!boton) return;
  const fila = boton.closest('.categoria-fila');
  const categoria = estado.categorias.find((c) => c.id === fila?.dataset.id);
  if (!categoria) return;

  const accion = boton.dataset.accion;

  if (accion === 'renombrar') {
    renombrando = categoria.id;
    mostrarError(vista.error, '');
    pintar();
    return;
  }

  if (accion === 'cancelar') {
    renombrando = null;
    mostrarError(vista.error, '');
    pintar();
    return;
  }

  if (accion === 'confirmar') {
    const nombre = fila.querySelector('input').value.trim();
    if (!nombreValido(categoria.tipo, nombre, categoria.id)) return;
    renombrando = null;
    // Renombra también los movimientos que ya usaban esta categoría.
    await repo.renombrarCategoria(categoria.id, nombre);
    await recargar();
    return;
  }

  if (accion === 'borrar') {
    if (categoriasDe(categoria.tipo).length === 1) {
      mostrarError(vista.error, 'Tiene que quedar al menos una categoría de cada tipo.');
      return;
    }
    const usos = cuantosMovimientos(categoria);
    const aviso = usos
      ? `Hay ${usos} movimiento(s) con la categoría "${categoria.nombre}". Se quedan como están, pero ya no podrás elegirla. ¿Borrarla?`
      : `¿Borrar la categoría "${categoria.nombre}"?`;
    if (!confirm(aviso)) return;
    mostrarError(vista.error, '');
    await repo.borrarCategoria(categoria.id);
    await recargar();
  }
}

export function iniciarCategorias() {
  document.querySelectorAll('form.anadir').forEach((f) => f.addEventListener('submit', anadir));
  vista.gasto.addEventListener('click', alPulsar);
  vista.ingreso.addEventListener('click', alPulsar);
  alCambiar(pintar);
}
