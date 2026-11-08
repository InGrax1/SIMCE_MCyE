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
import { crearAlmacenOperacion } from '../src/operacion/almacen.js';
import { crearServicioOperacion } from '../src/operacion/servicio.js';

const origen = 'http://localhost:3000';
const modos = process.env.TEST_MYSQL === '1' ? ['archivo', 'mysql'] : ['archivo'];
const momento = '2026-11-07T18:00:00.000Z';

describe.each(modos)('operación persistente en %s', (modo) => {
  const admin = { id: randomUUID(), rol: 'admin' };
  const operador = { id: randomUUID(), rol: 'operador' };
  const dispositivoUuid = randomUUID();
  const productoUuid = randomUUID();
  let app, db, carpeta, almacen, servicio, catalogo;
  const tokens = new Map();
  let secuencia = 0;

  const comando = (tipo, usuario, payload, opciones = {}) => ({
    tipo,
    operacionUuid: randomUUID(),
    agregadoId: randomUUID(),
    autorUuid: usuario.id,
    dispositivoUuid,
    secuencia: ++secuencia,
    versionBase: 0,
    ocurridaEn: momento,
    payload,
    ...opciones,
  });
  const peticion = (metodo, ruta, usuario) => {
    const req = request(app)[metodo](`/api/v1${ruta}`).set('Origin', origen);
    return usuario ? req.auth(tokens.get(usuario.id), { type: 'bearer' }) : req;
  };
  async function enviar(usuario, ...operaciones) {
    return (await peticion('post', '/sync/push', usuario).send({ operaciones }).expect(207)).body
      .resultados;
  }

  beforeAll(async () => {
    carpeta = await mkdtemp(join(tmpdir(), 'simce-operacion-'));
    if (modo === 'mysql') {
      if (!process.env.DATABASE_NAME?.endsWith('_test'))
        throw new Error('Usa una base dedicada de pruebas.');
      db = crearConexionBaseDatos('test');
      await db.migrate.latest();
      almacen = new AlmacenCmsMysql(db);
      await almacen.iniciar();
    } else almacen = new AlmacenCmsArchivo(join(carpeta, 'estado.json'));
    const clave = randomBytes(18).toString('base64url');
    const hash = await hashClave(clave);
    await almacen.cambiar((s) => {
      for (const usuario of [admin, operador])
        s.usuarios.push({
          ...usuario,
          correo: `${usuario.id}@example.test`,
          hash,
          activo: true,
          debeCambiar: false,
        });
    });
    catalogo = crearAlmacenCatalogo(almacen, db);
    const guardar = (tipo, fila) =>
      catalogo.guardar(admin, () => ({ tipo, fila, accion: 'DATOS_PRUEBA' }));
    const linea = await guardar('lineas', {
      uuid: randomUUID(),
      nombre: 'Línea de prueba',
      activo: true,
      version: 1,
    });
    const especie = await guardar('especies', {
      uuid: randomUUID(),
      nombre: 'Especie de prueba',
      activo: true,
      version: 1,
    });
    await guardar('productos', {
      uuid: productoUuid,
      nombre: 'Producto de prueba',
      activo: true,
      version: 1,
      plu: String(randomInt(1, 999_999)).padStart(6, '0'),
      linea_uuid: linea.uuid,
      especie_uuid: especie.uuid,
      presentacion: 'Estándar',
    });
    servicio = crearServicioOperacion(crearAlmacenOperacion(almacen, catalogo, db), () => momento);
    const auth = await crearAutenticacion({
      almacen,
      secreto: randomBytes(32).toString('hex'),
      origenes: [origen],
    });
    const rutas = crearRutasCms({ almacen, auth, operacion: servicio });
    app = crearAplicacion({ cms: { rutas, auth, carpetaPortal: carpeta, carpetaPanel: carpeta } });
    for (const usuario of [admin, operador]) {
      const login = await peticion('post', '/auth/login')
        .send({ correo: `${usuario.id}@example.test`, clave })
        .expect(200);
      tokens.set(usuario.id, login.body.token);
    }
  });

  afterAll(async () => {
    await db?.destroy();
    if (carpeta) {
      await rm(join(carpeta, 'estado.json'), { force: true });
      await rmdir(carpeta);
    }
  });

  it('aplica lotes, ajustes y compensaciones una sola vez y conserva el conflicto', async () => {
    await peticion('get', '/sync/pull').expect(401);
    const datos = { productoUuid, fecha: '2026-10-01', motivo: 'Acta de recuento' };
    const apertura = comando('ABRIR_EXISTENCIA', admin, { ...datos, gramos: 1000 });
    const alta = comando('CREAR_LOTE', operador, {
      ...datos,
      gramos: 2000,
      caducidad: '2026-11-09',
      area: 'Prueba',
      responsable: 'Operador de prueba',
      piezas: 4,
    });
    const correccion = comando(
      'CORREGIR_LOTE',
      operador,
      { ...alta.payload, gramos: 1500, motivo: 'Recuento del lote', reversionUuid: randomUUID() },
      { agregadoId: alta.agregadoId, versionBase: 1, dependeDe: alta.operacionUuid },
    );
    const falta = comando('REGISTRAR_MERMA', operador, {
      ...datos,
      gramos: 200,
      motivo: 'Muestra',
    });
    const ajuste = comando('AJUSTAR_EXISTENCIA', admin, { ...datos, direccion: -1, gramos: 300 });
    expect((await enviar(operador, correccion))[0].estado).toBe('ESPERA');
    expect((await enviar(admin, apertura, ajuste)).map((r) => r.estado)).toEqual([
      'APLICADA',
      'APLICADA',
    ]);
    expect((await enviar(operador, alta, correccion, falta)).map((r) => r.estado)).toEqual([
      'APLICADA',
      'APLICADA',
      'APLICADA',
    ]);
    expect((await enviar(operador, correccion))[0]).toMatchObject({
      estado: 'APLICADA',
      repetida: true,
    });
    const copia = { ...correccion, operacionUuid: randomUUID() };
    expect((await enviar(operador, copia))[0].codigo).toBe('CONFLICTO_SINCRONIZACION');
    const vetada = comando('AJUSTAR_EXISTENCIA', operador, ajuste.payload);
    expect((await enviar(operador, vetada))[0].codigo).toBe('SIN_PERMISO');
    expect((await enviar(admin, vetada))[0].codigo).toBe('SIN_PERMISO');
    const { body } = await peticion('get', '/operacion/inventario?fecha=2026-10-01', admin).expect(
      200,
    );
    expect(body.existencias.find((r) => r.productoUuid === productoUuid).gramos).toBe(2000);
    expect(body.movimientos.filter((m) => m.productoUuid === productoUuid)).toHaveLength(6);
    expect(body.movimientos).toContainEqual(
      expect.objectContaining({
        tipo: 'REVERSA',
        reversaDe: alta.operacionUuid,
        direccion: -1,
        gramos: 2000,
      }),
    );
    const conflictos = (await peticion('get', '/operacion/conflictos', operador).expect(200)).body;
    expect(conflictos).toContainEqual(
      expect.objectContaining({
        uuid: copia.operacionUuid,
        servidor: expect.objectContaining({ version: 2 }),
      }),
    );
    await peticion('post', `/operacion/conflictos/${copia.operacionUuid}/resolver`, operador)
      .send({ motivo: 'Verificado' })
      .expect(403);
    await peticion('post', `/operacion/conflictos/${copia.operacionUuid}/resolver`, admin)
      .send({ motivo: 'Se mantiene el lote verificado' })
      .expect(200);
    const replica = (await peticion('get', '/sync/pull', operador).expect(200)).body;
    expect(
      replica.eventos.some(({ cambios }) =>
        cambios.some(({ registro }) => registro.uuid === alta.agregadoId),
      ),
    ).toBe(true);
    expect(replica.catalogo.productos.some(({ uuid }) => uuid === productoUuid)).toBe(true);
    const siguiente = (
      await peticion(
        'get',
        `/sync/pull?cursor=${replica.cursor}&catalogo=${replica.revisionCatalogo}`,
        operador,
      ).expect(200)
    ).body;
    expect(siguiente.eventos).toEqual([]);
    expect(siguiente.catalogo).toBeUndefined();
  });
});
