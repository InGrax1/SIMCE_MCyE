import request from 'supertest';
import sharp from 'sharp';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { crearAplicacion } from '../src/app.js';
import { AlmacenCmsArchivo } from '../src/cms/almacen.js';
import { crearAutenticacion, hashClave } from '../src/cms/autenticacion.js';
import { crearRutasCms } from '../src/cms/rutas.js';

const origen = 'http://localhost:3000';
const clave = randomBytes(18).toString('base64url');
let hash;
beforeAll(async () => {
  hash = await hashClave(clave);
});
describe('gestión de contenido y sesiones', () => {
  let carpeta, almacen, app;
  let falloPublicacion = false;
  const usuarios = ['editor', 'operador', 'responsable', 'admin'];
  beforeEach(async () => {
    await mkdir(resolve('artifacts'), { recursive: true });
    carpeta = await mkdtemp(resolve('artifacts/test-cms-'));
    almacen = new AlmacenCmsArchivo(join(carpeta, 'estado.json'));
    await almacen.cambiar((estado) => {
      estado.usuarios = usuarios.map((rol) => ({
        id: randomUUID(),
        correo: `${rol}@example.test`,
        rol,
        hash,
        activo: true,
        debeCambiar: false,
      }));
    });
    const auth = await crearAutenticacion({
      almacen,
      secreto: randomBytes(48).toString('hex'),
      origenes: [origen],
    });
    const publicador = {
      publicar: async () => {
        if (falloPublicacion) throw new Error('Fallo simulado');
        await almacen.cambiar((s) => {
          s.revisionHtml = s.revisionPortal;
        });
      },
      previsualizar: async () => '<html lang="es"><title>Vista previa</title></html>',
    };
    app = crearAplicacion({
      cms: {
        almacen,
        auth,
        carpetaPortal: carpeta,
        carpetaPanel: carpeta,
        rutas: crearRutasCms({ almacen, auth, publicador, carpetaMedios: join(carpeta, 'medios') }),
      },
    });
    falloPublicacion = false;
  });
  afterEach(async () => {
    if (carpeta?.startsWith(resolve('artifacts/test-cms-')))
      await rm(carpeta, { recursive: true, force: true });
  });
  const entrar = (rol) =>
    request(app)
      .post('/api/v1/auth/login')
      .set('Origin', origen)
      .send({ correo: `${rol}@example.test`, clave });
  const api = (rol, metodo, ruta, datos) =>
    entrar(rol).then((s) => {
      const enviar = request(app)[metodo](`/api/v1${ruta}`);
      return enviar.set('Origin', origen).auth(s.body.token, { type: 'bearer' }).send(datos);
    });
  async function nuevo() {
    return (
      await api('editor', 'post', '/cms/entradas', {
        tipo: 'aviso',
        datos: {
          nombre: 'Aviso de prueba',
          descripcion: 'Contenido sintético de prueba',
          fecha: '2026-10-27',
        },
      })
    ).body;
  }

  it('no entrega borradores ni campos privados al visitante y conserva la versión publicada al editar', async () => {
    const entrada = await nuevo();
    let publico = await request(app).get('/api/v1/publico/contenido').expect(200);
    expect(publico.body.avisos).toEqual([]);
    expect(publico.body.usuarios).toBeUndefined();
    await api('responsable', 'post', `/cms/entradas/${entrada.id}/publicar`, {
      version: 1,
      confirmarRevision: true,
    });
    await api('editor', 'put', `/cms/entradas/${entrada.id}`, {
      version: 2,
      datos: { nombre: 'Texto aún sin publicar', descripcion: 'Revisión pendiente' },
    });
    publico = await request(app).get('/api/v1/publico/contenido');
    expect(publico.body.avisos[0].nombre).toBe('Aviso de prueba');
    expect(JSON.stringify(publico.body)).not.toContain('Texto aún sin publicar');
  });
  it('deniega sin sesión, a operadores y a editores en cada acción reservada', async () => {
    const entrada = await nuevo();
    await request(app).get('/api/v1/cms/entradas').expect(401);
    await api('operador', 'get', '/cms/entradas').then((r) => expect(r.status).toBe(403));
    for (const rol of ['editor', 'operador'])
      for (const [metodo, ruta] of [
        ['post', `/cms/entradas/${entrada.id}/publicar`],
        ['post', `/cms/entradas/${entrada.id}/despublicar`],
        ['delete', `/cms/entradas/${entrada.id}`],
        ['post', '/cms/regenerar'],
        ['get', '/cms/auditoria'],
      ]) {
        const respuesta = await api(rol, metodo, ruta, { version: 1, confirmarRevision: true });
        expect(respuesta.status).toBe(403);
      }
    const editor = await entrar('editor');
    await request(app)
      .post('/api/v1/sync/push')
      .auth(editor.body.token, { type: 'bearer' })
      .send({})
      .expect(403);
  });
  it('rechaza HTML ejecutable, versiones antiguas y publicaciones sin revisión', async () => {
    await api('editor', 'post', '/cms/entradas', {
      tipo: 'aviso',
      datos: { nombre: '<script>alert(1)</script>' },
    }).then((r) => expect(r.status).toBe(422));
    const entrada = await nuevo();
    const editor = await entrar('editor');
    const cambios = await Promise.all(
      ['Primero', 'Segundo'].map((nombre) =>
        request(app)
          .put(`/api/v1/cms/entradas/${entrada.id}`)
          .set('Origin', origen)
          .auth(editor.body.token, { type: 'bearer' })
          .send({ version: 1, datos: { nombre, descripcion: 'Prueba concurrente' } }),
      ),
    );
    expect(cambios.map((r) => r.status).sort()).toEqual([200, 409]);
    await api('responsable', 'post', `/cms/entradas/${entrada.id}/publicar`, { version: 2 }).then(
      (r) => expect(r.status).toBe(422),
    );
  });
  it('registra publicación, despublicación y eliminación sin datos de sesión en la bitácora', async () => {
    const entrada = await nuevo();
    await api('admin', 'post', `/cms/entradas/${entrada.id}/publicar`, {
      version: 1,
      confirmarRevision: true,
    }).then((r) => expect(r.status).toBe(200));
    await api('admin', 'post', `/cms/entradas/${entrada.id}/despublicar`, { version: 2 }).then(
      (r) => expect(r.status).toBe(200),
    );
    await api('admin', 'delete', `/cms/entradas/${entrada.id}`, { version: 3 }).then((r) =>
      expect(r.status).toBe(200),
    );
    const eventos = (await api('responsable', 'get', '/cms/auditoria')).body;
    expect(eventos.map((e) => e.accion)).toEqual(
      expect.arrayContaining(['PUBLICAR', 'DESPUBLICAR', 'ELIMINAR']),
    );
    expect(JSON.stringify(eventos)).not.toMatch(/hash|token|clave/);
  });
  it('conserva las tres versiones anteriores y restaura como borrador', async () => {
    const entrada = await nuevo();
    for (let i = 1; i < 5; i++)
      await api('editor', 'put', `/cms/entradas/${entrada.id}`, {
        version: i,
        datos: { nombre: `Versión ${i + 1}` },
      });
    const actual = (await almacen.leer()).entradas.find((e) => e.id === entrada.id);
    expect(actual.historial).toHaveLength(3);
    await api('editor', 'post', `/cms/entradas/${entrada.id}/restaurar/3`, { version: 5 }).then(
      (r) => expect(r.body.borrador.nombre).toBe('Versión 3'),
    );
    expect((await request(app).get('/api/v1/publico/contenido')).body.avisos).toEqual([]);
  });
  it('rechaza orígenes desconocidos y revoca la familia cuando se reutiliza el refresco', async () => {
    await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', 'https://otro.example')
      .send({ correo: 'admin@example.test', clave })
      .expect(403);
    const sesion = await entrar('admin');
    const cookie = sesion.headers['set-cookie'][0].split(';')[0];
    expect(sesion.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(sesion.headers['set-cookie'][0]).toContain('SameSite=Strict');
    const renovada = await request(app)
      .post('/api/v1/auth/refrescar')
      .set('Origin', origen)
      .set('Cookie', cookie)
      .expect(200);
    await request(app)
      .post('/api/v1/auth/refrescar')
      .set('Origin', origen)
      .set('Cookie', cookie)
      .expect(401);
    await request(app)
      .get('/api/v1/cms/entradas')
      .auth(renovada.body.token, { type: 'bearer' })
      .expect(401);
  });
  it('cierra la sesión y exige cambiar la contraseña inicial', async () => {
    await almacen.cambiar((s) => {
      s.usuarios.find((u) => u.rol === 'admin').debeCambiar = true;
    });
    const sesion = await entrar('admin');
    await request(app)
      .get('/api/v1/cms/entradas')
      .auth(sesion.body.token, { type: 'bearer' })
      .expect(403);
    const nueva = randomBytes(20).toString('hex');
    const incorrecta = await request(app)
      .post('/api/v1/auth/clave')
      .set('Origin', origen)
      .auth(sesion.body.token, { type: 'bearer' })
      .send({ anterior: 'Una clave incorrecta', nueva })
      .expect(422);
    expect(incorrecta.body.error).toBe('CLAVE_ACTUAL_INVALIDA');
    await request(app)
      .get('/api/v1/auth/yo')
      .auth(sesion.body.token, { type: 'bearer' })
      .expect(200);
    const cambiada = await request(app)
      .post('/api/v1/auth/clave')
      .set('Origin', origen)
      .auth(sesion.body.token, { type: 'bearer' })
      .send({ anterior: clave, nueva })
      .expect(200);
    await request(app)
      .get('/api/v1/cms/entradas')
      .auth(cambiada.body.token, { type: 'bearer' })
      .expect(200);
    await request(app)
      .post('/api/v1/auth/salir')
      .set('Origin', origen)
      .set('Cookie', cambiada.headers['set-cookie'][0].split(';')[0])
      .expect(204);
    await request(app)
      .get('/api/v1/cms/entradas')
      .auth(cambiada.body.token, { type: 'bearer' })
      .expect(401);
  });
  it('limita el sexto intento fallido sin enumerar cuentas', async () => {
    for (let i = 0; i < 5; i++)
      await request(app)
        .post('/api/v1/auth/login')
        .set('Origin', origen)
        .send({ correo: 'nadie@example.test', clave: 'fallida' })
        .expect(401);
    await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', origen)
      .send({ correo: 'admin@example.test', clave })
      .expect(429);
  });
  it('valida y recodifica imágenes, y no expone las que no están publicadas', async () => {
    const sesion = await entrar('editor');
    await request(app)
      .post('/api/v1/cms/medios')
      .set('Origin', origen)
      .auth(sesion.body.token, { type: 'bearer' })
      .set('Content-Type', 'application/octet-stream')
      .set('X-Imagen-Alt', 'Prueba')
      .send(Buffer.from('<svg onload="alert(1)"></svg>'))
      .expect(422);
    const imagen = await sharp({
      create: { width: 100, height: 80, channels: 3, background: '#f0f0f0' },
    })
      .png()
      .toBuffer();
    const subida = await request(app)
      .post('/api/v1/cms/medios')
      .set('Origin', origen)
      .auth(sesion.body.token, { type: 'bearer' })
      .set('Content-Type', 'application/octet-stream')
      .set('X-Imagen-Alt', 'Imagen de prueba')
      .set('X-Recorte', JSON.stringify({ left: 0, top: 0, width: 50, height: 40 }))
      .send(imagen)
      .expect(201);
    expect(subida.body).toMatchObject({ ancho: 50, alto: 40 });
    await request(app).get(subida.body.ruta).expect(404);
    const producto = await api('editor', 'post', '/cms/entradas', {
      tipo: 'producto',
      datos: {
        nombre: 'Producto de prueba',
        descripcion: 'Producto sintético para probar la publicación de imágenes.',
        foto: subida.body.ruta,
        alt: subida.body.alt,
        precio: '100.00',
        mostrarPrecio: false,
      },
    });
    await api('responsable', 'post', `/cms/entradas/${producto.body.id}/publicar`, {
      version: 1,
      confirmarRevision: true,
    });
    const entregada = await request(app).get(subida.body.ruta).expect(200);
    expect(entregada.headers['content-type']).toContain('image/webp');
    const publico = (await request(app).get('/api/v1/publico/contenido')).body;
    expect(publico.productos.find((p) => p.id === producto.body.id).precio).toBeUndefined();
    const enorme = await sharp({
      create: { width: 6000, height: 5000, channels: 3, background: 'white' },
    })
      .png()
      .toBuffer();
    await request(app)
      .post('/api/v1/cms/medios')
      .set('Origin', origen)
      .auth(sesion.body.token, { type: 'bearer' })
      .set('Content-Type', 'application/octet-stream')
      .set('X-Imagen-Alt', 'Prueba')
      .send(enorme)
      .expect(422);
  });
  it('conserva el cambio y permite reintentar cuando falla la generación de HTML', async () => {
    const entrada = await nuevo();
    falloPublicacion = true;
    await api('admin', 'post', `/cms/entradas/${entrada.id}/publicar`, {
      version: 1,
      confirmarRevision: true,
    }).then((r) => expect(r.status).toBe(503));
    expect((await almacen.leer()).revisionPortal).toBeGreaterThan(
      (await almacen.leer()).revisionHtml,
    );
    falloPublicacion = false;
    await api('admin', 'post', '/cms/regenerar').then((r) => expect(r.status).toBe(200));
    const estado = await almacen.leer();
    expect(estado.revisionHtml).toBe(estado.revisionPortal);
    expect(
      (await new AlmacenCmsArchivo(join(carpeta, 'estado.json')).leer()).entradas.some(
        (e) => e.id === entrada.id,
      ),
    ).toBe(true);
  });
  it('rechaza la sesión y su refresco después de ocho horas sin actividad', async () => {
    const sesion = await entrar('editor');
    await almacen.cambiar((s) => {
      for (const registro of s.sesiones) registro.ultimaActividad = Date.now() - 8 * 3600_000 - 1;
    });
    await request(app)
      .get('/api/v1/cms/entradas')
      .auth(sesion.body.token, { type: 'bearer' })
      .expect(401);
    await request(app)
      .post('/api/v1/auth/refrescar')
      .set('Origin', origen)
      .set('Cookie', sesion.headers['set-cookie'])
      .expect(401);
  });
  it('permite preparar borradores incompletos pero exige sus campos al publicar y valida fechas', async () => {
    const borrador = await api('editor', 'post', '/cms/entradas', {
      tipo: 'producto',
      datos: { nombre: 'Producto por completar' },
    });
    expect(borrador.status).toBe(201);
    await api('responsable', 'post', `/cms/entradas/${borrador.body.id}/publicar`, {
      version: 1,
      confirmarRevision: true,
    }).then((r) => expect(r.status).toBe(422));
    await api('editor', 'post', '/cms/entradas', {
      tipo: 'aviso',
      datos: { nombre: 'Fecha imposible', fecha: '2026-02-30' },
    }).then((r) => expect(r.status).toBe(422));
    expect(
      (await almacen.leer()).entradas.find((e) => e.id === borrador.body.id).publicado,
    ).toBeFalsy();
  });
  it('no recoge intereses sin aviso autorizado y restringe su consulta a la responsable', async () => {
    const estado = await almacen.leer();
    const programa = estado.entradas.find((e) => e.tipo === 'programa');
    const datos = {
      nombre: 'Persona de prueba',
      correo: 'persona@example.test',
      mensaje: 'Prueba sintética',
      aceptoAviso: true,
      versionAviso: 'prueba',
    };
    await request(app)
      .post(`/api/v1/publico/programas/${programa.id}/intereses`)
      .set('Origin', origen)
      .send(datos)
      .expect(503);
    await almacen.cambiar((s) => {
      s.avisoInteres = { url: 'https://example.test/aviso', version: 'prueba' };
    });
    await request(app)
      .post(`/api/v1/publico/programas/${programa.id}/intereses`)
      .set('Origin', origen)
      .send({ ...datos, aceptoAviso: false })
      .expect(422);
    await request(app)
      .post(`/api/v1/publico/programas/${programa.id}/intereses`)
      .set('Origin', origen)
      .send(datos)
      .expect(201);
    await api('editor', 'get', '/cms/intereses').then((r) => expect(r.status).toBe(403));
    await api('responsable', 'get', '/cms/intereses').then((r) =>
      expect(r.body[0].correo).toBe(datos.correo),
    );
    expect(
      JSON.stringify((await request(app).get('/api/v1/publico/contenido')).body),
    ).not.toContain(datos.correo);
  });
  it('mantiene privadas las galerías por área hasta publicar y protege sus asociaciones', async () => {
    const area = await api('editor', 'post', '/cms/entradas', {
      tipo: 'area',
      datos: {
        nombre: 'Área sintética',
        descripcion: 'Prueba de asociaciones',
        foto: 'Images4.png',
        alt: 'Imagen de prueba',
      },
    });
    expect(area.status).toBe(201);
    const areaPublicada = await api(
      'responsable',
      'post',
      `/cms/entradas/${area.body.id}/publicar`,
      {
        version: 1,
        confirmarRevision: true,
      },
    );
    expect(areaPublicada.status).toBe(200);
    const imagen = {
      nombre: 'Imagen sintética de galería',
      foto: 'Images4.png',
      alt: 'Imagen para prueba',
      areaId: area.body.id,
    };
    const galeria = await api('editor', 'post', '/cms/entradas', {
      tipo: 'galeria',
      datos: imagen,
    });
    expect(galeria.status).toBe(201);
    expect(
      (await request(app).get('/api/v1/publico/contenido')).body.galeria.some(
        (g) => g.id === galeria.body.id,
      ),
    ).toBe(false);
    const imagenPublicada = await api(
      'responsable',
      'post',
      `/cms/entradas/${galeria.body.id}/publicar`,
      {
        version: 1,
        confirmarRevision: true,
      },
    );
    expect(imagenPublicada.status).toBe(200);
    expect(
      (await request(app).get('/api/v1/publico/contenido')).body.galeria.find(
        (g) => g.id === galeria.body.id,
      ).areaId,
    ).toBe(area.body.id);
    await api('responsable', 'post', `/cms/entradas/${area.body.id}/despublicar`, {
      version: 2,
    }).then((r) => expect(r.status).toBe(409));
    await api('responsable', 'delete', `/cms/entradas/${area.body.id}`, { version: 2 }).then((r) =>
      expect(r.status).toBe(409),
    );
    await api('editor', 'post', '/cms/entradas', {
      tipo: 'galeria',
      datos: { ...imagen, areaId: randomUUID() },
    }).then((r) => expect(r.status).toBe(422));
  });
  it('adapta las galerías anteriores sin reemplazar contraseñas ni ediciones de la institución', async () => {
    const anterior = await almacen.leer();
    delete anterior.versionEsquema;
    const galerias = anterior.entradas.filter((e) => e.tipo === 'galeria');
    for (const entrada of galerias) {
      delete entrada.borrador.areaId;
      delete entrada.publicado.areaId;
    }
    galerias[2].validacion = 'pendiente';
    const viejo = new AlmacenCmsArchivo(join(carpeta, 'estado-anterior.json'), anterior);
    const adaptado = await viejo.leer();
    expect(adaptado.usuarios).toEqual(anterior.usuarios);
    expect(adaptado.entradas.find((e) => e.id === galerias[1].id).publicado.areaId).toBeTruthy();
    expect(adaptado.entradas.find((e) => e.id === galerias[2].id).publicado.areaId).toBeUndefined();
    expect(adaptado.revisionPortal).toBe(anterior.revisionPortal);
  });
});
