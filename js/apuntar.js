// Pantalla "Apuntar": el formulario de alta y la lista de movimientos.

import * as repo from './repo.js';
import { estado, recargar, categoriasDe, alCambiar } from './estado.js';
import { $, crear, mostrarError } from './comun.js';
import { parseImporte, formatearConSigno, hoyISO, ordenarPorFecha } from './movimientos.js';

const vista = {
  formulario: $('formulario'),
  importe: $('importe'),
  categorias: $('categorias'),
  fecha: $('fecha'),
  nota: $('nota'),
  error: $('error'),
  guardar: $('guardar'),
  cancelar: $('cancelar'),
  lista: $('lista'),
  vacio: $('vacio'),
};

const formulario = {
  tipo: 'gasto',                        // 'gasto' por defecto
  elegida: { gasto: null, ingreso: null },
  editandoId: null,
};

// --- Formulario --------------------------------------------------------------

function pintarCategorias() {
  const delTipo = categoriasDe(formulario.tipo);
  if (!delTipo.some((c) => c.nombre === formulario.elegida[formulario.tipo])) {
    formulario.elegida[formulario.tipo] = delTipo[0]?.nombre ?? null;
  }

  vista.categorias.replaceChildren(
    ...delTipo.map((categoria) => {
      const activa = categoria.nombre === formulario.elegida[formulario.tipo];
      return crear('button', {
        type: 'button',
        clase: 'chip' + (activa ? ' activo' : ''),
        'aria-pressed': String(activa),
        'data-nombre': categoria.nombre,
        texto: categoria.nombre,
      });
    }),
  );
}

function pintarTipo() {
  document.querySelectorAll('.tipo-opcion').forEach((boton) => {
    const activo = boton.dataset.tipo === formulario.tipo;
    boton.classList.toggle('activo', activo);
    boton.setAttribute('aria-pressed', String(activo));
  });
  pintarCategorias();
}

function limpiarFormulario({ mantenerTipo = true } = {}) {
  formulario.editandoId = null;
  if (!mantenerTipo) formulario.tipo = 'gasto';
  vista.importe.value = '';
  vista.nota.value = '';
  vista.fecha.value = hoyISO();
  vista.guardar.textContent = 'Guardar';
  vista.cancelar.hidden = true;
  mostrarError(vista.error, '');
  pintarTipo();
}

function rellenarFormulario(movimiento) {
  formulario.editandoId = movimiento.id;
  formulario.tipo = movimiento.tipo;
  formulario.elegida[movimiento.tipo] = movimiento.categoria;
  vista.importe.value = (movimiento.importe / 100).toFixed(2).replace('.', ',');
  vista.fecha.value = movimiento.fecha;
  vista.nota.value = movimiento.nota || '';
  vista.guardar.textContent = 'Actualizar';
  vista.cancelar.hidden = false;
  mostrarError(vista.error, '');
  pintarTipo();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  vista.importe.focus();
}

async function enviar(evento) {
  evento.preventDefault();
  const centimos = parseImporte(vista.importe.value);
  if (centimos === null) return mostrarError(vista.error, 'Escribe un importe, por ejemplo 12,50.');
  if (centimos <= 0) return mostrarError(vista.error, 'El importe tiene que ser mayor que cero.');
  if (!vista.fecha.value) return mostrarError(vista.error, 'Elige una fecha.');
  const categoria = formulario.elegida[formulario.tipo];
  if (!categoria) return mostrarError(vista.error, 'Añade antes una categoría en Ajustes.');

  const anterior = estado.movimientos.find((m) => m.id === formulario.editandoId);
  await repo.guardarMovimiento({
    id: formulario.editandoId || undefined,
    creadoEn: anterior?.creadoEn,
    tipo: formulario.tipo,
    importe: centimos,
    fecha: vista.fecha.value,
    categoria,
    nota: vista.nota.value.trim(),
  });

  limpiarFormulario();
  await recargar();
  vista.importe.focus();
}

// --- Lista -------------------------------------------------------------------

function textoFecha(fecha) {
  if (fecha === hoyISO()) return 'Hoy';
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(anio, mes - 1, dia));
}

function filaMovimiento(movimiento) {
  const fila = crear(
    'li',
    { clase: 'movimiento ' + movimiento.tipo },
    crear(
      'div',
      { clase: 'datos' },
      crear('div', { clase: 'categoria', texto: movimiento.categoria }),
      movimiento.nota ? crear('div', { clase: 'nota', texto: movimiento.nota }) : null,
    ),
    crear('div', {
      clase: 'importe',
      texto: formatearConSigno(movimiento.importe, movimiento.tipo),
    }),
    crear(
      'div',
      { clase: 'botones' },
      crear('button', { type: 'button', clase: 'icono', 'data-accion': 'editar', 'aria-label': 'Editar', texto: '✏️' }),
      crear('button', { type: 'button', clase: 'icono', 'data-accion': 'borrar', 'aria-label': 'Borrar', texto: '🗑️' }),
    ),
  );
  fila.dataset.id = movimiento.id;
  return fila;
}

function pintarLista() {
  const ordenados = ordenarPorFecha(estado.movimientos);
  vista.vacio.hidden = ordenados.length > 0;

  const nodos = [];
  let diaAnterior = null;
  for (const movimiento of ordenados) {
    if (movimiento.fecha !== diaAnterior) {
      diaAnterior = movimiento.fecha;
      nodos.push(crear('li', { clase: 'dia', texto: textoFecha(movimiento.fecha) }));
    }
    nodos.push(filaMovimiento(movimiento));
  }
  vista.lista.replaceChildren(...nodos);
}

function alPulsarLista(evento) {
  const boton = evento.target.closest('button[data-accion]');
  if (!boton) return;
  const id = boton.closest('.movimiento')?.dataset.id;
  const movimiento = estado.movimientos.find((m) => m.id === id);
  if (!movimiento) return;

  if (boton.dataset.accion === 'editar') {
    rellenarFormulario(movimiento);
    return;
  }
  const importe = formatearConSigno(movimiento.importe, movimiento.tipo);
  if (!confirm(`¿Borrar ${movimiento.categoria} ${importe}?`)) return;
  repo.borrarMovimiento(movimiento.id).then(() => {
    if (formulario.editandoId === movimiento.id) limpiarFormulario();
    return recargar();
  });
}

// --- Arranque ----------------------------------------------------------------

export function iniciarApuntar() {
  document.querySelectorAll('.tipo-opcion').forEach((boton) => {
    boton.addEventListener('click', () => {
      formulario.tipo = boton.dataset.tipo;
      mostrarError(vista.error, '');
      pintarTipo();
    });
  });

  vista.categorias.addEventListener('click', (evento) => {
    const chip = evento.target.closest('.chip');
    if (!chip) return;
    formulario.elegida[formulario.tipo] = chip.dataset.nombre;
    pintarCategorias();
  });

  vista.formulario.addEventListener('submit', enviar);
  vista.cancelar.addEventListener('click', () => limpiarFormulario({ mantenerTipo: false }));
  vista.lista.addEventListener('click', alPulsarLista);

  vista.fecha.value = hoyISO();
  alCambiar(() => {
    pintarTipo();
    pintarLista();
  });
}

export function enfocarImporte() {
  vista.importe.focus();
}
