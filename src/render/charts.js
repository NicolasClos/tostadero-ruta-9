import { escapeHtml } from "../lib/html.js";

export function lineChart({ labels, series, width = 680, height = 280, formatValue = String, ariaLabel }) {
  const marginLeft = 74;
  const marginRight = 16;
  const top = 16;
  const bottom = 28;
  const plotW = width - marginLeft - marginRight;
  const plotH = height - top - bottom;

  const allValues = series.flatMap((s) => s.values);
  const rawMin = Math.min(0, ...allValues);
  const rawMax = Math.max(0, ...allValues);
  const range = rawMax - rawMin || 1;
  const domainMin = rawMin - range * 0.1;
  const domainMax = rawMax + range * 0.1;

  const x = (i) => (labels.length <= 1 ? marginLeft + plotW / 2 : marginLeft + (plotW * i) / (labels.length - 1));
  const y = (v) => top + plotH - ((v - domainMin) / (domainMax - domainMin)) * plotH;

  const ticks = [0, 0.25, 0.5, 0.75, 1]
    .map((f) => {
      const val = domainMax - f * (domainMax - domainMin);
      const ty = top + f * plotH;
      return `<line x1="${marginLeft}" y1="${ty.toFixed(1)}" x2="${width - marginRight}" y2="${ty.toFixed(1)}" class="chart-grid"></line>
      <text x="${marginLeft - 8}" y="${(ty + 4).toFixed(1)}" text-anchor="end" class="chart-axis-label">${escapeHtml(formatValue(val))}</text>`;
    })
    .join("");

  const zeroLine =
    domainMin < 0
      ? `<line x1="${marginLeft}" y1="${y(0).toFixed(1)}" x2="${width - marginRight}" y2="${y(0).toFixed(1)}" class="chart-zero"></line>`
      : "";

  const xLabels = labels
    .map((l, i) => `<text x="${x(i).toFixed(1)}" y="${height - 8}" text-anchor="middle" class="chart-axis-label">${escapeHtml(l)}</text>`)
    .join("");

  const lines = series
    .map((s) => {
      const points = s.values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
      const lastIdx = s.values.length - 1;
      const color = escapeHtml(s.color);
      return `<path d="${points}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${s.dashed ? ' stroke-dasharray="6 4"' : ""}></path>
      <circle cx="${x(lastIdx).toFixed(1)}" cy="${y(s.values[lastIdx]).toFixed(1)}" r="4" fill="${color}"></circle>`;
    })
    .join("");

  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" role="img" aria-label="${escapeHtml(ariaLabel)}">${ticks}${zeroLine}${lines}${xLabels}</svg>`;
}

export function divergingBarChart({ labels, values, width = 680, height = 220, formatValue = String, ariaLabel }) {
  const marginLeft = 74;
  const marginRight = 16;
  const top = 20;
  const bottom = 28;
  const plotW = width - marginLeft - marginRight;
  const plotH = height - top - bottom;

  const rawMin = Math.min(0, ...values);
  const rawMax = Math.max(0, ...values);
  const range = rawMax - rawMin || 1;
  const domainMin = rawMin - range * 0.15;
  const domainMax = rawMax + range * 0.15;

  const y = (v) => top + plotH - ((v - domainMin) / (domainMax - domainMin)) * plotH;
  const zeroY = y(0);
  const slot = plotW / values.length;
  const barW = Math.min(40, slot * 0.5);

  const ticks = [0, 0.25, 0.5, 0.75, 1]
    .map((f) => {
      const val = domainMax - f * (domainMax - domainMin);
      const ty = top + f * plotH;
      return `<line x1="${marginLeft}" y1="${ty.toFixed(1)}" x2="${width - marginRight}" y2="${ty.toFixed(1)}" class="chart-grid"></line>
      <text x="${marginLeft - 8}" y="${(ty + 4).toFixed(1)}" text-anchor="end" class="chart-axis-label">${escapeHtml(formatValue(val))}</text>`;
    })
    .join("");

  const bars = values
    .map((v, i) => {
      const cx = marginLeft + slot * (i + 0.5);
      const barY = Math.min(y(v), zeroY);
      const barH = Math.max(1, Math.abs(y(v) - zeroY));
      const color = v >= 0 ? "var(--diverging-positive)" : "var(--diverging-negative)";
      const labelY = v >= 0 ? barY - 6 : barY + barH + 14;
      return `<rect x="${(cx - barW / 2).toFixed(1)}" y="${barY.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" rx="3" fill="${color}"></rect>
      <text x="${cx.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" class="chart-value">${escapeHtml(formatValue(v))}</text>
      <text x="${cx.toFixed(1)}" y="${height - 8}" text-anchor="middle" class="chart-axis-label">${escapeHtml(labels[i])}</text>`;
    })
    .join("");

  const zeroLine = `<line x1="${marginLeft}" y1="${zeroY.toFixed(1)}" x2="${width - marginRight}" y2="${zeroY.toFixed(1)}" class="chart-zero"></line>`;

  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" role="img" aria-label="${escapeHtml(ariaLabel)}">${ticks}${zeroLine}${bars}</svg>`;
}

export function barChart({ items, width = 680, rowHeight = 34, barColor = "var(--series-ingresos)", formatValue = String, ariaLabel }) {
  const marginLeft = 240;
  const marginRight = 96;
  const top = 8;
  const bottom = 8;
  const plotW = width - marginLeft - marginRight;
  const height = items.length * rowHeight + top + bottom;
  const maxVal = Math.max(1, ...items.map((i) => Math.abs(i.value)));
  const barH = Math.min(22, rowHeight - 12);

  const gridLines = [0, 0.25, 0.5, 0.75, 1]
    .map((f) => {
      const gx = marginLeft + plotW * f;
      return `<line x1="${gx.toFixed(1)}" y1="${top}" x2="${gx.toFixed(1)}" y2="${height - bottom}" class="chart-grid"></line>`;
    })
    .join("");

  const rows = items
    .map((item, i) => {
      const cy = top + i * rowHeight + rowHeight / 2;
      const barW = Math.max(1, (Math.abs(item.value) / maxVal) * plotW);
      const color = escapeHtml(item.color || barColor);
      return `<text x="${marginLeft - 10}" y="${(cy + 4).toFixed(1)}" text-anchor="end" class="chart-label">${escapeHtml(item.label)}</text>
      <rect x="${marginLeft}" y="${(cy - barH / 2).toFixed(1)}" width="${barW.toFixed(1)}" height="${barH}" rx="4" fill="${color}"></rect>
      <text x="${(marginLeft + barW + 8).toFixed(1)}" y="${(cy + 4).toFixed(1)}" class="chart-value">${escapeHtml(formatValue(item.value))}</text>`;
    })
    .join("");

  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" role="img" aria-label="${escapeHtml(ariaLabel)}">${gridLines}${rows}</svg>`;
}

export function legendHtml(series, formatValue = String) {
  return `<div class="chart-legend">${series
    .map(
      (s) =>
        `<span class="chart-legend-item"><span class="chart-legend-swatch" style="background:${escapeHtml(s.color)}"></span>${escapeHtml(s.name)}: <strong>${escapeHtml(formatValue(s.values[s.values.length - 1]))}</strong></span>`
    )
    .join("")}</div>`;
}
