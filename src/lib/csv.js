// Parser de CSV con delimitador configurable, con soporte de campos entre
// comillas dobles (incluyendo delimitadores y saltos de linea escapados
// dentro de las comillas, y comillas dobles escapadas como "").
// gastos_operativos.csv lo necesita: la columna "notas" trae un ";" dentro
// de comillas, y un split(";") ingenuo desalinearia esa fila.

/**
 * @param {string} text contenido crudo del archivo
 * @param {string} delimiter delimitador de campo, por defecto ";"
 * @returns {string[][]} filas, cada una como array de campos (incluye el header en la fila 0)
 */
export function parseCsvRows(text, delimiter = ";") {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < normalized.length; i++) {
    const c = normalized[i];
    if (inQuotes) {
      if (c === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      pushField();
    } else if (c === "\n") {
      pushRow();
    } else {
      field += c;
    }
  }
  // ultima fila si el archivo no termina con salto de linea
  if (field.length > 0 || row.length > 0) {
    pushRow();
  }

  // descarta lineas totalmente vacias (por ejemplo un \n final del archivo)
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

/**
 * Parsea un CSV con header a una lista de objetos { columna: valor }.
 * Los valores quedan como string; la conversion a numero/fecha es
 * responsabilidad de la capa de ingesta (cada dataset sabe que columnas
 * son numericas).
 *
 * @param {string} text
 * @param {string} delimiter
 * @returns {Record<string,string>[]}
 */
export function parseCsv(text, delimiter = ";") {
  const rows = parseCsvRows(text, delimiter);
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((row, idx) => {
    const obj = {};
    header.forEach((h, i) => {
      obj[h] = row[i] !== undefined ? row[i] : "";
    });
    obj.__line = idx + 2; // +1 por el header, +1 porque las lineas empiezan en 1
    return obj;
  });
}
