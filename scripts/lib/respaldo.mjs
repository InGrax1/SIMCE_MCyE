import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';

const cabecera = Buffer.from('SIMCEBK1');
export const sha256 = (valor) => createHash('sha256').update(valor).digest('hex');
const claveValida = (clave) => {
  if (!Buffer.isBuffer(clave) || clave.length !== 32)
    throw new Error('El respaldo requiere una clave independiente de 32 bytes.');
};
function validar(paquete) {
  if (
    paquete.formato !== 'SIMCE:MYSQL:1' ||
    !/^[a-zA-Z0-9_]{1,64}$/.test(paquete.baseOrigen) ||
    typeof paquete.sql !== 'string' ||
    paquete.sql.length > 128 * 1024 * 1024 ||
    sha256(paquete.sql) !== paquete.sha256Sql ||
    !Array.isArray(paquete.medios) ||
    paquete.medios.length > 10000
  )
    throw new Error('El manifiesto del respaldo no es válido.');
  const nombres = new Set();
  for (const medio of paquete.medios) {
    if (
      !/^[a-f0-9-]{36}\.webp$/.test(medio.nombre) ||
      nombres.has(medio.nombre) ||
      typeof medio.contenido !== 'string'
    )
      throw new Error('El respaldo contiene rutas de medios no válidas.');
    const datos = Buffer.from(medio.contenido, 'base64');
    if (
      datos.length > 5 * 1024 * 1024 ||
      datos.toString('base64') !== medio.contenido ||
      sha256(datos) !== medio.sha256
    )
      throw new Error('La integridad de una imagen del respaldo no es válida.');
    nombres.add(medio.nombre);
  }
  return paquete;
}
export function cifrarRespaldo({ sql, medios, baseOrigen, revision, versionApp }, clave) {
  claveValida(clave);
  const paquete = validar({
    formato: 'SIMCE:MYSQL:1',
    creadoEn: new Date().toISOString(),
    versionApp,
    baseOrigen,
    revision,
    sql,
    sha256Sql: sha256(sql),
    medios,
  });
  const iv = randomBytes(12);
  const cifrador = createCipheriv('aes-256-gcm', clave, iv);
  cifrador.setAAD(cabecera);
  const datos = gzipSync(Buffer.from(JSON.stringify(paquete)));
  const cifrado = Buffer.concat([cifrador.update(datos), cifrador.final()]);
  return Buffer.concat([cabecera, iv, cifrador.getAuthTag(), cifrado]);
}
export function abrirRespaldo(archivo, clave) {
  claveValida(clave);
  if (
    archivo.length < 37 ||
    archivo.length > 256 * 1024 * 1024 ||
    !archivo.subarray(0, 8).equals(cabecera)
  )
    throw new Error('El archivo no es un respaldo compatible.');
  let datos;
  try {
    const descifrador = createDecipheriv('aes-256-gcm', clave, archivo.subarray(8, 20));
    descifrador.setAAD(cabecera);
    descifrador.setAuthTag(archivo.subarray(20, 36));
    datos = Buffer.concat([descifrador.update(archivo.subarray(36)), descifrador.final()]);
  } catch {
    throw new Error(
      'No se pudo verificar el respaldo. Comprueba la clave y la integridad del archivo.',
    );
  }
  return validar(
    JSON.parse(gunzipSync(datos, { maxOutputLength: 512 * 1024 * 1024 }).toString('utf8')),
  );
}
