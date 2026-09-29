const DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

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

export function periodoOrdinal(periodo) {
  const [mm, yyyy] = periodo.split("/").map(Number);
  return yyyy * 12 + mm;
}

export function compararPeriodos(a, b) {
  return periodoOrdinal(a) - periodoOrdinal(b);
}

const MESES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

export function periodoLabel(periodo) {
  const [mm, yyyy] = periodo.split("/").map(Number);
  return `${MESES[mm - 1]} ${yyyy}`;
}

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
