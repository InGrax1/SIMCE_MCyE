import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { crearConexionBaseDatos } from '../src/infra/baseDatos.js';
import { AlmacenCmsMysql } from '../src/cms/almacen.js';
import { registrarInscripcion, cambiarInscripcion } from '../src/talleres/servicio.js';
import {
  registrarConsulta,
  responderConsulta,
  consultarRespuesta,
} from '../src/talleres/consultas.js';

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
  it('conserva consultas y respuestas privadas al recrear el repositorio MySQL', async () => {
    const id = randomUUID();
    const avisoAnterior = (await almacen.leer()).avisoTalleres;
    let folio;
    try {
      const acceso = await almacen.cambiar((s) => {
        s.entradas.push({ id, tipo: 'taller', publicado: { nombre: 'Consulta sintética MySQL' } });
        s.avisoTalleres = { url: 'https://example.test/aviso', version: 'prueba-mysql' };
        return registrarConsulta(s, id, {
          nombre: 'Persona de prueba',
          correo: 'consulta@example.test',
          mensaje: '¿Cuál es la sede?',
          aceptoAviso: true,
          versionAviso: 'prueba-mysql',
        });
      });
      folio = acceso.folio;
      const otro = new AlmacenCmsMysql(db);
      await otro.cambiar((s) => {
        const c = s.consultasTalleres.find((c) => c.folio === folio);
        responderConsulta(s, c.id, { texto: 'Sede de prueba', version: 1 }, { id: 'prueba-mysql' });
      });
      const respuesta = consultarRespuesta(await new AlmacenCmsMysql(db).leer(), acceso);
      expect(respuesta.respuestas[0].texto).toBe('Sede de prueba');
    } finally {
      await almacen.cambiar((s) => {
        s.entradas = s.entradas.filter((t) => t.id !== id);
        s.consultasTalleres = s.consultasTalleres.filter((c) => c.folio !== folio);
        s.avisoTalleres = avisoAnterior;
      });
    }
  });
  it('asigna una sola última plaza entre dos repositorios y conserva cancelación y reactivación', async () => {
    const id = randomUUID();
    const ahora = new Date('2026-11-06T18:00:00.000Z');
    const avisoAnterior = (await almacen.leer()).avisoTalleres;
    const datos = (correo) => ({
      nombre: 'Participante sintético',
      correo,
      telefono: '5500000000',
      procedencia: 'externa',
      aceptoAviso: true,
      versionAviso: 'prueba-mysql',
    });
    try {
      await almacen.cambiar((s) => {
        s.avisoTalleres = { url: 'https://example.test/aviso-mysql', version: 'prueba-mysql' };
        s.entradas.push({
          id,
          tipo: 'taller',
          publicado: { nombre: 'Prueba MySQL' },
          version: 1,
          inscripcion: {
            cupo: 1,
            estado: 'programado',
            apertura: '2026-11-01T00:00:00.000Z',
            cierre: '2026-11-09T00:00:00.000Z',
          },
        });
      });
      const otro = new AlmacenCmsMysql(db);
      const respuestas = await Promise.allSettled([
        almacen.cambiar((s) => registrarInscripcion(s, id, datos('uno@example.test'), ahora)),
        otro.cambiar((s) => registrarInscripcion(s, id, datos('dos@example.test'), ahora)),
      ]);
      expect(respuestas.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(respuestas.find((r) => r.status === 'rejected').reason.codigo).toBe('CUPO_AGOTADO');
      let inscrito = (await otro.leer()).inscripciones.find((i) => i.tallerId === id);
      await almacen.cambiar((s) =>
        cambiarInscripcion(
          s,
          inscrito.id,
          {
            accion: 'cancelar',
            motivo: 'Solicitud de prueba',
            version: 1,
          },
          { id: 'prueba-mysql' },
          ahora,
        ),
      );
      await otro.cambiar((s) =>
        cambiarInscripcion(
          s,
          inscrito.id,
          {
            ...datos(inscrito.correo),
            accion: 'reactivar',
            motivo: 'Consentimiento de prueba',
            version: 2,
          },
          { id: 'prueba-mysql' },
          ahora,
        ),
      );
      inscrito = (await new AlmacenCmsMysql(db).leer()).inscripciones.find(
        (i) => i.tallerId === id,
      );
      expect(inscrito.estado).toBe('confirmada');
      expect(inscrito.historial).toHaveLength(3);
    } finally {
      await almacen.cambiar((s) => {
        s.entradas = s.entradas.filter((t) => t.id !== id);
        s.inscripciones = s.inscripciones.filter((i) => i.tallerId !== id);
        s.avisoTalleres = avisoAnterior;
      });
    }
  });
});
