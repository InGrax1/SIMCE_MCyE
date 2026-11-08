import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { mkdtemp, rm, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { calcularDigitoControlEan13 } from '@simce/dominio';
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
  const destinoUuid = randomUUID();
  const precioUuid = randomUUID();
  const precioNuevoUuid = randomUUID();
  const plu = String(randomInt(1, 999_999)).padStart(6, '0');
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
      plu,
      linea_uuid: linea.uuid,
      especie_uuid: especie.uuid,
      presentacion: 'Estándar',
    });
    await guardar('destinos', {
      uuid: destinoUuid,
      nombre: 'Destino de prueba',
      activo: true,
      version: 1,
    });
    for (const [uuid, precio_kg_centavos, vigente_desde] of [
      [precioUuid, 18500, '2025-01-01'],
      [precioNuevoUuid, 20000, '2026-01-01'],
    ])
      await guardar('precios', {
        uuid,
        producto_uuid: productoUuid,
        precio_kg_centavos,
        vigente_desde,
        revision_documentos: false,
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

  it('valida etiquetas, congela precios y conserva PDF, folio y reversiones al reenviar', async () => {
    const crear = comando('CREAR_REMISION', operador, {
      fecha: '2025-12-31',
      destinoUuid,
      folioPapel: 'P-20',
    });
    const codigo = (importe) => {
      const cuerpo = `2${plu}${importe}`;
      return cuerpo + calcularDigitoControlEan13(cuerpo);
    };
    const agregar = (versionBase, importe, precio) =>
      comando(
        'AGREGAR_RENGLON',
        operador,
        {
          origen: 'ESCANEO',
          codigo: codigo(importe),
          precioUuid: precio,
          fuentePrecio: 'Registro de etiquetado',
          renglonUuid: randomUUID(),
          partidaUuid: randomUUID(),
        },
        { agregadoId: crear.agregadoId, versionBase },
      );
    const uno = agregar(1, '08695', precioUuid);
    const dos = agregar(2, '08700', precioNuevoUuid);
    const cerrar = comando(
      'CERRAR_REMISION',
      operador,
      { documentoUuid: randomUUID() },
      { agregadoId: crear.agregadoId, versionBase: 3 },
    );
    const etiqueta = await peticion('post', '/escaneos/decodificar', operador)
      .send(uno.payload)
      .expect(200);
    expect(etiqueta.body).toMatchObject({ gramos: 470, centavos: 8695, precioUuid });
    await peticion('post', '/escaneos/decodificar', operador)
      .send({ ...uno.payload, precioUuid: undefined })
      .expect(422);
    const respuestas = await enviar(operador, crear, uno, dos, cerrar);
    expect(respuestas.map((r) => r.estado)).toEqual([
      'APLICADA',
      'APLICADA',
      'APLICADA',
      'APLICADA',
    ]);
    const cierre = respuestas.at(-1);
    const remision = cierre.cambios.find((c) => c.tipo === 'remisiones').registro;
    expect(remision.folioFinal).toMatch(/^REM-2025-\d{6,}$/);
    expect(remision.renglones.map((r) => [r.gramos, r.centavos, r.precioUuid])).toEqual([
      [470, 8695, precioUuid],
      [435, 8700, precioNuevoUuid],
    ]);
    expect((await enviar(operador, cerrar))[0]).toEqual({ ...cierre, repetida: true });
    expect(
      (
        await enviar(
          operador,
          comando('EDITAR_REMISION', operador, crear.payload, {
            agregadoId: crear.agregadoId,
            versionBase: 4,
          }),
        )
      )[0].codigo,
    ).toBe('REMISION_CERRADA');
    const { body: filtradas } = await peticion(
      'get',
      `/remisiones?desde=2025-12-31&destino=${destinoUuid}&estado=CERRADA`,
      operador,
    ).expect(200);
    expect(filtradas.map((r) => r.uuid)).toContain(crear.agregadoId);
    const descargar = (uuid) =>
      peticion('get', `/operacion/documentos/${uuid}/pdf`, operador)
        .buffer(true)
        .parse((res, listo) => {
          const partes = [];
          res.on('data', (parte) => partes.push(parte));
          res.on('end', () => listo(null, Buffer.concat(partes)));
        })
        .expect(200)
        .expect('Content-Type', /application\/pdf/);
    const pdf = await descargar(remision.definitivoUuid);
    expect(pdf.body.subarray(0, 4).toString()).toBe('%PDF');
    const provisional = cierre.cambios.find(
      (c) => c.tipo === 'documentos' && c.registro.tipo === 'PROVISIONAL',
    ).registro;
    expect(provisional.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect((await descargar(provisional.uuid)).body.equals(pdf.body)).toBe(false);
    const cancelar = comando(
      'CANCELAR_REMISION',
      admin,
      { motivo: 'Devolución completa', reversiones: [randomUUID(), randomUUID()] },
      { agregadoId: crear.agregadoId, versionBase: 4 },
    );
    const cancelada = (await enviar(admin, cancelar))[0];
    expect(cancelada.cambios[0].registro).toMatchObject({
      estado: 'CANCELADA',
      folioFinal: remision.folioFinal,
    });
    expect((await enviar(admin, cancelar))[0]).toEqual({ ...cancelada, repetida: true });
    expect((await descargar(remision.definitivoUuid)).body.equals(pdf.body)).toBe(true);
    const movimientos = (await servicio.datos()).movimientos.filter(
      (m) => m.remisionUuid === crear.agregadoId,
    );
    expect(movimientos.map((m) => m.direccion).sort()).toEqual([-1, -1, 1, 1]);
    await peticion('get', '/reportes/salidas?hasta=2025-12-31', operador).expect(403);
    const salidas = (
      await peticion('get', '/reportes/salidas?hasta=2025-12-31&agrupar=destino', admin).expect(200)
    ).body;
    expect(salidas.filas).toContainEqual(['Destino de prueba', '0.905', '173.95', 2, 0]);
    const csv = await peticion(
      'get',
      '/reportes/canceladas?desde=2026-11-01&hasta=2026-11-30&formato=csv',
      admin,
    ).expect(200);
    expect(csv.text).toContain(remision.folioFinal);
    expect(csv.text).toContain('Devolución completa');
    await peticion('get', '/reportes/existencias?hasta=2025-12-31&formato=pdf', admin)
      .expect(200)
      .expect('Content-Type', /application\/pdf/);
    await almacen.cambiar((s) => {
      s.usuarios.find((u) => u.id === operador.id).rol = 'editor';
    });
    const merma = comando('REGISTRAR_MERMA', operador, {
      productoUuid,
      fecha: '2026-11-07',
      motivo: 'Prueba de revocación',
      gramos: 100,
    });
    await peticion('post', '/sync/push', operador)
      .send({ operaciones: [merma] })
      .expect(403);
    expect((await servicio.datos()).movimientos.some((m) => m.uuid === merma.agregadoId)).toBe(
      false,
    );
  });
});
