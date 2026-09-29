# Tostadero Ruta 9 — herramienta de visibilidad de negocio

Toma los 5 CSV que exportó Sofía de su ERP (`../export_erp/`) y genera un
único reporte HTML (`dist/dashboard.html`) que responde "¿cómo está el
negocio?" y sugiere acciones concretas para la semana.

## Cómo correrlo

Requiere únicamente Node.js 18+ (no hace falta `npm install`: el proyecto no
tiene dependencias).

```bash
npm run build
```

Esto genera `dist/dashboard.html`. Se abre con doble click en cualquier
navegador — no necesita servidor ni conexión a internet, ni siquiera para los
gráficos (son SVG generados por el propio script, no un `<canvas>` con una
librería externa).

Para correr los tests:

```bash
npm test
```

## Por qué este stack (y no Python, ni MERN completo)

Quien pidió este ejercicio no tiene experiencia en Python y preguntó
puntualmente si un stack MERN (Mongo + Express + React + Node) era una buena
idea. La decisión final fue **Node.js + JavaScript plano, sin base de datos y
sin servidor**, por estas razones:

- **Mongo no aplica.** Los datos son tabulares, de solo lectura, sin usuarios
  concurrentes — exactamente el caso de uso opuesto al que resuelve una base
  de datos documental. Meter Mongo acá es complejidad sin beneficio.
- **Express/un servidor persistente tampoco aplica.** Esto es un reporte que
  se regenera cuando Sofía manda datos nuevos, no una aplicación con usuarios
  en vivo. Un servidor agrega un paso ("levantalo y dejalo corriendo") que ni
  Sofía ni quien corrija esto necesitan.
- **Se mantiene JavaScript de punta a punta**, que es el lenguaje con el que
  la persona que armó esto está cómoda.
- **Cero dependencias, no por dogma sino por restricción real:** esta
  máquina tiene el registro de npm limitado a un mirror corporativo interno
  (devuelve 403 para paquetes públicos como `typescript` o `chart.js`). En
  vez de escribir código contra librerías que no se podían instalar ni
  probar acá, se optó por JavaScript plano (Node nativo: `fs`, `node:test`)
  y gráficos SVG hechos a mano. El resultado termina siendo mejor para el
  entregable en sí: ni siquiera hace falta `npm install` para correrlo, en
  ninguna máquina.

Patrón general: **ETL en Node → métricas en memoria → render a HTML
estático**, con tests unitarios sobre lo más propenso a bugs (parseo de CSV
con campos entre comillas, mapeo de códigos de producto legados, cálculo de
métricas mes a mes).

## Estructura

```
src/
  lib/        parseo de CSV, fechas, números y formato (es-AR); escape de HTML
  ingest/     lee los 5 CSV y los tipa (sin reglas de negocio)
  clean/      reglas de negocio: código de producto legado, cruces con
              productos/clientes/costos, calculo de margen por línea
  metrics/    agregaciones: mensual, por producto, por canal, por cliente,
              gastos por concepto, devoluciones
  insights/   reglas que generan el "estado del negocio" y las acciones de
              la semana, a partir de las métricas (nada de texto fijo)
  render/     genera el HTML final: gráficos SVG (charts.js) + layout
              (template.js)
  build.js    orquesta todo, de punta a punta
test/         un archivo de test por módulo de src/, con datos sintéticos
              calculados a mano (no los CSV reales)
dist/         salida de `npm run build` (dashboard.html ya generado)
```

## Supuestos sobre los datos

Están documentados en detalle (y con los números reales) en la sección
"Notas y supuestos" del propio `dashboard.html`, que es la fuente viva de
esto. En resumen:

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
`src/clean/index.js` y la sección "Notas y supuestos" del reporte). Con el
export actual no hay ninguna advertencia.

## Preview opcional vía servidor local

`dashboard.html` está pensado para abrirse directo (`file://`), pero si se
quiere ver servido por http (por ejemplo para probarlo en herramientas que no
soportan `file://`), en la carpeta del ejercicio (un nivel arriba de este
repo) hay un `.claude/launch.json` que levanta un servidor estático de un
solo comando (`python3 -m http.server`) apuntando a `sawy/dist/`. Es solo
una comodidad de desarrollo, no hace falta para usar el reporte.
