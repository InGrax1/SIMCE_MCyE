import knex from 'knex';
import { afterAll, describe, expect, it } from 'vitest';
import { up } from '../migraciones/202609060001_fase_cero.js';

describe('migración inicial de MySQL', () => {
  const compilador = knex({ client: 'mysql2' });

  afterAll(async () => {
    await compilador.destroy();
  });

  it('compila todas las tablas con tipos enteros sin signo válidos', async () => {
    const sentencias = [];
    const knexCompilacion = {
      fn: compilador.fn,
      schema: {
        createTable(nombre, definirTabla) {
          const consulta = compilador.schema.createTable(nombre, definirTabla);
          sentencias.push(...consulta.toSQL().map(({ sql }) => sql));
          return Promise.resolve();
        },
      },
    };

    await up(knexCompilacion);
    const esquema = sentencias.join('\n');
    const tablasCreadas = sentencias.filter((sql) => sql.startsWith('create table'));

    expect(tablasCreadas).toHaveLength(4);
    expect(esquema).toContain('create table `perfiles_etiqueta`');
    expect(esquema).toContain('create table `remisiones`');
    expect(esquema).toContain('create table `operaciones_sincronizacion`');
    expect(esquema).toContain('create table `consecutivos_folio`');
    expect(esquema).toContain('int unsigned');
    expect(esquema).toContain('bigint unsigned');
  });
});
