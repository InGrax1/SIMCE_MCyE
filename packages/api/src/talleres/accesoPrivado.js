import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { ErrorApi } from '../errores.js';

const huella = (valor) => createHash('sha256').update(valor).digest();
export function crearAccesoPrivado() {
  const acceso = randomBytes(32).toString('base64url');
  return { acceso, accesoHash: huella(acceso).toString('hex') };
}
export function sinAccesoPrivado(registro) {
  const datos = { ...registro };
  delete datos.accesoHash;
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
  const esperado = Buffer.from(registro?.accesoHash ?? '0'.repeat(64), 'hex');
  if (
    esperado.length !== 32 ||
    !timingSafeEqual(huella(datos.acceso), esperado) ||
    !registro?.accesoHash
  )
    throw invalido();
  return registro;
}
