import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm, readFile, access } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import mysql from 'mysql2/promise';
import { tmpdir } from 'node:os';

const raiz = resolve(import.meta.dirname, '..');
const ejecutable =
  process.env.MYSQLD_BIN ??
  (process.platform === 'win32'
    ? 'C:/Program Files/MySQL/MySQL Server 8.0/bin/mysqld.exe'
    : '/usr/sbin/mysqld');
await access(ejecutable);
const base = resolve(tmpdir());
const temporal = await mkdtemp(join(base, 'simce-mysql-'));
const sonda = createServer();
await new Promise((ok, no) => {
  sonda.once('error', no);
  sonda.listen(0, '127.0.0.1', ok);
});
const puerto = sonda.address().port;
await new Promise((ok) => sonda.close(ok));
const clave = randomBytes(32).toString('hex');
const datos = join(temporal, 'datos');
const inicio = join(temporal, 'inicio.sql');
const registro = createWriteStream(join(temporal, 'motor.log'), { flags: 'a', mode: 0o600 });
let motor;
let version;
const opciones = {
  host: '127.0.0.1',
  port: puerto,
  user: 'simce_pruebas',
  password: clave,
  database: 'simce_test',
  connectTimeout: 1000,
};
async function ejecutar(binario, args, cwd = raiz, env = process.env) {
  await new Promise((ok, no) => {
    const hijo = spawn(binario, args, { cwd, env, stdio: 'inherit', windowsHide: true });
    hijo.once('error', no);
    hijo.once('exit', (codigo) =>
      codigo === 0 ? ok() : no(new Error(`La comprobación terminó con código ${codigo}.`)),
    );
  });
}
try {
  console.log(
    'Inicializando una instancia MySQL temporal, independiente de los servicios instalados.',
  );
  await new Promise((ok, no) => {
    const hijo = spawn(
      ejecutable,
      [
        '--no-defaults',
        '--initialize-insecure',
        `--basedir=${dirname(dirname(ejecutable))}`,
        `--datadir=${datos}`,
      ],
      { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    hijo.stdout.pipe(registro, { end: false });
    hijo.stderr.pipe(registro, { end: false });
    hijo.once('error', no);
    hijo.once('exit', (codigo) =>
      codigo === 0 ? ok() : no(new Error(`No se pudo inicializar MySQL (${codigo}).`)),
    );
  });
  await writeFile(
    inicio,
    [
      `ALTER USER 'root'@'localhost' IDENTIFIED BY '${clave}';`,
      'CREATE DATABASE simce_test CHARACTER SET utf8mb4;',
      'CREATE DATABASE simce_restauracion_test CHARACTER SET utf8mb4;',
      `CREATE USER 'simce_pruebas'@'127.0.0.1' IDENTIFIED BY '${clave}';`,
      "GRANT ALL ON simce_test.* TO 'simce_pruebas'@'127.0.0.1';",
      "GRANT ALL ON simce_restauracion_test.* TO 'simce_pruebas'@'127.0.0.1';",
      "GRANT SHUTDOWN ON *.* TO 'simce_pruebas'@'127.0.0.1';",
    ].join('\n'),
    { mode: 0o600, flag: 'wx' },
  );
  motor = spawn(
    ejecutable,
    [
      '--no-defaults',
      `--basedir=${dirname(dirname(ejecutable))}`,
      `--datadir=${datos}`,
      '--bind-address=127.0.0.1',
      `--port=${puerto}`,
      '--mysqlx=OFF',
      '--skip-name-resolve',
      `--init-file=${inicio}`,
      '--console',
    ],
    { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  motor.stdout.pipe(registro, { end: false });
  motor.stderr.pipe(registro, { end: false });
  let falloArranque;
  motor.once('error', (e) => {
    falloArranque = e;
  });
  for (let intento = 0; intento < 120; intento++) {
    if (falloArranque || motor.exitCode !== null)
      throw falloArranque ?? new Error('El motor terminó durante el arranque.');
    let conexion;
    try {
      conexion = await mysql.createConnection(opciones);
      const [filas] = await conexion.query('SELECT VERSION() AS version');
      version = filas[0].version;
      break;
    } catch {
      await new Promise((ok) => setTimeout(ok, 500));
    } finally {
      await conexion?.end();
    }
  }
  if (!version) throw new Error('MySQL no estuvo disponible dentro del límite de arranque.');
  await rm(inicio);
  console.log(
    `MySQL ${version} disponible solo en loopback. Ejecutando las pruebas de integración.`,
  );
  const env = {
    ...process.env,
    NODE_ENV: 'test',
    TEST_MYSQL: '1',
    DATABASE_HOST: '127.0.0.1',
    DATABASE_PORT: String(puerto),
    DATABASE_NAME: 'simce_test',
    DATABASE_USER: opciones.user,
    DATABASE_PASSWORD: clave,
    RESTORE_DATABASE_NAME: 'simce_restauracion_test',
    MYSQL_BIN_DIR:
      process.env.MYSQL_BIN_DIR ??
      (process.platform === 'win32' ? dirname(ejecutable) : '/usr/bin'),
  };
  await ejecutar(
    process.execPath,
    [
      resolve(raiz, 'node_modules/vitest/vitest.mjs'),
      'run',
      'test/mysql.test.js',
      'test/cmsMysql.test.js',
      'test/catalogo.test.js',
      '--no-file-parallelism',
    ],
    resolve(raiz, 'packages/api'),
    env,
  );
  if (!process.argv.includes('--solo-integracion'))
    await ejecutar(process.execPath, ['scripts/verificar-respaldo-local.mjs'], raiz, env);
  const evidencias = resolve(raiz, 'artifacts/fase-1');
  await mkdir(evidencias, { recursive: true });
  await writeFile(
    join(evidencias, 'mysql-local.json'),
    JSON.stringify(
      {
        version,
        instancia: 'Temporal aislada en loopback',
        integracion: 'Aprobada',
        respaldo: process.argv.includes('--solo-integracion') ? 'No ejecutado' : 'Aprobado',
        fecha: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
} catch (error) {
  const log = await readFile(join(temporal, 'motor.log'), 'utf8').catch(() => '');
  console.error(log.replaceAll(clave, '[secreto local]').split('\n').slice(-12).join('\n'));
  throw error;
} finally {
  if (motor && motor.exitCode === null) {
    const fin = new Promise((ok) => motor.once('exit', ok));
    let detenido = false;
    if (version) {
      let conexion;
      try {
        conexion = await mysql.createConnection(opciones);
        await conexion.query('SHUTDOWN');
        detenido = true;
      } catch {
        /* El cierre del servidor también puede cerrar la conexión. */
      } finally {
        await conexion?.end().catch(() => {});
      }
    }
    if (!detenido && motor.exitCode === null) {
      if (process.platform === 'win32')
        await new Promise((ok) => {
          const cierre = spawn('taskkill.exe', ['/PID', String(motor.pid), '/T', '/F'], {
            windowsHide: true,
            stdio: 'ignore',
          });
          cierre.once('error', ok);
          cierre.once('exit', ok);
        });
      else motor.kill();
    }
    await fin;
  }
  await new Promise((ok) => registro.end(ok));
  if (dirname(temporal) === base && temporal.startsWith(join(base, 'simce-mysql-')))
    await rm(temporal, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}
