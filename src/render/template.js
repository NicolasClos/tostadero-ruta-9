import { escapeHtml } from "../lib/html.js";
import { fmtMoney, fmtPct, fmtInt } from "../lib/parse.js";
import { lineChart, barChart, divergingBarChart, legendHtml } from "./charts.js";

const SEVERITY_META = {
  critical: { color: "var(--status-critical)", bg: "var(--status-critical-bg)", label: "Urgente" },
  warning: { color: "var(--status-warning)", bg: "var(--status-warning-bg)", label: "Atención" },
  info: { color: "var(--status-info)", bg: "var(--status-info-bg)", label: "Contexto" },
};

function table(headers, rows) {
  return `<div class="table-wrap"><table class="data-table"><thead><tr>${headers
    .map((h) => `<th>${escapeHtml(h)}</th>`)
    .join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(String(c))}</td>`).join("")}</tr>`)
    .join("")}</tbody></table></div>`;
}

function kpiCard(label, value, sublabel = "") {
  return `<div class="kpi-card">
    <div class="kpi-label">${escapeHtml(label)}</div>
    <div class="kpi-value">${escapeHtml(value)}</div>
    ${sublabel ? `<div class="kpi-sublabel">${escapeHtml(sublabel)}</div>` : ""}
  </div>`;
}

function insightCard(insight, index) {
  const meta = SEVERITY_META[insight.severity] ?? SEVERITY_META.info;
  return `<div class="insight-card" style="border-left-color:${meta.color}">
    <div class="insight-head">
      ${index !== undefined ? `<span class="insight-index">${index}</span>` : ""}
      <span class="badge" style="background:${meta.bg};color:${meta.color}">${meta.label}</span>
      <h3 class="insight-title">${escapeHtml(insight.titulo)}</h3>
    </div>
    <p class="insight-detail">${escapeHtml(insight.detalle)}</p>
    ${insight.accion ? `<p class="insight-action"><strong>Acción sugerida:</strong> ${escapeHtml(insight.accion)}</p>` : ""}
  </div>`;
}

function section(id, title, content, subtitle = "") {
  return `<section id="${id}" class="section">
    <h2>${escapeHtml(title)}</h2>
    ${subtitle ? `<p class="section-subtitle">${escapeHtml(subtitle)}</p>` : ""}
    ${content}
  </section>`;
}

export function renderDashboard({ metrics, insights, warnings, meta }) {
  const { mensual, porProducto, porCanal, porCliente, gastosPorConcepto, devoluciones } = metrics;
  const primero = mensual[0];
  const ultimo = mensual[mensual.length - 1];
  const ingresosTotales = mensual.reduce((a, m) => a + m.ingresos, 0);
  const margenTotal = mensual.reduce((a, m) => a + m.margenBruto, 0);
  const resultadoTotal = mensual.reduce((a, m) => a + m.resultadoNeto, 0);

  // Se muestran 3 graficos separados, no uno solo con las 3 series: en un
  // solo eje, ingresos (~decenas de millones) aplastan a margen bruto y
  // sobre todo a resultado neto (que ronda el cero) hasta hacerlos
  // ilegibles. Ingresos y margen bruto comparten orden de magnitud; margen
  // bruto y gastos operativos comparten orden de magnitud (y su distancia
  // ES el resultado neto); y el resultado neto se ve mejor como barras
  // arriba/abajo de cero que como una linea casi plana.
  const ingresosMargenSeries = [
    { name: "Ingresos", color: "var(--series-ingresos)", values: mensual.map((m) => m.ingresos) },
    { name: "Margen bruto", color: "var(--series-margen)", values: mensual.map((m) => m.margenBruto) },
  ];
  const ingresosMargenChart = lineChart({
    labels: mensual.map((m) => m.label),
    series: ingresosMargenSeries,
    formatValue: fmtMoney,
    ariaLabel: `Evolución mensual de ingresos y margen bruto, de ${primero.label} a ${ultimo.label}`,
  });
  const ingresosMargenLegend = legendHtml(ingresosMargenSeries, fmtMoney);

  const margenGastosSeries = [
    { name: "Margen bruto", color: "var(--series-margen)", values: mensual.map((m) => m.margenBruto) },
    { name: "Gastos operativos", color: "var(--series-gastos)", values: mensual.map((m) => m.gastosOperativos), dashed: true },
  ];
  const margenGastosChart = lineChart({
    labels: mensual.map((m) => m.label),
    series: margenGastosSeries,
    formatValue: fmtMoney,
    ariaLabel: `Margen bruto contra gastos operativos por mes, de ${primero.label} a ${ultimo.label}`,
  });
  const margenGastosLegend = legendHtml(margenGastosSeries, fmtMoney);

  const resultadoChart = divergingBarChart({
    labels: mensual.map((m) => m.label),
    values: mensual.map((m) => m.resultadoNeto),
    formatValue: fmtMoney,
    ariaLabel: `Resultado neto por mes, de ${primero.label} a ${ultimo.label}`,
  });

  const gastosChart = barChart({
    items: gastosPorConcepto.map((g) => ({ label: g.concepto, value: g.total })),
    barColor: "var(--series-gastos)",
    formatValue: fmtMoney,
    ariaLabel: "Gastos operativos totales del período, por concepto",
  });

  const productosTop = [...porProducto].filter((p) => p.margenBruto !== 0).slice(0, 8);
  const productosChart = barChart({
    items: productosTop.map((p) => ({ label: p.descripcion, value: p.margenBruto })),
    barColor: "var(--series-margen)",
    formatValue: fmtMoney,
    ariaLabel: "Margen bruto por producto, de mayor a menor",
  });

  const canalChart = barChart({
    items: porCanal.map((c, i) => ({
      label: c.canal,
      value: c.ingresos,
      color: ["var(--series-canal-1)", "var(--series-canal-2)", "var(--series-canal-3)", "var(--series-canal-4)"][i % 4],
    })),
    formatValue: fmtMoney,
    ariaLabel: "Facturación por canal comercial",
  });

  const clientesTop = porCliente.slice(0, 8);
  const clientesChart = barChart({
    items: clientesTop.map((c) => ({ label: c.razonSocial, value: c.ingresos })),
    barColor: "var(--series-ingresos)",
    formatValue: fmtMoney,
    ariaLabel: "Facturación por cliente, top 8",
  });

  const estadoNegocioHtml = insights.estadoDeNegocio.map((i) => insightCard(i)).join("");
  const accionesHtml = insights.accionesSemana.map((i, idx) => insightCard(i, idx + 1)).join("");

  const productosTabla = table(
    ["Producto", "Rubro", "Facturación", "Margen bruto", "Margen %", "% del total", "Devoluciones"],
    [...porProducto]
      .sort((a, b) => b.ingresos - a.ingresos)
      .map((p) => [
        p.descripcion,
        p.rubro,
        fmtMoney(p.ingresos),
        fmtMoney(p.margenBruto),
        fmtPct(p.margenBrutoPct),
        fmtPct(p.participacionIngresos),
        p.devolucionImporte > 0 ? `${fmtMoney(p.devolucionImporte)} (${fmtPct(p.devolucionPct)})` : "—",
      ])
  );

  const clientesTabla = table(
    ["Cliente", "Canal", "Facturación", "% del total", "Margen bruto", "Margen %", "Bonif. prom."],
    porCliente.map((c) => [
      c.razonSocial,
      c.canal,
      fmtMoney(c.ingresos),
      fmtPct(c.participacionIngresos),
      fmtMoney(c.margenBruto),
      fmtPct(c.margenBrutoPct),
      fmtPct(c.bonifPromedioPonderada / 100),
    ])
  );

  const mensualTabla = table(
    ["Mes", "Ingresos", "Costo mercadería", "Margen bruto", "Margen %", "Gastos operativos", "Resultado neto"],
    mensual.map((m) => [
      m.label,
      fmtMoney(m.ingresos),
      fmtMoney(m.costoTotal),
      fmtMoney(m.margenBruto),
      fmtPct(m.margenBrutoPct),
      fmtMoney(m.gastosOperativos),
      fmtMoney(m.resultadoNeto),
    ])
  );

  const warningsHtml =
    warnings.length > 0
      ? `<div class="callout callout-warning"><strong>Advertencias de calidad de datos detectadas automáticamente:</strong><ul>${warnings
          .map((w) => `<li>${escapeHtml(w)}</li>`)
          .join("")}</ul></div>`
      : `<div class="callout callout-ok">No se detectaron inconsistencias de cruce entre ventas, productos, clientes y costos en este export.</div>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Tostadero Ruta 9 — Visibilidad de negocio</title>
<style>${CSS}</style>
</head>
<body>
<header class="page-header">
  <div class="page-header-inner">
    <div>
      <p class="eyebrow">Herramienta de visibilidad de negocio</p>
      <h1>Tostadero Ruta 9</h1>
      <p class="page-subtitle">Período analizado: ${escapeHtml(primero.label)} a ${escapeHtml(ultimo.label)} · generado el ${escapeHtml(meta.generadoEn)}</p>
    </div>
    <nav class="nav">
      <a href="#resumen">Resumen</a>
      <a href="#estado">Estado del negocio</a>
      <a href="#gastos">Gastos</a>
      <a href="#productos">Productos</a>
      <a href="#clientes">Clientes y canales</a>
      <a href="#devoluciones">Devoluciones</a>
      <a href="#acciones">Acciones de la semana</a>
      <a href="#notas">Notas y supuestos</a>
    </nav>
  </div>
</header>

<main class="page-main">

${section(
  "resumen",
  "Resumen del período",
  `<div class="kpi-grid">
    ${kpiCard("Facturación total", fmtMoney(ingresosTotales), `${primero.label} a ${ultimo.label}`)}
    ${kpiCard("Margen bruto", fmtMoney(margenTotal), fmtPct(margenTotal / ingresosTotales) + " sobre facturación")}
    ${kpiCard("Resultado neto acumulado", fmtMoney(resultadoTotal), fmtPct(resultadoTotal / ingresosTotales) + " sobre facturación")}
    ${kpiCard("Resultado neto — " + ultimo.label, fmtMoney(ultimo.resultadoNeto), fmtPct(ultimo.resultadoNetoPct) + " de ese mes")}
  </div>
  <h3>Ingresos y margen bruto por mes</h3>
  ${ingresosMargenLegend}
  ${ingresosMargenChart}
  <h3>Margen bruto contra gastos operativos</h3>
  ${margenGastosLegend}
  ${margenGastosChart}
  <p class="chart-caption">La distancia entre estas dos líneas es, mes a mes, el resultado neto: cuanto más se acercan (o se cruzan), menos —o nada— queda libre.</p>
  <h3>Resultado neto por mes</h3>
  ${resultadoChart}
  ${mensualTabla}`
)}

${section(
  "estado",
  "Estado del negocio",
  `<div class="insight-list">${estadoNegocioHtml}</div>`,
  "Lectura automática de los datos del período — no reemplaza el criterio de Sofía, lo informa con números."
)}

${section(
  "gastos",
  "Gastos operativos",
  `${gastosChart}
  <p class="chart-caption">Total por concepto en todo el período (${escapeHtml(primero.label)} a ${escapeHtml(ultimo.label)}). El flete de distribución no se cobra a los clientes.</p>`
)}

${section(
  "productos",
  "Productos",
  `<h3>Margen bruto por producto</h3>
  ${productosChart}
  ${productosTabla}`
)}

${section(
  "clientes",
  "Clientes y canales",
  `<h3>Facturación por canal</h3>
  ${canalChart}
  <h3>Top 8 clientes por facturación</h3>
  ${clientesChart}
  ${clientesTabla}`
)}

${section(
  "devoluciones",
  "Devoluciones (notas de crédito)",
  `<div class="kpi-grid">
    ${kpiCard("Notas de crédito", fmtInt(devoluciones.cantidadNotas))}
    ${kpiCard("Importe devuelto", fmtMoney(devoluciones.totalImporte))}
    ${kpiCard("Unidades devueltas", fmtInt(devoluciones.totalUnidades))}
    ${kpiCard("% sobre ventas brutas", fmtPct(devoluciones.pctSobreVentasBrutas))}
  </div>
  <p class="chart-caption">Sofía indica que las notas de crédito son café que se puso viejo en el mostrador del cliente.</p>`
)}

${section(
  "acciones",
  "Acciones sugeridas para esta semana",
  `<div class="insight-list">${accionesHtml || '<p class="chart-caption">No hay acciones críticas generadas por las reglas actuales para este período.</p>'}</div>`,
  "Ordenadas por urgencia. Salen de las mismas reglas que arman \"Estado del negocio\"."
)}

${section(
  "notas",
  "Notas y supuestos",
  `${warningsHtml}
  <div class="callout callout-info">
    <strong>Supuestos aplicados para poder calcular estos números:</strong>
    <ul>
      <li>El código de producto legado <code>BLEND1K</code> (usado solo por Granos del Sur) se trató como el mismo producto que <code>CAF-BLEND-1K</code>, siguiendo el aviso de Sofía de que "quedaron códigos viejos dando vueltas".</li>
      <li>Los gastos operativos (incluido el flete) no están discriminados por producto en el export, así que se descuentan una sola vez a nivel de cada mes, no por línea de venta.</li>
      <li>El costo de mercadería de cada línea de venta se tomó del costo mensual del producto (costos.csv) correspondiente al mes de la fecha de venta.</li>
      <li>El canal comercial de cada venta es la "condición comercial" del cliente en clientes.csv (Distribuidor / Mayorista / Local / Ecommerce).</li>
      <li>La bonificación de cada línea de venta es la registrada en esa venta (no la del maestro de clientes), porque puede haber cambiado en el tiempo.</li>
    </ul>
  </div>
  <p class="build-meta">Generado a partir de ${fmtInt(meta.filas.ventas)} líneas de venta, ${fmtInt(meta.filas.clientes)} clientes y ${fmtInt(meta.filas.productos)} productos de <code>export_erp/</code>. Ver <code>sawy/README.md</code> para cómo regenerar este reporte.</p>`
)}

</main>
<footer class="page-footer">Tostadero Ruta 9 · herramienta de visibilidad de negocio construida para la cátedra · datos sintéticos</footer>
</body>
</html>`;
}

const CSS = `
:root {
  color-scheme: light dark;
  --surface-0: #f6f5f1;
  --surface-1: #fcfcfb;
  --surface-2: #ffffff;
  --text-primary: #0b0b0b;
  --text-secondary: #52514e;
  --text-muted: #898781;
  --border: rgba(11,11,11,0.10);
  --border-strong: rgba(11,11,11,0.18);
  --series-ingresos: #2a78d6;
  --series-margen: #1baf7a;
  --series-resultado: #6250d6;
  --series-gastos: #eb6834;
  --series-canal-1: #2a78d6;
  --series-canal-2: #eb6834;
  --series-canal-3: #1baf7a;
  --series-canal-4: #eda100;
  --status-critical: #d03b3b;
  --status-critical-bg: #fcebeb;
  --status-warning: #a86400;
  --status-warning-bg: #faeeda;
  --status-info: #0f6e56;
  --status-info-bg: #e1f5ee;
  --diverging-positive: #1baf7a;
  --diverging-negative: #d03b3b;
}
@media (prefers-color-scheme: dark) {
  :root {
    --surface-0: #141413;
    --surface-1: #1a1a19;
    --surface-2: #202020;
    --text-primary: #f0efec;
    --text-secondary: #c3c2b7;
    --text-muted: #898781;
    --border: rgba(255,255,255,0.12);
    --border-strong: rgba(255,255,255,0.22);
    --series-ingresos: #3987e5;
    --series-margen: #199e70;
    --series-resultado: #9085e9;
    --series-gastos: #d95926;
    --series-canal-1: #3987e5;
    --series-canal-2: #d95926;
    --series-canal-3: #199e70;
    --series-canal-4: #c98500;
    --status-critical: #f2a3a3;
    --status-critical-bg: #3a1f1f;
    --status-warning: #f0c987;
    --status-warning-bg: #3a2f1a;
    --status-info: #8fd8c2;
    --status-info-bg: #1a332c;
    --diverging-positive: #199e70;
    --diverging-negative: #e66767;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--surface-0);
  color: var(--text-primary);
  font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 1.7;
}
h1, h2, h3 { font-weight: 500; margin: 0 0 0.5rem; }
h1 { font-size: 26px; }
h2 { font-size: 20px; padding-top: 0.25rem; }
h3 { font-size: 16px; margin-top: 1.5rem; }
code { background: var(--surface-1); padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.9em; }
.page-header {
  background: var(--surface-1);
  border-bottom: 0.5px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 1;
}
.page-header-inner {
  max-width: 960px;
  margin: 0 auto;
  padding: 1.25rem 1.5rem 0.75rem;
}
.eyebrow { font-size: 13px; color: var(--text-muted); margin: 0; text-transform: none; }
.page-subtitle { color: var(--text-secondary); font-size: 14px; margin: 0.25rem 0 1rem; }
.nav { display: flex; flex-wrap: wrap; gap: 4px 18px; padding-bottom: 0.75rem; }
.nav a { color: var(--text-secondary); text-decoration: none; font-size: 14px; }
.nav a:hover { color: var(--text-primary); text-decoration: underline; }
.page-main { max-width: 960px; margin: 0 auto; padding: 1.5rem; }
.section { padding: 2rem 0; border-bottom: 0.5px solid var(--border); }
.section:last-child { border-bottom: none; }
.section-subtitle { color: var(--text-secondary); font-size: 14px; margin-top: -0.25rem; }
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; margin: 1rem 0; }
.kpi-card { background: var(--surface-1); border-radius: 8px; padding: 1rem; }
.kpi-label { font-size: 13px; color: var(--text-secondary); }
.kpi-value { font-size: 24px; font-weight: 500; margin-top: 4px; }
.kpi-sublabel { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.chart-caption { font-size: 13px; color: var(--text-muted); margin-top: 0.5rem; }
.chart-label { font-size: 12px; fill: var(--text-secondary); }
.chart-value { font-size: 12px; fill: var(--text-primary); font-weight: 500; }
.chart-axis-label { font-size: 11px; fill: var(--text-muted); }
.chart-grid { stroke: var(--border); stroke-width: 1; }
.chart-zero { stroke: var(--border-strong); stroke-width: 1; stroke-dasharray: 3 3; }
.chart-legend { display: flex; flex-wrap: wrap; gap: 8px 18px; font-size: 13px; color: var(--text-secondary); margin-bottom: 0.5rem; }
.chart-legend-item { display: inline-flex; align-items: center; gap: 6px; }
.chart-legend-swatch { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
.table-wrap { overflow-x: auto; margin-top: 1rem; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table th, .data-table td { text-align: left; padding: 8px 10px; border-bottom: 0.5px solid var(--border); white-space: nowrap; }
.data-table th { color: var(--text-secondary); font-weight: 500; }
.insight-list { display: flex; flex-direction: column; gap: 12px; margin-top: 1rem; }
.insight-card { background: var(--surface-1); border-radius: 8px; border-left: 4px solid var(--border); padding: 1rem 1.25rem; }
.insight-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.insight-index { font-size: 13px; color: var(--text-muted); font-weight: 500; }
.insight-title { font-size: 16px; margin: 0; }
.insight-detail { color: var(--text-secondary); margin: 0.5rem 0 0; }
.insight-action { margin: 0.5rem 0 0; }
.badge { font-size: 12px; padding: 2px 10px; border-radius: 999px; font-weight: 500; }
.callout { border-radius: 8px; padding: 1rem 1.25rem; font-size: 14px; margin-top: 1rem; }
.callout ul { margin: 0.5rem 0 0; padding-left: 1.25rem; }
.callout-warning { background: var(--status-warning-bg); color: var(--text-primary); }
.callout-ok { background: var(--status-info-bg); color: var(--text-primary); }
.callout-info { background: var(--surface-1); color: var(--text-primary); }
.build-meta { font-size: 12px; color: var(--text-muted); margin-top: 1rem; }
.page-footer { text-align: center; font-size: 12px; color: var(--text-muted); padding: 2rem 1.5rem; }
`;
