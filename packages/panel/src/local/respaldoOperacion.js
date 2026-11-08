import { uuidOperativo, validarComandoOperativo } from '@simce/dominio';

const version = 1;
export const limiteRespaldo = 20 * 1024 * 1024;
export const estadosRecuperables = ['PENDIENTE', 'RECHAZADA', 'CONFLICTO'];

async function sha256(texto) {
  const bytes = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto)),
  );
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function codificar(bytes) {
  let texto = '';
  for (let inicio = 0; inicio < bytes.length; inicio += 8192)
    texto += String.fromCharCode(...bytes.subarray(inicio, inicio + 8192));
  return btoa(texto);
}

function normalizar(valor) {
  if (Array.isArray(valor)) return valor.map(normalizar);
  if (valor instanceof Uint8Array) return codificar(valor);
  if (!valor || typeof valor !== 'object') return valor;
  return Object.fromEntries(
    Object.keys(valor)
      .sort()
      .map((clave) => [clave, normalizar(valor[clave])]),
  );
}

export function mismoComando(a, b) {
  return JSON.stringify(normalizar(a)) === JSON.stringify(normalizar(b));
}

export async function crearRespaldoOperacion(usuario, datos) {
  const contenido = JSON.stringify({
    usuarioId: usuario.id,
    momento: new Date().toISOString(),
    cola: datos.cola,
    documentos: datos.documentos.map(({ uuid, bytes }) => ({ uuid, base64: codificar(bytes) })),
  });
  const archivo = JSON.stringify({ version, sha256: await sha256(contenido), contenido });
  if (new TextEncoder().encode(archivo).length > limiteRespaldo)
    throw new Error(
      'El respaldo de pendientes supera 20 MB. Sincroniza parte de la cola y vuelve a intentarlo.',
    );
  return archivo;
}

export async function leerRespaldoOperacion(archivo, usuario) {
  if (new TextEncoder().encode(archivo).length > limiteRespaldo)
    throw new Error('El archivo supera 20 MB.');
  const paquete = JSON.parse(archivo);
  if (paquete?.version !== version || typeof paquete.contenido !== 'string')
    throw new Error('La versión del respaldo no es compatible.');
  if ((await sha256(paquete.contenido)) !== paquete.sha256)
    throw new Error('La comprobación de integridad del respaldo falló.');
  const datos = JSON.parse(paquete.contenido);
  if (datos?.usuarioId !== usuario.id) throw new Error('El respaldo pertenece a otra cuenta.');
  if (typeof datos.momento !== 'string' || !Number.isFinite(Date.parse(datos.momento)))
    throw new Error('La fecha del respaldo no es válida.');
  if (!Array.isArray(datos.cola) || datos.cola.length > 5000 || !Array.isArray(datos.documentos))
    throw new Error('La cola del respaldo no tiene un formato válido.');
  const operaciones = new Set();
  const documentosPermitidos = new Set();
  for (const fila of datos.cola) {
    const { comando, estado, resultado } = fila;
    validarComandoOperativo(comando);
    if (
      comando.autorUuid !== usuario.id ||
      !estadosRecuperables.includes(estado) ||
      operaciones.has(comando.operacionUuid) ||
      (estado !== 'PENDIENTE' &&
        (typeof resultado?.mensaje !== 'string' || typeof resultado?.estado !== 'string'))
    )
      throw new Error('El respaldo contiene operaciones duplicadas o con autor o estado inválido.');
    operaciones.add(comando.operacionUuid);
    if (comando.tipo === 'CERRAR_REMISION')
      documentosPermitidos.add(uuidOperativo(comando.payload.documentoUuid));
  }
  const documentos = datos.documentos.map(({ uuid, base64 }) => {
    if (!documentosPermitidos.delete(uuid) || typeof base64 !== 'string')
      throw new Error('Un documento no corresponde a un cierre recuperable.');
    const bytes = Uint8Array.from(atob(base64), (b) => b.charCodeAt(0));
    if (new TextDecoder().decode(bytes.subarray(0, 5)) !== '%PDF-')
      throw new Error('Un archivo provisional no es un PDF válido.');
    return { uuid, bytes };
  });
  return { momento: datos.momento, cola: datos.cola, documentos };
}
