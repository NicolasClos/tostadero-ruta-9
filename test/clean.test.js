import { test } from "node:test";
import assert from "node:assert/strict";
import { resolverCodigoProducto, enriquecerVentas } from "../src/clean/index.js";

test("resolverCodigoProducto mapea el codigo legado conocido", () => {
  assert.equal(resolverCodigoProducto("BLEND1K"), "CAF-BLEND-1K");
});

test("resolverCodigoProducto deja igual un codigo no mapeado", () => {
  assert.equal(resolverCodigoProducto("CAF-BRAS-250"), "CAF-BRAS-250");
});

function buildFixture() {
  const productos = [
    { codigo: "CAF-BLEND-1K", descripcion: "Blend Casa 1kg", unidadMedida: "UN", rubro: "CAFE", precioListaActual: 20000, activo: true },
    { codigo: "CAF-BRAS-250", descripcion: "Brasil 250g", unidadMedida: "UN", rubro: "CAFE", precioListaActual: 6000, activo: true },
  ];
  const clientes = [{ codigo: "C1", razonSocial: "Cliente Uno", canal: "Mayorista", bonificacionPct: 10, cuit: "x", localidad: "CABA" }];
  const costos = [
    { codigoProducto: "CAF-BLEND-1K", periodo: "01/2025", costoUnitario: 10000, moneda: "ARS" },
    { codigoProducto: "CAF-BRAS-250", periodo: "01/2025", costoUnitario: 2500, moneda: "ARS" },
  ];
  const ventas = [
    { fecha: "2025-01-05", periodo: "01/2025", comprobante: "F1", tipoComprobante: "FAC", codigoCliente: "C1", razonSocial: "Cliente Uno", codigoProducto: "BLEND1K", cantidad: 5, precioUnitario: 20000, bonificacionPct: 0, importe: 100000, vendedor: null },
    { fecha: "2025-01-05", periodo: "01/2025", comprobante: "F2", tipoComprobante: "FAC", codigoCliente: "C1", razonSocial: "Cliente Uno", codigoProducto: "CAF-BRAS-250", cantidad: 4, precioUnitario: 6000, bonificacionPct: 0, importe: 24000, vendedor: null },
    { fecha: "2025-02-01", periodo: "02/2025", comprobante: "F3", tipoComprobante: "FAC", codigoCliente: "C1", razonSocial: "Cliente Uno", codigoProducto: "CAF-BLEND-1K", cantidad: 2, precioUnitario: 20000, bonificacionPct: 0, importe: 40000, vendedor: null },
    { fecha: "2025-01-07", periodo: "01/2025", comprobante: "F4", tipoComprobante: "FAC", codigoCliente: "C9", razonSocial: "Desconocido SA", codigoProducto: "CAF-BRAS-250", cantidad: 1, precioUnitario: 6000, bonificacionPct: 0, importe: 6000, vendedor: null },
  ];
  return { ventas, productos, clientes, costos };
}

test("enriquecerVentas resuelve codigo legado, cruza costo por producto+periodo y calcula margen", () => {
  const { ventas } = enriquecerVentas(buildFixture());
  const v1 = ventas[0];
  assert.equal(v1.codigoProductoResuelto, "CAF-BLEND-1K");
  assert.equal(v1.esCodigoLegado, true);
  assert.equal(v1.canal, "Mayorista");
  assert.equal(v1.rubro, "CAFE");
  assert.equal(v1.costoUnitario, 10000);
  assert.equal(v1.costoTotal, 50000);
  assert.equal(v1.margenBruto, 50000);
});

test("enriquecerVentas no rompe si falta el costo del periodo: usa costo 0 y lo marca como no confiable", () => {
  const { ventas, warnings } = enriquecerVentas(buildFixture());
  const v3 = ventas[2];
  assert.equal(v3.costoConocido, false);
  assert.equal(v3.costoTotal, 0);
  assert.equal(v3.margenBruto, 40000);
  assert.ok(warnings.some((w) => w.includes("CAF-BLEND-1K@02/2025")));
});

test("enriquecerVentas marca canal Desconocido si el cliente no esta en el maestro, sin descartar la venta", () => {
  const { ventas, warnings } = enriquecerVentas(buildFixture());
  const v4 = ventas[3];
  assert.equal(v4.canal, "Desconocido");
  assert.ok(warnings.some((w) => w.includes("C9")));
});
