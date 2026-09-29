import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, parseCsvRows } from "../src/lib/csv.js";

test("parsea filas simples separadas por ;", () => {
  const rows = parseCsvRows("a;b;c\n1;2;3\n");
  assert.deepEqual(rows, [
    ["a", "b", "c"],
    ["1", "2", "3"],
  ]);
});

test("respeta un delimitador dentro de comillas dobles", () => {
  const csv = 'periodo;concepto;importe;notas\n01/2025;Flete;100;"reparto a cafeterias; no se cobra"\n';
  const rows = parseCsv(csv);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].notas, "reparto a cafeterias; no se cobra");
  assert.equal(rows[0].importe, "100");
});

test("procesa comillas dobles escapadas como \"\" dentro de un campo entre comillas", () => {
  const csv = 'a;b\n"dijo ""hola""";2\n';
  const rows = parseCsv(csv);
  assert.equal(rows[0].a, 'dijo "hola"');
});

test("no rompe con \\r\\n (Windows)", () => {
  const rows = parseCsvRows("a;b\r\n1;2\r\n");
  assert.deepEqual(rows, [
    ["a", "b"],
    ["1", "2"],
  ]);
});

test("parseCsv arma objetos usando la primera fila como header", () => {
  const rows = parseCsv("codigo;precio\nX1;100\nX2;200\n");
  assert.deepEqual(
    rows.map((r) => ({ codigo: r.codigo, precio: r.precio })),
    [
      { codigo: "X1", precio: "100" },
      { codigo: "X2", precio: "200" },
    ]
  );
});
