let token;
let alRenovar;
let renovacion;
async function conectar(url, opciones) {
  try {
    return await fetch(url, opciones);
  } catch {
    throw new Error('No pudimos conectar con el sitio. Inténtalo de nuevo en unos momentos.');
  }
}
export function establecerSesion(valor, notificar) {
  token = valor;
  alRenovar = notificar ?? alRenovar;
}
export function cabecerasSesion() {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
function invalidarSesion() {
  establecerSesion(null);
  alRenovar?.(null);
}
async function solicitarRefresco() {
  const respuesta = await conectar('/api/v1/auth/refrescar', {
    method: 'POST',
    credentials: 'same-origin',
  });
  if (!respuesta.ok) {
    invalidarSesion();
    throw new Error('La sesión terminó. Vuelve a iniciar sesión.');
  }
  const sesion = await respuesta.json();
  establecerSesion(sesion.token);
  alRenovar?.(sesion);
  return sesion;
}
export function renovarSesion() {
  if (!renovacion) {
    const solicitud =
      typeof window !== 'undefined' && navigator.locks
        ? navigator.locks.request('simce-refresco', solicitarRefresco)
        : solicitarRefresco();
    renovacion = solicitud.finally(() => {
      renovacion = undefined;
    });
  }
  return renovacion;
}
export async function consultarApi(
  ruta,
  { metodo = 'GET', datos, cuerpo, cabeceras = {}, reintentar = true } = {},
) {
  const tokenEnviado = token;
  const respuesta = await conectar(`/api/v1${ruta}`, {
    method: metodo,
    credentials: 'same-origin',
    headers: {
      ...cabecerasSesion(),
      ...(datos ? { 'Content-Type': 'application/json' } : {}),
      ...cabeceras,
    },
    body: datos ? JSON.stringify(datos) : cuerpo,
  });
  if (respuesta.status === 401 && ruta !== '/auth/login') {
    if (tokenEnviado && reintentar) {
      if (token === tokenEnviado) await renovarSesion();
      if (token) return consultarApi(ruta, { metodo, datos, cuerpo, cabeceras, reintentar: false });
    }
    if (token === tokenEnviado) invalidarSesion();
  }
  if (!respuesta.ok) {
    let mensaje;
    let codigo;
    try {
      const rechazo = await respuesta.json();
      mensaje = rechazo.mensaje;
      codigo = rechazo.error;
    } catch {
      mensaje = 'No fue posible completar la solicitud.';
    }
    const error = new Error(mensaje);
    error.codigo = codigo;
    throw error;
  }
  if (respuesta.status === 204) return null;
  if (/application\/pdf|text\/csv/.test(respuesta.headers.get('content-type') ?? ''))
    return respuesta.blob();
  return respuesta.headers.get('content-type')?.includes('text/html')
    ? respuesta.text()
    : respuesta.json();
}
