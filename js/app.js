// Arranque de la app: enciende cada pantalla y maneja la barra de abajo.

import { recargar } from './estado.js';
import { $, mostrarError } from './comun.js';
import { iniciarApuntar, enfocarImporte } from './apuntar.js';
import { iniciarCategorias } from './categorias.js';
import { iniciarResumen, irAlMesDeHoy } from './resumen.js';
import { iniciarCopia } from './copia.js';

const TITULOS = { apuntar: 'Gastos', resumen: 'Resumen', ajustes: 'Ajustes' };

function mostrarPantalla(nombre) {
  document.querySelectorAll('.pantalla').forEach((seccion) => {
    seccion.hidden = seccion.id !== 'pantalla-' + nombre;
  });
  document.querySelectorAll('.barra button').forEach((boton) => {
    const activo = boton.dataset.pantalla === nombre;
    boton.classList.toggle('activo', activo);
    boton.setAttribute('aria-current', activo ? 'page' : 'false');
  });
  $('titulo').textContent = TITULOS[nombre];
  if (nombre === 'resumen') irAlMesDeHoy();
  window.scrollTo({ top: 0 });
}

iniciarApuntar();
iniciarResumen();
iniciarCategorias();
iniciarCopia();

document.querySelectorAll('.barra button').forEach((boton) => {
  boton.addEventListener('click', () => mostrarPantalla(boton.dataset.pantalla));
});

mostrarPantalla('apuntar');
recargar()
  .then(enfocarImporte)
  .catch((error) => {
    console.error(error);
    mostrarError($('error'), 'No se han podido leer los datos guardados en este dispositivo.');
  });

// Service worker: hace que la app abra sin conexión una vez instalada.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => console.error(error));
  });
}
