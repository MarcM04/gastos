// Lógica pura de movimientos: leer importes, ordenar y calcular totales.
//
// Aquí no se toca el DOM ni IndexedDB a propósito: así estas funciones se
// pueden probar con `node --test` y son las mismas que usa el navegador.
//
// Un movimiento es un objeto plano:
//   { id, tipo: 'gasto' | 'ingreso', importe, fecha, categoria, nota, creadoEn }
// `importe` va en CÉNTIMOS enteros y siempre positivo (el signo lo da `tipo`),
// para que las sumas de dinero no arrastren errores de decimales.

/**
 * Lee un importe escrito a mano en formato español y lo devuelve en céntimos.
 * Acepta coma o punto como separador decimal y el punto de los miles:
 *   '12,50' -> 1250     '12.50' -> 1250     '1.234,56' -> 123456
 *   '1.234' -> 123400 (un punto con tres cifras detrás son miles)
 *   '7'     -> 700      '0,05'  -> 5        '  3,5 €' -> 350
 * Devuelve null si no se puede leer un número.
 */
export function parseImporte(texto) {
  if (typeof texto === 'number') {
    return Number.isFinite(texto) ? Math.round(texto * 100) : null;
  }
  if (texto === null || texto === undefined) return null;

  const limpio = String(texto).replace(/\s/g, '').replace(/€/g, '').replace(/^\+/, '');
  if (limpio === '' || !/^[0-9.,]+$/.test(limpio)) return null;

  // ¿Cuál de los separadores es el decimal? El último que aparezca.
  const ultimaComa = limpio.lastIndexOf(',');
  const ultimoPunto = limpio.lastIndexOf('.');
  let separador = null;
  if (ultimaComa >= 0 && ultimoPunto >= 0) {
    separador = ultimaComa > ultimoPunto ? ',' : '.';
  } else if (ultimaComa >= 0) {
    separador = ',';
  } else if (ultimoPunto >= 0) {
    // Un único punto: '1.234' son miles, '12.50' son decimales.
    const cifrasDetras = limpio.length - ultimoPunto - 1;
    separador = (cifrasDetras === 3 && ultimoPunto > 0) ? null : '.';
  }

  let enteros = limpio;
  let decimales = '';
  if (separador) {
    const corte = limpio.lastIndexOf(separador);
    enteros = limpio.slice(0, corte);
    decimales = limpio.slice(corte + 1);
  }
  enteros = enteros.replace(/[.,]/g, '');
  decimales = decimales.replace(/[.,]/g, '');
  if (enteros === '' && decimales === '') return null;

  // Redondeo a céntimos mirando la tercera cifra decimal, sin decimales flotantes.
  const tresDecimales = decimales.padEnd(3, '0');
  let centimos = Number(enteros || '0') * 100 + Number(tresDecimales.slice(0, 2));
  if (Number(tresDecimales[2]) >= 5) centimos += 1;
  return centimos;
}

/** Formatea céntimos como euros en formato español: 123456 -> '1.234,56 €'. */
export function formatearEuros(centimos) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
    .format((centimos || 0) / 100);
}

/** Formatea céntimos con signo según el tipo: gasto -> '−12,50 €', ingreso -> '+12,50 €'. */
export function formatearConSigno(centimos, tipo) {
  const signo = tipo === 'ingreso' ? '+' : '−';
  return signo + formatearEuros(Math.abs(centimos || 0));
}

/** La fecha de hoy en formato 'YYYY-MM-DD' según la hora local del móvil. */
export function hoyISO(fecha = new Date()) {
  const dos = (n) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

/** El mes ('YYYY-MM') de una fecha 'YYYY-MM-DD'. */
export function mesDe(fecha) {
  return String(fecha || '').slice(0, 7);
}

/** Mueve un mes 'YYYY-MM' adelante o atrás: ('2026-01', -1) -> '2025-12'. */
export function sumarMeses(mes, n) {
  const [anio, m] = String(mes).split('-').map(Number);
  const total = anio * 12 + (m - 1) + n;
  const nuevoAnio = Math.floor(total / 12);
  const nuevoMes = total - nuevoAnio * 12 + 1;
  return `${nuevoAnio}-${String(nuevoMes).padStart(2, '0')}`;
}

/** Los movimientos de un mes concreto. */
export function filtrarPorMes(movimientos, mes) {
  return movimientos.filter((m) => mesDe(m.fecha) === mes);
}

/** Ordena por fecha descendente y, dentro del mismo día, el apuntado más tarde primero. */
export function ordenarPorFecha(movimientos) {
  return [...movimientos].sort((a, b) => {
    if (a.fecha !== b.fecha) return a.fecha < b.fecha ? 1 : -1;
    return String(b.creadoEn || '').localeCompare(String(a.creadoEn || ''));
  });
}

/**
 * Totales de un mes: ingresos, gastos, balance (ingresos − gastos)
 * y gastos agrupados por categoría, de mayor a menor.
 */
export function resumenMes(movimientos, mes) {
  const delMes = filtrarPorMes(movimientos, mes);
  let ingresos = 0;
  let gastos = 0;
  const porCategoria = new Map();

  for (const m of delMes) {
    const importe = Math.abs(Number(m.importe) || 0);
    if (m.tipo === 'ingreso') {
      ingresos += importe;
    } else {
      gastos += importe;
      const categoria = m.categoria || 'Otros';
      porCategoria.set(categoria, (porCategoria.get(categoria) || 0) + importe);
    }
  }

  return {
    mes,
    ingresos,
    gastos,
    balance: ingresos - gastos,
    gastosPorCategoria: [...porCategoria]
      .map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total || a.categoria.localeCompare(b.categoria)),
  };
}

/** Meses con algún movimiento, del más reciente al más antiguo. */
export function mesesConMovimientos(movimientos) {
  return [...new Set(movimientos.map((m) => mesDe(m.fecha)))].sort().reverse();
}
