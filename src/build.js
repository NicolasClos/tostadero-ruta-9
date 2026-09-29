import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ingestar } from "./ingest/index.js";
import { enriquecerVentas } from "./clean/index.js";
import { calcularMetricas } from "./metrics/index.js";
import { generarInsights } from "./insights/index.js";
import { renderDashboard } from "./render/template.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const dataDir = resolve(__dirname, "..", process.env.DATA_DIR || process.argv[2] || "../export_erp");
const outDir = resolve(__dirname, "..", "dist");
const outFile = join(outDir, "dashboard.html");

console.log(`Leyendo datos de ${dataDir}`);
const crudos = ingestar(dataDir);

const { ventas: ventasEnriquecidas, warnings } = enriquecerVentas(crudos);
const metrics = calcularMetricas(ventasEnriquecidas, crudos.gastos);
const insights = generarInsights(metrics);

const html = renderDashboard({
  metrics,
  insights,
  warnings,
  meta: {
    generadoEn: new Intl.DateTimeFormat("es-AR", { dateStyle: "long", timeStyle: "short" }).format(new Date()),
    filas: {
      ventas: crudos.ventas.length,
      clientes: crudos.clientes.length,
      productos: crudos.productos.length,
    },
  },
});

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, html, "utf-8");

console.log(`Dashboard generado en ${outFile}`);
console.log(`Líneas de venta procesadas: ${crudos.ventas.length}`);
if (warnings.length > 0) {
  console.log(`Advertencias de calidad de datos (${warnings.length}):`);
  warnings.forEach((w) => console.log(`  - ${w}`));
} else {
  console.log("Sin advertencias de calidad de datos.");
}
