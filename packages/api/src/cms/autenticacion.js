import { createHash, randomBytes, randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import { SignJWT, jwtVerify } from 'jose';
import { ErrorApi } from '../errores.js';
import { auditar } from './contenido.js';

const huella = (valor) => createHash('sha256').update(valor).digest('hex');
export const roles = ['editor', 'operador', 'responsable', 'admin'];
export async function hashClave(clave) {
  if (
    typeof clave !== 'string' ||
    clave.length < 10 ||
    clave.length > 200 ||
    /^(password|contrase[nñ]a|1234567890|qwerty)/i.test(clave)
  )
    throw new ErrorApi(
      422,
      'CLAVE_INVALIDA',
      'Usa una contraseña de 10 a 200 caracteres que no sea común.',
    );
  return argon2.hash(clave, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });
}
const noAutenticado = () => new ErrorApi(401, 'NO_AUTENTICADO', 'Inicia sesión para continuar.');

export async function crearAutenticacion({ almacen, secreto, origenes, segura = false }) {
  if (typeof secreto !== 'string' || secreto.length < 32 || secreto.startsWith('REEMPLAZAR'))
    throw new Error('Configura JWT_SECRET con al menos 32 caracteres aleatorios.');
  const llave = new TextEncoder().encode(secreto);
  const falso = await hashClave(randomBytes(32).toString('hex'));
  const intentos = new Map();
  const cookieNombre = 'simce_refresco';
  function origen(req, _res, next) {
    if (!origenes.includes(req.get('origin')))
      return next(
        new ErrorApi(403, 'ORIGEN_NO_PERMITIDO', 'El origen de la solicitud no está autorizado.'),
      );
    next();
  }
  const leerCookie = (req) =>
    req.headers.cookie
      ?.split(';')
      .map((v) => v.trim())
      .find((v) => v.startsWith(`${cookieNombre}=`))
      ?.slice(cookieNombre.length + 1);
  function cookie(res, valor, maxAge = 30 * 86400) {
    res.setHeader(
      'Set-Cookie',
      `${cookieNombre}=${valor}; Path=/api/v1/auth; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${segura ? '; Secure' : ''}`,
    );
  }
  async function emitir(estado, usuario, familia = randomUUID()) {
    const refresco = randomBytes(32).toString('base64url');
    estado.sesiones = estado.sesiones.filter((s) => s.vence > Date.now());
    estado.sesiones.push({
      hash: huella(refresco),
      usuarioId: usuario.id,
      familia,
      vence: Date.now() + 30 * 86400_000,
      ultimaActividad: Date.now(),
      usado: false,
      revocado: false,
    });
    const token = await new SignJWT({ rol: usuario.rol, familia })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(usuario.id)
      .setIssuer('simce')
      .setAudience('simce-panel')
      .setIssuedAt()
      .setExpirationTime('30m')
      .sign(llave);
    return {
      refresco,
      token,
      usuario: {
        id: usuario.id,
        correo: usuario.correo,
        rol: usuario.rol,
        debeCambiar: usuario.debeCambiar,
      },
    };
  }
  async function identificar(req, _res, next) {
    try {
      const token = req.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
      if (!token) throw noAutenticado();
      const { payload } = await jwtVerify(token, llave, {
        algorithms: ['HS256'],
        issuer: 'simce',
        audience: 'simce-panel',
      });
      const estado = await almacen.leer();
      const usuario = estado.usuarios.find((u) => u.id === payload.sub && u.activo);
      if (
        !usuario ||
        !estado.sesiones.some(
          (s) =>
            s.familia === payload.familia &&
            !s.revocado &&
            s.vence > Date.now() &&
            Date.now() - (s.ultimaActividad ?? 0) < 8 * 3600_000,
        )
      )
        throw noAutenticado();
      const actividad =
        estado.sesiones.find((s) => s.familia === payload.familia && !s.revocado)
          ?.ultimaActividad ?? 0;
      if (Date.now() - actividad > 60_000)
        await almacen.cambiar((actual) => {
          actual.sesiones
            .filter((s) => s.familia === payload.familia && !s.revocado)
            .forEach((s) => {
              s.ultimaActividad = Date.now();
            });
        });
      req.usuario = {
        id: usuario.id,
        correo: usuario.correo,
        rol: usuario.rol,
        debeCambiar: usuario.debeCambiar,
      };
      next();
    } catch {
      next(noAutenticado());
    }
  }
  function permitir(permitidos) {
    return (req, _res, next) => {
      if (req.usuario.debeCambiar)
        return next(
          new ErrorApi(403, 'CAMBIO_REQUERIDO', 'Cambia tu contraseña inicial para continuar.'),
        );
      if (!permitidos.includes(req.usuario.rol))
        return next(
          new ErrorApi(403, 'SIN_PERMISO', 'Tu cuenta no tiene permiso para realizar esta acción.'),
        );
      next();
    };
  }
  function responder(res, resultado) {
    cookie(res, resultado.refresco);
    res.json({ token: resultado.token, usuario: resultado.usuario });
  }
  async function login(req, res) {
    req.body ??= {};
    const key = req.ip;
    const ahora = Date.now();
    for (const [k, v] of intentos) if (v.vence < ahora) intentos.delete(k);
    const intento = intentos.get(key) ?? { cantidad: 0, vence: ahora + 15 * 60_000 };
    if (intento.cantidad >= 5 || intentos.size > 10000)
      throw new ErrorApi(429, 'LIMITE_TASA', 'Espera 15 minutos antes de volver a intentarlo.');
    intento.cantidad++;
    intentos.set(key, intento);
    const correo = typeof req.body.correo === 'string' ? req.body.correo.trim().toLowerCase() : '';
    const clave =
      typeof req.body.clave === 'string' && req.body.clave.length <= 200 ? req.body.clave : '';
    const estado = await almacen.leer();
    const usuario = estado.usuarios.find((u) => u.correo === correo && u.activo);
    const coincide = await argon2.verify(usuario?.hash ?? falso, clave);
    if (!usuario || !coincide)
      throw new ErrorApi(401, 'CREDENCIALES_INVALIDAS', 'Correo o contraseña incorrectos.');
    const resultado = await almacen.cambiar(async (s) => {
      const actual = s.usuarios.find((u) => u.id === usuario.id && u.activo);
      if (!actual || actual.hash !== usuario.hash) throw noAutenticado();
      auditar(s, actual, 'INICIAR_SESION', actual.id);
      return emitir(s, actual);
    });
    intentos.delete(key);
    responder(res, resultado);
  }
  async function refrescar(req, res) {
    const valor = leerCookie(req);
    if (!valor) throw noAutenticado();
    const resultado = await almacen.cambiar(async (estado) => {
      const sesion = estado.sesiones.find((s) => s.hash === huella(valor));
      if (!sesion) return null;
      if (
        sesion.usado ||
        sesion.revocado ||
        sesion.vence < Date.now() ||
        Date.now() - (sesion.ultimaActividad ?? 0) >= 8 * 3600_000
      ) {
        estado.sesiones
          .filter((s) => s.familia === sesion.familia)
          .forEach((s) => {
            s.revocado = true;
          });
        return null;
      }
      const usuario = estado.usuarios.find((u) => u.id === sesion.usuarioId && u.activo);
      if (!usuario) return null;
      sesion.usado = true;
      return emitir(estado, usuario, sesion.familia);
    });
    if (!resultado) {
      cookie(res, '', 0);
      throw noAutenticado();
    }
    responder(res, resultado);
  }
  async function salir(req, res) {
    const valor = leerCookie(req);
    if (valor)
      await almacen.cambiar((estado) => {
        const sesion = estado.sesiones.find((s) => s.hash === huella(valor));
        if (sesion)
          estado.sesiones
            .filter((s) => s.familia === sesion.familia)
            .forEach((s) => {
              s.revocado = true;
            });
      });
    cookie(res, '', 0);
    res.sendStatus(204);
  }
  async function cambiarClave(req, res) {
    req.body ??= {};
    const usuario = (await almacen.leer()).usuarios.find((u) => u.id === req.usuario.id);
    if (
      typeof req.body.anterior !== 'string' ||
      req.body.anterior.length > 200 ||
      !(await argon2.verify(usuario.hash, req.body.anterior))
    )
      throw noAutenticado();
    const nuevoHash = await hashClave(req.body.nueva);
    if (req.body.nueva === req.body.anterior)
      throw new ErrorApi(422, 'CLAVE_INVALIDA', 'Elige una contraseña diferente.');
    const resultado = await almacen.cambiar(async (estado) => {
      const actual = estado.usuarios.find((u) => u.id === usuario.id);
      if (!actual?.activo || actual.hash !== usuario.hash) throw noAutenticado();
      actual.hash = nuevoHash;
      actual.debeCambiar = false;
      estado.sesiones
        .filter((s) => s.usuarioId === actual.id)
        .forEach((s) => {
          s.revocado = true;
        });
      auditar(estado, actual, 'CAMBIAR_CLAVE', actual.id);
      return emitir(estado, actual);
    });
    responder(res, resultado);
  }
  return { origen, identificar, permitir, login, refrescar, salir, cambiarClave };
}
