import { ErrorApi } from '../errores.js';
import { buscarConAcceso } from './accesoPrivado.js';
import { buscarTaller, proyectarTaller } from './reglas.js';
import { cambiarInscripcion } from './servicio.js';

export function consultarInscripcion(estado, datos, ahora = new Date()) {
  const registro = buscarConAcceso(estado.inscripciones, datos, 'INS');
  const taller = buscarTaller(estado, registro.tallerId);
  const disponible = proyectarTaller(estado, taller, ahora).inscripcion;
  return {
    folio: registro.folio,
    nombre: registro.nombre,
    correo: registro.correo,
    telefono: registro.telefono,
    procedencia: registro.procedencia,
    licenciatura: registro.licenciatura,
    numeroCuenta: registro.numeroCuenta,
    estado: registro.estado,
    version: registro.version,
    creadoEn: registro.creadoEn,
    tallerNombre: registro.tallerNombre ?? taller.publicado?.nombre ?? 'Taller',
    inicio: taller.publicado?.inicio ?? registro.inicio,
    fin: taller.publicado?.fin ?? registro.fin,
    sede: disponible?.sede,
    temario: disponible?.temario,
    estadoTaller: disponible?.estado,
    aviso: estado.avisoTalleres,
    puedeCancelar: registro.estado === 'confirmada' && disponible?.estado === 'programado',
    puedeReactivar: registro.estado === 'cancelada' && Boolean(disponible?.habilitada),
    historial: registro.historial.map(({ accion, motivo, momento, usuarioId }) => ({
      accion,
      motivo,
      momento,
      origen: ['visitante', 'participante'].includes(usuarioId)
        ? 'Participante'
        : 'Personal del Módulo',
    })),
  };
}

export function gestionarInscripcionPropia(estado, datos, ahora = new Date()) {
  const registro = buscarConAcceso(estado.inscripciones, datos, 'INS');
  const actual = consultarInscripcion(estado, datos, ahora);
  if (!['cancelar', 'reactivar'].includes(datos.accion))
    throw new ErrorApi(
      403,
      'ACCION_NO_PERMITIDA',
      'La asistencia la registra el personal del Módulo.',
    );
  if (datos.accion === 'cancelar' && !actual.puedeCancelar)
    throw new ErrorApi(
      409,
      'TRANSICION_INVALIDA',
      'Esta inscripción ya no puede cancelarse desde el sitio.',
    );
  cambiarInscripcion(estado, registro.id, datos, { id: 'participante' }, ahora);
  return consultarInscripcion(estado, datos, ahora);
}
