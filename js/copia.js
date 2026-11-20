// Botones de copia de seguridad: exportar a un archivo .json e importarlo.

import * as repo from './repo.js';
import { recargar } from './estado.js';
import { $ } from './comun.js';
import { construirCopia, leerCopia, nombreArchivo } from './backup.js';

const vista = {
  exportar: $('exportar'),
  importar: $('importar'),
  archivo: $('archivo'),
  estado: $('estado-copia'),
};

function avisar(mensaje, esError = false) {
  vista.estado.textContent = mensaje;
  vista.estado.classList.toggle('error', esError);
}

/** Descarga de toda la vida: un enlace invisible con el archivo dentro. */
function descargar(texto, nombre) {
  const url = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

async function exportar() {
  try {
    const datos = await repo.leerTodo();
    const texto = JSON.stringify(construirCopia(datos), null, 2);
    const nombre = nombreArchivo();

    // En el iPhone con la app instalada en la pantalla de inicio, la descarga
    // directa no siempre sale; el menú de compartir sí, y desde ahí se puede
    // guardar en Archivos o iCloud.
    const archivo = new File([texto], nombre, { type: 'application/json' });
    if (navigator.standalone && navigator.canShare?.({ files: [archivo] })) {
      try {
        await navigator.share({ files: [archivo] });
        avisar(`Copia creada: ${datos.movimientos.length} movimiento(s).`);
        return;
      } catch (error) {
        if (error.name === 'AbortError') return;    // lo ha cancelado él
      }
    }

    descargar(texto, nombre);
    avisar(`Copia descargada (${nombre}) con ${datos.movimientos.length} movimiento(s).`);
  } catch (error) {
    console.error(error);
    avisar('No se ha podido crear la copia.', true);
  }
}

async function importar(evento) {
  const archivo = evento.target.files?.[0];
  evento.target.value = '';                          // permite repetir el mismo archivo
  if (!archivo) return;

  try {
    const { movimientos, categorias } = leerCopia(await archivo.text(), repo.nuevoId);
    const actuales = await repo.listarMovimientos();
    const aviso =
      `Vas a sustituir lo que hay ahora (${actuales.length} movimiento(s)) por el contenido ` +
      `del archivo (${movimientos.length} movimiento(s)). ¿Seguir?`;
    if (!confirm(aviso)) return;

    await repo.reemplazarTodo({ movimientos, categorias });
    await recargar();
    avisar(`Importados ${movimientos.length} movimiento(s) y ${categorias.length} categoría(s).`);
  } catch (error) {
    console.error(error);
    avisar(error.message || 'No se ha podido importar el archivo.', true);
  }
}

export function iniciarCopia() {
  vista.exportar.addEventListener('click', exportar);
  vista.importar.addEventListener('click', () => vista.archivo.click());
  vista.archivo.addEventListener('change', importar);
}
