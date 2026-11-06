import { auditar } from '../cms/contenido.js';

const escapar = (valor) =>
  valor
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

export function crearCorreoConsultas({ almacen, enviarCorreo, origenPublico, produccion = false }) {
  const origen = new URL(origenPublico);
  if (
    origen.origin !== origenPublico ||
    (origen.protocol !== 'https:' &&
      (produccion ||
        origen.protocol !== 'http:' ||
        !['localhost', '127.0.0.1', '[::1]'].includes(origen.hostname)))
  )
    throw new Error('Configura PORTAL_ORIGEN_PUBLICO con HTTPS o un origen local de desarrollo.');

  return async ({ folio, acceso }) => {
    const consulta = (await almacen.leer()).consultasTalleres.find((c) => c.folio === folio);
    const url = new URL('/', origen);
    url.hash = `consulta-taller=${encodeURIComponent(folio)}&acceso=${encodeURIComponent(acceso)}`;
    let estado = 'no_disponible';
    if (enviarCorreo) {
      try {
        const resultado = await enviarCorreo({
          para: consulta.correo,
          asunto: `Recibimos tu consulta ${folio} · SIMCE`,
          texto: `Hola, ${consulta.nombre}.\n\nRecibimos tu consulta sobre ${consulta.tallerNombre}.\nFolio: ${folio}\n\nTu pregunta:\n${consulta.mensaje}\n\nConsulta tu estado y la respuesta del Módulo:\n${url.href}\n\nEste enlace es personal. Puedes usarlo si cambias de equipo o borras los datos del navegador. Enviar una consulta no reserva una plaza del taller.`,
          html: `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Tu consulta en SIMCE</title></head><body style="font-family:Arial,sans-serif;color:#241d1d;line-height:1.6"><h1>Recibimos tu consulta</h1><p>Hola, ${escapar(consulta.nombre)}.</p><p>Taller: <strong>${escapar(consulta.tallerNombre)}</strong><br>Folio: <strong>${escapar(folio)}</strong></p><h2>Tu pregunta</h2><p style="white-space:pre-wrap">${escapar(consulta.mensaje)}</p><p><a href="${escapar(url.href)}" style="display:inline-block;background:#640e0e;color:#fff;padding:14px 22px;border-radius:6px;text-decoration:none">Consulta tu estado</a></p><p>La respuesta del Módulo estará disponible dentro del sitio. Este enlace es personal y permite recuperar el acceso si cambias de equipo o borras los datos del navegador.</p><p>Si el botón no funciona, abre este enlace:<br><a href="${escapar(url.href)}">${escapar(url.href)}</a></p><p>Enviar una consulta no reserva una plaza del taller.</p><p>SIMCE · Módulo de Carnes y Embutidos · FES Cuautitlán · UNAM</p></body></html>`,
        });
        estado = resultado?.modo === 'archivo' ? 'archivo' : 'enviado';
      } catch {
        estado = 'fallido';
      }
    }
    await almacen.cambiar((s) => {
      const registro = s.consultasTalleres.find((c) => c.folio === folio);
      registro.correoConfirmacion = { estado, intentadoEn: new Date().toISOString() };
      auditar(s, { id: 'sistema' }, `CORREO_CONSULTA_${estado.toUpperCase()}`, registro.id);
    });
    return estado;
  };
}
