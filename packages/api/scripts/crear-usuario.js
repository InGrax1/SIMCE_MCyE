import { randomUUID } from 'node:crypto';
import { configurarCms } from '../src/cms/configuracion.js';
import { hashClave, roles } from '../src/cms/autenticacion.js';

const [correo, rol] = process.argv.slice(2);
if (!correo || !roles.includes(rol))
  throw new Error(
    'Uso: crear-usuario.js correo rol; envía la contraseña inicial por la entrada estándar.',
  );
const fragmentos = [];
for await (const parte of process.stdin) fragmentos.push(parte);
const hash = await hashClave(Buffer.concat(fragmentos).toString('utf8').trim());
const cms = await configurarCms();
try {
  await cms.almacen.cambiar((estado) => {
    if (estado.usuarios.some((u) => u.correo === correo.toLowerCase()))
      throw new Error('La cuenta ya existe; no se modificó.');
    estado.usuarios.push({
      id: randomUUID(),
      correo: correo.toLowerCase(),
      rol,
      hash,
      activo: true,
      debeCambiar: true,
    });
  });
  console.log('Cuenta creada; requiere cambio de contraseña al iniciar sesión.');
} finally {
  await cms.cerrar();
}
