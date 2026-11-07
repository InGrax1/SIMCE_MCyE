import { randomUUID } from 'node:crypto';
import { ErrorApi } from '../errores.js';
import { auditar } from '../cms/contenido.js';
import { aceptarAviso, buscarTaller, textoInscripcion } from './reglas.js';
import { buscarConAcceso, crearAccesoPrivado, sinAccesoPrivado } from './accesoPrivado.js';

const privada = sinAccesoPrivado;

export function registrarConsulta(estado, tallerId, datos, ahora = new Date()) {
  const taller = buscarTaller(estado, tallerId);
  if (!taller.publicado) throw new ErrorApi(404, 'NO_ENCONTRADO', 'El taller no está publicado.');
  aceptarAviso(estado, datos);
  const nombre = textoInscripcion(datos.nombre, 'nombre', 160);
  const correo = textoInscripcion(datos.correo, 'correo', 160).toLowerCase();
  const mensaje = textoInscripcion(datos.mensaje, 'consulta', 1000, true);
  if (!/^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(correo))
    throw new ErrorApi(422, 'DATOS_INVALIDOS', 'Revisa el correo de contacto.');
  if (
    (estado.consultasTalleres ?? []).some(
      (c) => c.tallerId === tallerId && c.correo.trim().toLowerCase() === correo,
    )
  )
    throw new ErrorApi(
      409,
      'CONSULTA_DUPLICADA',
      'Ya existe una consulta para este correo y taller. Ábrela en «Mis consultas de talleres» o desde tu correo para continuar en el mismo folio.',
    );
  const consecutivo = (estado.consecutivoConsultaTaller ?? 0) + 1;
  if (consecutivo > 99999999)
    throw new ErrorApi(409, 'LIMITE_FOLIOS', 'Contacta al administrador.');
  estado.consecutivoConsultaTaller = consecutivo;
  const { acceso, accesoHash } = crearAccesoPrivado();
  const consulta = {
    id: randomUUID(),
    tallerId,
    tallerNombre: taller.publicado.nombre ?? taller.publicado.titulo,
    folio: `CT-${ahora.getUTCFullYear()}-${String(consecutivo).padStart(8, '0')}`,
    nombre,
    correo,
    mensaje,
    accesoHash,
    versionAviso: estado.avisoTalleres.version,
    creadoEn: ahora.toISOString(),
    avisoAceptadoEn: ahora.toISOString(),
    estado: 'pendiente',
    version: 1,
    respuestas: [],
    seguimientos: [],
  };
  (estado.consultasTalleres ??= []).push(consulta);
  auditar(estado, { id: 'visitante' }, 'REGISTRAR_CONSULTA_TALLER', consulta.id);
  return { folio: consulta.folio, acceso };
}

export function consultarRespuesta(estado, datos) {
  const consulta = buscarConAcceso(estado.consultasTalleres, datos, 'CT');
  return {
    folio: consulta.folio,
    tallerNombre: consulta.tallerNombre,
    mensaje: consulta.mensaje,
    estado: consulta.estado,
    creadoEn: consulta.creadoEn,
    respuestas: consulta.respuestas,
    seguimientos: consulta.seguimientos ?? [],
    version: consulta.version,
  };
}

export function agregarSeguimiento(estado, datos, ahora = new Date()) {
  const consulta = buscarConAcceso(estado.consultasTalleres, datos, 'CT');
  if (!Number.isInteger(datos.version) || consulta.version !== datos.version)
    throw new ErrorApi(
      409,
      'VERSION_DESACTUALIZADA',
      'La consulta cambió. Actualiza la respuesta antes de enviar.',
    );
  const texto = textoInscripcion(datos.texto, 'mensaje', 1000, true);
  (consulta.seguimientos ??= []).push({ texto, momento: ahora.toISOString() });
  consulta.estado = 'pendiente';
  consulta.version++;
  auditar(estado, { id: 'visitante' }, 'CONTINUAR_CONSULTA_TALLER', consulta.id);
  return consultarRespuesta(estado, datos);
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
