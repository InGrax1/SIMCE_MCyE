import request from 'supertest';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { crearAplicacion } from '../src/app.js';
import { AlmacenCmsArchivo } from '../src/cms/almacen.js';
import { crearAutenticacion, hashClave } from '../src/cms/autenticacion.js';
import { crearRutasCms } from '../src/cms/rutas.js';
import { configurarAvisoTalleres } from '../src/talleres/aviso.js';
import {
  registrarInscripcion,
  configurarTaller,
  cambiarInscripcion,
} from '../src/talleres/servicio.js';
import { proyectarTaller } from '../src/talleres/reglas.js';

const origen = 'http://localhost:3000';
const clave = randomBytes(18).toString('base64url');
const id = randomUUID();
const instante = new Date('2026-11-06T18:00:00.000Z');
const participante = (correo = 'participante@example.test') => ({
  nombre: 'María López',
  correo,
  telefono: '5500000000',
  procedencia: 'externa',
  aceptoAviso: true,
  versionAviso: 'sintetico-v1',
});
function tallerPrueba(tallerId = id) {
  const datos = {
    nombre: 'Taller sintético de embutidos',
    descripcion: 'Solo para pruebas',
    inicio: '2099-11-10',
    fin: '2099-11-11',
    estadoTaller: 'abierto',
  };
  return {
    id: tallerId,
    tipo: 'taller',
    borrador: datos,
    publicado: structuredClone(datos),
    version: 1,
    historial: [],
    inscripcion: {
      cupo: 1,
      temario: 'Higiene y elaboración',
      sede: 'Sede de pruebas',
      apertura: '2020-01-01T00:00:00.000Z',
      cierre: '2099-11-09T23:00:00.000Z',
      estado: 'programado',
    },
  };
}
let hash;
beforeAll(async () => {
  hash = await hashClave(clave);
});
describe('talleres e inscripciones', () => {
  let carpeta, almacen, app, auth;
  beforeEach(async () => {
    const base = resolve('artifacts/test-talleres');
    await mkdir(base, { recursive: true });
    carpeta = await mkdtemp(join(base, 'ejecucion-'));
    almacen = new AlmacenCmsArchivo(join(carpeta, 'estado.json'));
    await almacen.cambiar((s) => {
      s.entradas.push(tallerPrueba());
      s.avisoTalleres = { url: 'https://example.test/aviso-sintetico', version: 'sintetico-v1' };
      s.usuarios = ['responsable', 'admin', 'editor', 'operador'].map((rol) => ({
        id: randomUUID(),
        correo: `${rol}@example.test`,
        rol,
        hash,
        activo: true,
        debeCambiar: false,
      }));
    });
    auth = await crearAutenticacion({
      almacen,
      secreto: randomBytes(48).toString('hex'),
      origenes: [origen],
    });
    const publicador = { publicar: async () => {}, previsualizar: async () => '' };
    app = crearAplicacion({
      cms: {
        auth,
        carpetaPortal: carpeta,
        carpetaPanel: carpeta,
        rutas: crearRutasCms({ almacen, auth, publicador, carpetaMedios: carpeta }),
      },
    });
  });
  afterEach(async () => {
    if (carpeta?.startsWith(resolve('artifacts/test-talleres') + sep))
      await rm(carpeta, { recursive: true, force: true });
  });
  async function api(rol, metodo, ruta, datos) {
    const sesion = await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', origen)
      .send({ correo: `${rol}@example.test`, clave });
    expect(sesion.status).toBe(200);
    const solicitud = request(app)[metodo](`/api/v1${ruta}`);
    return solicitud.set('Origin', origen).auth(sesion.body.token, { type: 'bearer' }).send(datos);
  }
  const inscribir = (datos = participante()) =>
    request(app)
      .post(`/api/v1/publico/talleres/${id}/inscripciones`)
      .set('Origin', origen)
      .send(datos);

  it('entrega folio, normaliza correo y registra consentimiento sin publicar datos personales', async () => {
    const resultado = await inscribir(participante(' Participante@Example.test '));
    expect(resultado.status).toBe(201);
    expect(resultado.body).toEqual({
      folio: expect.stringMatching(/^INS-\d{4}-\d{8}$/),
      estado: 'confirmada',
    });
    const estado = await new AlmacenCmsArchivo(almacen.archivo).leer();
    expect(estado.inscripciones[0]).toMatchObject({
      correo: 'participante@example.test',
      versionAviso: 'sintetico-v1',
      avisoAceptadoEn: expect.any(String),
    });
    expect(JSON.stringify(estado.auditoria)).not.toContain('María');
    const publico = await request(app).get('/api/v1/publico/talleres');
    expect(publico.body.talleres[0].inscripcion.estadoInscripcion).toBe('cupo_lleno');
    expect(JSON.stringify(publico.body)).not.toMatch(/participante@example|María|avisoAceptadoEn/);
    const contenido = await request(app).get('/api/v1/publico/contenido');
    expect(JSON.stringify(contenido.body)).not.toContain('participante@example');
  });
  it('serializa dos solicitudes simultáneas a la última plaza', async () => {
    const resultados = await Promise.all([
      inscribir(participante('uno@example.test')),
      inscribir(participante('dos@example.test')),
    ]);
    expect(resultados.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(resultados.find((r) => r.status === 409).body.error).toBe('CUPO_AGOTADO');
    expect((await almacen.leer()).inscripciones).toHaveLength(1);
  });
  it('rechaza duplicados normalizados incluso después de cancelar y permite reactivación autorizada', async () => {
    await inscribir();
    let registro = (await almacen.leer()).inscripciones[0];
    expect((await inscribir(participante('PARTICIPANTE@example.test'))).body.error).toBe(
      'INSCRIPCION_DUPLICADA',
    );
    let resultado = await api('responsable', 'post', `/inscripciones/${registro.id}/acciones`, {
      accion: 'cancelar',
      motivo: 'Solicitud del participante',
      version: 1,
    });
    expect(resultado.status).toBe(200);
    expect((await inscribir()).body.error).toBe('INSCRIPCION_DUPLICADA');
    expect(
      proyectarTaller(await almacen.leer(), tallerPrueba(), instante).inscripcion.disponibles,
    ).toBe(1);
    await almacen.cambiar((s) => {
      s.avisoTalleres = { url: 'https://example.test/v2', version: 'sintetico-v2' };
    });
    resultado = await api('responsable', 'post', `/inscripciones/${registro.id}/acciones`, {
      ...participante(),
      versionAviso: 'sintetico-v2',
      accion: 'reactivar',
      motivo: 'Consentimiento renovado',
      version: 2,
    });
    expect(resultado.status).toBe(200);
    registro = (await almacen.leer()).inscripciones[0];
    expect(registro.historial).toHaveLength(3);
    expect(registro.historial[0].versionAviso).toBe('sintetico-v1');
    expect(registro.historial[2].versionAviso).toBe('sintetico-v2');
    expect(registro.estado).toBe('confirmada');
  });
  it('bloquea aviso ausente, consentimiento falso y versión obsoleta sin almacenar datos', async () => {
    expect((await inscribir({ ...participante(), aceptoAviso: false })).body.error).toBe(
      'AVISO_NO_ACEPTADO',
    );
    expect((await inscribir({ ...participante(), versionAviso: 'otra' })).status).toBe(422);
    await almacen.cambiar((s) => {
      s.avisoTalleres = null;
    });
    expect((await inscribir()).body.error).toBe('AVISO_PENDIENTE');
    expect((await almacen.leer()).inscripciones).toHaveLength(0);
  });
  it('exige datos internos cuando corresponde y limita el abuso por IP', async () => {
    expect((await inscribir({ ...participante(), procedencia: 'interna' })).status).toBe(422);
    for (let n = 0; n < 4; n++) await inscribir({});
    expect((await inscribir()).status).toBe(429);
    expect((await almacen.leer()).inscripciones).toHaveLength(0);
  });
  it('no acepta inscripciones a borradores, talleres cancelados ni fuera del periodo', async () => {
    await almacen.cambiar((s) => {
      s.entradas.find((t) => t.id === id).publicado = null;
    });
    expect((await inscribir()).status).toBe(404);
    await almacen.cambiar((s) => {
      const t = s.entradas.find((t) => t.id === id);
      t.publicado = t.borrador;
      t.inscripcion.estado = 'cancelado';
    });
    expect((await inscribir()).body.error).toBe('INSCRIPCION_CERRADA');
    await almacen.cambiar((s) => {
      const t = s.entradas.find((t) => t.id === id);
      t.inscripcion.estado = 'programado';
      t.inscripcion.cierre = '2020-11-06T00:00:00.000Z';
    });
    expect((await inscribir()).body.error).toBe('INSCRIPCION_CERRADA');
  });
  it('usa apertura inclusiva y cierre exclusivo según el reloj del servidor', async () => {
    await almacen.cambiar((s) => {
      const t = s.entradas.find((t) => t.id === id);
      t.inscripcion.apertura = instante.toISOString();
      t.inscripcion.cierre = '2026-11-06T19:00:00.000Z';
      expect(
        proyectarTaller(s, t, new Date(instante.getTime() - 1)).inscripcion.estadoInscripcion,
      ).toBe('proximamente');
      expect(() =>
        registrarInscripcion(s, id, participante(), new Date(t.inscripcion.cierre)),
      ).toThrow('cerrada');
      expect(registrarInscripcion(s, id, participante(), instante).estado).toBe('confirmada');
    });
  });
  it('protege listas y exportaciones de visitantes, editor y operador', async () => {
    await request(app).get(`/api/v1/talleres/${id}/inscripciones`).expect(401);
    for (const rol of ['editor', 'operador'])
      for (const sufijo of ['', '?formato=csv', '?formato=pdf'])
        expect((await api(rol, 'get', `/talleres/${id}/inscripciones${sufijo}`)).status).toBe(403);
    expect(
      (
        await request(app)
          .post(`/api/v1/publico/talleres/${id}/inscripciones`)
          .set('Origin', 'https://ajeno.example.test')
          .send(participante())
      ).status,
    ).toBe(403);
  });
  it('exporta CSV seguro para hojas de cálculo y un PDF con acceso autenticado y auditado', async () => {
    await inscribir({ ...participante(), nombre: '=SUM(1,2)' });
    const csv = await api('responsable', 'get', `/talleres/${id}/inscripciones?formato=csv`);
    expect(csv.status).toBe(200);
    expect(csv.text).toContain('"\'=SUM(1,2)"');
    expect(csv.headers['cache-control']).toBe('no-store');
    const pdf = await api('admin', 'get', `/talleres/${id}/inscripciones?formato=pdf`);
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toContain('application/pdf');
    expect(pdf.body.subarray(0, 4).toString()).toBe('%PDF');
    expect(
      (await almacen.leer()).auditoria.filter((a) => a.accion === 'EXPORTAR_INSCRIPCIONES'),
    ).toHaveLength(2);
  });
  it('impide reducir cupo, cambiar fechas sin motivo, borrar un taller inscrito o perder historial', async () => {
    await inscribir();
    const t = (await almacen.leer()).entradas.find((t) => t.id === id);
    const datos = { ...t.inscripcion, version: t.version };
    expect(
      (
        await api('responsable', 'put', `/talleres/${id}`, {
          ...datos,
          cierre: '2099-11-08T00:00:00.000Z',
        })
      ).status,
    ).toBe(422);
    expect(
      (await api('responsable', 'delete', `/cms/entradas/${id}`, { version: 1 })).body.error,
    ).toBe('TALLER_CON_INSCRIPCIONES');
    await almacen.cambiar((s) => {
      const t = s.entradas.find((t) => t.id === id);
      t.inscripcion.cupo = 2;
      registrarInscripcion(s, id, participante('segundo@example.test'), instante);
      expect(() => configurarTaller(s, id, datos, { id: 'admin' })).toThrow('menor');
    });
  });
  it('cancelar un taller libera plazas y bloquea republicación y reactivación', async () => {
    await inscribir();
    const cancelado = await api('responsable', 'post', `/talleres/${id}/acciones`, {
      accion: 'cancelar',
      motivo: 'Cambio de programación',
      version: 1,
    });
    expect(cancelado.status).toBe(200);
    const s = await almacen.leer();
    const i = s.inscripciones[0];
    expect(i.estado).toBe('cancelada');
    expect(() =>
      cambiarInscripcion(
        s,
        i.id,
        { ...participante(), accion: 'reactivar', motivo: 'Prueba', version: i.version },
        { id: 'admin' },
        instante,
      ),
    ).toThrow('cerrada');
    expect(
      (
        await api('responsable', 'post', `/cms/entradas/${id}/publicar`, {
          version: 2,
          confirmarRevision: true,
        })
      ).body.error,
    ).toBe('TALLER_CANCELADO');
  });
  it('conserva versiones de avisos y rechaza reutilizarlas con otra URL', async () => {
    await configurarAvisoTalleres(almacen, {
      AVISO_TALLERES_URL: 'https://example.test/v1',
      AVISO_TALLERES_VERSION: 'v1',
    });
    await expect(
      configurarAvisoTalleres(almacen, {
        AVISO_TALLERES_URL: 'https://example.test/otro',
        AVISO_TALLERES_VERSION: 'v1',
      }),
    ).rejects.toThrow('inmutable');
    await configurarAvisoTalleres(almacen, {});
    expect((await almacen.leer()).avisosTalleres).toHaveLength(1);
    await expect(
      configurarAvisoTalleres(almacen, {
        AVISO_TALLERES_URL: 'http://example.test/v2',
        AVISO_TALLERES_VERSION: 'v2',
      }),
    ).rejects.toThrow('HTTPS');
  });
  it('exige motivo al cambiar las fechas publicadas aunque se despublique primero', async () => {
    expect(
      (await api('responsable', 'post', `/cms/entradas/${id}/despublicar`, { version: 1 })).status,
    ).toBe(200);
    const t = (await almacen.leer()).entradas.find((e) => e.id === id);
    expect(
      (
        await api('editor', 'put', `/cms/entradas/${id}`, {
          version: 2,
          datos: { ...t.borrador, inicio: '2099-11-09' },
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await api('responsable', 'post', `/cms/entradas/${id}/publicar`, {
          version: 3,
          confirmarRevision: true,
        })
      ).status,
    ).toBe(422);
    expect(
      (
        await api('responsable', 'post', `/cms/entradas/${id}/publicar`, {
          version: 3,
          confirmarRevision: true,
          motivo: 'Cambio autorizado de fecha',
        })
      ).status,
    ).toBe(200);
    expect(
      (await almacen.leer()).entradas.find((e) => e.id === id).historialOperativo[0],
    ).toMatchObject({ anterior: { inicio: '2099-11-10' }, motivo: 'Cambio autorizado de fecha' });
  });
  it('la asistencia conserva la plaza y las acciones rechazan versiones antiguas', async () => {
    await inscribir();
    const i = (await almacen.leer()).inscripciones[0];
    expect(
      (
        await api('responsable', 'post', `/inscripciones/${i.id}/acciones`, {
          accion: 'asistencia',
          motivo: 'Asistencia verificada',
          version: 1,
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await api('responsable', 'post', `/inscripciones/${i.id}/acciones`, {
          accion: 'cancelar',
          motivo: 'Prueba obsoleta',
          version: 1,
        })
      ).body.error,
    ).toBe('VERSION_DESACTUALIZADA');
    expect((await inscribir(participante('otro@example.test'))).body.error).toBe('CUPO_AGOTADO');
  });
});
