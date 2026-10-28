import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { crearConexionBaseDatos } from '../src/infra/baseDatos.js';
import { AlmacenCmsMysql } from '../src/cms/almacen.js';

const conMysql = process.env.TEST_MYSQL === '1' ? describe : describe.skip;
conMysql('gestor persistente MySQL', () => {
  let db, almacen;
  beforeAll(async () => {
    if (!process.env.DATABASE_NAME?.endsWith('_test'))
      throw new Error('Usa una base dedicada con nombre terminado en _test.');
    db = crearConexionBaseDatos('test');
    await db.migrate.latest();
    almacen = new AlmacenCmsMysql(db);
    await almacen.iniciar();
  });
  afterAll(async () => {
    await db?.destroy();
  });
  it('serializa escritores concurrentes y conserva el estado al recrear el repositorio', async () => {
    const id = randomUUID();
    await almacen.cambiar((s) => {
      s.auditoria.push({ id, accion: 'PRUEBA', cantidad: 0 });
    });
    await Promise.all(
      Array.from({ length: 5 }, () =>
        almacen.cambiar((s) => {
          s.auditoria.find((a) => a.id === id).cantidad++;
        }),
      ),
    );
    const recuperado = await new AlmacenCmsMysql(db).leer();
    expect(recuperado.auditoria.find((a) => a.id === id).cantidad).toBe(5);
  });
});
