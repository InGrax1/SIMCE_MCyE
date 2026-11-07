import { auditar } from '../cms/contenido.js';
import { crearAccesoRespuesta } from './accesoPrivado.js';

const escapar = (valor) =>
  valor
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

export function crearCorreoConsultas({
  almacen,
  enviarCorreo,
  origenPublico,
  secreto,
  produccion = false,
}) {
  const origen = new URL(origenPublico);
  if (
    origen.origin !== origenPublico ||
    (origen.protocol !== 'https:' &&
      (produccion ||
        origen.protocol !== 'http:' ||
        !['localhost', '127.0.0.1', '[::1]'].includes(origen.hostname)))
  )
    throw new Error('Configura PORTAL_ORIGEN_PUBLICO con HTTPS o un origen local de desarrollo.');

  return async ({ folio, acceso, respuesta }) => {
    const inscripcion = folio.startsWith('INS-');
    const social = folio.startsWith('SS-');
    const coleccion = inscripcion ? 'inscripciones' : social ? 'intereses' : 'consultasTalleres';
    const consulta = (await almacen.leer())[coleccion].find((c) => c.folio === folio);
    const esRespuesta = respuesta !== undefined;
    if (esRespuesta && enviarCorreo && secreto) {
      const privado = crearAccesoRespuesta(consulta.id, secreto);
      if (consulta.accesoRespuestaHash !== privado.accesoHash)
        await almacen.cambiar((s) => {
          const registro = s[coleccion].find((c) => c.id === consulta.id);
          registro.accesoRespuestaHash = privado.accesoHash;
        });
      acceso = privado.acceso;
    }
    const titulo = esRespuesta
      ? 'El Módulo respondió tu solicitud'
      : inscripcion
        ? 'Inscripción confirmada'
        : social
          ? 'Recibimos tu solicitud de servicio social'
          : 'Recibimos tu consulta';
    const actividad = `${social ? 'Programa' : 'Taller'}: ${consulta.programaNombre ?? consulta.tallerNombre}`;
    const mensaje =
      consulta.mensaje ||
      (social ? 'Solicito información sobre este programa.' : 'Sin mensaje inicial.');
    const detalleTexto = esRespuesta
      ? respuesta
      : inscripcion
        ? 'Tu inscripción está confirmada. Dentro del sitio puedes revisar tus datos, cancelar o reactivar cuando haya cupo y consultar tu historial y asistencia.'
        : `Tu pregunta:\n${mensaje}`;
    const detalleHtml = esRespuesta
      ? `<p style="white-space:pre-wrap">${escapar(respuesta)}</p>`
      : inscripcion
        ? '<p>Tu inscripción está confirmada. Dentro del sitio puedes revisar tus datos, cancelar o reactivar cuando haya cupo y consultar tu historial y asistencia.</p>'
        : `<h2>Tu pregunta</h2><p style="white-space:pre-wrap">${escapar(mensaje)}</p>`;
    const nota = inscripcion
      ? 'La asistencia la registra el personal del Módulo.'
      : social
        ? 'La solicitud no constituye admisión al programa de servicio social.'
        : 'Enviar una consulta no reserva una plaza del taller.';
    const url = new URL('/', origen);
    url.hash = `${inscripcion ? 'inscripcion-taller' : social ? 'servicio-social' : 'consulta-taller'}=${encodeURIComponent(folio)}&acceso=${encodeURIComponent(acceso)}`;
    let estado = 'no_disponible';
    if (enviarCorreo && acceso) {
      try {
        const resultado = await enviarCorreo({
          para: consulta.correo,
          asunto: `${titulo} ${folio} · SIMCE`,
          texto: `Hola, ${consulta.nombre}.\n\n${titulo}\n${actividad}\nFolio: ${folio}\n\n${detalleTexto}\n\nConsulta tu estado:\n${url.href}\n\nEste enlace es personal. Puedes usarlo si cambias de equipo o borras los datos del navegador. ${nota}`,
          html: `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Tu solicitud en SIMCE</title></head><body style="font-family:Arial,sans-serif;color:#241d1d;line-height:1.6"><h1>${titulo}</h1><p>Hola, ${escapar(consulta.nombre)}.</p><p><strong>${escapar(actividad)}</strong><br>Folio: <strong>${escapar(folio)}</strong></p>${detalleHtml}<p><a href="${escapar(url.href)}" style="display:inline-block;background:#640e0e;color:#fff;padding:14px 22px;border-radius:6px;text-decoration:none">Consulta tu estado</a></p><p>El estado y seguimiento estarán disponibles dentro del sitio. Este enlace es personal y permite recuperar el acceso si cambias de equipo o borras los datos del navegador.</p><p>Si el botón no funciona, abre este enlace:<br><a href="${escapar(url.href)}">${escapar(url.href)}</a></p><p>${nota}</p><p>SIMCE · Módulo de Carnes y Embutidos · FES Cuautitlán · UNAM</p></body></html>`,
        });
        estado = resultado?.modo === 'archivo' ? 'archivo' : 'enviado';
      } catch {
        estado = 'fallido';
      }
    }
    await almacen.cambiar((s) => {
      const registro = s[coleccion].find((c) => c.folio === folio);
      if (!esRespuesta)
        registro.correoConfirmacion = { estado, intentadoEn: new Date().toISOString() };
      const evento = esRespuesta
        ? 'CORREO_RESPUESTA'
        : inscripcion
          ? 'CORREO_INSCRIPCION'
          : social
            ? 'CORREO_SERVICIO_SOCIAL'
            : 'CORREO_CONSULTA';
      auditar(s, { id: 'sistema' }, `${evento}_${estado.toUpperCase()}`, registro.id);
    });
    return estado;
  };
}
