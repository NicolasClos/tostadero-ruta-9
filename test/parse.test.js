import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseFecha,
  parseNumero,
  periodoOrdinal,
  compararPeriodos,
  periodoLabel,
  fmtMoney,
  fmtPct,
} from "../src/lib/parse.js";

test("parseFecha interpreta DD/MM/AAAA (no MM/DD)", () => {
  const { periodo, iso } = parseFecha("05/01/2025");
  assert.equal(periodo, "01/2025");
  assert.equal(iso, "2025-01-05");
});

test("parseFecha rechaza formatos invalidos en vez de adivinar", () => {
  assert.throws(() => parseFecha("2025-01-05"));
  assert.throws(() => parseFecha(""));
});

test("parseNumero interpreta el punto como separador decimal", () => {
  assert.equal(parseNumero("18396.0"), 18396);
  assert.equal(parseNumero("-3"), -3);
  assert.equal(parseNumero(""), 0);
});

test("parseNumero rechaza texto no numerico", () => {
  assert.throws(() => parseNumero("n/d"));
});

test("compararPeriodos ordena cronologicamente, no alfabeticamente", () => {
  const periodos = ["06/2025", "01/2025", "12/2024", "02/2025"];
  periodos.sort(compararPeriodos);
  assert.deepEqual(periodos, ["12/2024", "01/2025", "02/2025", "06/2025"]);
  assert.ok(periodoOrdinal("01/2025") > periodoOrdinal("12/2024"));
});

test("periodoLabel da un nombre corto en espanol", () => {
  assert.equal(periodoLabel("01/2025"), "ene 2025");
  assert.equal(periodoLabel("06/2025"), "jun 2025");
});

test("fmtMoney y fmtPct usan convencion es-AR", () => {
  assert.equal(fmtMoney(1234567), "$ 1.234.567");
  assert.equal(fmtPct(0.153), "15,3%");
});
