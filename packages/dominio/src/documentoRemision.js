import { formatearDinero, formatearKilogramos } from './precio.js';
import { agruparPartidas, totalesRenglones } from './remisionOperativa.js';

export const plantillaEnvio = Object.freeze({ version: 'envio-carta-v1', capacidad: 25 });

export function paginarRemision(renglones, capacidad = plantillaEnvio.capacidad) {
  const partidas = agruparPartidas(renglones);
  const paginas = [];
  for (let grupo = 0; grupo < partidas.length; grupo += 3) {
    const columnas = partidas.slice(grupo, grupo + 3);
    const longitud = Math.max(...columnas.map((p) => p.renglones.length));
    for (let inicio = 0; inicio < longitud; inicio += capacidad) {
      paginas.push(
        columnas.map(({ renglones: todos, ...partida }) => {
          const filas = todos.slice(inicio, inicio + capacidad);
          return {
            ...partida,
            filas,
            subtotal: totalesRenglones(filas),
            acumulado: totalesRenglones(todos.slice(0, inicio + capacidad)),
          };
        }),
      );
    }
  }
  return paginas;
}

const peso = (gramos) => formatearKilogramos(gramos);
const importe = (centavos) => `$${formatearDinero(centavos)}`;

export function generarDocumentoRemision(Pdf, remision, documento) {
  const pdf = new Pdf({ unit: 'mm', format: 'letter', compress: true });
  pdf.setFileId(documento.uuid.replaceAll('-', ''));
  const momento = new Date(documento.emitidoEn).toISOString().slice(0, 19).replace(/\D/g, '');
  pdf.setCreationDate(`D:${momento}+00'00'`);
  pdf.setProperties({ title: 'Lista de Envío de Productos', author: 'SIMCE - CEA' });
  const paginas = paginarRemision(remision.renglones);
  const total = totalesRenglones(remision.renglones);
  const provisional = documento.tipo === 'PROVISIONAL';
  const ancho = 62;
  paginas.forEach((columnas, indice) => {
    if (indice) pdf.addPage();
    pdf.setFont('helvetica', 'bold').setFontSize(10).setTextColor(25);
    pdf.text('UNAM · FES Cuautitlán · Centro de Enseñanza Agropecuaria', 108, 14, {
      align: 'center',
    });
    pdf.setFontSize(14).text('Lista de Envío de Productos', 108, 21, { align: 'center' });
    pdf
      .setFontSize(8)
      .setTextColor(110, 30, 26)
      .text(
        provisional ? 'PROVISIONAL - SIN FOLIO OFICIAL' : 'VERSIÓN DEFINITIVA DEL SISTEMA',
        108,
        27,
        { align: 'center' },
      );
    pdf.setFont('helvetica', 'normal').setTextColor(25).setFontSize(8);
    pdf.text(`Folio ${documento.folio}`, 15, 33);
    pdf.text(`Envío ${remision.fecha}`, 201, 33, { align: 'right' });
    pdf.text(pdf.splitTextToSize(`Destino ${remision.destinoNombre}`, 127), 15, 39);
    if (remision.folioPapel)
      pdf.text(pdf.splitTextToSize(`Hoja en papel ${remision.folioPapel}`, 54), 147, 39);
    pdf.text('Plantilla de prueba · Validación institucional pendiente', 15, 49);
    if (!provisional && remision.folioProvisional)
      pdf.text(`Relacionado con ${remision.folioProvisional}`, 201, 49, { align: 'right' });
    columnas.forEach((partida, col) => {
      const x = 15 + col * ancho;
      pdf.setDrawColor(155).setLineWidth(0.2).rect(x, 53, ancho, 161);
      pdf.setFontSize(8).setFont('helvetica', 'bold');
      pdf.text(pdf.splitTextToSize(partida.productoNombre, ancho - 6), x + 3, 57);
      pdf
        .setFont('helvetica', 'normal')
        .text(`${importe(partida.precioKgCentavos)} / kg`, x + 3, 70);
      pdf.line(x, 73, x + ancho, 73);
      pdf.text('Peso (kg)', x + 24, 78, { align: 'right' });
      pdf.text('Valor (MXN)', x + ancho - 3, 78, { align: 'right' });
      partida.filas.forEach((fila, i) => {
        const y = 83 + i * 4.5;
        if (i % 2 === 0) pdf.setFillColor(246).rect(x + 0.2, y - 3.2, ancho - 0.4, 4.5, 'F');
        pdf.text(peso(fila.gramos), x + 24, y, { align: 'right' });
        pdf.text(importe(fila.centavos), x + ancho - 3, y, { align: 'right' });
      });
      pdf.line(x, 195, x + ancho, 195);
      pdf.setFontSize(7.5);
      for (const [etiqueta, cantidades, y] of [
        ['Subtotal de hoja', partida.subtotal, 201],
        ['Acumulado de partida', partida.acumulado, 208],
      ]) {
        pdf.text(etiqueta, x + 2, y);
        pdf.text(`${peso(cantidades.gramos)} kg`, x + 41, y, { align: 'right' });
        pdf.text(importe(cantidades.centavos), x + ancho - 2, y, { align: 'right' });
      }
    });
    const final = indice === paginas.length - 1;
    const cantidades = final ? total : totalesRenglones(columnas.flatMap((p) => p.filas));
    pdf.setFont('helvetica', 'bold').setFontSize(10);
    pdf.text(
      `${final ? 'Total de remisión' : 'Subtotal de hoja'}   ${peso(cantidades.gramos)} kg   ${importe(cantidades.centavos)} MXN`,
      201,
      224,
      { align: 'right' },
    );
    pdf.setFont('helvetica', 'normal').setFontSize(8);
    for (const [col, firma] of [
      'Entregó en el Taller',
      'Delegación Administrativa C.E.A.',
      'Recibió',
    ].entries()) {
      const centro = 46 + col * ancho;
      pdf.line(centro - 25, 251, centro + 25, 251);
      pdf.text(firma, centro, 256, { align: 'center' });
    }
    pdf.text(`${plantillaEnvio.version}   ·   Hoja ${indice + 1} de ${paginas.length}`, 108, 270, {
      align: 'center',
    });
  });
  return new Uint8Array(pdf.output('arraybuffer'));
}
