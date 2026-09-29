import { escapeHtml } from "../lib/html.js";
import { fmtMoney, fmtPct, fmtInt, periodoOrdinal } from "../lib/parse.js";
import { lineChart, barChart, divergingBarChart, legendHtml } from "./charts.js";

const SEVERITY_META = {
  critical: { color: "var(--status-critical)", bg: "var(--status-critical-bg)", ring: "var(--status-critical-ring)", label: "Urgente" },
  warning: { color: "var(--status-warning)", bg: "var(--status-warning-bg)", ring: "var(--status-warning-ring)", label: "Atención" },
  info: { color: "var(--status-info)", bg: "var(--status-info-bg)", ring: "var(--status-info-ring)", label: "Contexto" },
};

const NAV_ITEMS = [
  { id: "resumen", href: "index.html", label: "Resumen" },
  { id: "acciones", href: "acciones.html", label: "Acciones" },
  { id: "gastos", href: "gastos.html", label: "Gastos" },
  { id: "productos", href: "productos.html", label: "Productos" },
  { id: "clientes", href: "clientes.html", label: "Clientes y canales" },
  { id: "devoluciones", href: "devoluciones.html", label: "Devoluciones" },
  { id: "notas", href: "notas.html", label: "Notas y supuestos" },
];

const PAGE_ACTIONS_HTML = `<div class="page-actions">
  <a href="index.html?print=1" class="btn-ghost" data-print-target="index.html">⬇ Resumen (PDF)</a>
  <a href="reporte-completo.html?print=1" class="btn-ghost" data-print-target="reporte-completo.html">⬇ Reporte completo (PDF)</a>
</div>`;

const SITE_SCRIPT = `(function () {
  var params = new URLSearchParams(location.search);
  if (params.get("print") === "1") {
    window.addEventListener("load", function () { window.print(); });
  }

  var currentFile = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("[data-print-target]").forEach(function (btn) {
    if (btn.getAttribute("data-print-target") === currentFile) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        window.print();
      });
    }
  });

  document.querySelectorAll(".data-table").forEach(function (tbl) {
    var headers = tbl.querySelectorAll("th");
    headers.forEach(function (th, colIndex) {
      th.addEventListener("click", function () {
        var tbody = tbl.querySelector("tbody");
        var rows = Array.from(tbody.querySelectorAll("tr"));
        var asc = th.getAttribute("data-sort") !== "asc";
        headers.forEach(function (h) { h.removeAttribute("data-sort"); });
        th.setAttribute("data-sort", asc ? "asc" : "desc");
        rows.sort(function (a, b) {
          var av = a.children[colIndex].getAttribute("data-value");
          var bv = b.children[colIndex].getAttribute("data-value");
          var an = parseFloat(av);
          var bn = parseFloat(bv);
          var cmp = !isNaN(an) && !isNaN(bn) ? an - bn : String(av).localeCompare(String(bv), "es");
          return asc ? cmp : -cmp;
        });
        rows.forEach(function (row) { tbody.appendChild(row); });
      });
    });
  });
})();`;

function table(headers, rows) {
  return `<div class="table-wrap"><table class="data-table"><thead><tr>${headers
    .map((h) => `<th>${escapeHtml(h)}</th>`)
    .join("")}</tr></thead><tbody>${rows
    .map(
      (r) =>
        `<tr>${r.map((c) => `<td data-value="${escapeHtml(String(c.value))}">${escapeHtml(c.text)}</td>`).join("")}</tr>`
    )
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
  const color = escapeHtml(meta.color);
  const bg = escapeHtml(meta.bg);
  const ring = escapeHtml(meta.ring);
  return `<div class="insight-card" style="border-left-color:${color}">
    <div class="insight-head">
      ${index !== undefined ? `<span class="insight-index">${index}</span>` : ""}
      <span class="badge" style="background:${bg};color:${color};box-shadow:inset 0 0 0 1px ${ring}">${escapeHtml(meta.label)}</span>
      <h3 class="insight-title">${escapeHtml(insight.titulo)}</h3>
    </div>
    <p class="insight-detail">${escapeHtml(insight.detalle)}</p>
    ${insight.accion ? `<p class="insight-action"><span class="insight-action-label">→ Acción sugerida</span> ${escapeHtml(insight.accion)}</p>` : ""}
  </div>`;
}

function topbarHtml(activeId) {
  const links = NAV_ITEMS.map((item) => {
    const isActive = item.id === activeId;
    return `<a href="${item.href}"${isActive ? ' class="active" aria-current="page"' : ""}>${escapeHtml(item.label)}</a>`;
  }).join("");
  return `<nav class="topbar">
  <div class="topbar-inner">
    <a class="brand" href="index.html">
      <span class="brand-mark">Sawy</span><span class="brand-sep">·</span><span class="brand-client">Tostadero Ruta 9</span>
    </a>
    <div class="topbar-links">${links}</div>
  </div>
</nav>`;
}

function pageHead({ eyebrow, title, subtitle, extraHtml }) {
  return `<header class="page-head">
  <div class="page-head-inner">
    ${eyebrow ? `<p class="eyebrow">${escapeHtml(eyebrow)}</p>` : ""}
    <h1>${escapeHtml(title)}</h1>
    ${subtitle ? `<p class="page-head-subtitle">${escapeHtml(subtitle)}</p>` : ""}
    ${extraHtml || ""}
    ${PAGE_ACTIONS_HTML}
  </div>
</header>`;
}

function pageShell({ activeId, docTitle, headHtml, bodyHtml }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(docTitle)}</title>
<style>${CSS}</style>
</head>
<body>
${topbarHtml(activeId)}
${headHtml}
<main class="page-main">
${bodyHtml}
</main>
<footer class="page-footer">Sawy · reporte para Tostadero Ruta 9</footer>
<script>${SITE_SCRIPT}</script>
</body>
</html>`;
}

export function renderSite({ metrics, insights, warnings, meta }) {
  const { mensual, porProducto, porCanal, porCliente, gastosPorConcepto, devoluciones } = metrics;
  const primero = mensual[0];
  const ultimo = mensual[mensual.length - 1];
  const ingresosTotales = mensual.reduce((a, m) => a + m.ingresos, 0);
  const margenTotal = mensual.reduce((a, m) => a + m.margenBruto, 0);
  const resultadoTotal = mensual.reduce((a, m) => a + m.resultadoNeto, 0);

  const headline = insights.accionables.find((i) => i.id === "balance-periodo") ?? insights.accionables[0];
  const headlineMeta = headline ? SEVERITY_META[headline.severity] ?? SEVERITY_META.info : null;
  const heroTldrHtml = headline
    ? `<div class="hero-tldr" style="border-left-color:${escapeHtml(headlineMeta.color)}">
      <span class="badge" style="background:${escapeHtml(headlineMeta.bg)};color:${escapeHtml(headlineMeta.color)};box-shadow:inset 0 0 0 1px ${escapeHtml(headlineMeta.ring)}">${escapeHtml(headlineMeta.label)}</span>
      <p class="hero-tldr-text">${escapeHtml(headline.titulo)}</p>
    </div>`
    : "";

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

  const accionesHtml = insights.accionables.map((i, idx) => insightCard(i, idx + 1)).join("");

  const productosTabla = table(
    ["Producto", "Rubro", "Facturación", "Margen bruto", "Margen %", "% del total", "Devoluciones"],
    [...porProducto]
      .sort((a, b) => b.ingresos - a.ingresos)
      .map((p) => [
        { text: p.descripcion, value: p.descripcion },
        { text: p.rubro, value: p.rubro },
        { text: fmtMoney(p.ingresos), value: p.ingresos },
        { text: fmtMoney(p.margenBruto), value: p.margenBruto },
        { text: fmtPct(p.margenBrutoPct), value: p.margenBrutoPct },
        { text: fmtPct(p.participacionIngresos), value: p.participacionIngresos },
        {
          text: p.devolucionImporte > 0 ? `${fmtMoney(p.devolucionImporte)} (${fmtPct(p.devolucionPct)})` : "—",
          value: p.devolucionImporte,
        },
      ])
  );

  const clientesTabla = table(
    ["Cliente", "Canal", "Facturación", "% del total", "Margen bruto", "Margen %", "Bonif. prom."],
    porCliente.map((c) => [
      { text: c.razonSocial, value: c.razonSocial },
      { text: c.canal, value: c.canal },
      { text: fmtMoney(c.ingresos), value: c.ingresos },
      { text: fmtPct(c.participacionIngresos), value: c.participacionIngresos },
      { text: fmtMoney(c.margenBruto), value: c.margenBruto },
      { text: fmtPct(c.margenBrutoPct), value: c.margenBrutoPct },
      { text: fmtPct(c.bonifPromedioPonderada / 100), value: c.bonifPromedioPonderada },
    ])
  );

  const mensualTabla = table(
    ["Mes", "Ingresos", "Costo mercadería", "Margen bruto", "Margen %", "Gastos operativos", "Resultado neto"],
    mensual.map((m) => [
      { text: m.label, value: periodoOrdinal(m.periodo) },
      { text: fmtMoney(m.ingresos), value: m.ingresos },
      { text: fmtMoney(m.costoTotal), value: m.costoTotal },
      { text: fmtMoney(m.margenBruto), value: m.margenBruto },
      { text: fmtPct(m.margenBrutoPct), value: m.margenBrutoPct },
      { text: fmtMoney(m.gastosOperativos), value: m.gastosOperativos },
      { text: fmtMoney(m.resultadoNeto), value: m.resultadoNeto },
    ])
  );

  const warningsHtml =
    warnings.length > 0
      ? `<div class="callout callout-warning"><strong>Advertencias de calidad de datos detectadas automáticamente:</strong><ul>${warnings
          .map((w) => `<li>${escapeHtml(w)}</li>`)
          .join("")}</ul></div>`
      : `<div class="callout callout-ok">No se detectaron inconsistencias de cruce entre ventas, productos, clientes y costos en este export.</div>`;

  const resumenBody = `<h2>Resumen del período</h2>
  <div class="kpi-grid">
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
  ${mensualTabla}`;

  const accionesBody = `<div class="insight-list">${accionesHtml || '<p class="chart-caption">No hay observaciones generadas por las reglas actuales para este período.</p>'}</div>`;

  const gastosBody = `${gastosChart}
  <p class="chart-caption">Total por concepto en todo el período (${escapeHtml(primero.label)} a ${escapeHtml(ultimo.label)}). El flete de distribución no se cobra a los clientes.</p>`;

  const productosBody = `<h3>Margen bruto por producto</h3>
  ${productosChart}
  ${productosTabla}`;

  const clientesBody = `<h3>Facturación por canal</h3>
  ${canalChart}
  <h3>Top 8 clientes por facturación</h3>
  ${clientesChart}
  ${clientesTabla}`;

  const devolucionesBody = `<div class="kpi-grid">
    ${kpiCard("Notas de crédito", fmtInt(devoluciones.cantidadNotas))}
    ${kpiCard("Importe devuelto", fmtMoney(devoluciones.totalImporte))}
    ${kpiCard("Unidades devueltas", fmtInt(devoluciones.totalUnidades))}
    ${kpiCard("% sobre ventas brutas", fmtPct(devoluciones.pctSobreVentasBrutas))}
  </div>
  <p class="chart-caption">Las notas de crédito registradas corresponden a café que se puso viejo en el mostrador del cliente.</p>`;

  const notasBody = `${warningsHtml}
  <div class="callout callout-info">
    <strong>Supuestos aplicados para poder calcular estos números:</strong>
    <ul>
      <li>El código de producto legado <code>BLEND1K</code> (usado solo por Granos del Sur) se trató como el mismo producto que <code>CAF-BLEND-1K</code>, por tratarse de un código de un sistema anterior.</li>
      <li>Los gastos operativos (incluido el flete) no están discriminados por producto en el export, así que se descuentan una sola vez a nivel de cada mes, no por línea de venta.</li>
      <li>El costo de mercadería de cada línea de venta se tomó del costo mensual del producto (costos.csv) correspondiente al mes de la fecha de venta.</li>
      <li>El canal comercial de cada venta es la "condición comercial" del cliente en clientes.csv (Distribuidor / Mayorista / Local / Ecommerce).</li>
      <li>La bonificación de cada línea de venta es la registrada en esa venta (no la del maestro de clientes), porque puede haber cambiado en el tiempo.</li>
    </ul>
  </div>`;

  const pages = {};

  pages["index.html"] = pageShell({
    activeId: "resumen",
    docTitle: "Tostadero Ruta 9 — Resumen",
    headHtml: pageHead({
      eyebrow: "Herramienta de visibilidad de negocio",
      title: "Tostadero Ruta 9",
      subtitle: `Período analizado: ${primero.label} a ${ultimo.label} · generado el ${meta.generadoEn}`,
      extraHtml: heroTldrHtml,
    }),
    bodyHtml: resumenBody,
  });

  pages["acciones.html"] = pageShell({
    activeId: "acciones",
    docTitle: "Tostadero Ruta 9 — Acciones",
    headHtml: pageHead({
      title: "Acciones",
      subtitle: "Lectura automática de los datos del período, ordenada por urgencia — no reemplaza el criterio de negocio, lo informa con números.",
    }),
    bodyHtml: accionesBody,
  });

  pages["gastos.html"] = pageShell({
    activeId: "gastos",
    docTitle: "Tostadero Ruta 9 — Gastos operativos",
    headHtml: pageHead({ title: "Gastos operativos" }),
    bodyHtml: gastosBody,
  });

  pages["productos.html"] = pageShell({
    activeId: "productos",
    docTitle: "Tostadero Ruta 9 — Productos",
    headHtml: pageHead({ title: "Productos" }),
    bodyHtml: productosBody,
  });

  pages["clientes.html"] = pageShell({
    activeId: "clientes",
    docTitle: "Tostadero Ruta 9 — Clientes y canales",
    headHtml: pageHead({ title: "Clientes y canales" }),
    bodyHtml: clientesBody,
  });

  pages["devoluciones.html"] = pageShell({
    activeId: "devoluciones",
    docTitle: "Tostadero Ruta 9 — Devoluciones",
    headHtml: pageHead({ title: "Devoluciones (notas de crédito)" }),
    bodyHtml: devolucionesBody,
  });

  pages["notas.html"] = pageShell({
    activeId: "notas",
    docTitle: "Tostadero Ruta 9 — Notas y supuestos",
    headHtml: pageHead({ title: "Notas y supuestos" }),
    bodyHtml: notasBody,
  });

  pages["reporte-completo.html"] = pageShell({
    activeId: null,
    docTitle: "Tostadero Ruta 9 — Reporte completo",
    headHtml: pageHead({
      eyebrow: "Herramienta de visibilidad de negocio",
      title: "Tostadero Ruta 9 — Reporte completo",
      subtitle: `Período analizado: ${primero.label} a ${ultimo.label} · generado el ${meta.generadoEn}`,
      extraHtml: heroTldrHtml,
    }),
    bodyHtml: [
      `<section class="print-section">${resumenBody}</section>`,
      `<section class="print-section"><h2>Acciones</h2>${accionesBody}</section>`,
      `<section class="print-section"><h2>Gastos operativos</h2>${gastosBody}</section>`,
      `<section class="print-section"><h2>Productos</h2>${productosBody}</section>`,
      `<section class="print-section"><h2>Clientes y canales</h2>${clientesBody}</section>`,
      `<section class="print-section"><h2>Devoluciones (notas de crédito)</h2>${devolucionesBody}</section>`,
      `<section class="print-section"><h2>Notas y supuestos</h2>${notasBody}</section>`,
    ].join("\n"),
  });

  return pages;
}

const CSS = `
:root {
  color-scheme: light;
  --surface-0: #ffffff;
  --surface-1: #ffffff;
  --surface-tint-a: #fff0f7;
  --surface-tint-b: #fff7fa;
  --ink: #2a0a1c;
  --ink-dark: #1e0714;
  --text-primary: #2a0a1c;
  --text-secondary: #7a5566;
  --text-muted: #a68a95;
  --border: rgba(42,10,28,0.10);
  --border-strong: rgba(42,10,28,0.22);
  --pink: #ff3d80;
  --orange: #ff7a45;
  --gradient: linear-gradient(96deg, var(--pink) 0%, var(--orange) 100%);
  --series-ingresos: #ff3d80;
  --series-margen: #ff7a45;
  --series-gastos: #2a0a1c;
  --series-canal-1: #ff3d80;
  --series-canal-2: #ff7a45;
  --series-canal-3: #2a0a1c;
  --series-canal-4: #c98aa0;
  --status-critical: #c8102e;
  --status-critical-bg: rgba(200,16,46,0.10);
  --status-critical-ring: rgba(200,16,46,0.32);
  --status-warning: #954416;
  --status-warning-bg: rgba(255,122,69,0.12);
  --status-warning-ring: rgba(255,122,69,0.34);
  --status-info: #2f7a4f;
  --status-info-bg: rgba(47,122,79,0.10);
  --status-info-ring: rgba(47,122,79,0.30);
  --diverging-positive: #2f7a4f;
  --diverging-negative: #c8102e;
  --card-shadow: 0 1px 2px rgba(42,10,28,0.04), 0 12px 28px -14px rgba(42,10,28,0.28);
  --footer-height: 3.25rem;
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
h1, h2, h3 { font-weight: 600; margin: 0 0 0.5rem; letter-spacing: -0.02em; }
h1 { font-size: 32px; }
h2 { font-size: 21px; padding-top: 0.25rem; }
h3 { font-size: 16px; margin-top: 1.5rem; letter-spacing: -0.01em; }
code { background: var(--surface-tint-a); padding: 0.1rem 0.4rem; border-radius: 6px; font-size: 0.9em; }
.topbar {
  background: var(--surface-0);
  border-bottom: 0.5px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 10;
}
.topbar-inner {
  max-width: 960px;
  margin: 0 auto;
  padding: 0.85rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 24px;
}
.brand { display: inline-flex; align-items: baseline; gap: 8px; text-decoration: none; }
.brand-mark {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.01em;
  background: var(--gradient);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.brand-sep { color: var(--text-muted); }
.brand-client { font-size: 14px; color: var(--text-secondary); }
.topbar-links { display: flex; flex-wrap: wrap; gap: 4px 20px; }
.topbar-links a { color: var(--text-secondary); text-decoration: none; font-size: 14px; }
.topbar-links a:hover { color: var(--ink); }
.topbar-links a.active { color: var(--pink); font-weight: 600; }
.page-head {
  padding: 2rem 0 0.5rem;
  background: linear-gradient(180deg, var(--surface-tint-a) 0%, var(--surface-tint-b) 60%, var(--surface-0) 100%);
}
.page-head-inner { max-width: 960px; margin: 0 auto; padding: 0 1.5rem; }
.eyebrow { font-size: 13px; color: var(--pink); font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; margin: 0; }
.page-head-subtitle { color: var(--text-secondary); font-size: 14px; margin: 0.35rem 0 0; }
.hero-tldr { display: flex; align-items: center; gap: 12px; background: var(--surface-1); border: 1px solid var(--border); border-left: 4px solid var(--border); border-radius: 16px; box-shadow: var(--card-shadow); padding: 0.85rem 1.25rem; margin-top: 1.25rem; }
.hero-tldr-text { margin: 0; font-size: 16px; font-weight: 600; color: var(--ink); }
.page-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 1.1rem; }
.btn-ghost { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: var(--ink); background: var(--surface-1); border: 1px solid var(--border-strong); border-radius: 999px; padding: 8px 16px; text-decoration: none; }
.btn-ghost:hover { border-color: var(--pink); color: var(--pink); }
.page-main { max-width: 960px; margin: 0 auto; padding: 0.5rem 1.5rem calc(var(--footer-height) + 2rem); }
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; margin: 1rem 0; }
.kpi-card { background: var(--surface-1); border: 1px solid var(--border); border-radius: 16px; box-shadow: var(--card-shadow); padding: 1.1rem; }
.kpi-label { font-size: 13px; color: var(--text-secondary); }
.kpi-value { font-size: 24px; font-weight: 700; margin-top: 4px; letter-spacing: -0.01em; }
.kpi-sublabel { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.chart-caption { font-size: 13px; color: var(--text-muted); margin-top: 0.5rem; }
.chart-label { font-size: 12px; fill: var(--text-secondary); }
.chart-value { font-size: 12px; fill: var(--ink); font-weight: 600; }
.chart-axis-label { font-size: 11px; fill: var(--text-muted); }
.chart-grid { stroke: var(--border); stroke-width: 1; }
.chart-zero { stroke: var(--border-strong); stroke-width: 1; stroke-dasharray: 3 3; }
.chart-legend { display: flex; flex-wrap: wrap; gap: 8px 18px; font-size: 13px; color: var(--text-secondary); margin-bottom: 0.5rem; }
.chart-legend-item { display: inline-flex; align-items: center; gap: 6px; }
.chart-legend-swatch { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
.table-wrap { overflow-x: auto; margin-top: 1rem; border: 1px solid var(--border); border-radius: 16px; box-shadow: var(--card-shadow); }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table th, .data-table td { text-align: left; padding: 10px 14px; border-bottom: 0.5px solid var(--border); white-space: nowrap; }
.data-table th { color: var(--text-secondary); font-weight: 600; cursor: pointer; user-select: none; }
.data-table th:hover { color: var(--pink); }
.data-table th[data-sort="asc"]::after { content: " ▲"; font-size: 10px; color: var(--pink); }
.data-table th[data-sort="desc"]::after { content: " ▼"; font-size: 10px; color: var(--pink); }
.data-table tr:last-child td { border-bottom: none; }
.insight-list { display: flex; flex-direction: column; gap: 12px; margin-top: 1rem; }
.insight-card { background: var(--surface-1); border: 1px solid var(--border); border-radius: 16px; box-shadow: var(--card-shadow); border-left: 4px solid var(--border); padding: 1.1rem 1.25rem; }
.insight-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.insight-index { font-size: 13px; color: var(--text-muted); font-weight: 600; }
.insight-title { font-size: 16px; margin: 0; }
.insight-detail { color: var(--text-secondary); margin: 0.5rem 0 0; }
.insight-action { margin: 0.6rem 0 0; color: var(--text-secondary); }
.insight-action-label { color: var(--pink); font-weight: 700; margin-right: 4px; }
.badge { font-size: 12px; padding: 3px 12px; border-radius: 999px; font-weight: 600; }
.callout { border-radius: 16px; border: 1px solid var(--border); box-shadow: var(--card-shadow); padding: 1.1rem 1.25rem; font-size: 14px; margin-top: 1rem; }
.callout ul { margin: 0.5rem 0 0; padding-left: 1.25rem; }
.callout-warning { background: var(--status-warning-bg); color: var(--ink); }
.callout-ok { background: var(--status-info-bg); color: var(--ink); }
.callout-info { background: var(--surface-1); color: var(--ink); }
.page-footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  height: var(--footer-height);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ink-dark);
  color: var(--surface-tint-a);
  font-size: 12px;
}
.print-section { padding: 2rem 0; border-bottom: 0.5px solid var(--border); }
.print-section:last-child { border-bottom: none; }
@media print {
  .topbar, .page-footer, .page-actions { display: none !important; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { background: #fff; }
  .page-head { background: none; padding-top: 0; }
  .page-main { padding-bottom: 1rem; }
  .kpi-card, .insight-card, .callout, .table-wrap, .hero-tldr { box-shadow: none; break-inside: avoid; }
  .print-section { break-after: page; }
  .print-section:last-child { break-after: auto; }
}
`;
