# Gastos

App para apuntar a mano gastos e ingresos, pensada para un solo usuario y para
usarse desde el móvil como una app más de la pantalla de inicio.

Los datos se guardan **en el propio dispositivo** (IndexedDB del navegador). No
hay servidor, ni cuentas, ni registro, ni analítica, ni servicios de terceros.
Nadie que abra la dirección web ve nada tuyo: en el servidor solo está el código.

## Qué hace

- Apuntar un **gasto** o un **ingreso**: importe, categoría, fecha y nota opcional.
- Lista de movimientos por fecha, con editar y borrar.
- Resumen del mes: ingresos, gastos, balance y gasto por categoría, cambiando de mes.
- Categorías propias, separadas para gastos y para ingresos.
- Copia de seguridad: exportar todo a un archivo `.json` e importarlo.
- Funciona sin conexión y se instala en la pantalla de inicio.

## Arrancarla en local

Hace falta [Node.js](https://nodejs.org) 18 o superior. No hay que instalar
dependencias: la app no tiene ninguna.

```
npm start
```

Abre <http://localhost:8000>. Para los tests:

```
npm test
```

Para regenerar los iconos (solo si cambias el dibujo o el color):

```
node scripts/icono.js
```

## Publicarla en internet

Para instalarla en el móvil hace falta una dirección web con **https**. La app
son archivos estáticos: vale cualquier hosting estático gratuito.

**La opción más sencilla: Netlify Drop.**

1. Prepara la carpeta a subir:

   ```
   npm run publicar
   ```

   Deja en `publicar/` solo lo que el sitio necesita, sin `package.json` (si lo
   ve, Netlify cree que hay que compilar algo) ni tests ni scripts.
2. Entra en <https://app.netlify.com/drop>.
3. Arrastra la carpeta `publicar` a la página.
4. En unos segundos te da una dirección del tipo `https://algo-raro-123.netlify.app`.
5. Crea una cuenta gratuita cuando te lo pida, para que el sitio no caduque, y
   si quieres cámbiale el nombre en *Site settings → Change site name*.

Para actualizarla más adelante: `npm run publicar` otra vez y arrastras `publicar` al mismo sitio.

**Alternativa: GitHub Pages.** Si prefieres tenerlo en un repositorio: creas el
repo, subes el contenido de `publicar` y activas *Settings → Pages → Deploy from a branch*. Da
una dirección `https://usuario.github.io/gastos/`, que también sirve.

Da igual que la dirección sea pública: tus movimientos no salen de tu móvil.

## Instalarla en el móvil

### iPhone (Safari)

1. Abre la dirección **en Safari** (no vale Chrome ni Firefox en iPhone).
2. Toca el botón **Compartir** (el cuadrado con la flecha hacia arriba).
3. Baja y toca **Añadir a pantalla de inicio**.
4. Ponle el nombre que quieras y toca **Añadir**.

Ya tienes el icono verde con el euro. Al abrirlo desde ahí se ve a pantalla
completa, sin la barra del navegador.

> **Importante:** instálala de verdad en la pantalla de inicio. Si la usas solo
> como una página de Safari, iOS borra los datos de los sitios que no abres en
> unos 7 días. Instalada no caduca.

### Android (Chrome)

1. Abre la dirección en Chrome.
2. Chrome suele mostrar un aviso **Instalar app**; si no sale, menú ⋮ →
   **Añadir a pantalla de inicio** / **Instalar app**.

## Copia de seguridad (importante)

Tus datos están solo en este dispositivo. Los pierdes si borras los datos del
navegador, desinstalas la app o cambias de móvil. Por eso:

- En **Ajustes → Copia de seguridad → Exportar** se descarga un archivo
  `gastos-AAAA-MM-DD.json` con todos los movimientos y categorías. Guárdalo
  donde no se pierda (iCloud, Drive, el correo...).
- En el móvil nuevo: abres la app, **Importar**, eliges el archivo y te pregunta
  antes de sustituir lo que haya.
- Si el archivo está corrupto o no es una copia de esta app, no importa nada: o
  entra todo o no entra nada.

En el iPhone, con la app instalada, "Exportar" abre el menú de compartir de iOS
para que lo guardes en Archivos o iCloud, porque Safari no siempre deja
descargar archivos desde una app instalada.

## Cómo está hecho

HTML, CSS y JavaScript a pelo. Sin framework, sin compilación, sin dependencias.

```
index.html              la única página; una sección por pantalla
app.css                 estilos, pensados primero para el móvil
manifest.webmanifest    nombre, iconos y colores para que se pueda instalar
sw.js                   service worker: guarda la app para abrirla sin conexión
servidor.js             servidor estático para probar en local
js/
  repo.js               ÚNICA pieza que habla con IndexedDB
  movimientos.js        lógica pura: importes, orden, totales y balance
  backup.js             construir y leer el archivo de copia
  estado.js             los datos a la vista y el aviso a las pantallas
  comun.js              cuatro ayudas compartidas
  apuntar.js            pantalla de apuntar y lista
  resumen.js            pantalla del resumen del mes
  categorias.js         pantalla de categorías
  copia.js              botones de exportar e importar
  app.js                arranque y navegación
scripts/icono.js        genera los iconos PNG
test/                   tests con el runner de Node
icons/                  iconos generados
```

La capa de datos está aislada en `js/repo.js` a propósito: para añadir
sincronización o cambiar de almacén más adelante se reescribe ese archivo y ya,
sin tocar las pantallas.

Cada movimiento se guarda así:

```json
{
  "id": "...",
  "tipo": "gasto",
  "importe": 1250,
  "fecha": "2026-11-20",
  "categoria": "Supermercado",
  "nota": "Mercadona",
  "creadoEn": "2026-11-20T11:15:10.162Z"
}
```

El campo `tipo` (`gasto` o `ingreso`) va dentro de cada movimiento para poder
ampliar sin migraciones. El importe se guarda en **céntimos enteros**: así las
sumas de dinero no arrastran errores de decimales.

## Tests

```
npm test
```

Cubren lo delicado: leer importes con coma decimal (`12,50`, `1.234,56`, y
también con punto), los totales de ingresos, gastos y balance por mes, que el
balance cuadre siempre con los movimientos de la lista, los totales por
categoría, y exportar e importar sin perder nada ni cambiar los totales.
