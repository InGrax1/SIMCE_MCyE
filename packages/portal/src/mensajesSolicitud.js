export const avisoConexion =
  'No pudimos conectar con el sitio. Inténtalo de nuevo en unos momentos.';

export function mensajeSolicitud(error) {
  if (
    error instanceof TypeError ||
    /^(Failed to fetch|Load failed|NetworkError)/i.test(error?.message ?? '')
  )
    return avisoConexion;
  if (error instanceof SyntaxError)
    return 'El sitio no pudo completar la solicitud. Inténtalo de nuevo en unos momentos.';
  return error?.message || 'No fue posible completar la solicitud. Inténtalo de nuevo.';
}
