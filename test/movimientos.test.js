// Tests de la lógica delicada: leer importes con coma decimal y los totales.
// Se ejecutan con `npm test` (usa el runner de Node, sin dependencias).

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseImporte,
  formatearEuros,
  resumenMes,
  mesDe,
  sumarMeses,
  filtrarPorMes,
  ordenarPorFecha,
  mesesConMovimientos,
} from '../js/movimientos.js';

test('lee importes en formato español', () => {
  assert.equal(parseImporte('12,50'), 1250);
  assert.equal(parseImporte('0,05'), 5);
  assert.equal(parseImporte('7'), 700);
  assert.equal(parseImporte('1.234,56'), 123456);
  assert.equal(parseImporte('  3,5 € '), 350);
  assert.equal(parseImporte(',5'), 50);
});

test('acepta también el punto como separador decimal', () => {
  assert.equal(parseImporte('12.50'), 1250);
  assert.equal(parseImporte('12.5'), 1250);
  assert.equal(parseImporte('1,234.56'), 123456);
});

test('un punto con tres cifras detrás son miles', () => {
  assert.equal(parseImporte('1.234'), 123400);
  assert.equal(parseImporte('12.345'), 1234500);
});

test('redondea a céntimos', () => {
  assert.equal(parseImporte('1,005'), 101);
  assert.equal(parseImporte('1,004'), 100);
  assert.equal(parseImporte('0,999'), 100);
});

test('rechaza lo que no es un importe', () => {
  assert.equal(parseImporte(''), null);
  assert.equal(parseImporte('   '), null);
  assert.equal(parseImporte('hola'), null);
  assert.equal(parseImporte('12-50'), null);
  assert.equal(parseImporte('-5'), null);
  assert.equal(parseImporte(null), null);
  assert.equal(parseImporte(undefined), null);
  assert.equal(parseImporte(','), null);
});

test('formatea euros en formato español', () => {
  // En español no se agrupan los millares de cuatro cifras (1234,56), sí los de cinco (12.345,67).
  const euros = (c) => formatearEuros(c).replace(/\u00a0/g, ' ');
  assert.equal(euros(0), '0,00 €');
  assert.equal(euros(5), '0,05 €');
  assert.equal(euros(123456), '1234,56 €');
  assert.equal(euros(1234567), '12.345,67 €');
});

const movimientos = [
  { id: '1', tipo: 'gasto', importe: 1250, fecha: '2026-11-02', categoria: 'Supermercado' },
  { id: '2', tipo: 'gasto', importe: 2000, fecha: '2026-11-15', categoria: 'Supermercado' },
  { id: '3', tipo: 'gasto', importe: 999, fecha: '2026-11-15', categoria: 'Transporte' },
  { id: '4', tipo: 'ingreso', importe: 180000, fecha: '2026-11-25', categoria: 'Nómina' },
  { id: '5', tipo: 'ingreso', importe: 5000, fecha: '2026-11-28', categoria: 'Otros ingresos' },
  { id: '6', tipo: 'gasto', importe: 10000, fecha: '2026-10-31', categoria: 'Ocio' },
];

test('resumen del mes: ingresos, gastos y balance', () => {
  const r = resumenMes(movimientos, '2026-11');
  assert.equal(r.ingresos, 185000);
  assert.equal(r.gastos, 4249);
  assert.equal(r.balance, 180751);
});

test('el balance siempre cuadra con los movimientos del mes', () => {
  for (const mes of ['2026-10', '2026-11', '2026-12']) {
    const r = resumenMes(movimientos, mes);
    const suma = filtrarPorMes(movimientos, mes).reduce(
      (total, m) => total + (m.tipo === 'ingreso' ? m.importe : -m.importe),
      0,
    );
    assert.equal(r.balance, suma);
    assert.equal(r.ingresos - r.gastos, suma);
  }
});

test('gastos por categoría, de mayor a menor y sin contar ingresos', () => {
  const r = resumenMes(movimientos, '2026-11');
  assert.deepEqual(r.gastosPorCategoria, [
    { categoria: 'Supermercado', total: 3250 },
    { categoria: 'Transporte', total: 999 },
  ]);
  const suma = r.gastosPorCategoria.reduce((t, c) => t + c.total, 0);
  assert.equal(suma, r.gastos);
});

test('un mes sin movimientos da todo a cero', () => {
  const r = resumenMes(movimientos, '2025-01');
  assert.deepEqual(
    { ingresos: r.ingresos, gastos: r.gastos, balance: r.balance, cat: r.gastosPorCategoria },
    { ingresos: 0, gastos: 0, balance: 0, cat: [] },
  );
});

test('cambiar de mes', () => {
  assert.equal(mesDe('2026-11-20'), '2026-11');
  assert.equal(sumarMeses('2026-01', -1), '2025-12');
  assert.equal(sumarMeses('2026-12', 1), '2027-01');
  assert.equal(sumarMeses('2026-11', 0), '2026-11');
  assert.equal(sumarMeses('2026-03', -14), '2025-01');
});

test('la lista va de la fecha más reciente a la más antigua', () => {
  const orden = ordenarPorFecha(movimientos).map((m) => m.fecha);
  assert.deepEqual(orden, [
    '2026-11-28',
    '2026-11-25',
    '2026-11-15',
    '2026-11-15',
    '2026-10-31',
    '2026-11-02',
  ].sort().reverse());
});

test('meses con movimientos, del más reciente al más antiguo', () => {
  assert.deepEqual(mesesConMovimientos(movimientos), ['2026-11', '2026-10']);
});
