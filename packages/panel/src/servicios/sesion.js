let token;
let alRenovar;
let renovacion;
export function establecerSesion(valor, notificar) {
  token = valor;
  alRenovar = notificar ?? alRenovar;
}
export function cabecerasSesion() {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
async function solicitarRefresco() {
  const respuesta = await fetch('/api/v1/auth/refrescar', {
    method: 'POST',
    credentials: 'same-origin',
  });
  if (!respuesta.ok) {
    establecerSesion(null);
    alRenovar?.(null);
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
  const respuesta = await fetch(`/api/v1${ruta}`, {
    method: metodo,
    credentials: 'same-origin',
    headers: {
      ...cabecerasSesion(),
      ...(datos ? { 'Content-Type': 'application/json' } : {}),
      ...cabeceras,
    },
    body: datos ? JSON.stringify(datos) : cuerpo,
  });
  if (respuesta.status === 401 && token && reintentar) {
    await renovarSesion();
    return consultarApi(ruta, { metodo, datos, cuerpo, cabeceras, reintentar: false });
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
  return respuesta.headers.get('content-type')?.includes('text/html')
    ? respuesta.text()
    : respuesta.json();
}
