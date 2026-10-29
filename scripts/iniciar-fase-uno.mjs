import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { AlmacenCmsArchivo } from '../packages/api/src/cms/almacen.js';
import { hashClave } from '../packages/api/src/cms/autenticacion.js';

const raiz = resolve(import.meta.dirname, '..');
const carpeta = resolve(raiz, '.local/cms');
await mkdir(carpeta, { recursive: true });
const archivoConfiguracion = resolve(carpeta, 'desarrollo.json');
let configuracion;
try {
  configuracion = JSON.parse(await readFile(archivoConfiguracion, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  configuracion = { secreto: randomBytes(48).toString('hex') };
  await writeFile(archivoConfiguracion, JSON.stringify(configuracion), { mode: 0o600 });
}
const almacen = new AlmacenCmsArchivo(resolve(carpeta, 'estado.json'));
if (!(await almacen.leer()).usuarios.length) {
  const cuenta = {
    correo: 'admin.local@example.test',
    clave: randomBytes(18).toString('base64url'),
  };
  const hash = await hashClave(cuenta.clave);
  await almacen.cambiar((estado) => {
    estado.usuarios.push({
      id: randomUUID(),
      correo: cuenta.correo,
      rol: 'admin',
      hash,
      activo: true,
      debeCambiar: true,
    });
  });
  await writeFile(resolve(carpeta, 'acceso-inicial.json'), JSON.stringify(cuenta, null, 2), {
    mode: 0o600,
  });
}
const puerto = process.env.PORT ?? '3080';
console.log(`Portal: http://127.0.0.1:${puerto}/ · Gestor: http://127.0.0.1:${puerto}/panel/`);
console.log(
  'La cuenta de prueba local está en .local/cms/acceso-inicial.json. No es una cuenta institucional.',
);
const proceso = spawn(process.execPath, ['packages/api/src/servidor.js'], {
  cwd: raiz,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development',
    STORAGE: 'file',
    HOST: '127.0.0.1',
    PORT: puerto,
    CMS_DIR: carpeta,
    CORREO_MODO: 'archivo',
    PANEL_ORIGEN_PUBLICO: `http://127.0.0.1:${puerto}`,
    JWT_SECRET: configuracion.secreto,
    CMS_ORIGENES: `http://127.0.0.1:${puerto},http://localhost:${puerto}`,
  },
});
process.once('SIGINT', () => proceso.kill());
process.once('SIGTERM', () => proceso.kill());
proceso.on('exit', (codigo) => {
  process.exitCode = codigo ?? 1;
});
