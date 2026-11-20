// Tests de la copia de seguridad: exportar e importar sin perder nada.

import test from 'node:test';
import assert from 'node:assert/strict';
import { construirCopia, leerCopia, nombreArchivo } from '../js/backup.js';
import { resumenMes } from '../js/movimientos.js';

const datos = {
  movimientos: [
    { id: 'a', tipo: 'gasto', importe: 1250, fecha: '2026-11-02', categoria: 'Supermercado', nota: 'Mercadona', creadoEn: '2026-11-02T10:00:00.000Z' },
    { id: 'b', tipo: 'gasto', importe: 999, fecha: '2026-11-15', categoria: 'Transporte', nota: '', creadoEn: '2026-11-15T10:00:00.000Z' },
    { id: 'c', tipo: 'ingreso', importe: 180000, fecha: '2026-11-25', categoria: 'Nómina', nota: '', creadoEn: '2026-11-25T10:00:00.000Z' },
  ],
  categorias: [
    { id: '1', tipo: 'gasto', nombre: 'Supermercado', orden: 0 },
    { id: '2', tipo: 'gasto', nombre: 'Transporte', orden: 1 },
    { id: '3', tipo: 'ingreso', nombre: 'Nómina', orden: 2 },
  ],
};

test('exportar e importar devuelve exactamente lo mismo', () => {
  const texto = JSON.stringify(construirCopia(datos));
  const recuperado = leerCopia(texto);
  assert.deepEqual(recuperado.movimientos, datos.movimientos);
  assert.deepEqual(recuperado.categorias, datos.categorias);
});

test('los totales del mes son los mismos antes y después de importar', () => {
  const antes = resumenMes(datos.movimientos, '2026-11');
  const despues = resumenMes(leerCopia(JSON.stringify(construirCopia(datos))).movimientos, '2026-11');
  assert.deepEqual(despues, antes);
  assert.equal(despues.ingresos, 180000);
  assert.equal(despues.gastos, 2249);
  assert.equal(despues.balance, 177751);
});

test('el archivo lleva versión y fecha', () => {
  const copia = construirCopia(datos, new Date('2026-11-20T08:30:00.000Z'));
  assert.equal(copia.aplicacion, 'gastos');
  assert.equal(copia.version, 1);
  assert.equal(copia.exportado, '2026-11-20T08:30:00.000Z');
  assert.equal(copia.movimientos.length, 3);
});

test('el nombre del archivo lleva la fecha', () => {
  assert.equal(nombreArchivo(new Date(2026, 10, 20)), 'gastos-2026-11-20.json');
  assert.equal(nombreArchivo(new Date(2027, 0, 5)), 'gastos-2027-01-05.json');
});

test('una copia vacía se importa sin romper nada', () => {
  const recuperado = leerCopia(JSON.stringify(construirCopia({ movimientos: [], categorias: [] })));
  assert.deepEqual(recuperado.movimientos, []);
  // Sin categorías en el archivo, se rescatan las de por defecto.
  assert.ok(recuperado.categorias.some((c) => c.nombre === 'Supermercado' && c.tipo === 'gasto'));
  assert.ok(recuperado.categorias.some((c) => c.nombre === 'Nómina' && c.tipo === 'ingreso'));
});

test('si el archivo no trae categorías, se sacan de los movimientos', () => {
  const recuperado = leerCopia(
    JSON.stringify({
      movimientos: [
        { id: 'x', tipo: 'gasto', importe: 500, fecha: '2026-11-01', categoria: 'Peluquería' },
      ],
    }),
  );
  assert.ok(recuperado.categorias.some((c) => c.nombre === 'Peluquería' && c.tipo === 'gasto'));
  assert.equal(recuperado.movimientos[0].categoria, 'Peluquería');
});

test('rellena lo que falte sin tocar el importe ni el tipo', () => {
  const recuperado = leerCopia(
    JSON.stringify({ movimientos: [{ tipo: 'ingreso', importe: 2500, fecha: '2026-11-01', categoria: 'Nómina' }] }),
  );
  const m = recuperado.movimientos[0];
  assert.equal(m.tipo, 'ingreso');
  assert.equal(m.importe, 2500);
  assert.equal(m.nota, '');
  assert.ok(m.id);
  assert.ok(m.creadoEn);
});

test('rechaza archivos que no sirven, sin importar nada a medias', () => {
  assert.throws(() => leerCopia('esto no es json'), /no es un JSON/);
  assert.throws(() => leerCopia('{"hola":1}'), /no tiene movimientos/);
  assert.throws(() => leerCopia('[1,2,3]'), /no tiene movimientos/);
  assert.throws(
    () => leerCopia(JSON.stringify({ movimientos: [{ tipo: 'gasto', importe: 'mucho', fecha: '2026-11-01', categoria: 'Ocio' }] })),
    /datos raros/,
  );
  assert.throws(
    () => leerCopia(JSON.stringify({ movimientos: [{ tipo: 'otra cosa', importe: 100, fecha: '2026-11-01', categoria: 'Ocio' }] })),
    /datos raros/,
  );
  assert.throws(
    () => leerCopia(JSON.stringify({ movimientos: [{ tipo: 'gasto', importe: 100, fecha: '01/11/2026', categoria: 'Ocio' }] })),
    /datos raros/,
  );
});
