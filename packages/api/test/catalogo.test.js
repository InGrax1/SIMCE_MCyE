import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { mkdtemp, rm, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { crearAplicacion } from '../src/app.js';
import { crearAlmacenCatalogo } from '../src/catalogo/almacen.js';
import { AlmacenCmsArchivo, AlmacenCmsMysql } from '../src/cms/almacen.js';
import { crearAutenticacion, hashClave } from '../src/cms/autenticacion.js';
import { crearRutasCms } from '../src/cms/rutas.js';
import { crearConexionBaseDatos } from '../src/infra/baseDatos.js';

const origen = 'http://localhost:3000';
const modos = process.env.TEST_MYSQL === '1' ? ['archivo', 'mysql'] : ['archivo'];

describe.each(modos)('catálogo operativo con almacenamiento %s', (modo) => {
  let app, almacen, db, carpeta, usuarios;
  const tokens = {};
  const creados = new Map();
  const sufijo = randomUUID().slice(0, 8);
  const clave = randomBytes(18).toString('base64url');
  const api = (rol, metodo, ruta) => {
    const peticion = request(app)[metodo](`/api/v1${ruta}`);
    return peticion.set('Origin', origen).auth(tokens[rol], { type: 'bearer' });
  };

  beforeAll(async () => {
    carpeta = await mkdtemp(join(tmpdir(), 'simce-catalogo-'));
    if (modo === 'mysql') {
      if (!process.env.DATABASE_NAME?.endsWith('_test'))
        throw new Error('Usa una base dedicada con nombre terminado en _test.');
      db = crearConexionBaseDatos('test');
      await db.migrate.latest();
      almacen = new AlmacenCmsMysql(db);
      await almacen.iniciar();
    } else almacen = new AlmacenCmsArchivo(join(carpeta, 'estado.json'));
    const hash = await hashClave(clave);
    usuarios = ['admin', 'responsable', 'operador', 'editor', 'pendiente'].map((rol) => ({
      id: randomUUID(),
      correo: `catalogo-${rol}-${randomUUID()}@example.test`,
      rol: rol === 'pendiente' ? 'admin' : rol,
      debeCambiar: rol === 'pendiente',
      activo: true,
      hash,
    }));
    await almacen.cambiar((s) => s.usuarios.push(...usuarios));
    const auth = await crearAutenticacion({
      almacen,
      secreto: randomBytes(48).toString('hex'),
      origenes: [origen],
    });
    const rutas = crearRutasCms({ almacen, auth, catalogo: crearAlmacenCatalogo(almacen, db) });
    app = crearAplicacion({ cms: { rutas, auth, carpetaPortal: carpeta, carpetaPanel: carpeta } });
    for (const usuario of usuarios) {
      const login = await request(app)
        .post('/api/v1/auth/login')
        .set('Origin', origen)
        .send({ correo: usuario.correo, clave })
        .expect(200);
      tokens[usuario.debeCambiar ? 'pendiente' : usuario.rol] = login.body.token;
    }
  });

  afterAll(async () => {
    try {
      if (db && usuarios) {
        const productoUuid = creados.get('productos_operativos');
        if (productoUuid) await db('precios_producto').where('producto_uuid', productoUuid).del();
        for (const [tabla, uuid] of [...creados].reverse()) await db(tabla).where({ uuid }).del();
        const ids = new Set(usuarios.map((usuario) => usuario.id));
        await almacen.cambiar((s) => {
          s.usuarios = s.usuarios.filter((u) => !ids.has(u.id));
          s.sesiones = s.sesiones.filter((sesion) => !ids.has(sesion.usuarioId));
          s.auditoria = s.auditoria.filter((evento) => !ids.has(evento.usuarioId));
        });
      }
    } finally {
      await db?.destroy();
      if (carpeta) {
        await rm(join(carpeta, 'estado.json'), { force: true });
        await rmdir(carpeta);
      }
    }
  });

  it('protege el catálogo y autoriza solo al responsable y administrador a cambiarlo', async () => {
    await request(app).get('/api/v1/productos').expect(401);
    await api('pendiente', 'get', '/catalogos-operativos').expect(403);
    await api('editor', 'get', '/productos').expect('Cache-Control', 'no-store').expect(200);
    await api('editor', 'get', '/productos/plu/010101').expect(403);
    await api('operador', 'post', '/catalogos-operativos/destinos')
      .send({ nombre: 'Destino' })
      .expect(403);
    await api('admin', 'post', '/catalogos-operativos/destinos')
      .set('Origin', 'https://example.test')
      .send({ nombre: 'Destino' })
      .expect(403);
    const destino = (
      await api('responsable', 'post', '/catalogos-operativos/destinos')
        .send({ nombre: `Destino de prueba ${sufijo}` })
        .expect(201)
    ).body;
    creados.set('destinos', destino.uuid);
    await api('responsable', 'patch', `/catalogos-operativos/destinos/${destino.uuid}`)
      .send({ nombre: destino.nombre, activo: false, version: destino.version })
      .expect(200);
    expect(
      (await api('operador', 'get', '/catalogos-operativos').expect(200)).body.destinos,
    ).toContainEqual({ ...destino, activo: false, version: 2 });
  });

  it('reserva el PLU bajo concurrencia, conserva el historial de precios y registra auditoría', async () => {
    const crearClasificacion = async (tipo, nombre) =>
      (await api('admin', 'post', `/catalogos-operativos/${tipo}`).send({ nombre }).expect(201))
        .body;
    const linea = await crearClasificacion('lineas', `Hamburguesa de prueba ${sufijo}`);
    creados.set('lineas_producto', linea.uuid);
    const especie = await crearClasificacion('especies', `Conejo de prueba ${sufijo}`);
    creados.set('especies', especie.uuid);
    const plu = String(randomInt(1, 100_000)).padStart(6, '0');
    const datos = {
      nombre: 'Producto sintético',
      plu,
      linea_uuid: linea.uuid,
      especie_uuid: especie.uuid,
      presentacion: 'Estándar',
    };
    await api('admin', 'post', '/productos')
      .send({ ...datos, plu: '000000' })
      .expect(422);
    const altas = await Promise.all([
      api('admin', 'post', '/productos').send(datos),
      api('responsable', 'post', '/productos').send(datos),
    ]);
    expect(altas.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(altas.find((r) => r.status === 409).body.error).toBe('PLU_DUPLICADO');
    const producto = altas.find((r) => r.status === 201).body;
    creados.set('productos_operativos', producto.uuid);
    const rutaProducto = `/productos/${producto.uuid}`;
    const rutaPrecios = `${rutaProducto}/precios`;
    const anterior = { precio_kg_centavos: 18500, vigente_desde: '2026-02-28' };
    await api('admin', 'post', rutaPrecios)
      .send({ ...anterior, vigente_desde: '2026-02-30' })
      .expect(422);
    await api('admin', 'post', rutaPrecios)
      .send({ ...anterior, motivo: 'Revisión de prueba' })
      .expect(422);
    const primerPrecio = (
      await api('admin', 'post', rutaPrecios)
        .send({ ...anterior, motivo: 'Revisión de prueba', revision_documentos: true })
        .expect(201)
    ).body;
    const futuro = { precio_kg_centavos: 20000, vigente_desde: '2099-03-01' };
    const vigencias = await Promise.all([
      api('admin', 'post', rutaPrecios).send(futuro),
      api('responsable', 'post', rutaPrecios).send(futuro),
    ]);
    expect(vigencias.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(vigencias.find((r) => r.status === 409).body.error).toBe('VIGENCIA_DUPLICADA');
    const segundoPrecio = vigencias.find((r) => r.status === 201).body;
    expect((await api('operador', 'get', rutaPrecios).expect(200)).body).toEqual([
      { ...primerPrecio, vigente_hasta: '2099-02-28' },
      { ...segundoPrecio, vigente_hasta: null },
    ]);
    for (const [fecha, precio] of [
      ['2026-02-27', null],
      ['2026-02-28', primerPrecio.uuid],
      ['2099-03-01', segundoPrecio.uuid],
    ]) {
      const { body } = await api('operador', 'get', `/productos?fecha=${fecha}`).expect(200);
      const actual = body.productos.find((item) => item.uuid === producto.uuid);
      expect(actual.precio?.uuid ?? null).toBe(precio);
    }
    await api('operador', 'get', `/productos/plu/${plu}`).expect(200);
    await api('admin', 'patch', `/catalogos-operativos/lineas/${linea.uuid}`)
      .send({ nombre: linea.nombre, activo: false, version: linea.version })
      .expect(409);
    await api('admin', 'patch', rutaProducto)
      .send({ ...datos, activo: false, version: 0 })
      .expect(409);
    await api('admin', 'patch', rutaProducto)
      .send({ ...datos, activo: false, version: 1 })
      .expect(200);
    await api('operador', 'get', `/productos/plu/${plu}`).expect(409);
    await api('admin', 'post', '/productos').send(datos).expect(409);
    expect((await api('admin', 'get', '/cms/auditoria').expect(200)).body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          accion: 'ACTUALIZAR_PRODUCTO_OPERATIVO',
          recurso: producto.uuid,
        }),
        expect.objectContaining({
          accion: 'REGISTRAR_PRECIO_OPERATIVO',
          recurso: primerPrecio.uuid,
          usuarioId: usuarios[0].id,
        }),
      ]),
    );
  });
});
