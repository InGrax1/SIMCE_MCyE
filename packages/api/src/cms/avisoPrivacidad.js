import { avisoPrivacidad } from '../../../portal/src/avisoPrivacidad.js';

export function validarAvisoConfigurado(url, version) {
  if (Boolean(url) !== Boolean(version))
    throw new Error('Configura URL y versión del aviso de privacidad juntas.');
  if (!url) return null;
  if (typeof version !== 'string' || !/^[A-Za-z0-9._-]{1,80}$/.test(version))
    throw new Error('El aviso necesita una versión de hasta 80 caracteres.');
  // Este recurso está incluido en el portal; hereda HTTPS en el alojamiento
  // y también puede consultarse en el origen de revisión local.
  if (url === avisoPrivacidad.url && version === avisoPrivacidad.version) return { url, version };
  let direccion;
  try {
    direccion = new URL(url);
  } catch {
    /* Rechazar rutas relativas ajenas. */
  }
  if (
    !direccion ||
    direccion.protocol !== 'https:' ||
    direccion.username ||
    direccion.password ||
    url.length > 1000
  )
    throw new Error(
      'El aviso necesita HTTPS o la ruta de su versión autorizada incluida en el portal.',
    );
  return { url, version };
}
