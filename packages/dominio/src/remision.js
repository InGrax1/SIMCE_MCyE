import { decodificarEtiqueta } from './codigoBarras.js';
import { exigir } from './errores.js';
import { calcularPesoDesdeImporte } from './precio.js';

export const ESTADO_REMISION = Object.freeze({
  BORRADOR: 'BORRADOR',
  CERRADA_LOCAL: 'CERRADA_LOCAL',
  SINCRONIZADA: 'SINCRONIZADA',
});

const crearUuid = () => globalThis.crypto.randomUUID();
const ahoraIso = () => new Date().toISOString();

export function crearRemision({ centroId, remisionUuid = crearUuid(), fecha = ahoraIso() }) {
  exigir(Boolean(centroId), 'CENTRO_REQUERIDO', 'La remisión requiere un centro de destino.');
  return {
    remisionUuid,
    centroId,
    estado: ESTADO_REMISION.BORRADOR,
    version: 0,
    fechaCreacion: fecha,
    partidas: [],
    totalCentavos: 0,
    totalGramos: 0,
    folioProvisional: null,
    folioFinal: null,
  };
}

export function agregarEtiqueta(
  remision,
  { codigo, precioKgCentavos, productoId, resolucionGramos = 5, partidaUuid = crearUuid(), perfil },
) {
  exigir(
    remision.estado === ESTADO_REMISION.BORRADOR,
    'REMISION_CERRADA',
    'No se puede modificar una remisión cerrada.',
  );
  exigir(Boolean(productoId), 'PRODUCTO_REQUERIDO', 'La etiqueta requiere un producto verificado.');

  const etiqueta = decodificarEtiqueta(codigo, perfil);
  const gramos = calcularPesoDesdeImporte({
    importeCentavos: etiqueta.importeCentavos,
    precioKgCentavos,
    resolucionGramos,
  });
  const partida = Object.freeze({
    partidaUuid,
    productoId,
    plu: etiqueta.plu,
    codigo: etiqueta.codigo,
    importeCentavos: etiqueta.importeCentavos,
    precioKgCentavos,
    gramos,
    resolucionGramos,
  });

  return {
    ...remision,
    partidas: [...remision.partidas, partida],
    totalCentavos: remision.totalCentavos + partida.importeCentavos,
    totalGramos: remision.totalGramos + partida.gramos,
  };
}

export function cerrarRemisionLocal(remision, { fecha = ahoraIso() } = {}) {
  exigir(
    remision.estado === ESTADO_REMISION.BORRADOR,
    'REMISION_ESTADO',
    'Solo se puede cerrar una remisión en borrador.',
  );
  exigir(
    remision.partidas.length > 0,
    'REMISION_VACIA',
    'No se puede cerrar una remisión sin partidas.',
  );

  return {
    ...remision,
    estado: ESTADO_REMISION.CERRADA_LOCAL,
    version: 1,
    fechaCierreLocal: fecha,
    folioProvisional: `PROV-${remision.remisionUuid.slice(0, 8).toUpperCase()}`,
  };
}

export function crearOperacionCierre(
  remision,
  { operacionUuid = crearUuid(), fecha = ahoraIso() } = {},
) {
  exigir(
    remision.estado === ESTADO_REMISION.CERRADA_LOCAL,
    'REMISION_NO_CERRADA',
    'La operación de sincronización requiere una remisión cerrada localmente.',
  );

  return Object.freeze({
    operacionUuid,
    tipo: 'CERRAR_REMISION',
    agregadoId: remision.remisionUuid,
    versionBase: 0,
    fechaCreacion: fecha,
    payload: structuredClone(remision),
  });
}

export function marcarRemisionSincronizada(remision, { folioFinal, versionServidor }) {
  exigir(
    remision.estado === ESTADO_REMISION.CERRADA_LOCAL,
    'REMISION_ESTADO',
    'La remisión no está lista para sincronizar.',
  );
  exigir(Boolean(folioFinal), 'FOLIO_REQUERIDO', 'El servidor debe devolver un folio final.');
  exigir(
    Number.isSafeInteger(versionServidor) && versionServidor >= remision.version,
    'VERSION_INVALIDA',
    'La versión del servidor no es válida.',
  );

  return {
    ...remision,
    estado: ESTADO_REMISION.SINCRONIZADA,
    folioFinal,
    version: versionServidor,
  };
}
