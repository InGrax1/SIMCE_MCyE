import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { ErrorApi } from '../errores.js';
import { auditar } from '../cms/contenido.js';
import { aceptarAviso, buscarTaller, textoInscripcion } from './reglas.js';

const huella = (acceso) => createHash('sha256').update(acceso).digest();
const privada = (consulta) => {
  const datos = { ...consulta };
  delete datos.accesoHash;
  return datos;
};

export function registrarConsulta(estado, tallerId, datos, ahora = new Date()) {
  const taller = buscarTaller(estado, tallerId);
  if (!taller.publicado) throw new ErrorApi(404, 'NO_ENCONTRADO', 'El taller no está publicado.');
  aceptarAviso(estado, datos);
  const nombre = textoInscripcion(datos.nombre, 'nombre', 160);
  const correo = textoInscripcion(datos.correo, 'correo', 160).toLowerCase();
  const mensaje = textoInscripcion(datos.mensaje, 'consulta', 1000, true);
  if (!/^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(correo))
    throw new ErrorApi(422, 'DATOS_INVALIDOS', 'Revisa el correo de contacto.');
  const consecutivo = (estado.consecutivoConsultaTaller ?? 0) + 1;
  if (consecutivo > 99999999)
    throw new ErrorApi(409, 'LIMITE_FOLIOS', 'Contacta al administrador.');
  estado.consecutivoConsultaTaller = consecutivo;
  const acceso = randomBytes(32).toString('base64url');
  const consulta = {
    id: randomUUID(),
    tallerId,
    tallerNombre: taller.publicado.nombre ?? taller.publicado.titulo,
    folio: `CT-${ahora.getUTCFullYear()}-${String(consecutivo).padStart(8, '0')}`,
    nombre,
    correo,
    mensaje,
    accesoHash: huella(acceso).toString('hex'),
    versionAviso: estado.avisoTalleres.version,
    creadoEn: ahora.toISOString(),
    avisoAceptadoEn: ahora.toISOString(),
    estado: 'pendiente',
    version: 1,
    respuestas: [],
  };
  (estado.consultasTalleres ??= []).push(consulta);
  auditar(estado, { id: 'visitante' }, 'REGISTRAR_CONSULTA_TALLER', consulta.id);
  return { folio: consulta.folio, acceso };
}

export function consultarRespuesta(estado, datos) {
  const noEncontrada = () =>
    new ErrorApi(
      404,
      'CONSULTA_NO_ENCONTRADA',
      'No encontramos la consulta. Revisa tu enlace privado.',
    );
  if (
    typeof datos.folio !== 'string' ||
    !/^CT-\d{4}-\d{8}$/.test(datos.folio) ||
    typeof datos.acceso !== 'string' ||
    !/^[A-Za-z0-9_-]{43}$/.test(datos.acceso)
  )
    throw noEncontrada();
  const consulta = (estado.consultasTalleres ?? []).find((c) => c.folio === datos.folio);
  const esperado = Buffer.from(consulta?.accesoHash ?? '0'.repeat(64), 'hex');
  if (!timingSafeEqual(huella(datos.acceso), esperado) || !consulta) throw noEncontrada();
  return {
    folio: consulta.folio,
    tallerNombre: consulta.tallerNombre,
    mensaje: consulta.mensaje,
    estado: consulta.estado,
    creadoEn: consulta.creadoEn,
    respuestas: consulta.respuestas,
  };
}

export function listarConsultas(estado, tallerId, usuario) {
  buscarTaller(estado, tallerId);
  auditar(estado, usuario, 'CONSULTAR_SOLICITUDES_TALLER', tallerId);
  return (estado.consultasTalleres ?? [])
    .filter((c) => c.tallerId === tallerId)
    .map(privada)
    .reverse();
}

export function responderConsulta(estado, id, datos, usuario, ahora = new Date()) {
  const consulta = (estado.consultasTalleres ?? []).find((c) => c.id === id);
  if (!consulta) throw new ErrorApi(404, 'NO_ENCONTRADO', 'No se encontró la consulta.');
  if (!Number.isInteger(datos.version) || datos.version !== consulta.version)
    throw new ErrorApi(
      409,
      'VERSION_DESACTUALIZADA',
      'La consulta cambió. Recarga antes de responder.',
    );
  const texto = textoInscripcion(datos.texto, 'respuesta', 2000, true);
  consulta.respuestas.push({ texto, momento: ahora.toISOString() });
  consulta.estado = 'respondida';
  consulta.respondidaEn = ahora.toISOString();
  consulta.version++;
  auditar(estado, usuario, 'RESPONDER_CONSULTA_TALLER', id);
  return privada(consulta);
}
