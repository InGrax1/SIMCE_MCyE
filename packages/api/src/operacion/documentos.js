import { createHash, randomUUID } from 'node:crypto';
import { jsPDF } from 'jspdf';
import { generarDocumentoRemision, plantillaEnvio } from '@simce/dominio';

export async function emitirDocumentos(tx, cambios, momento) {
  const remision = cambios.find((c) => c.tipo === 'remisiones').registro;
  const provisional = cambios.find((c) => c.tipo === 'documentos').registro;
  const serie = `REM-${remision.fecha.slice(0, 4)}`;
  const consecutivo = await tx.siguienteFolio(serie, momento);
  const definitivo = {
    uuid: randomUUID(),
    remisionUuid: remision.uuid,
    provisionalUuid: provisional.uuid,
    folio: `${serie}-${String(consecutivo).padStart(6, '0')}`,
    tipo: 'DEFINITIVO',
    emitidoEn: momento,
    plantilla: plantillaEnvio.version,
  };
  remision.folioFinal = definitivo.folio;
  remision.definitivoUuid = definitivo.uuid;
  for (const documento of [provisional, definitivo]) {
    const archivo = generarDocumentoRemision(jsPDF, remision, documento);
    documento.sha256 = createHash('sha256').update(archivo).digest('hex');
    await tx.guardarPdf(documento.uuid, archivo);
  }
  cambios.push({ tipo: 'documentos', registro: definitivo });
}
