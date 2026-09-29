import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ingestar } from "./ingest/index.js";
import { enriquecerVentas } from "./clean/index.js";
import { calcularMetricas } from "./metrics/index.js";
import { generarInsights } from "./insights/index.js";
import { renderSite } from "./render/template.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const dataDir = resolve(__dirname, "..", process.env.DATA_DIR || process.argv[2] || "data");
const outDir = resolve(__dirname, "..", "dist");

console.log(`Leyendo datos de ${dataDir}`);
const crudos = ingestar(dataDir);

const { ventas: ventasEnriquecidas, warnings } = enriquecerVentas(crudos);
const metrics = calcularMetricas(ventasEnriquecidas, crudos.gastos);
const insights = generarInsights(metrics);

const pages = renderSite({
  metrics,
  insights,
  warnings,
  meta: {
    generadoEn: new Intl.DateTimeFormat("es-AR", { dateStyle: "long", timeStyle: "short" }).format(new Date()),
  },
});

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
for (const [filename, html] of Object.entries(pages)) {
  writeFileSync(join(outDir, filename), html, "utf-8");
}

console.log(`Dashboard generado en ${outDir} (${Object.keys(pages).length} páginas, empezar por index.html)`);
console.log(`Líneas de venta procesadas: ${crudos.ventas.length}`);
if (warnings.length > 0) {
  console.log(`Advertencias de calidad de datos (${warnings.length}):`);
  warnings.forEach((w) => console.log(`  - ${w}`));
} else {
  console.log("Sin advertencias de calidad de datos.");
}
