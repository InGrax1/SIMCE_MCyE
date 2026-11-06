import { ErrorApi } from '../errores.js';

export function buscarTaller(estado, id) {
  const taller = estado.entradas.find((e) => e.id === id && e.tipo === 'taller');
  if (!taller) throw new ErrorApi(404, 'NO_ENCONTRADO', 'No se encontró el taller.');
  return taller;
}

export const plazasOcupadas = (estado, id) =>
  (estado.inscripciones ?? []).filter(
    (i) => i.tallerId === id && ['confirmada', 'asistio'].includes(i.estado),
  ).length;

export function proyectarTaller(estado, taller, ahora = new Date()) {
  const configuracion = taller.inscripcion;
  const ocupadas = plazasOcupadas(estado, taller.id);
  let estadoInscripcion = 'cerrada';
  if (configuracion?.estado === 'programado' && taller.publicado) {
    if (ahora < new Date(configuracion.apertura)) estadoInscripcion = 'proximamente';
    else if (ahora < new Date(configuracion.cierre))
      estadoInscripcion = ocupadas < configuracion.cupo ? 'abierta' : 'cupo_lleno';
  }
  return {
    ...taller.publicado,
    id: taller.id,
    inscripcion: configuracion
      ? {
          ...configuracion,
          ocupadas,
          disponibles: Math.max(0, configuracion.cupo - ocupadas),
          estadoInscripcion,
          habilitada: estadoInscripcion === 'abierta' && Boolean(estado.avisoTalleres),
        }
      : null,
  };
}

export function exigirPlaza(estado, taller, ahora) {
  const datos = proyectarTaller(estado, taller, ahora).inscripcion;
  if (!datos || ['cerrada', 'proximamente'].includes(datos.estadoInscripcion))
    throw new ErrorApi(409, 'INSCRIPCION_CERRADA', 'La inscripción a este taller está cerrada.');
  if (datos.estadoInscripcion === 'cupo_lleno')
    throw new ErrorApi(409, 'CUPO_AGOTADO', 'El taller ya no tiene lugares disponibles.');
}

export function aceptarAviso(estado, datos) {
  if (!estado.avisoTalleres)
    throw new ErrorApi(
      503,
      'AVISO_PENDIENTE',
      'La inscripción aún no está disponible. Contacta al módulo.',
    );
  if (datos.aceptoAviso !== true || datos.versionAviso !== estado.avisoTalleres.version)
    throw new ErrorApi(422, 'AVISO_NO_ACEPTADO', 'Lee y acepta el aviso de privacidad vigente.');
}

export function textoInscripcion(valor, campo, maximo, multilinea = false) {
  if (
    typeof valor !== 'string' ||
    valor.length > maximo ||
    !valor.trim() ||
    /[<>]/u.test(valor) ||
    [...valor].some(
      (letra) =>
        (letra.charCodeAt(0) < 32 && !(multilinea && ['\n', '\r', '\t'].includes(letra))) ||
        letra.charCodeAt(0) === 127,
    )
  )
    throw new ErrorApi(422, 'DATOS_INVALIDOS', `Revisa el campo ${campo}.`);
  return valor.trim();
}

export function validarParticipante(datos) {
  const nombre = textoInscripcion(datos.nombre, 'nombre completo', 160);
  const correo = textoInscripcion(datos.correo, 'correo', 160).toLowerCase();
  const telefono = textoInscripcion(datos.telefono, 'teléfono', 30);
  if (
    !/^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(correo) ||
    !/^[+()\d .-]{7,30}$/.test(telefono) ||
    !['interna', 'externa'].includes(datos.procedencia)
  )
    throw new ErrorApi(422, 'DATOS_INVALIDOS', 'Revisa el correo, el teléfono y la procedencia.');
  const interna = datos.procedencia === 'interna';
  return {
    nombre,
    correo,
    telefono,
    procedencia: datos.procedencia,
    licenciatura: interna ? textoInscripcion(datos.licenciatura, 'licenciatura', 160) : '',
    numeroCuenta: interna ? textoInscripcion(datos.numeroCuenta, 'número de cuenta', 30) : '',
  };
}

export function validarPublicacionTaller(entrada, siguientes, motivo) {
  if (entrada.tipo !== 'taller' || !entrada.inscripcion) return;
  if (entrada.inscripcion.estado === 'cancelado')
    throw new ErrorApi(409, 'TALLER_CANCELADO', 'Un taller cancelado no puede publicarse.');
  if (!siguientes.inicio || !siguientes.fin)
    throw new ErrorApi(422, 'CONTENIDO_INCOMPLETO', 'Completa las fechas del taller.');
  const anteriores = entrada.fechasPublicadas ?? entrada.publicado;
  if (anteriores && ['inicio', 'fin'].some((c) => siguientes[c] !== anteriores[c]))
    textoInscripcion(motivo, 'motivo del cambio de fechas', 500);
  if (
    entrada.inscripcion.estado === 'concluido' &&
    ['inicio', 'fin'].some((c) => siguientes[c] !== anteriores?.[c])
  )
    throw new ErrorApi(409, 'TALLER_CONCLUIDO', 'No se cambian las fechas de un taller concluido.');
}
