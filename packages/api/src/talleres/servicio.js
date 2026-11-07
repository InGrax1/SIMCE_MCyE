import { randomUUID } from 'node:crypto';
import { ErrorApi } from '../errores.js';
import { auditar } from '../cms/contenido.js';
import { crearAccesoPrivado, sinAccesoPrivado } from './accesoPrivado.js';
import {
  aceptarAviso,
  buscarTaller,
  exigirPlaza,
  plazasOcupadas,
  textoInscripcion,
  validarParticipante,
} from './reglas.js';

export function comprobarVersion(taller, version) {
  if (!Number.isInteger(version) || taller.version !== version)
    throw new ErrorApi(
      409,
      'VERSION_DESACTUALIZADA',
      'El taller cambió. Recarga antes de guardar.',
    );
}

export function configurarTaller(estado, id, datos, usuario) {
  const taller = buscarTaller(estado, id);
  comprobarVersion(taller, datos.version);
  const anterior = taller.inscripcion;
  const temario = textoInscripcion(datos.temario, 'contenido temático', 4000, true);
  const sede = textoInscripcion(datos.sede, 'sede', 300);
  if (!Number.isInteger(datos.cupo) || datos.cupo < 1 || datos.cupo > 10000)
    throw new ErrorApi(422, 'CUPO_INVALIDO', 'El cupo debe ser un entero entre 1 y 10000.');
  if (datos.cupo < plazasOcupadas(estado, id))
    throw new ErrorApi(
      409,
      'CUPO_INFERIOR_A_OCUPACION',
      'El cupo no puede ser menor a las plazas ocupadas.',
    );
  const instantes = ['apertura', 'cierre'].map((c) => {
    if (
      typeof datos[c] !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(datos[c]) ||
      !Number.isFinite(Date.parse(datos[c])) ||
      new Date(datos[c]).toISOString() !== datos[c]
    )
      throw new ErrorApi(
        422,
        'PERIODO_INVALIDO',
        'Selecciona fechas y horas de inscripción válidas.',
      );
    return datos[c];
  });
  if (instantes[0] >= instantes[1])
    throw new ErrorApi(422, 'PERIODO_INVALIDO', 'El cierre debe ser posterior a la apertura.');
  if (anterior && anterior.estado !== 'programado')
    throw new ErrorApi(
      409,
      'TALLER_TERMINADO',
      'Un taller cancelado o concluido conserva su configuración.',
    );
  const cambiaFechas = anterior && ['apertura', 'cierre'].some((c) => datos[c] !== anterior[c]);
  if (cambiaFechas) textoInscripcion(datos.motivo, 'motivo del cambio de fechas', 500);
  if (!taller.borrador.inicio || !taller.borrador.fin)
    throw new ErrorApi(422, 'CONTENIDO_INCOMPLETO', 'Guarda primero las fechas del taller.');
  taller.inscripcion = {
    temario,
    sede,
    cupo: datos.cupo,
    apertura: instantes[0],
    cierre: instantes[1],
    estado: 'programado',
  };
  taller.version++;
  estado.revisionPortal++;
  if (cambiaFechas)
    (taller.historialOperativo ??= []).push({
      accion: 'CAMBIAR_PERIODO',
      motivo: datos.motivo.trim(),
      usuarioId: usuario.id,
      anterior,
      momento: new Date().toISOString(),
    });
  auditar(estado, usuario, 'CONFIGURAR_INSCRIPCION', id);
  return taller;
}

export function registrarInscripcion(estado, id, datos, ahora = new Date()) {
  const taller = buscarTaller(estado, id);
  if (!taller.publicado) throw new ErrorApi(404, 'NO_ENCONTRADO', 'El taller no está publicado.');
  aceptarAviso(estado, datos);
  const participante = validarParticipante(datos);
  estado.inscripciones ??= [];
  if (estado.inscripciones.some((i) => i.tallerId === id && i.correo === participante.correo))
    throw new ErrorApi(
      409,
      'INSCRIPCION_DUPLICADA',
      'Este correo ya tiene una inscripción en el taller. Revísala en «Mis inscripciones a talleres» o desde tu correo para consultar su estado o reactivarla.',
    );
  exigirPlaza(estado, taller, ahora);
  const consecutivo = (estado.consecutivoInscripcion ?? 0) + 1;
  if (consecutivo > 99999999)
    throw new ErrorApi(409, 'LIMITE_FOLIOS', 'Contacta al administrador.');
  estado.consecutivoInscripcion = consecutivo;
  const momento = ahora.toISOString();
  const { acceso, accesoHash } = crearAccesoPrivado();
  const inscripcion = {
    ...participante,
    id: randomUUID(),
    tallerId: id,
    tallerNombre: taller.publicado.nombre ?? taller.publicado.titulo,
    inicio: taller.publicado.inicio,
    fin: taller.publicado.fin,
    accesoHash,
    folio: `INS-${ahora.getUTCFullYear()}-${String(consecutivo).padStart(8, '0')}`,
    estado: 'confirmada',
    version: 1,
    versionAviso: estado.avisoTalleres.version,
    avisoAceptadoEn: momento,
    creadoEn: momento,
    historial: [
      {
        accion: 'INSCRIBIR',
        momento,
        usuarioId: 'visitante',
        versionAviso: estado.avisoTalleres.version,
      },
    ],
  };
  estado.inscripciones.push(inscripcion);
  auditar(estado, { id: 'visitante' }, 'REGISTRAR_INSCRIPCION', inscripcion.id);
  return { folio: inscripcion.folio, estado: inscripcion.estado, acceso };
}

export function cambiarInscripcion(estado, id, datos, usuario, ahora = new Date()) {
  const inscripcion = (estado.inscripciones ?? []).find((i) => i.id === id);
  if (!inscripcion) throw new ErrorApi(404, 'NO_ENCONTRADO', 'No se encontró la inscripción.');
  comprobarVersion(inscripcion, datos.version);
  const taller = buscarTaller(estado, inscripcion.tallerId);
  const motivo = textoInscripcion(datos.motivo, 'motivo', 500);
  if (datos.accion === 'cancelar' && inscripcion.estado === 'confirmada')
    inscripcion.estado = 'cancelada';
  else if (datos.accion === 'reactivar' && inscripcion.estado === 'cancelada') {
    aceptarAviso(estado, datos);
    exigirPlaza(estado, taller, ahora);
    inscripcion.estado = 'confirmada';
    inscripcion.versionAviso = estado.avisoTalleres.version;
    inscripcion.avisoAceptadoEn = ahora.toISOString();
  } else if (
    datos.accion === 'asistencia' &&
    inscripcion.estado === 'confirmada' &&
    taller.inscripcion.estado !== 'cancelado'
  )
    inscripcion.estado = 'asistio';
  else throw new ErrorApi(409, 'TRANSICION_INVALIDA', 'La acción no corresponde al estado actual.');
  inscripcion.version++;
  inscripcion.historial.push({
    accion: datos.accion,
    motivo,
    momento: ahora.toISOString(),
    usuarioId: usuario.id,
    ...(datos.accion === 'reactivar' ? { versionAviso: inscripcion.versionAviso } : {}),
  });
  auditar(estado, usuario, 'CAMBIAR_INSCRIPCION', id);
  return sinAccesoPrivado(inscripcion);
}

export function cambiarEstadoTaller(estado, id, datos, usuario, ahora = new Date()) {
  const taller = buscarTaller(estado, id);
  comprobarVersion(taller, datos.version);
  if (
    !taller.inscripcion ||
    taller.inscripcion.estado !== 'programado' ||
    !['cancelar', 'concluir'].includes(datos.accion)
  )
    throw new ErrorApi(
      409,
      'TRANSICION_INVALIDA',
      'La acción no corresponde al estado del taller.',
    );
  const motivo = textoInscripcion(datos.motivo, 'motivo', 500);
  taller.inscripcion.estado = datos.accion === 'cancelar' ? 'cancelado' : 'concluido';
  taller.version++;
  estado.revisionPortal++;
  (taller.historialOperativo ??= []).push({
    accion: datos.accion,
    motivo,
    momento: ahora.toISOString(),
    usuarioId: usuario.id,
  });
  if (datos.accion === 'cancelar') {
    for (const inscripcion of estado.inscripciones.filter(
      (i) => i.tallerId === id && i.estado === 'confirmada',
    )) {
      inscripcion.estado = 'cancelada';
      inscripcion.version++;
      inscripcion.historial.push({
        accion: 'CANCELAR_TALLER',
        motivo,
        momento: ahora.toISOString(),
        usuarioId: usuario.id,
      });
    }
  }
  auditar(estado, usuario, 'CAMBIAR_ESTADO_TALLER', id);
  return taller;
}
