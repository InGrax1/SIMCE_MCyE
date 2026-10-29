import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { hashClave } from './autenticacion.js';
import { auditar } from './contenido.js';
import { ErrorApi } from '../errores.js';

const huella = (valor) => createHash('sha256').update(valor).digest('hex');
const mensaje =
  'Si el correo corresponde a una cuenta activa, recibirás un enlace para restablecer tu contraseña.';
const enlaceInvalido = () =>
  new ErrorApi(422, 'ENLACE_INVALIDO', 'El enlace no es válido o ya venció. Solicita uno nuevo.');

export function crearRecuperacion({
  almacen,
  enviarCorreo,
  origenPublico,
  produccion = false,
  ahora = Date.now,
  limpiarCookie = () => {},
}) {
  const origen = new URL(origenPublico);
  if (
    origen.origin !== origenPublico ||
    (origen.protocol !== 'https:' &&
      (produccion ||
        origen.protocol !== 'http:' ||
        !['localhost', '127.0.0.1', '[::1]'].includes(origen.hostname)))
  )
    throw new Error(
      'Configura el origen público HTTPS del panel, o un origen de desarrollo en loopback.',
    );
  const tasas = new Map();
  function limitar(clave, maximo, duracion) {
    for (const [id, cuota] of tasas) if (cuota.hasta <= ahora()) tasas.delete(id);
    const cuota = tasas.get(clave) ?? { total: 0, hasta: ahora() + duracion };
    if (cuota.total >= maximo || tasas.size > 10000)
      throw new ErrorApi(429, 'LIMITE_TASA', 'Espera unos minutos antes de volver a intentarlo.');
    cuota.total++;
    tasas.set(clave, cuota);
  }
  async function solicitar(req, res) {
    if (!enviarCorreo)
      throw new ErrorApi(
        503,
        'CORREO_PENDIENTE',
        'La recuperación por correo aún no está disponible. Contacta al administrador.',
      );
    limitar(`solicitar:${req.ip}`, 5, 15 * 60000);
    const correo =
      typeof req.body?.correo === 'string'
        ? req.body.correo.trim().toLowerCase().slice(0, 161)
        : '';
    limitar(`cuenta:${huella(correo)}`, 3, 3600000);
    const token = randomBytes(32).toString('base64url');
    const id = randomUUID();
    const destinatario = await almacen.cambiar((s) => {
      s.recuperaciones = (s.recuperaciones ?? []).filter((r) => r.vence > ahora() && !r.usado);
      const usuario =
        correo.length <= 160 &&
        /^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(correo) &&
        s.usuarios.find((u) => u.activo && u.correo === correo);
      if (!usuario) return null;
      for (const r of s.recuperaciones.filter((r) => r.usuarioId === usuario.id)) r.usado = true;
      s.recuperaciones.push({
        id,
        usuarioId: usuario.id,
        hash: huella(token),
        claveAlEmitir: huella(usuario.hash),
        vence: ahora() + 30 * 60000,
        usado: false,
      });
      auditar(s, usuario, 'SOLICITAR_RECUPERACION', id);
      return usuario.correo;
    });
    if (destinatario) {
      const url = new URL('/panel/', origen);
      url.hash = `restablecer=${token}`;
      try {
        await enviarCorreo({
          para: destinatario,
          asunto: 'Restablece tu contraseña de SIMCE',
          texto: `Se solicitó restablecer tu contraseña de SIMCE.\n\nAbre este enlace de un solo uso, válido durante 30 minutos:\n${url.href}\n\nSi no lo solicitaste, puedes ignorar este mensaje. Tu contraseña no ha cambiado.`,
        });
      } catch {
        await almacen.cambiar((s) => {
          const registro = s.recuperaciones.find((r) => r.id === id);
          if (registro) registro.usado = true;
          auditar(s, { id: 'sistema' }, 'FALLO_CORREO_RECUPERACION', id);
        });
      }
    }
    res.status(202).json({ mensaje });
  }
  async function restablecer(req, res) {
    limitar(`restablecer:${req.ip}`, 10, 15 * 60000);
    const token = req.body?.token;
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw enlaceInvalido();
    const hashToken = huella(token);
    function buscar(s) {
      const registro = (s.recuperaciones ?? []).find((r) => r.hash === hashToken);
      const usuario = s.usuarios.find((u) => u.id === registro?.usuarioId && u.activo);
      if (
        !registro ||
        registro.usado ||
        registro.vence <= ahora() ||
        !usuario ||
        registro.claveAlEmitir !== huella(usuario.hash)
      )
        throw enlaceInvalido();
      return { registro, usuario };
    }
    buscar(await almacen.leer());
    const hash = await hashClave(req.body?.nueva);
    await almacen.cambiar((s) => {
      const { registro, usuario } = buscar(s);
      usuario.hash = hash;
      usuario.debeCambiar = false;
      for (const r of s.recuperaciones.filter((r) => r.usuarioId === usuario.id)) r.usado = true;
      for (const sesion of s.sesiones.filter((r) => r.usuarioId === usuario.id))
        sesion.revocado = true;
      auditar(s, usuario, 'RESTABLECER_CLAVE', registro.id);
    });
    limpiarCookie(res);
    res.sendStatus(204);
  }
  return { solicitar, restablecer };
}
