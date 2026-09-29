import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCsv } from "../lib/csv.js";
import { parseFecha, parseNumero, parseBooleanSN } from "../lib/parse.js";

export function ingestar(dataDir) {
  const leer = (archivo) => readFileSync(join(dataDir, archivo), "utf-8");

  const ventas = parseCsv(leer("ventas.csv")).map((r) => {
    const { periodo, iso } = parseFecha(r.fecha);
    return {
      fecha: iso,
      periodo,
      comprobante: r.comprobante,
      tipoComprobante: r.tipo_comprobante,
      codigoCliente: r.codigo_cliente,
      razonSocial: r.razon_social,
      codigoProducto: r.codigo_producto,
      cantidad: parseNumero(r.cantidad, `ventas.csv:${r.__line} cantidad`),
      precioUnitario: parseNumero(r.precio_unitario, `ventas.csv:${r.__line} precio_unitario`),
      bonificacionPct: parseNumero(r.bonificacion_pct, `ventas.csv:${r.__line} bonificacion_pct`),
      importe: parseNumero(r.importe, `ventas.csv:${r.__line} importe`),
      vendedor: (r.vendedor || "").trim() || null,
      _line: r.__line,
    };
  });

  const productos = parseCsv(leer("productos.csv")).map((r) => ({
    codigo: r.codigo,
    descripcion: r.descripcion,
    unidadMedida: r.unidad_medida,
    rubro: r.rubro,
    precioListaActual: parseNumero(r.precio_lista_actual, `productos.csv:${r.__line}`),
    activo: parseBooleanSN(r.activo),
  }));

  const clientes = parseCsv(leer("clientes.csv")).map((r) => ({
    codigo: r.codigo_cliente,
    razonSocial: r.razon_social,
    canal: r.condicion_comercial,
    bonificacionPct: parseNumero(r.bonificacion_pct, `clientes.csv:${r.__line}`),
    cuit: r.cuit || null,
    localidad: r.localidad || null,
  }));

  const costos = parseCsv(leer("costos.csv")).map((r) => ({
    codigoProducto: r.codigo_producto,
    periodo: r.periodo,
    costoUnitario: parseNumero(r.costo_unitario, `costos.csv:${r.__line}`),
    moneda: r.moneda,
  }));

  const gastos = parseCsv(leer("gastos_operativos.csv")).map((r) => ({
    periodo: r.periodo,
    concepto: r.concepto,
    importe: parseNumero(r.importe, `gastos_operativos.csv:${r.__line}`),
    notas: r.notas || null,
  }));

  return { ventas, productos, clientes, costos, gastos };
}
