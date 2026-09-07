import { describe, expect, it } from 'vitest';
import {
  ESTADO_REMISION,
  agregarEtiqueta,
  cerrarRemisionLocal,
  crearOperacionCierre,
  crearRemision,
  marcarRemisionSincronizada,
} from '../src/index.js';

const remisionUuid = '11111111-1111-4111-8111-111111111111';

describe('remisión local', () => {
  it('captura, cierra y prepara una operación repetible', () => {
    const borrador = crearRemision({
      centroId: 'centro-01',
      remisionUuid,
      fecha: '2026-09-06T12:00:00.000Z',
    });
    const capturada = agregarEtiqueta(borrador, {
      codigo: '2010101086955',
      productoId: 'producto-01',
      precioKgCentavos: 18_500,
      partidaUuid: '22222222-2222-4222-8222-222222222222',
    });
    const cerrada = cerrarRemisionLocal(capturada, { fecha: '2026-09-06T12:01:00.000Z' });
    const operacion = crearOperacionCierre(cerrada, {
      operacionUuid: '33333333-3333-4333-8333-333333333333',
      fecha: '2026-09-06T12:02:00.000Z',
    });

    expect(cerrada).toMatchObject({
      estado: ESTADO_REMISION.CERRADA_LOCAL,
      version: 1,
      totalCentavos: 8695,
      totalGramos: 470,
      folioProvisional: 'PROV-11111111',
    });
    expect(operacion).toMatchObject({
      tipo: 'CERRAR_REMISION',
      agregadoId: remisionUuid,
      versionBase: 0,
    });
  });

  it('impide cerrar una remisión vacía', () => {
    const borrador = crearRemision({ centroId: 'centro-01', remisionUuid });
    expect(() => cerrarRemisionLocal(borrador)).toThrowError(/sin partidas/);
  });

  it('acepta el folio definitivo del servidor', () => {
    const borrador = crearRemision({ centroId: 'centro-01', remisionUuid });
    const cerrada = cerrarRemisionLocal(
      agregarEtiqueta(borrador, {
        codigo: '2010101086955',
        productoId: 'producto-01',
        precioKgCentavos: 18_500,
      }),
    );
    const sincronizada = marcarRemisionSincronizada(cerrada, {
      folioFinal: 'REM-2026-000001',
      versionServidor: 1,
    });
    expect(sincronizada.estado).toBe(ESTADO_REMISION.SINCRONIZADA);
    expect(sincronizada.folioFinal).toBe('REM-2026-000001');
  });
});
