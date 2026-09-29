import { test } from "node:test";
import assert from "node:assert/strict";
import {
  metricasMensuales,
  metricasPorProducto,
  metricasPorCanal,
  metricasPorCliente,
  metricasGastosPorConcepto,
  resumenDevoluciones,
} from "../src/metrics/index.js";

function closeTo(actual, expected, eps = 1e-6) {
  assert.ok(Math.abs(actual - expected) < eps, `esperaba ${expected}, obtuve ${actual}`);
}

function fixtureVentas() {
  const base = {
    descripcionProducto: undefined,
    rubro: "CAFE",
  };
  return [
    { ...base, periodo: "01/2025", tipoComprobante: "FAC", codigoProductoResuelto: "X1", descripcionProducto: "Producto X1", codigoCliente: "K1", razonSocial: "Cliente K1", canal: "Mayorista", cantidad: 10, importe: 10000, costoTotal: 4000, margenBruto: 6000, bonificacionPct: 0 },
    { ...base, periodo: "01/2025", tipoComprobante: "FAC", codigoProductoResuelto: "X2", descripcionProducto: "Producto X2", codigoCliente: "K2", razonSocial: "Cliente K2", canal: "Distribuidor", cantidad: 5, importe: 5000, costoTotal: 3000, margenBruto: 2000, bonificacionPct: 20 },
    { ...base, periodo: "01/2025", tipoComprobante: "NC", codigoProductoResuelto: "X1", descripcionProducto: "Producto X1", codigoCliente: "K1", razonSocial: "Cliente K1", canal: "Mayorista", cantidad: -2, importe: -2000, costoTotal: -800, margenBruto: -1200, bonificacionPct: 0 },
    { ...base, periodo: "02/2025", tipoComprobante: "FAC", codigoProductoResuelto: "X1", descripcionProducto: "Producto X1", codigoCliente: "K1", razonSocial: "Cliente K1", canal: "Mayorista", cantidad: 8, importe: 9000, costoTotal: 3600, margenBruto: 5400, bonificacionPct: 0 },
    { ...base, periodo: "02/2025", tipoComprobante: "FAC", codigoProductoResuelto: "X2", descripcionProducto: "Producto X2", codigoCliente: "K3", razonSocial: "Cliente K3", canal: "Local", cantidad: 3, importe: 3600, costoTotal: 2100, margenBruto: 1500, bonificacionPct: 0 },
  ];
}

function fixtureGastos() {
  return [
    { periodo: "01/2025", concepto: "Alquiler", importe: 1000, notas: null },
    { periodo: "01/2025", concepto: "Flete", importe: 500, notas: null },
    { periodo: "02/2025", concepto: "Alquiler", importe: 1000, notas: null },
    { periodo: "02/2025", concepto: "Flete", importe: 800, notas: null },
  ];
}

test("metricasMensuales: ingresos netean FAC y NC, margen y resultado neto salen bien", () => {
  const [enero, febrero] = metricasMensuales(fixtureVentas(), fixtureGastos());

  assert.equal(enero.periodo, "01/2025");
  closeTo(enero.ingresos, 13000);
  closeTo(enero.devoluciones, 2000);
  closeTo(enero.costoTotal, 6200);
  closeTo(enero.margenBruto, 6800);
  closeTo(enero.margenBrutoPct, 6800 / 13000);
  closeTo(enero.gastosOperativos, 1500);
  closeTo(enero.resultadoNeto, 5300);

  assert.equal(febrero.periodo, "02/2025");
  closeTo(febrero.ingresos, 12600);
  closeTo(febrero.margenBruto, 6900);
  closeTo(febrero.gastosOperativos, 1800);
  closeTo(febrero.resultadoNeto, 5100);
});

test("metricasPorProducto agrega a traves de meses y calcula devolucion % sobre ventas brutas", () => {
  const filas = metricasPorProducto(fixtureVentas());
  const x1 = filas.find((f) => f.codigo === "X1");
  const x2 = filas.find((f) => f.codigo === "X2");

  closeTo(x1.ingresos, 17000);
  closeTo(x1.margenBruto, 10200);
  closeTo(x1.devolucionImporte, 2000);
  closeTo(x1.devolucionPct, 2000 / 19000);
  closeTo(x1.participacionIngresos, 17000 / 25600);

  closeTo(x2.ingresos, 8600);
  closeTo(x2.margenBruto, 3500);
  closeTo(x2.devolucionImporte, 0);

  assert.deepEqual(filas.map((f) => f.codigo), ["X1", "X2"]);
});

test("metricasPorCanal agrega por condicion comercial del cliente", () => {
  const filas = metricasPorCanal(fixtureVentas());
  const mayorista = filas.find((f) => f.canal === "Mayorista");
  const distribuidor = filas.find((f) => f.canal === "Distribuidor");
  const local = filas.find((f) => f.canal === "Local");

  closeTo(mayorista.ingresos, 17000);
  closeTo(mayorista.margenBruto, 10200);
  assert.equal(mayorista.clientesUnicos, 1);

  closeTo(distribuidor.ingresos, 5000);
  closeTo(local.ingresos, 3600);

  assert.deepEqual(filas.map((f) => f.canal), ["Mayorista", "Distribuidor", "Local"]);
});

test("metricasPorCliente pondera la bonificacion por importe facturado (solo FAC)", () => {
  const filas = metricasPorCliente(fixtureVentas());
  const k1 = filas.find((f) => f.codigo === "K1");
  const k2 = filas.find((f) => f.codigo === "K2");

  closeTo(k1.ingresos, 17000);
  closeTo(k1.bonifPromedioPonderada, 0);
  closeTo(k2.bonifPromedioPonderada, 20);
});

test("metricasGastosPorConcepto calcula variacion entre el primer y el ultimo periodo", () => {
  const filas = metricasGastosPorConcepto(fixtureGastos());
  const flete = filas.find((f) => f.concepto === "Flete");
  const alquiler = filas.find((f) => f.concepto === "Alquiler");

  closeTo(flete.total, 1300);
  closeTo(flete.variacionPct, (800 - 500) / 500);
  closeTo(alquiler.variacionPct, 0);

  assert.deepEqual(filas.map((f) => f.concepto), ["Alquiler", "Flete"]);
});

test("resumenDevoluciones calcula el % sobre ventas brutas totales (todos los productos)", () => {
  const resumen = resumenDevoluciones(fixtureVentas());
  assert.equal(resumen.cantidadNotas, 1);
  closeTo(resumen.totalImporte, 2000);
  closeTo(resumen.totalUnidades, 2);
  closeTo(resumen.pctSobreVentasBrutas, 2000 / 27600);
});
