// Utilidades de parseo y formato. Los 5 CSV de este ERP usan "." como
// separador decimal y no usan separador de miles (se verifico a mano sobre
// el export real) y fechas "DD/MM/AAAA". Si el dia de manana llega un ERP
// con otro formato, esto es lo primero que hay que reescribir (ver
// respuestas.md, pregunta 2).

const DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/**
 * @param {string} value "DD/MM/AAAA"
 * @returns {{ date: Date, periodo: string, iso: string }}
 */
export function parseFecha(value) {
  const m = DATE_RE.exec((value || "").trim());
  if (!m) {
    throw new Error(`Fecha invalida: "${value}" (esperado DD/MM/AAAA)`);
  }
  const [, dd, mm, yyyy] = m;
  const date = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
  const periodo = `${mm}/${yyyy}`;
  const iso = `${yyyy}-${mm}-${dd}`;
  return { date, periodo, iso };
}

/**
 * Convierte "MM/AAAA" a un numero ordenable (AAAA*12+MM) para poder
 * comparar/ordenar periodos cronologicamente sin volver a parsear fechas.
 * @param {string} periodo "MM/AAAA"
 */
export function periodoOrdinal(periodo) {
  const [mm, yyyy] = periodo.split("/").map(Number);
  return yyyy * 12 + mm;
}

export function compararPeriodos(a, b) {
  return periodoOrdinal(a) - periodoOrdinal(b);
}

/**
 * Nombre corto en espanol del periodo, ej "01/2025" -> "ene 2025".
 */
const MESES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];
export function periodoLabel(periodo) {
  const [mm, yyyy] = periodo.split("/").map(Number);
  return `${MESES[mm - 1]} ${yyyy}`;
}

/**
 * @param {string} value numero como string, ej "18396.0" o "40"
 * @param {string} campo nombre de campo para el mensaje de error
 * @returns {number}
 */
export function parseNumero(value, campo = "valor") {
  const trimmed = (value ?? "").trim();
  if (trimmed === "") return 0;
  const n = Number(trimmed);
  if (Number.isNaN(n)) {
    throw new Error(`${campo} invalido, no es numerico: "${value}"`);
  }
  return n;
}

export function parseBooleanSN(value) {
  return (value ?? "").trim().toUpperCase() === "S";
}

// --- Formato para el dashboard (locale es-AR, todo calculado server-side) ---

const currencyFmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});
const percentFmt = new Intl.NumberFormat("es-AR", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const intFmt = new Intl.NumberFormat("es-AR");

export function fmtMoney(n) {
  return currencyFmt.format(n);
}
export function fmtPct(n) {
  return percentFmt.format(n);
}
export function fmtInt(n) {
  return intFmt.format(Math.round(n));
}
