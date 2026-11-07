import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { ErrorApi } from '../errores.js';

const huella = (valor) => createHash('sha256').update(valor).digest();
export function crearAccesoPrivado() {
  const acceso = randomBytes(32).toString('base64url');
  return { acceso, accesoHash: huella(acceso).toString('hex') };
}
export function crearAccesoRespuesta(id, secreto) {
  const acceso = createHmac('sha256', secreto)
    .update(`simce:acceso-correo-respuesta:v1:${id}`)
    .digest('base64url');
  return { acceso, accesoHash: huella(acceso).toString('hex') };
}
export function sinAccesoPrivado(registro) {
  const datos = { ...registro };
  delete datos.accesoHash;
  delete datos.accesoRespuestaHash;
  return datos;
}
export function buscarConAcceso(registros, datos, prefijo) {
  const invalido = () =>
    new ErrorApi(
      404,
      'ACCESO_NO_ENCONTRADO',
      'No encontramos el registro. Revisa tu enlace privado.',
    );
  if (
    typeof datos.folio !== 'string' ||
    !new RegExp(`^${prefijo}-\\d{4}-\\d{8}$`).test(datos.folio) ||
    typeof datos.acceso !== 'string' ||
    !/^[A-Za-z0-9_-]{43}$/.test(datos.acceso)
  )
    throw invalido();
  const registro = (registros ?? []).find((r) => r.folio === datos.folio);
  const recibida = huella(datos.acceso);
  const coincide = [registro?.accesoHash, registro?.accesoRespuestaHash].some((hash) => {
    const esperado = Buffer.from(hash ?? '0'.repeat(64), 'hex');
    return esperado.length === 32 && timingSafeEqual(recibida, esperado) && Boolean(hash);
  });
  if (!coincide) throw invalido();
  return registro;
}
