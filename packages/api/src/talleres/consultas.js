import { randomUUID } from 'node:crypto';
import { ErrorApi } from '../errores.js';
import { auditar } from '../cms/contenido.js';
import { aceptarAviso, buscarTaller, textoInscripcion } from './reglas.js';
import { buscarConAcceso, crearAccesoPrivado, sinAccesoPrivado } from './accesoPrivado.js';

export const proyectarSolicitud = (consulta) => ({
  ...sinAccesoPrivado(consulta),
  seguimientoHabilitado: Boolean(consulta.accesoHash),
});
const privada = proyectarSolicitud;
const registros = (estado, tipo) =>
  tipo === 'SS' ? (estado.intereses ?? []) : (estado.consultasTalleres ?? []);
const decisiones = {
  aceptar: {
    estado: 'aceptada',
    evento: 'ACEPTAR_SOLICITUD',
    CT: 'El Módulo aceptó tu solicitud de información sobre el taller. Puedes continuar la conversación desde este folio.',
    SS: 'El Módulo aceptó dar seguimiento a tu solicitud de servicio social. La admisión al programa se confirma por separado.',
  },
  rechazar: {
    estado: 'rechazada',
    evento: 'RECHAZAR_SOLICITUD',
    CT: 'El Módulo rechazó tu solicitud de información sobre el taller. Si necesitas una aclaración, puedes escribirnos desde este folio.',
    SS: 'El Módulo rechazó tu solicitud de seguimiento de servicio social. Si necesitas una aclaración, puedes escribirnos desde este folio.',
  },
};
function versionActual(consulta, version) {
  if (!Number.isInteger(version) || consulta.version !== version)
    throw new ErrorApi(
      409,
      'VERSION_DESACTUALIZADA',
      'La solicitud cambió. Actualízala antes de continuar.',
    );
}
function exigirActiva(consulta) {
  if (consulta.estado === 'cancelada')
    throw new ErrorApi(
      409,
      'SOLICITUD_CANCELADA',
      'Esta solicitud está cancelada. El Módulo puede reabrirla para continuar.',
    );
}
function historial(consulta, accion, usuario, momento, motivo) {
  (consulta.historial ??= []).push({
    accion,
    usuarioId: usuario.id,
    momento,
    ...(motivo ? { motivo } : {}),
  });
}

export function registrarConsulta(estado, tallerId, datos, ahora = new Date()) {
  const taller = buscarTaller(estado, tallerId);
  if (!taller.publicado) throw new ErrorApi(404, 'NO_ENCONTRADO', 'El taller no está publicado.');
  aceptarAviso(estado, datos);
  const nombre = textoInscripcion(datos.nombre, 'nombre', 160);
  const correo = textoInscripcion(datos.correo, 'correo', 160).toLowerCase();
  const mensaje =
    datos.mensaje === '' || datos.mensaje === undefined
      ? ''
      : textoInscripcion(datos.mensaje, 'consulta', 1000, true);
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
      'Ya existe una consulta para este correo y taller. Continúa desde tu acceso guardado o pulsa «Consulta tu estado» en el correo de confirmación.',
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
    historial: [
      { accion: 'REGISTRAR_SOLICITUD', usuarioId: 'visitante', momento: ahora.toISOString() },
    ],
  };
  (estado.consultasTalleres ??= []).push(consulta);
  auditar(estado, { id: 'visitante' }, 'REGISTRAR_CONSULTA_TALLER', consulta.id);
  return { folio: consulta.folio, acceso };
}

export function consultarRespuesta(estado, datos, tipo = 'CT') {
  const consulta = buscarConAcceso(registros(estado, tipo), datos, tipo);
  return {
    folio: consulta.folio,
    tallerNombre: consulta.tallerNombre,
    programaNombre: consulta.programaNombre,
    mensaje: consulta.mensaje,
    estado: consulta.estado,
    creadoEn: consulta.creadoEn,
    respuestas: consulta.respuestas,
    seguimientos: consulta.seguimientos ?? [],
    version: consulta.version,
    historial: (consulta.historial ?? []).map(({ accion, momento, motivo, usuarioId }) => ({
      accion,
      momento,
      motivo,
      origen: usuarioId === 'visitante' ? 'Solicitante' : 'Personal del Módulo',
    })),
  };
}

export function agregarSeguimiento(estado, datos, ahora = new Date(), tipo = 'CT') {
  const consulta = buscarConAcceso(registros(estado, tipo), datos, tipo);
  versionActual(consulta, datos.version);
  exigirActiva(consulta);
  const texto = textoInscripcion(datos.texto, 'mensaje', 1000, true);
  (consulta.seguimientos ??= []).push({ texto, momento: ahora.toISOString() });
  consulta.estado = 'pendiente';
  consulta.version++;
  historial(consulta, 'AGREGAR_MENSAJE', { id: 'visitante' }, ahora.toISOString());
  auditar(
    estado,
    { id: 'visitante' },
    tipo === 'SS' ? 'CONTINUAR_SERVICIO_SOCIAL' : 'CONTINUAR_CONSULTA_TALLER',
    consulta.id,
  );
  return consultarRespuesta(estado, datos, tipo);
}

export function listarConsultas(estado, tallerId, usuario) {
  buscarTaller(estado, tallerId);
  auditar(estado, usuario, 'CONSULTAR_SOLICITUDES_TALLER', tallerId);
  return (estado.consultasTalleres ?? [])
    .filter((c) => c.tallerId === tallerId)
    .map(privada)
    .reverse();
}

export function responderConsulta(estado, id, datos, usuario, ahora = new Date(), tipo = 'CT') {
  const consulta = registros(estado, tipo).find((c) => c.id === id);
  if (!consulta) throw new ErrorApi(404, 'NO_ENCONTRADO', 'No se encontró la consulta.');
  versionActual(consulta, datos.version);
  exigirActiva(consulta);
  const resolucion =
    typeof datos.decision === 'string' && Object.hasOwn(decisiones, datos.decision)
      ? decisiones[datos.decision]
      : null;
  if (!resolucion && datos.decision !== undefined)
    throw new ErrorApi(422, 'DECISION_INVALIDA', 'Elige aceptar o rechazar la solicitud.');
  if (resolucion?.estado === consulta.estado)
    throw new ErrorApi(409, 'DECISION_YA_REGISTRADA', 'La solicitud ya tiene esa decisión.');
  const nota =
    resolucion && (datos.texto === undefined || datos.texto === '')
      ? ''
      : textoInscripcion(datos.texto, 'respuesta', 2000, true);
  const texto = resolucion ? [resolucion[tipo], nota].filter(Boolean).join('\n\n') : nota;
  consulta.respuestas.push({ texto, momento: ahora.toISOString() });
  consulta.estado = resolucion?.estado ?? 'respondida';
  consulta.respondidaEn = ahora.toISOString();
  consulta.version++;
  historial(consulta, resolucion?.evento ?? 'RESPONDER_SOLICITUD', usuario, ahora.toISOString());
  auditar(
    estado,
    usuario,
    tipo === 'SS' ? 'RESPONDER_SERVICIO_SOCIAL' : 'RESPONDER_CONSULTA_TALLER',
    id,
  );
  return privada(consulta);
}

export async function responderYNotificar(almacen, enviarCorreo, id, datos, usuario, tipo) {
  const resultado = await almacen.cambiar((estado) =>
    responderConsulta(estado, id, datos, usuario, new Date(), tipo),
  );
  let correo = 'no_disponible';
  if (enviarCorreo) {
    try {
      correo = await enviarCorreo({
        folio: resultado.folio,
        respuesta: resultado.respuestas.at(-1).texto,
      });
    } catch {
      correo = 'fallido';
    }
  }
  return { ...resultado, correoRespuesta: correo };
}

export function cambiarEstadoSolicitud(
  estado,
  id,
  datos,
  usuario,
  ahora = new Date(),
  tipo = 'CT',
) {
  const consulta = registros(estado, tipo).find((c) => c.id === id);
  if (!consulta) throw new ErrorApi(404, 'NO_ENCONTRADO', 'No se encontró la solicitud.');
  versionActual(consulta, datos.version);
  const motivo = textoInscripcion(datos.motivo, 'motivo', 500);
  if (datos.accion === 'cancelar' && consulta.estado !== 'cancelada') consulta.estado = 'cancelada';
  else if (datos.accion === 'reabrir' && consulta.estado === 'cancelada')
    consulta.estado = 'pendiente';
  else
    throw new ErrorApi(
      409,
      'TRANSICION_INVALIDA',
      'La acción no corresponde al estado de esta solicitud.',
    );
  consulta.version++;
  historial(
    consulta,
    datos.accion === 'cancelar' ? 'CANCELAR_SOLICITUD' : 'REABRIR_SOLICITUD',
    usuario,
    ahora.toISOString(),
    motivo,
  );
  auditar(
    estado,
    usuario,
    tipo === 'SS' ? 'CAMBIAR_SOLICITUD_SERVICIO_SOCIAL' : 'CAMBIAR_CONSULTA_TALLER',
    id,
  );
  return privada(consulta);
}
