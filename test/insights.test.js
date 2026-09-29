import { test } from "node:test";
import assert from "node:assert/strict";
import { generarInsights } from "../src/insights/index.js";

function porId(insights, id) {
  return insights.find((i) => i.id === id);
}

// Escenario "alarmante": el periodo cierra en rojo en el acumulado, un
// cliente concentra mas de 1/4 de la facturacion, el flete crece fuerte y el
// producto con mejor margen % no es la linea Blend Casa.
function fixtureAlarmante() {
  return {
    mensual: [
      { periodo: "01/2025", label: "ene 2025", ingresos: 100000, resultadoNeto: 20000, resultadoNetoPct: 0.2 },
      { periodo: "02/2025", label: "feb 2025", ingresos: 120000, resultadoNeto: -30000, resultadoNetoPct: -30000 / 120000 },
    ],
    porProducto: [
      { codigo: "CAF-BLEND-1K", descripcion: "Blend Casa 1kg", margenBruto: 25000, margenBrutoPct: 0.5, participacionIngresos: 0.5, devolucionPct: 0, devolucionImporte: 0, ingresos: 50000 },
      { codigo: "CAF-BRAS-250", descripcion: "Brasil 250g", margenBruto: 30000, margenBrutoPct: 0.6, participacionIngresos: 0.5, devolucionPct: 0, devolucionImporte: 0, ingresos: 50000 },
    ],
    porCanal: [{ canal: "Mayorista", ingresos: 100000, participacionIngresos: 1, margenBruto: 15000, margenBrutoPct: 0.5, clientesUnicos: 2 }],
    porCliente: [{ codigo: "K1", razonSocial: "Cliente Grande", canal: "Mayorista", ingresos: 60000, participacionIngresos: 0.6, margenBruto: 10000, margenBrutoPct: 0.5, bonifPromedioPonderada: 10 }],
    gastosPorConcepto: [
      { concepto: "Flete distribucion", total: 5000, porPeriodo: { "01/2025": 2000, "02/2025": 3000 }, primerPeriodo: "01/2025", ultimoPeriodo: "02/2025", variacionPct: 0.5 },
    ],
    devoluciones: { cantidadNotas: 0, totalImporte: 0, totalUnidades: 0, pctSobreVentasBrutas: 0 },
  };
}

// Escenario "en orden": ingresos y resultado neto crecen juntos, ningun
// cliente concentra mas de 1/4, Blend Casa es el mas rentable en ambos
// sentidos, el flete esta estable y las devoluciones estan repartidas.
function fixtureEnOrden() {
  const clientes = ["K1", "K2", "K3", "K4", "K5"].map((codigo, i) => ({
    codigo,
    razonSocial: `Cliente ${codigo}`,
    canal: "Mayorista",
    ingresos: 20000,
    participacionIngresos: 0.2,
    margenBruto: 8000,
    margenBrutoPct: 0.4,
    bonifPromedioPonderada: 10,
  }));
  return {
    mensual: [
      { periodo: "01/2025", label: "ene 2025", ingresos: 100000, resultadoNeto: 20000, resultadoNetoPct: 0.2 },
      { periodo: "06/2025", label: "jun 2025", ingresos: 110000, resultadoNeto: 25000, resultadoNetoPct: 25000 / 110000 },
    ],
    porProducto: [
      { codigo: "CAF-BLEND-1K", descripcion: "Blend Casa 1kg", margenBruto: 50000, margenBrutoPct: 0.7, participacionIngresos: 0.6, devolucionPct: 0.01, devolucionImporte: 500, ingresos: 66000 },
      { codigo: "CAF-BRAS-250", descripcion: "Brasil 250g", margenBruto: 20000, margenBrutoPct: 0.4, participacionIngresos: 0.4, devolucionPct: 0.01, devolucionImporte: 300, ingresos: 44000 },
    ],
    porCanal: [
      { canal: "Mayorista", ingresos: 97000, participacionIngresos: 0.97, margenBruto: 40000, margenBrutoPct: 0.5, clientesUnicos: 5 },
      { canal: "Ecommerce", ingresos: 3000, participacionIngresos: 0.03, margenBruto: 1000, margenBrutoPct: 0.33, clientesUnicos: 1 },
    ],
    porCliente: clientes,
    gastosPorConcepto: [
      { concepto: "Flete distribucion", total: 6000, porPeriodo: { "01/2025": 3000, "06/2025": 3000 }, primerPeriodo: "01/2025", ultimoPeriodo: "06/2025", variacionPct: 0 },
    ],
    devoluciones: { cantidadNotas: 3, totalImporte: 800, totalUnidades: 4, pctSobreVentasBrutas: 0.01 },
  };
}

test("escenario alarmante: prioriza el balance en rojo del periodo, detecta concentracion de cliente y flete creciente", () => {
  const { estadoDeNegocio, accionesSemana } = generarInsights(fixtureAlarmante());

  const balance = porId(estadoDeNegocio, "balance-periodo");
  assert.ok(balance, "deberia reportar que el acumulado del periodo cierra en rojo");
  assert.equal(balance.severity, "critical");
  assert.ok(balance.detalle.includes("feb 2025"));

  const concentracion = porId(estadoDeNegocio, "concentracion-cliente");
  assert.ok(concentracion.titulo.includes("Cliente Grande"));

  const flete = porId(estadoDeNegocio, "flete-no-facturado");
  assert.equal(flete.severity, "warning");
  assert.ok(flete.accion);

  const ancla = porId(estadoDeNegocio, "producto-ancla");
  assert.ok(ancla.detalle.includes("Brasil 250g"));
  assert.ok(ancla.accion, "si Blend Casa no es el mas rentable en % deberia sugerir una accion");

  // orden de acciones por severidad: critica primero, luego las dos de
  // atencion (en el orden en que se generaron), y la de contexto al final
  assert.deepEqual(
    accionesSemana.map((i) => i.id),
    ["balance-periodo", "concentracion-cliente", "flete-no-facturado", "producto-ancla"]
  );
});

test("escenario en orden: no genera alarmas ni acciones cuando los numeros no las ameritan", () => {
  const { estadoDeNegocio, accionesSemana } = generarInsights(fixtureEnOrden());

  const balance = porId(estadoDeNegocio, "balance-periodo");
  assert.ok(balance, "deberia informar el balance aunque sea buena noticia");
  assert.equal(balance.severity, "info");
  assert.equal(balance.accion, null);

  assert.equal(porId(estadoDeNegocio, "concentracion-cliente"), undefined);
  assert.equal(porId(estadoDeNegocio, "margen-delgado"), undefined);
  assert.equal(porId(estadoDeNegocio, "devoluciones-producto"), undefined);

  const ancla = porId(estadoDeNegocio, "producto-ancla");
  assert.ok(ancla, "igual deberia informar cual es el producto ancla, aunque sea buena noticia");
  assert.equal(ancla.severity, "info");
  assert.equal(ancla.accion, null);

  assert.ok(porId(estadoDeNegocio, "canal-online"));
  assert.ok(porId(estadoDeNegocio, "devoluciones-generales"));

  // ninguno de los insights de este escenario trae una accion concreta
  assert.deepEqual(accionesSemana, []);
});
