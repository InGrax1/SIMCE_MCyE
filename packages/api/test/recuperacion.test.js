import request from 'supertest';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { beforeAll, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { AlmacenCmsArchivo } from '../src/cms/almacen.js';
import { crearAutenticacion, hashClave } from '../src/cms/autenticacion.js';
import { crearRecuperacion } from '../src/cms/recuperacion.js';
import { crearRutasCms } from '../src/cms/rutas.js';
import { crearAplicacion } from '../src/app.js';

const origen = 'http://127.0.0.1:3080';
const clave = randomBytes(20).toString('hex');
let hash, carpeta, almacen, app, mensajes, enviarCorreo, tiempo;
beforeAll(async () => {
  hash = await hashClave(clave);
});
beforeEach(async () => {
  await mkdir(resolve('artifacts'), { recursive: true });
  carpeta = await mkdtemp(resolve('artifacts/recuperacion-'));
  almacen = new AlmacenCmsArchivo(join(carpeta, 'estado.json'));
  await almacen.cambiar((s) =>
    s.usuarios.push({
      id: randomUUID(),
      correo: 'persona@example.test',
      hash,
      activo: true,
      debeCambiar: true,
      rol: 'editor',
    }),
  );
  mensajes = [];
  enviarCorreo = vi.fn(async (m) => {
    mensajes.push(m);
  });
  tiempo = Date.now();
  const auth = await crearAutenticacion({
    almacen,
    secreto: randomBytes(48).toString('hex'),
    origenes: [origen],
  });
  const recuperacion = crearRecuperacion({
    almacen,
    enviarCorreo,
    origenPublico: origen,
    ahora: () => tiempo,
    limpiarCookie: auth.limpiarCookie,
  });
  const rutas = crearRutasCms({
    almacen,
    auth,
    recuperacion,
    publicador: {},
    carpetaMedios: carpeta,
  });
  app = crearAplicacion({ cms: { auth, rutas, carpetaPortal: carpeta, carpetaPanel: carpeta } });
});
afterEach(async () => {
  if (carpeta?.startsWith(resolve('artifacts/recuperacion-')))
    await rm(carpeta, { recursive: true, force: true });
});
const solicitar = (correo = 'persona@example.test') =>
  request(app).post('/api/v1/auth/recuperar').set('Origin', origen).send({ correo });
const token = () =>
  new URLSearchParams(new URL(mensajes.at(-1).texto.match(/http:\/\/[^\s]+/)[0]).hash.slice(1)).get(
    'restablecer',
  );
const restablecer = (valor, nueva = randomBytes(20).toString('hex')) =>
  request(app).post('/api/v1/auth/restablecer').set('Origin', origen).send({ token: valor, nueva });

it('responde igual a cuentas conocidas y desconocidas, sin publicar el enlace ni guardarlo en claro', async () => {
  const conocida = await solicitar().expect(202);
  const desconocida = await solicitar('nadie@example.test').expect(202);
  expect(desconocida.body).toEqual(conocida.body);
  expect(enviarCorreo).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(await almacen.leer())).not.toContain(token());
  expect(JSON.stringify((await request(app).get('/api/v1/publico/contenido')).body)).not.toContain(
    'persona@example.test',
  );
  expect(mensajes[0].texto).toContain(`${origen}/panel/#restablecer=`);
});
it('acepta un único uso incluso ante solicitudes concurrentes y revoca las sesiones anteriores', async () => {
  const sesion = await request(app)
    .post('/api/v1/auth/login')
    .set('Origin', origen)
    .send({ correo: 'persona@example.test', clave })
    .expect(200);
  await solicitar().expect(202);
  const nueva = randomBytes(20).toString('hex');
  const respuestas = await Promise.all([restablecer(token(), nueva), restablecer(token(), nueva)]);
  expect(respuestas.map((r) => r.status).sort()).toEqual([204, 422]);
  await request(app).get('/api/v1/auth/yo').auth(sesion.body.token, { type: 'bearer' }).expect(401);
  const acceso = await request(app)
    .post('/api/v1/auth/login')
    .set('Origin', origen)
    .send({ correo: 'persona@example.test', clave: nueva })
    .expect(200);
  expect(acceso.body.usuario.debeCambiar).toBe(false);
  await restablecer(token()).expect(422);
});
it('rechaza enlaces vencidos o alterados sin cambiar la contraseña', async () => {
  await solicitar().expect(202);
  tiempo += 30 * 60000;
  await restablecer(token()).expect(422);
  await restablecer(randomBytes(32).toString('base64url')).expect(422);
  expect((await almacen.leer()).usuarios[0].hash).toBe(hash);
});
it('no permite restablecer con un enlace anterior a un cambio de contraseña', async () => {
  await solicitar().expect(202);
  await almacen.cambiar((s) => {
    s.usuarios[0].hash = 'huella-distinta';
  });
  await restablecer(token()).expect(422);
});
it('exige origen autorizado y limita la repetición de solicitudes', async () => {
  await request(app)
    .post('/api/v1/auth/recuperar')
    .send({ correo: 'persona@example.test' })
    .expect(403);
  for (let i = 0; i < 3; i++) await solicitar().expect(202);
  await solicitar().expect(429);
});
it('invalida el enlace si falla la entrega y conserva una respuesta pública genérica', async () => {
  enviarCorreo.mockImplementation(async (m) => {
    mensajes.push(m);
    throw new Error('Fallo sintético');
  });
  const fallida = await solicitar().expect(202);
  const inexistente = await solicitar('nadie@example.test').expect(202);
  expect(fallida.body).toEqual(inexistente.body);
  await restablecer(token()).expect(422);
});
