import { formatearDinero, formatearKilogramos } from '@simce/dominio';
import { jsPDF } from 'jspdf';

export function nombrePdfProvisional(remision) {
  return `${remision.folioProvisional ?? 'remision-provisional'}.pdf`;
}

export function generarPdfProvisional(remision) {
  const documento = new jsPDF({ unit: 'mm', format: 'letter' });
  documento.setFont('helvetica', 'bold');
  documento.setFontSize(16);
  documento.text('SIMCE - Remisión', 18, 20);
  documento.setTextColor(180, 30, 30);
  documento.setFontSize(12);
  documento.text('DOCUMENTO PROVISIONAL - SIN FOLIO OFICIAL', 18, 29);
  documento.setTextColor(20, 20, 20);
  documento.setFont('helvetica', 'normal');
  documento.setFontSize(10);
  documento.text(`Folio local: ${remision.folioProvisional}`, 18, 39);
  documento.text(`Destino: ${remision.centroId}`, 18, 45);

  let y = 58;
  documento.setFont('helvetica', 'bold');
  documento.text('PLU', 18, y);
  documento.text('Código', 48, y);
  documento.text('Peso kg', 105, y);
  documento.text('Importe', 155, y);
  documento.setFont('helvetica', 'normal');

  for (const partida of remision.partidas) {
    y += 7;
    documento.text(partida.plu, 18, y);
    documento.text(partida.codigo, 48, y);
    documento.text(formatearKilogramos(partida.gramos), 105, y);
    documento.text(`$${formatearDinero(partida.importeCentavos)}`, 155, y);
  }

  y += 14;
  documento.setFont('helvetica', 'bold');
  documento.text(`Total: ${formatearKilogramos(remision.totalGramos)} kg`, 105, y);
  documento.text(`$${formatearDinero(remision.totalCentavos)}`, 155, y);
  documento.setFont('helvetica', 'normal');
  documento.setFontSize(8);
  documento.text(
    'El folio definitivo se asignará al sincronizar con el servidor institucional.',
    18,
    255,
  );

  return new Uint8Array(documento.output('arraybuffer'));
}
