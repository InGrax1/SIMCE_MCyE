import { jsPDF } from 'jspdf';
import { csvTabular } from '../formatos/csv.js';

const columnas = [
  ['folio', 'Folio', 99],
  ['nombre', 'Nombre completo', 135],
  ['correo', 'Correo', 148],
  ['telefono', 'Teléfono', 78],
  ['procedencia', 'Procedencia', 64],
  ['licenciatura', 'Licenciatura', 95],
  ['numeroCuenta', 'Cuenta', 70],
  ['estado', 'Estado', 65],
];

export function exportarCsv(inscripciones) {
  return csvTabular([
    columnas.map(([, titulo]) => titulo),
    ...inscripciones.map((i) => columnas.map(([campo]) => i[campo])),
  ]);
}

export function exportarPdf(taller, inscripciones) {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  let y;
  const cabecera = () => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    const titulo = pdf.splitTextToSize(taller.borrador.nombre ?? taller.borrador.titulo, 754);
    pdf.text(titulo, 32, 35);
    y = 48 + titulo.length * 16;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(`Lista de inscripciones · ${inscripciones.length} registros · SIMCE MCyE`, 32, y);
    y += 22;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    let x = 32;
    for (const [, titulo, ancho] of columnas) {
      pdf.text(titulo, x + 4, y);
      x += ancho;
    }
    y += 8;
    pdf.line(32, y, 786, y);
    y += 5;
    pdf.setFont('helvetica', 'normal');
  };
  cabecera();
  for (const inscripcion of inscripciones) {
    const celdas = columnas.map(([campo, , ancho]) =>
      pdf.splitTextToSize(String(inscripcion[campo] ?? ''), ancho - 8),
    );
    const alto = Math.max(1, ...celdas.map((c) => c.length)) * 11 + 12;
    if (y + alto > 550) {
      pdf.addPage();
      cabecera();
    }
    let x = 32;
    celdas.forEach((lineas, indice) => {
      pdf.text(lineas, x + 4, y + 10, { lineHeightFactor: 1.375 });
      x += columnas[indice][2];
    });
    y += alto;
    pdf.setDrawColor(210);
    pdf.line(32, y, 786, y);
    y += 3;
  }
  if (!inscripciones.length) pdf.text('Todavía no hay inscripciones.', 36, y + 16);
  for (let pagina = 1; pagina <= pdf.getNumberOfPages(); pagina++) {
    pdf.setPage(pagina);
    pdf.setFontSize(8);
    pdf.text(`Página ${pagina} de ${pdf.getNumberOfPages()}`, 786, 578, { align: 'right' });
  }
  return Buffer.from(pdf.output('arraybuffer'));
}
