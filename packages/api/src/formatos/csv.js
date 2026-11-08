export function csvTabular(filas) {
  const celda = (valor) => {
    const texto = String(valor ?? '');
    return `"${(/^[\s]*[=+\-@]/u.test(texto) ? "'" + texto : texto).replaceAll('"', '""')}"`;
  };
  return '\ufeff' + filas.map((fila) => fila.map(celda).join(',')).join('\r\n') + '\r\n';
}
