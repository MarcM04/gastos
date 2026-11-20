// Cuatro ayudas que usan todas las pantallas.

export const $ = (id) => document.getElementById(id);

/** Crea un elemento sin usar innerHTML (así una nota nunca se interpreta como HTML). */
export function crear(etiqueta, atributos = {}, ...hijos) {
  const nodo = document.createElement(etiqueta);
  for (const [clave, valor] of Object.entries(atributos)) {
    if (clave === 'clase') nodo.className = valor;
    else if (clave === 'texto') nodo.textContent = valor;
    else if (valor !== null && valor !== undefined) nodo.setAttribute(clave, valor);
  }
  hijos.filter(Boolean).forEach((hijo) => nodo.append(hijo));
  return nodo;
}

/** Muestra u oculta un mensaje de error. */
export function mostrarError(elemento, mensaje) {
  elemento.textContent = mensaje || '';
  elemento.hidden = !mensaje;
}
