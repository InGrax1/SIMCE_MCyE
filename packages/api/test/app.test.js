import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { crearAplicacion } from '../src/app.js';
import { RepositorioSincronizacionMemoria } from '../src/repositorios/sincronizacionMemoria.js';

const operacionBase = {
  operacionUuid: '33333333-3333-4333-8333-333333333333',
  tipo: 'CERRAR_REMISION',
  agregadoId: '11111111-1111-4111-8111-111111111111',
  versionBase: 0,
  fechaCreacion: '2026-09-06T12:02:00.000Z',
  payload: {
    remisionUuid: '11111111-1111-4111-8111-111111111111',
    estado: 'CERRADA_LOCAL',
    totalCentavos: 8695,
    totalGramos: 470,
  },
};

describe('API de fase cero', () => {
  let aplicacion;

  beforeEach(() => {
    aplicacion = crearAplicacion({ repositorio: new RepositorioSincronizacionMemoria() });
  });

  it('expone salud y disponibilidad', async () => {
    await request(aplicacion).get('/api/v1/salud').expect(200, {
      estado: 'ok',
      servicio: 'simce-api',
    });
    await request(aplicacion).get('/api/v1/salud/listo').expect(200, {
      estado: 'listo',
      almacenamiento: 'RepositorioSincronizacionMemoria',
    });
  });

  it('asigna un folio final y repite el mismo resultado sin duplicar', async () => {
    const primera = await request(aplicacion)
      .post('/api/v1/sync/push')
      .send(operacionBase)
      .expect(200);
    const repetida = await request(aplicacion)
      .post('/api/v1/sync/push')
      .send(operacionBase)
      .expect(200);

    expect(primera.body).toMatchObject({
      estado: 'APLICADA',
      repetida: false,
      folioFinal: expect.stringMatching(/^REM-\d{4}-000001$/),
      versionServidor: 1,
    });
    expect(repetida.body).toEqual({ ...primera.body, repetida: true });
  });

  it('rechaza reutilizar el UUID con otro contenido', async () => {
    await request(aplicacion).post('/api/v1/sync/push').send(operacionBase).expect(200);
    const conflicto = await request(aplicacion)
      .post('/api/v1/sync/push')
      .send({ ...operacionBase, payload: { ...operacionBase.payload, totalGramos: 475 } })
      .expect(409);
    expect(conflicto.body.error).toBe('OPERACION_REUTILIZADA');
  });

  it('rechaza otra operación basada en una versión anterior', async () => {
    await request(aplicacion).post('/api/v1/sync/push').send(operacionBase).expect(200);
    const conflicto = await request(aplicacion)
      .post('/api/v1/sync/push')
      .send({ ...operacionBase, operacionUuid: '44444444-4444-4444-8444-444444444444' })
      .expect(409);
    expect(conflicto.body).toMatchObject({
      error: 'VERSION_CONFLICTO',
      detalles: { versionBase: 0, versionServidor: 1 },
    });
  });

  it('valida el contrato mínimo de sincronización', async () => {
    const respuesta = await request(aplicacion).post('/api/v1/sync/push').send({}).expect(400);
    expect(respuesta.body.error).toBe('OPERACION_FORMATO');
  });
});
