// Reglas de negocio y de limpieza de datos, separadas de la ingesta pura.
// Documentadas aca porque son SUPUESTOS, no hechos: si el dataset cambia,
// esto es lo primero a revisar (ver tambien respuestas.md).

// Sofia avisa en LEEME.txt: "quedaron codigos de producto viejos dando
// vueltas en algunas facturas". Se detecto un solo caso en el export:
// "BLEND1K" (28 filas, todas de GRANOS DEL SUR / C0001) que no existe en
// productos.csv como activo. Por descripcion ("BLEND CASA 1KG", unidad KG)
// y por aparecer solo en el cliente mas antiguo, se asume que es el mismo
// producto que "CAF-BLEND-1K" con el codigo del sistema anterior.
// Si aparece un codigo nuevo no mapeado, se lo deja tal cual y se reporta
// como advertencia de calidad de datos (no se descarta la venta).
export const MAPEO_CODIGOS_LEGADOS = {
  BLEND1K: "CAF-BLEND-1K",
};

export function resolverCodigoProducto(codigo) {
  return MAPEO_CODIGOS_LEGADOS[codigo] ?? codigo;
}

function buildLookups({ productos, clientes, costos }) {
  const productoPorCodigo = new Map(productos.map((p) => [p.codigo, p]));
  const clientePorCodigo = new Map(clientes.map((c) => [c.codigo, c]));
  const costoPorClave = new Map(
    costos.map((c) => [`${c.codigoProducto}|${c.periodo}`, c.costoUnitario])
  );
  return { productoPorCodigo, clientePorCodigo, costoPorClave };
}

/**
 * Cruza ventas con productos/clientes/costos y calcula margen por linea.
 * No lanza excepcion ante datos faltantes: cada problema queda como
 * advertencia en `warnings`, y la linea sigue procesandose con los datos
 * que tenga (costo 0 si no hay match, canal "Desconocido" si no hay cliente,
 * etc). Un ERP real siempre tiene algun cruce imperfecto; una herramienta
 * de negocio no puede caerse por eso, tiene que decirlo y seguir.
 *
 * @returns {{ ventas: object[], warnings: string[] }}
 */
export function enriquecerVentas({ ventas, productos, clientes, costos }) {
  const { productoPorCodigo, clientePorCodigo, costoPorClave } = buildLookups({
    productos,
    clientes,
    costos,
  });
  const warnings = [];
  const codigosSinCosto = new Set();
  const clientesSinMaestro = new Set();
  const productosSinMaestro = new Set();

  const enriquecidas = ventas.map((v) => {
    const codigoResuelto = resolverCodigoProducto(v.codigoProducto);
    const producto = productoPorCodigo.get(codigoResuelto) ?? null;
    const cliente = clientePorCodigo.get(v.codigoCliente) ?? null;
    const costoUnitario = costoPorClave.get(`${codigoResuelto}|${v.periodo}`);

    if (costoUnitario === undefined) {
      codigosSinCosto.add(`${codigoResuelto}@${v.periodo}`);
    }
    if (!cliente) {
      clientesSinMaestro.add(v.codigoCliente);
    }
    if (!producto) {
      productosSinMaestro.add(codigoResuelto);
    }

    const costoUnitarioFinal = costoUnitario ?? 0;
    const costoTotal = v.cantidad * costoUnitarioFinal;
    const margenBruto = v.importe - costoTotal;

    return {
      ...v,
      codigoProductoResuelto: codigoResuelto,
      esCodigoLegado: codigoResuelto !== v.codigoProducto,
      rubro: producto?.rubro ?? "Sin clasificar",
      descripcionProducto: producto?.descripcion ?? v.codigoProducto,
      canal: cliente?.canal ?? "Desconocido",
      costoUnitario: costoUnitarioFinal,
      costoConocido: costoUnitario !== undefined,
      costoTotal,
      margenBruto,
      esDevolucion: v.tipoComprobante === "NC",
    };
  });

  if (codigosSinCosto.size > 0) {
    warnings.push(
      `Sin costo cargado para ${codigosSinCosto.size} combinacion(es) producto/periodo (se uso costo 0, el margen de esas lineas esta sobrestimado): ${[...codigosSinCosto].slice(0, 5).join(", ")}${codigosSinCosto.size > 5 ? "..." : ""}`
    );
  }
  if (clientesSinMaestro.size > 0) {
    warnings.push(
      `Ventas con codigo_cliente sin maestro en clientes.csv (canal "Desconocido"): ${[...clientesSinMaestro].join(", ")}`
    );
  }
  if (productosSinMaestro.size > 0) {
    warnings.push(
      `Codigos de producto sin maestro en productos.csv ni en el mapeo de legados: ${[...productosSinMaestro].join(", ")}`
    );
  }

  return { ventas: enriquecidas, warnings };
}
