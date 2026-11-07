import { randomUUID } from 'node:crypto';
import { ErrorApi } from '../errores.js';
import { auditar } from '../cms/contenido.js';
import { crearAccesoPrivado } from '../talleres/accesoPrivado.js';
import { textoInscripcion } from '../talleres/reglas.js';

export function registrarSolicitudSocial(estado, programaId, datos, ahora = new Date()) {
  if (!estado.avisoInteres)
    throw new ErrorApi(
      503,
      'AVISO_PENDIENTE',
      'El registro de interés todavía no está disponible. Contacta al módulo por correo.',
    );
  if (
    ![true, 'on'].includes(datos.aceptoAviso) ||
    datos.versionAviso !== estado.avisoInteres.version
  )
    throw new ErrorApi(422, 'AVISO_NO_ACEPTADO', 'Lee y acepta el aviso de privacidad vigente.');
  const programa = estado.entradas.find(
    (e) => e.id === programaId && e.tipo === 'programa' && e.publicado,
  );
  if (!programa) throw new ErrorApi(404, 'NO_ENCONTRADO', 'El programa no está publicado.');
  const nombre = textoInscripcion(datos.nombre, 'nombre', 160);
  const correo = textoInscripcion(datos.correo, 'correo', 160).toLowerCase();
  const mensaje =
    datos.mensaje === '' || datos.mensaje === undefined
      ? ''
      : textoInscripcion(datos.mensaje, 'mensaje', 1000, true);
  if (!/^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(correo))
    throw new ErrorApi(422, 'DATOS_INVALIDOS', 'Revisa el correo de contacto.');
  if (
    (estado.intereses ?? []).some(
      (s) => s.programaId === programaId && s.correo.trim().toLowerCase() === correo,
    )
  )
    throw new ErrorApi(
      409,
      'SOLICITUD_DUPLICADA',
      'Ya existe una solicitud para este correo y programa. Continúa desde «Mis solicitudes de servicio social» o desde el enlace recibido por correo.',
    );
  const consecutivo = (estado.consecutivoInteres ?? 0) + 1;
  if (consecutivo > 99999999)
    throw new ErrorApi(409, 'LIMITE_FOLIOS', 'Contacta al administrador.');
  estado.consecutivoInteres = consecutivo;
  const { acceso, accesoHash } = crearAccesoPrivado();
  const momento = ahora.toISOString();
  const solicitud = {
    id: randomUUID(),
    programaId,
    programaNombre: programa.publicado.nombre ?? programa.publicado.titulo,
    nombre,
    correo,
    mensaje,
    folio: `SS-${ahora.getUTCFullYear()}-${String(consecutivo).padStart(8, '0')}`,
    accesoHash,
    estado: 'pendiente',
    version: 1,
    respuestas: [],
    seguimientos: [],
    historial: [{ accion: 'REGISTRAR_SOLICITUD', momento, usuarioId: 'visitante' }],
    creadoEn: momento,
    momento,
    versionAviso: estado.avisoInteres.version,
  };
  (estado.intereses ??= []).push(solicitud);
  auditar(estado, { id: 'visitante' }, 'REGISTRAR_INTERES', solicitud.id);
  return { recibido: true, folio: solicitud.folio, acceso };
}

export function prepararSeguimientoSocial(estado, id, datos, usuario, ahora = new Date()) {
  const solicitud = (estado.intereses ?? []).find((s) => s.id === id);
  if (!solicitud) throw new ErrorApi(404, 'NO_ENCONTRADO', 'No se encontró la solicitud.');
  if (!Number.isInteger(datos.version) || solicitud.version !== datos.version)
    throw new ErrorApi(
      409,
      'VERSION_DESACTUALIZADA',
      'La solicitud cambió. Actualízala antes de continuar.',
    );
  if (solicitud.accesoHash)
    throw new ErrorApi(
      409,
      'SEGUIMIENTO_HABILITADO',
      'La solicitud ya tiene un enlace privado de seguimiento.',
    );
  const { acceso, accesoHash } = crearAccesoPrivado();
  solicitud.accesoHash = accesoHash;
  solicitud.version++;
  (solicitud.historial ??= []).push({
    accion: 'HABILITAR_SEGUIMIENTO',
    momento: ahora.toISOString(),
    usuarioId: usuario.id,
  });
  auditar(estado, usuario, 'HABILITAR_SEGUIMIENTO_SOCIAL', id);
  return { folio: solicitud.folio, acceso, accesoHash };
}
