# Sawy — visibilidad de negocio para Tostadero Ruta 9

Toma los 5 CSV que exportó Sofía de su ERP (incluidos en `data/`, ver abajo)
y genera un sitio estático de varias páginas (`dist/`, empezando por
`index.html`) que responde "¿cómo está el negocio?" y sugiere acciones
concretas.

## Cómo correrlo

Requiere únicamente Node.js 18+ (no hace falta `npm install`: el proyecto no
tiene dependencias).

```bash
npm run build
```

Esto genera las páginas dentro de `dist/`. Abrir `dist/index.html` con doble
click en cualquier navegador — no necesita servidor ni conexión a internet,
ni siquiera para los gráficos (son SVG generados por el propio script, no un
`<canvas>` con una librería externa). La navegación entre páginas usa links
relativos, así que hay que mantener todos los archivos de `dist/` juntos en
la misma carpeta.

Para correr los tests:

```bash
npm test
```

## Qué incluye el sitio generado

- **8 páginas**: Resumen, Acciones, Gastos, Productos, Clientes y canales,
  Devoluciones, Notas y supuestos, y un Reporte completo (las anteriores
  concatenadas, pensado para imprimir/exportar).
- **Tablas ordenables**: cualquier columna de cualquier tabla se ordena
  haciendo click en su encabezado (ascendente/descendente). Es JavaScript
  vanilla embebido, sin librerías — sigue funcionando sin conexión.
- **Descarga a PDF**: cada página tiene dos botones ("Resumen" y "Reporte
  completo") que abren el diálogo de impresión del navegador con una hoja de
  estilos dedicada (`@media print`) — desde ahí se guarda como PDF. No genera
  un archivo binario en el servidor porque no hay servidor: usa la función
  de impresión nativa del navegador, que es exactamente para esto.

## Por qué este stack (y no Python, ni MERN completo)

Se evaluaron Python y un stack MERN completo (Mongo + Express + React + Node)
antes de decidir. La elección final fue **Node.js + JavaScript plano, sin
base de datos y sin servidor**, por estas razones:

- **Mongo no aplica.** Los datos son tabulares, de solo lectura, sin usuarios
  concurrentes — exactamente el caso de uso opuesto al que resuelve una base
  de datos documental. Meter Mongo acá es complejidad sin beneficio.
- **Express/un servidor persistente tampoco aplica.** Esto es un reporte que
  se regenera cuando llegan datos nuevos, no una aplicación con usuarios en
  vivo. Un servidor agrega un paso ("levantalo y dejalo corriendo") que hoy
  no hace falta — y de hecho el sitio generado se despliega en Vercel como
  archivos estáticos, sin runtime de servidor.
- **JavaScript de punta a punta**, que es el lenguaje que ya usa el equipo.
  La única interactividad del sitio (ordenar tablas, disparar la impresión)
  es JavaScript vanilla embebido en cada página, sin build step ni framework.
- **Cero dependencias, como decisión de diseño.** Se desarrolló sin acceso al
  registro público de npm, así que en vez de escribir código contra
  librerías que no se podían instalar ni probar, se optó por JavaScript
  plano (Node nativo: `fs`, `node:test`) y gráficos SVG hechos a mano. El
  resultado termina siendo mejor para quien lo usa: ni siquiera hace falta
  `npm install` para correrlo, en ninguna máquina.

Patrón general: **ETL en Node → métricas en memoria → render a HTML
estático**, con tests unitarios sobre lo más propenso a bugs (parseo de CSV
con campos entre comillas, mapeo de códigos de producto legados, cálculo de
métricas mes a mes).

## Estructura

```
data/         copia de los 5 CSV del ERP, para que el repo sea autocontenido
              (el build no depende de nada fuera de este repositorio)
src/
  lib/        parseo de CSV, fechas, números y formato (es-AR); escape de HTML
  ingest/     lee los 5 CSV y los tipa (sin reglas de negocio)
  clean/      reglas de negocio: código de producto legado, cruces con
              productos/clientes/costos, calculo de margen por línea
  metrics/    agregaciones: mensual, por producto, por canal, por cliente,
              gastos por concepto, devoluciones
  insights/   reglas que generan las acciones, a partir de las métricas
              (nada de texto fijo)
  render/     genera el HTML final: gráficos SVG (charts.js), layout
              (template.js) y el JS embebido de orden/impresión
  build.js    orquesta todo, de punta a punta
test/         un archivo de test por módulo de src/, con datos sintéticos
              calculados a mano (no los CSV reales)
dist/         salida de `npm run build`: 8 páginas HTML, empezar por index.html
```

## Supuestos sobre los datos

Están documentados en detalle (y con los números reales) en `notas.html`,
que es la fuente viva de esto. En resumen:

- El código de producto legado `BLEND1K` (usado solo por Granos del Sur) se
  mapea a `CAF-BLEND-1K` — ver `src/clean/index.js`.
- Los gastos operativos no están discriminados por producto en el export, así
  que se descuentan una sola vez a nivel de mes, no por línea de venta.
- El costo de cada línea de venta sale del costo mensual del producto
  (`costos.csv`) para el mes de la fecha de venta.
- El canal comercial de cada venta es la `condicion_comercial` del cliente.
- La bonificación de cada línea es la registrada en esa venta puntual, no la
  del maestro de clientes.

Si el cruce de datos falla para alguna línea (falta costo, falta cliente,
falta producto), la herramienta no se cae: sigue procesando con un valor por
defecto y lo reporta como advertencia (ver `enriquecerVentas` en
`src/clean/index.js` y `notas.html`). Con el export actual no hay ninguna
advertencia.

## Deploy en Vercel

El repo ya incluye `vercel.json` (`buildCommand: npm run build`,
`outputDirectory: dist`). Pasos:

1. Subir este repositorio a GitHub (repo propio, no hace falta que sea
   público).
2. En Vercel: "Add New Project" → importar el repo → framework preset
   "Other" (Vercel lo detecta solo por el `vercel.json`) → Deploy.
3. Vercel corre `npm install` (no instala nada, no hay dependencias) y
   después `npm run build`, que lee `data/` y escribe `dist/`, y sirve esa
   carpeta como sitio estático.

No hace falta ninguna variable de entorno ni base de datos. Si el día de
mañana cambian los CSV, alcanza con reemplazar los archivos en `data/`,
commitear, y Vercel vuelve a buildear solo.

## Preview opcional vía servidor local

El sitio está pensado para abrirse directo (`file://`), pero si se
quiere ver servido por http (por ejemplo para probarlo en herramientas que no
soportan `file://`), en la carpeta padre de este repositorio hay un
`.claude/launch.json` que levanta un servidor estático de un solo comando
(`python3 -m http.server`) apuntando a `sawy/dist/`. Es solo una comodidad de
desarrollo, no hace falta para usar el reporte.
