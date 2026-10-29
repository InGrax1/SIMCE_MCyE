import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import knex from 'knex';
import { ejecutarClienteMysql } from './lib/mysql-cliente.mjs';
import { cifrarRespaldo, abrirRespaldo, sha256 } from './lib/respaldo.mjs';
import { AlmacenCmsMysql } from '../packages/api/src/cms/almacen.js';
import { auditar } from '../packages/api/src/cms/contenido.js';

export function conectarBase(base, entorno = process.env) {
  return knex({
    client: 'mysql2',
    connection: {
      host: entorno.DATABASE_HOST ?? '127.0.0.1',
      port: Number(entorno.DATABASE_PORT ?? 3306),
      user: entorno.DATABASE_USER,
      password: entorno.DATABASE_PASSWORD,
      database: base,
    },
    migrations: { directory: resolve(import.meta.dirname, '../packages/api/migraciones') },
  });
}
export async function crearRespaldoMysql({
  db,
  base,
  carpetaMedios,
  archivo,
  clave,
  entorno = process.env,
}) {
  const almacen = new AlmacenCmsMysql(db);
  const estado = await almacen.leer();
  const sql = await ejecutarClienteMysql('mysqldump', base, undefined, entorno);
  if (JSON.stringify(estado) !== JSON.stringify(await almacen.leer()))
    throw new Error(
      'El gestor cambió durante el respaldo. Reintenta en una ventana sin ediciones.',
    );
  const medios = [];
  for (const imagen of estado.medios) {
    const nombre = imagen.ruta.replace(/^\/medios\//, '');
    if (!/^[a-f0-9-]{36}\.webp$/.test(nombre)) throw new Error('Referencia de imagen no válida.');
    const datos = await readFile(join(carpetaMedios, nombre));
    medios.push({ nombre, sha256: sha256(datos), contenido: datos.toString('base64') });
  }
  const paquete = cifrarRespaldo(
    { sql, medios, baseOrigen: base, revision: estado.revisionPortal, versionApp: '0.2.0' },
    clave,
  );
  await mkdir(dirname(archivo), { recursive: true });
  await writeFile(archivo, paquete, { flag: 'wx', mode: 0o600 });
  return { medios: medios.length, sha256: sha256(paquete), revision: estado.revisionPortal };
}
export async function restaurarPruebaMysql({
  db,
  base,
  carpetaMedios,
  archivo,
  clave,
  entorno = process.env,
}) {
  const paquete = abrirRespaldo(await readFile(archivo), clave);
  if (!/^[a-zA-Z0-9_]+_test$/.test(base) || base === paquete.baseOrigen)
    throw new Error('La restauración requiere una base de prueba diferente, terminada en _test.');
  if ((await db.raw('SHOW TABLES'))[0].length)
    throw new Error('La base de restauración debe estar vacía.');
  await mkdir(carpetaMedios, { recursive: true });
  if ((await readdir(carpetaMedios)).length)
    throw new Error('La carpeta de restauración de medios debe estar vacía.');
  // Se verifica todo el paquete antes de ejecutar SQL o escribir imágenes.
  await ejecutarClienteMysql('mysql', base, paquete.sql, entorno);
  for (const medio of paquete.medios)
    await writeFile(join(carpetaMedios, medio.nombre), Buffer.from(medio.contenido, 'base64'), {
      flag: 'wx',
      mode: 0o600,
    });
  const almacen = new AlmacenCmsMysql(db);
  const estado = await almacen.leer();
  for (const imagen of estado.medios) {
    const nombre = imagen.ruta.replace(/^\/medios\//, '');
    const copia = paquete.medios.find((m) => m.nombre === nombre);
    if (!copia || sha256(await readFile(join(carpetaMedios, nombre))) !== copia.sha256)
      throw new Error('La base y sus imágenes restauradas no coinciden.');
  }
  await almacen.cambiar((s) => {
    for (const sesion of s.sesiones) sesion.revocado = true;
    for (const enlace of s.recuperaciones ?? []) enlace.usado = true;
    s.revisionHtml = -1;
    auditar(s, { id: 'sistema' }, 'RESTAURAR_RESPALDO_PRUEBA', paquete.creadoEn);
  });
  return { medios: paquete.medios.length, revision: paquete.revision };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const [accion, ruta, carpeta] = process.argv.slice(2);
  if (
    !['crear', 'restaurar-prueba'].includes(accion) ||
    !ruta ||
    !carpeta ||
    !/^[a-f0-9]{64}$/i.test(process.env.RESPALDO_CLAVE ?? '')
  )
    throw new Error(
      'Uso: respaldo-mysql.mjs crear|restaurar-prueba archivo carpeta-medios; configura DATABASE_* y RESPALDO_CLAVE (64 dígitos hexadecimales).',
    );
  const base = process.env.DATABASE_NAME;
  const db = conectarBase(base);
  try {
    const opciones = {
      db,
      base,
      archivo: resolve(ruta),
      carpetaMedios: resolve(carpeta),
      clave: Buffer.from(process.env.RESPALDO_CLAVE, 'hex'),
    };
    const resultado =
      accion === 'crear'
        ? await crearRespaldoMysql(opciones)
        : await restaurarPruebaMysql(opciones);
    console.log(JSON.stringify({ accion, ...resultado }));
  } finally {
    await db.destroy();
  }
}
