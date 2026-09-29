import { compararPeriodos, periodoLabel } from "../lib/parse.js";

function sum(arr, fn) {
  return arr.reduce((acc, x) => acc + fn(x), 0);
}

function safeDiv(a, b) {
  return b === 0 ? 0 : a / b;
}

export function listaPeriodos(ventas) {
  return [...new Set(ventas.map((v) => v.periodo))].sort(compararPeriodos);
}

export function metricasMensuales(ventas, gastos) {
  const periodos = listaPeriodos(ventas);
  return periodos.map((periodo) => {
    const delMes = ventas.filter((v) => v.periodo === periodo);
    const ingresos = sum(delMes, (v) => v.importe);
    const ventasBrutas = sum(
      delMes.filter((v) => v.tipoComprobante === "FAC"),
      (v) => v.importe
    );
    const devoluciones = -sum(
      delMes.filter((v) => v.tipoComprobante === "NC"),
      (v) => v.importe
    );
    const unidades = sum(delMes, (v) => v.cantidad);
    const costoTotal = sum(delMes, (v) => v.costoTotal);
    const margenBruto = ingresos - costoTotal;
    const gastosOperativos = sum(
      gastos.filter((g) => g.periodo === periodo),
      (g) => g.importe
    );
    const resultadoNeto = margenBruto - gastosOperativos;
    return {
      periodo,
      label: periodoLabel(periodo),
      ingresos,
      ventasBrutas,
      devoluciones,
      unidades,
      costoTotal,
      margenBruto,
      margenBrutoPct: safeDiv(margenBruto, ingresos),
      gastosOperativos,
      resultadoNeto,
      resultadoNetoPct: safeDiv(resultadoNeto, ingresos),
    };
  });
}

export function metricasPorProducto(ventas) {
  const ingresosTotales = sum(ventas, (v) => v.importe);
  const codigos = [...new Set(ventas.map((v) => v.codigoProductoResuelto))];

  const filas = codigos.map((codigo) => {
    const delProducto = ventas.filter((v) => v.codigoProductoResuelto === codigo);
    const ingresos = sum(delProducto, (v) => v.importe);
    const ventasBrutas = sum(
      delProducto.filter((v) => v.tipoComprobante === "FAC"),
      (v) => v.importe
    );
    const devolucionImporte = -sum(
      delProducto.filter((v) => v.tipoComprobante === "NC"),
      (v) => v.importe
    );
    const unidades = sum(delProducto, (v) => v.cantidad);
    const margenBruto = sum(delProducto, (v) => v.margenBruto);
    return {
      codigo,
      descripcion: delProducto[0].descripcionProducto,
      rubro: delProducto[0].rubro,
      ingresos,
      unidades,
      margenBruto,
      margenBrutoPct: safeDiv(margenBruto, ingresos),
      participacionIngresos: safeDiv(ingresos, ingresosTotales),
      devolucionImporte,
      devolucionPct: safeDiv(devolucionImporte, ventasBrutas),
    };
  });

  return filas.sort((a, b) => b.margenBruto - a.margenBruto);
}

export function metricasPorCanal(ventas) {
  const ingresosTotales = sum(ventas, (v) => v.importe);
  const canales = [...new Set(ventas.map((v) => v.canal))];
  const filas = canales.map((canal) => {
    const delCanal = ventas.filter((v) => v.canal === canal);
    const ingresos = sum(delCanal, (v) => v.importe);
    const margenBruto = sum(delCanal, (v) => v.margenBruto);
    const clientesUnicos = new Set(delCanal.map((v) => v.codigoCliente)).size;
    return {
      canal,
      ingresos,
      margenBruto,
      margenBrutoPct: safeDiv(margenBruto, ingresos),
      participacionIngresos: safeDiv(ingresos, ingresosTotales),
      clientesUnicos,
    };
  });
  return filas.sort((a, b) => b.ingresos - a.ingresos);
}

export function metricasPorCliente(ventas) {
  const ingresosTotales = sum(ventas, (v) => v.importe);
  const codigos = [...new Set(ventas.map((v) => v.codigoCliente))];
  const filas = codigos.map((codigo) => {
    const delCliente = ventas.filter((v) => v.codigoCliente === codigo);
    const ingresos = sum(delCliente, (v) => v.importe);
    const margenBruto = sum(delCliente, (v) => v.margenBruto);
    const ventasBrutas = sum(
      delCliente.filter((v) => v.tipoComprobante === "FAC"),
      (v) => v.importe
    );
    const bonifPromedioPonderada = safeDiv(
      sum(
        delCliente.filter((v) => v.tipoComprobante === "FAC"),
        (v) => v.bonificacionPct * v.importe
      ),
      ventasBrutas
    );
    return {
      codigo,
      razonSocial: delCliente[0].razonSocial,
      canal: delCliente[0].canal,
      ingresos,
      margenBruto,
      margenBrutoPct: safeDiv(margenBruto, ingresos),
      participacionIngresos: safeDiv(ingresos, ingresosTotales),
      bonifPromedioPonderada,
    };
  });
  return filas.sort((a, b) => b.ingresos - a.ingresos);
}

export function metricasGastosPorConcepto(gastos) {
  const periodos = [...new Set(gastos.map((g) => g.periodo))].sort(compararPeriodos);
  const primerPeriodo = periodos[0];
  const ultimoPeriodo = periodos[periodos.length - 1];
  const conceptos = [...new Set(gastos.map((g) => g.concepto))];

  return conceptos
    .map((concepto) => {
      const delConcepto = gastos.filter((g) => g.concepto === concepto);
      const porPeriodo = Object.fromEntries(
        periodos.map((p) => [p, sum(delConcepto.filter((g) => g.periodo === p), (g) => g.importe)])
      );
      const total = sum(delConcepto, (g) => g.importe);
      const inicial = porPeriodo[primerPeriodo] ?? 0;
      const final = porPeriodo[ultimoPeriodo] ?? 0;
      return {
        concepto,
        total,
        porPeriodo,
        primerPeriodo,
        ultimoPeriodo,
        variacionPct: safeDiv(final - inicial, inicial),
      };
    })
    .sort((a, b) => b.total - a.total);
}

export function resumenDevoluciones(ventas) {
  const notas = ventas.filter((v) => v.tipoComprobante === "NC");
  const ventasBrutas = sum(
    ventas.filter((v) => v.tipoComprobante === "FAC"),
    (v) => v.importe
  );
  const totalImporte = -sum(notas, (v) => v.importe);
  const totalUnidades = -sum(notas, (v) => v.cantidad);
  return {
    cantidadNotas: notas.length,
    totalImporte,
    totalUnidades,
    pctSobreVentasBrutas: safeDiv(totalImporte, ventasBrutas),
  };
}

export function calcularMetricas(ventasEnriquecidas, gastos) {
  return {
    mensual: metricasMensuales(ventasEnriquecidas, gastos),
    porProducto: metricasPorProducto(ventasEnriquecidas),
    porCanal: metricasPorCanal(ventasEnriquecidas),
    porCliente: metricasPorCliente(ventasEnriquecidas),
    gastosPorConcepto: metricasGastosPorConcepto(gastos),
    devoluciones: resumenDevoluciones(ventasEnriquecidas),
  };
}
