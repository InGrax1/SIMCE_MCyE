import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, cp, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { conectarBase, crearRespaldoMysql, restaurarPruebaMysql } from './respaldo-mysql.mjs';
import { AlmacenCmsMysql } from '../packages/api/src/cms/almacen.js';
import { proyectarPortal } from '../packages/api/src/cms/contenido.js';
import { crearPublicador } from '../packages/api/src/cms/publicacion.js';
import { crearAutenticacion, hashClave } from '../packages/api/src/cms/autenticacion.js';
import { crearRutasCms } from '../packages/api/src/cms/rutas.js';
import { crearAplicacion } from '../packages/api/src/app.js';
import { sha256 } from './lib/respaldo.mjs';

const raiz = resolve(import.meta.dirname, '..');
const base = process.env.DATABASE_NAME;
const destino = process.env.RESTORE_DATABASE_NAME;
if (
  process.env.TEST_MYSQL !== '1' ||
  !base?.endsWith('_test') ||
  !destino?.endsWith('_test') ||
  base === destino
)
  throw new Error('Esta comprobación solo admite dos bases de prueba distintas y TEST_MYSQL=1.');
const carpeta = await mkdtemp(join(tmpdir(), 'simce-respaldo-'));
const db = conectarBase(base);
const dbDestino = conectarBase(destino);
const clave = randomBytes(32);
const id = randomUUID();
const nombre = `${id}.webp`;
const medios = join(carpeta, 'origen-medios');
const mediosRestaurados = join(carpeta, 'restauracion-medios');
const imagen = await sharp({
  create: { width: 128, height: 96, channels: 3, background: '#84271f' },
})
  .webp()
  .toBuffer();
const reporte = { pasos: [] };
let servicio;
async function iniciar(almacen, portal, carpetaMedios) {
  const publicador = crearPublicador({
    almacen,
    carpetaPortal: portal,
    carpetaMedios,
    moduloSsr: join(raiz, 'packages/portal/dist-ssr/entry-server.js'),
  });
  await publicador.publicar();
  const auth = await crearAutenticacion({
    almacen,
    secreto: randomBytes(48).toString('hex'),
    origenes: ['http://127.0.0.1'],
  });
  const rutas = crearRutasCms({ almacen, auth, publicador, carpetaMedios });
  const servidor = crearAplicacion({
    cms: { auth, rutas, carpetaPortal: portal, carpetaPanel: join(raiz, 'packages/panel/dist') },
  }).listen(0, '127.0.0.1');
  await new Promise((ok, no) => {
    servidor.once('listening', ok);
    servidor.once('error', no);
  });
  return { servidor, url: `http://127.0.0.1:${servidor.address().port}` };
}
async function cerrar() {
  if (servicio) {
    await new Promise((ok) => servicio.servidor.close(ok));
    servicio = null;
  }
}
try {
  await db.migrate.latest();
  const almacen = new AlmacenCmsMysql(db);
  await almacen.iniciar();
  await mkdir(medios);
  await writeFile(join(medios, nombre), imagen);
  const hash = await hashClave(randomBytes(20).toString('hex'));
  await almacen.cambiar((s) => {
    const usuarioId = randomUUID();
    s.usuarios.push({
      id: usuarioId,
      correo: 'respaldo@example.test',
      hash,
      activo: true,
      debeCambiar: false,
      rol: 'responsable',
    });
    s.medios.push({
      id,
      ruta: `/medios/${nombre}`,
      alt: 'Imagen sintética de restauración',
      ancho: 128,
      alto: 96,
    });
    const datos = {
      nombre: 'Prueba local de restauración',
      foto: `/medios/${nombre}`,
      alt: 'Imagen sintética de restauración',
      areaId: s.entradas.find((e) => e.tipo === 'area').id,
    };
    s.entradas.push({
      id: randomUUID(),
      tipo: 'galeria',
      borrador: datos,
      publicado: structuredClone(datos),
      orden: 99,
      version: 1,
      historial: [],
    });
    s.sesiones.push({
      usuarioId,
      hash: 'sesion-sintetica',
      familia: randomUUID(),
      vence: Date.now() + 60000,
      revocado: false,
    });
    s.recuperaciones.push({
      usuarioId,
      hash: 'enlace-sintetico',
      vence: Date.now() + 60000,
      usado: false,
    });
    s.revisionPortal++;
  });
  const portalOrigen = join(carpeta, 'portal-origen');
  const portalDestino = join(carpeta, 'portal-restaurado');
  await cp(join(raiz, 'packages/portal/dist'), portalOrigen, { recursive: true });
  await cp(join(raiz, 'packages/portal/dist'), portalDestino, { recursive: true });
  servicio = await iniciar(almacen, portalOrigen, medios);
  const htmlOriginal = await (await fetch(servicio.url)).text();
  assert.ok(htmlOriginal.includes('Prueba local de restauración'));
  await cerrar();
  servicio = await iniciar(new AlmacenCmsMysql(db), portalOrigen, medios);
  assert.equal(await (await fetch(servicio.url)).text(), htmlOriginal);
  await cerrar();
  reporte.pasos.push('Contenido e imagen conservados al reiniciar la API con MySQL');
  const publico = proyectarPortal(await almacen.leer());
  const remisiones = await db('remisiones').select('remision_uuid', 'folio_final');
  const archivo = join(carpeta, 'copia.simcebk');
  const manifiesto = await crearRespaldoMysql({ db, base, carpetaMedios: medios, archivo, clave });
  assert.ok(!(await readFile(archivo)).includes(Buffer.from('respaldo@example.test')));
  await restaurarPruebaMysql({
    db: dbDestino,
    base: destino,
    carpetaMedios: mediosRestaurados,
    archivo,
    clave,
  });
  const recuperado = await new AlmacenCmsMysql(dbDestino).leer();
  assert.deepEqual(proyectarPortal(recuperado), publico);
  assert.deepEqual(
    await dbDestino('remisiones').select('remision_uuid', 'folio_final'),
    remisiones,
  );
  assert.equal(sha256(await readFile(join(mediosRestaurados, nombre))), sha256(imagen));
  assert.ok(recuperado.sesiones.every((s) => s.revocado));
  assert.ok(recuperado.recuperaciones.every((s) => s.usado));
  reporte.pasos.push(
    'Volcado consistente de toda la base y manifiesto de imágenes',
    'Respaldo cifrado con AES-256-GCM',
    'Restauración en otra base y carpeta vacías',
    'Folios, contenido e imágenes conciliados; sesiones y enlaces anteriores invalidados',
  );
  servicio = await iniciar(new AlmacenCmsMysql(dbDestino), portalDestino, mediosRestaurados);
  assert.equal(await (await fetch(servicio.url)).text(), htmlOriginal);
  const respuestaImagen = await fetch(`${servicio.url}/medios/${nombre}`);
  assert.equal(respuestaImagen.status, 200);
  assert.equal(sha256(Buffer.from(await respuestaImagen.arrayBuffer())), sha256(imagen));
  reporte.pasos.push('HTML regenerado y medio servido después de restaurar');
  const evidencias = join(raiz, 'artifacts/fase-1');
  await mkdir(evidencias, { recursive: true });
  await writeFile(
    join(evidencias, 'respaldo-local.json'),
    JSON.stringify(
      {
        ...reporte,
        medios: manifiesto.medios,
        sha256: manifiesto.sha256,
        fecha: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(reporte));
} finally {
  await cerrar();
  await db.destroy();
  await dbDestino.destroy();
  if (
    dirname(carpeta) === resolve(tmpdir()) &&
    carpeta.startsWith(join(resolve(tmpdir()), 'simce-respaldo-'))
  )
    await rm(carpeta, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}
