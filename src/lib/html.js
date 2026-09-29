// Los textos que se embeben en el HTML/SVG (nombres de clientes, productos,
// notas) vienen de datos, no de literales del codigo. Se escapan siempre
// antes de insertarlos en markup, aunque hoy el dataset no tenga caracteres
// raros: es una salvaguarda barata contra bugs de inyeccion si el dia de
// manana el ERP trae un nombre de cliente con "<" o "&".
export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
