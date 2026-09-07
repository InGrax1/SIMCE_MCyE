import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { crearAplicacion } from '../src/app.js';
import { crearConexionBaseDatos } from '../src/infra/baseDatos.js';
import { RepositorioSincronizacionMysql } from '../src/repositorios/sincronizacionMysql.js';

const describeMysql = process.env.TEST_MYSQL === '1' ? describe : describe.skip;

describeMysql('repositorio MySQL', () => {
  let baseDatos;
  let aplicacion;

  beforeAll(async () => {
    baseDatos = crearConexionBaseDatos('test');
    await baseDatos.migrate.latest();
    aplicacion = crearAplicacion({ repositorio: new RepositorioSincronizacionMysql(baseDatos) });
  });

  beforeEach(async () => {
    await baseDatos('operaciones_sincronizacion').del();
    await baseDatos('remisiones').del();
    await baseDatos('consecutivos_folio').del();
  });

  afterAll(async () => {
    await baseDatos?.destroy();
  });

  it('conserva un único folio ante el reenvío de una operación', async () => {
    const operacion = {
      operacionUuid: '33333333-3333-4333-8333-333333333333',
      tipo: 'CERRAR_REMISION',
      agregadoId: '11111111-1111-4111-8111-111111111111',
      versionBase: 0,
      payload: {
        centroId: 'CENTRO-DEMO',
        totalCentavos: 8695,
        totalGramos: 470,
      },
    };
    const primera = await request(aplicacion).post('/api/v1/sync/push').send(operacion).expect(200);
    const segunda = await request(aplicacion).post('/api/v1/sync/push').send(operacion).expect(200);

    expect(segunda.body).toEqual({ ...primera.body, repetida: true });
    expect(await baseDatos('remisiones').count({ total: '*' }).first()).toEqual({ total: 1 });
    expect(await baseDatos('operaciones_sincronizacion').count({ total: '*' }).first()).toEqual({
      total: 1,
    });
  });
});
