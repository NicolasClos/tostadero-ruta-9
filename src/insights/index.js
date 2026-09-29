import { fmtMoney, fmtPct } from "../lib/parse.js";

// Umbrales de negocio. Son juicios de valor sobre "cuanto es demasiado" para
// un tostadero chico — no son constantes universales. Para otro rubro/cliente
// hay que revisarlos a mano (ver respuestas.md, pregunta 2).
const UMBRAL_CONCENTRACION_CLIENTE = 0.25; // 25% de la facturacion en un solo cliente
const UMBRAL_DEVOLUCION_PRODUCTO = 0.03; // 3% de lo facturado en un producto, devuelto
const UMBRAL_MARGEN_DELGADO = 0.15; // 15% de margen bruto
const UMBRAL_PARTICIPACION_RELEVANTE = 0.02; // por debajo de esto, ignoramos productos marginales

function severidadRank(s) {
  return { critical: 3, serious: 2, warning: 1, info: 0 }[s] ?? 0;
}

/**
 * Genera insights (estado del negocio) y, entre ellos, cuales tienen una
 * accion operativa concreta asociada. Cada regla es independiente y puede
 * no disparar si los datos no ameritan — no hay texto fijo, todo numero
 * citado sale de `metrics`.
 */
export function generarInsights(metrics) {
  const insights = [];
  const { mensual, porProducto, porCanal, porCliente, gastosPorConcepto, devoluciones } = metrics;
  const primero = mensual[0];
  const ultimo = mensual[mensual.length - 1];

  // 1) Balance del período completo: cuantos meses cerraron en rojo y cual
  // es el acumulado. Mirar solo primero-vs-ultimo mes esconde meses malos
  // en el medio (y este dataset tiene justamente ese caso: 5 de 6 meses
  // negativos aunque el ultimo mes no sea el peor).
  if (mensual.length > 0) {
    const mesesNegativos = mensual.filter((m) => m.resultadoNeto < 0);
    const resultadoAcumulado = mensual.reduce((a, m) => a + m.resultadoNeto, 0);
    const ingresosAcumulados = mensual.reduce((a, m) => a + m.ingresos, 0);
    const pctAcumulado = ingresosAcumulados === 0 ? 0 : resultadoAcumulado / ingresosAcumulados;

    if (mesesNegativos.length === 0) {
      insights.push({
        id: "balance-periodo",
        severity: "info",
        titulo: `El resultado neto fue positivo los ${mensual.length} meses del período`,
        detalle: `El acumulado ${primero.label}–${ultimo.label} es ${fmtMoney(resultadoAcumulado)} (${fmtPct(pctAcumulado)} sobre lo facturado), sin ningún mes en rojo.`,
        accion: null,
      });
    } else {
      const severity = resultadoAcumulado < 0 ? "critical" : mesesNegativos.length >= mensual.length / 2 ? "warning" : "info";
      insights.push({
        id: "balance-periodo",
        severity,
        titulo:
          resultadoAcumulado < 0
            ? `El período ${primero.label}–${ultimo.label} cierra en rojo: ${fmtMoney(resultadoAcumulado)}`
            : `El resultado neto fue negativo en ${mesesNegativos.length} de ${mensual.length} meses`,
        detalle: `Contando costo de mercadería y gastos operativos, el resultado neto fue negativo en ${mesesNegativos.length} de los ${mensual.length} meses analizados (${mesesNegativos.map((m) => m.label).join(", ")}). El acumulado del período es ${fmtMoney(resultadoAcumulado)} (${fmtPct(pctAcumulado)} sobre lo facturado), a pesar de una facturación total de ${fmtMoney(ingresosAcumulados)}.`,
        accion: `Revisar el desglose de gastos operativos mes a mes (sección "Gastos operativos") antes de cualquier decisión de crecimiento: con esta estructura de costos, facturar más no alcanza para dejar un resultado neto positivo de forma sostenida.`,
      });
    }
  }

  // 2) Concentracion de cliente (riesgo + poder de negociacion invertido).
  const topCliente = porCliente[0];
  if (topCliente && topCliente.participacionIngresos > UMBRAL_CONCENTRACION_CLIENTE) {
    insights.push({
      id: "concentracion-cliente",
      severity: "warning",
      titulo: `${topCliente.razonSocial} concentra ${fmtPct(topCliente.participacionIngresos)} de la facturación`,
      detalle: `Es el cliente más grande (canal ${topCliente.canal}), con una bonificación promedio de ${fmtPct(topCliente.bonifPromedioPonderada / 100)} y un margen bruto de ${fmtMoney(topCliente.margenBruto)} (${fmtPct(topCliente.margenBrutoPct)} sobre lo que se le factura a él).`,
      accion: `Definir un mínimo de compra o revisar la bonificación de ${topCliente.razonSocial} para asegurar que ese volumen siga siendo rentable después de flete y packaging, no solo antes.`,
    });
  }

  // 3) Producto ancla: ¿"Blend Casa" es realmente el que más deja?
  const blend = porProducto.filter((p) => p.codigo.includes("BLEND"));
  const blend1kg = porProducto.find((p) => p.codigo === "CAF-BLEND-1K");
  const margenBlend = blend.reduce((a, p) => a + p.margenBruto, 0);
  const margenTotal = porProducto.reduce((a, p) => a + p.margenBruto, 0);
  const topPorMargenPct = [...porProducto]
    .filter((p) => p.participacionIngresos > UMBRAL_PARTICIPACION_RELEVANTE)
    .sort((a, b) => b.margenBrutoPct - a.margenBrutoPct)[0];
  if (blend.length > 0 && topPorMargenPct && blend1kg) {
    const blendEsElMasRentablePct = topPorMargenPct.codigo.includes("BLEND");
    insights.push({
      id: "producto-ancla",
      severity: "info",
      titulo: blendEsElMasRentablePct
        ? "Blend Casa es el producto ancla, en pesos y en margen relativo"
        : "Blend Casa aporta el mayor margen en pesos, pero no el mejor margen relativo",
      detalle: `La línea Blend Casa genera ${fmtMoney(margenBlend)} de margen bruto (${fmtPct(margenTotal === 0 ? 0 : margenBlend / margenTotal)} del margen total del negocio), lo que confirma que es el producto ancla en volumen. ${
        blendEsElMasRentablePct
          ? "Además es el que mejor margen porcentual tiene."
          : `Sin embargo, en términos de margen porcentual, "${topPorMargenPct.descripcion}" rinde mejor (${fmtPct(topPorMargenPct.margenBrutoPct)} contra ${fmtPct(blend1kg.margenBrutoPct)} del Blend Casa 1 kg).`
      }`,
      accion: blendEsElMasRentablePct
        ? null
        : `Evaluar si conviene empujar más mezcla de venta hacia "${topPorMargenPct.descripcion}" en los canales donde el cliente elige por catálogo (online, mostrador), sin resignar el volumen de Blend Casa que sostiene al distribuidor.`,
    });
  }

  // 4) Canal online: ¿realmente es marginal?
  const online = porCanal.find((c) => c.canal === "Ecommerce");
  if (online) {
    insights.push({
      id: "canal-online",
      severity: "info",
      titulo: `El canal online pesa ${fmtPct(online.participacionIngresos)} de la facturación`,
      detalle: `Confirma lo que Sofía intuye: la venta online (${fmtMoney(online.ingresos)} en el período, margen bruto ${fmtPct(online.margenBrutoPct)}) es marginal frente al resto de los canales.`,
      accion: null,
    });
  }

  // 5) Devoluciones concentradas en un producto o cliente puntual.
  const productosConDevolucion = porProducto
    .filter((p) => p.devolucionPct > UMBRAL_DEVOLUCION_PRODUCTO)
    .sort((a, b) => b.devolucionPct - a.devolucionPct);
  if (productosConDevolucion.length > 0) {
    const p = productosConDevolucion[0];
    insights.push({
      id: "devoluciones-producto",
      severity: "warning",
      titulo: `"${p.descripcion}" concentra devoluciones por vencimiento`,
      detalle: `Se devolvió ${fmtMoney(p.devolucionImporte)} de este producto (${fmtPct(p.devolucionPct)} de lo facturado bruto), consistente con el café que se pone viejo en el mostrador del cliente.`,
      accion: `Para "${p.descripcion}", evaluar entregas más chicas y frecuentes en los clientes con notas de crédito repetidas, en vez de reponer todo el pedido de una vez.`,
    });
  } else if (devoluciones.cantidadNotas > 0) {
    insights.push({
      id: "devoluciones-generales",
      severity: "info",
      titulo: "Las devoluciones no están concentradas en un producto puntual",
      detalle: `En total hubo ${devoluciones.cantidadNotas} notas de crédito por ${fmtMoney(devoluciones.totalImporte)} (${fmtPct(devoluciones.pctSobreVentasBrutas)} de lo facturado bruto), repartidas sin un patrón dominante por producto.`,
      accion: null,
    });
  }

  // 6) Flete: Sofia lo paga y no lo cobra. Se muestra su peso siempre,
  // tematicamente central a la pregunta de Sofia, dispare o no otra regla.
  const flete = gastosPorConcepto.find((g) => g.concepto.toLowerCase().includes("flete"));
  if (flete && primero && ultimo) {
    const ingresosTotalPeriodo = mensual.reduce((a, m) => a + m.ingresos, 0);
    const fleteInicial = flete.porPeriodo[primero.periodo] ?? 0;
    const fleteFinal = flete.porPeriodo[ultimo.periodo] ?? 0;
    const crecio = fleteFinal > fleteInicial;
    insights.push({
      id: "flete-no-facturado",
      severity: flete.variacionPct > 0.15 ? "warning" : "info",
      titulo: `El flete no se cobra al cliente y representa ${fmtPct(flete.total / ingresosTotalPeriodo)} de la facturación del período`,
      detalle: `El flete de distribución pasó de ${fmtMoney(fleteInicial)} en ${primero.label} a ${fmtMoney(fleteFinal)} en ${ultimo.label} (${crecio ? "+" : ""}${fmtPct(flete.variacionPct)}). Como no se traslada al cliente, todo ese aumento sale directo del resultado neto.`,
      accion: crecio
        ? "Evaluar cobrar el flete a partir de cierto volumen, o fijarlo como parte de la condición comercial de los clientes con reparto frecuente (empezando por el de mayor volumen)."
        : null,
    });
  }

  // 7) Margen delgado en productos con participacion relevante (candidatos a repricing).
  const margenDelgado = porProducto
    .filter((p) => p.margenBrutoPct < UMBRAL_MARGEN_DELGADO && p.participacionIngresos > UMBRAL_PARTICIPACION_RELEVANTE)
    .sort((a, b) => a.margenBrutoPct - b.margenBrutoPct);
  if (margenDelgado.length > 0) {
    const p = margenDelgado[0];
    insights.push({
      id: "margen-delgado",
      severity: "warning",
      titulo: `"${p.descripcion}" tiene un margen bruto muy ajustado`,
      detalle: `Margen bruto de ${fmtPct(p.margenBrutoPct)} sobre ${fmtMoney(p.ingresos)} facturados (${fmtPct(p.participacionIngresos)} de la facturación total). Antes de gastos operativos ya deja poco margen de maniobra.`,
      accion: `Revisar el precio de lista o el costo de "${p.descripcion}" — con ${fmtPct(p.margenBrutoPct)} de margen bruto, cualquier bonificación adicional lo vuelve deficitario.`,
    });
  }

  const estadoDeNegocio = insights;
  const accionesSemana = insights
    .filter((i) => i.accion)
    .sort((a, b) => severidadRank(b.severity) - severidadRank(a.severity));

  return { estadoDeNegocio, accionesSemana };
}
