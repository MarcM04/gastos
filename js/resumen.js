// Pantalla "Resumen": ingresos, gastos y balance de un mes, y el gasto por categoría.

import { estado, alCambiar } from './estado.js';
import { $, crear } from './comun.js';
import { resumenMes, sumarMeses, formatearEuros, formatearConSigno, hoyISO, mesDe } from './movimientos.js';

const vista = {
  mes: $('mes'),
  anterior: $('mes-anterior'),
  siguiente: $('mes-siguiente'),
  ingresos: $('total-ingresos'),
  gastos: $('total-gastos'),
  balance: $('total-balance'),
  categorias: $('resumen-categorias'),
  sinGastos: $('sin-gastos'),
};

// Mes que se está mirando, en formato 'YYYY-MM'. Empieza en el mes de hoy.
let mesVisible = mesDe(hoyISO());

function nombreDelMes(mes) {
  const [anio, numero] = mes.split('-').map(Number);
  const texto = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' })
    .format(new Date(anio, numero - 1, 1));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function pintar() {
  const resumen = resumenMes(estado.movimientos, mesVisible);

  vista.mes.textContent = nombreDelMes(mesVisible);
  vista.ingresos.textContent = formatearEuros(resumen.ingresos);
  vista.gastos.textContent = formatearEuros(resumen.gastos);
  vista.balance.textContent =
    resumen.balance === 0
      ? formatearEuros(0)
      : formatearConSigno(resumen.balance, resumen.balance < 0 ? 'gasto' : 'ingreso');
  vista.balance.classList.toggle('negativo', resumen.balance < 0);

  vista.sinGastos.hidden = resumen.gastosPorCategoria.length > 0;
  vista.categorias.replaceChildren(
    ...resumen.gastosPorCategoria.map((linea) =>
      crear(
        'li',
        { clase: 'linea-categoria' },
        crear('span', { clase: 'categoria-nombre', texto: linea.categoria }),
        crear('span', { clase: 'importe', texto: formatearEuros(linea.total) }),
      ),
    ),
  );
}

function cambiarMes(cuantos) {
  mesVisible = sumarMeses(mesVisible, cuantos);
  pintar();
}

export function iniciarResumen() {
  vista.anterior.addEventListener('click', () => cambiarMes(-1));
  vista.siguiente.addEventListener('click', () => cambiarMes(1));
  alCambiar(pintar);
}

/** Al entrar en la pantalla, volver siempre al mes de hoy. */
export function irAlMesDeHoy() {
  mesVisible = mesDe(hoyISO());
  pintar();
}
