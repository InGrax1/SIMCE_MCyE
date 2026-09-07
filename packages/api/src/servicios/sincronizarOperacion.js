import { createHash } from 'node:crypto';
import { ErrorApi } from '../errores.js';

function serializarEstable(valor) {
  if (Array.isArray(valor)) {
    return `[${valor.map(serializarEstable).join(',')}]`;
  }
  if (valor && typeof valor === 'object') {
    const claves = Object.keys(valor).sort();
    return `{${claves.map((clave) => `${JSON.stringify(clave)}:${serializarEstable(valor[clave])}`).join(',')}}`;
  }
  return JSON.stringify(valor);
}

function validarOperacion(operacion) {
  if (!operacion || typeof operacion !== 'object') {
    throw new ErrorApi(400, 'OPERACION_REQUERIDA', 'La solicitud requiere una operación.');
  }
  for (const campo of ['operacionUuid', 'agregadoId', 'tipo']) {
    if (typeof operacion[campo] !== 'string' || operacion[campo].length === 0) {
      throw new ErrorApi(400, 'OPERACION_FORMATO', `El campo ${campo} es obligatorio.`);
    }
  }
  if (operacion.tipo !== 'CERRAR_REMISION') {
    throw new ErrorApi(
      422,
      'OPERACION_TIPO',
      'El tipo de operación no está habilitado en la fase cero.',
    );
  }
  if (!Number.isSafeInteger(operacion.versionBase) || operacion.versionBase < 0) {
    throw new ErrorApi(400, 'VERSION_FORMATO', 'La versión base debe ser un entero no negativo.');
  }
  if (!operacion.payload || typeof operacion.payload !== 'object') {
    throw new ErrorApi(
      400,
      'PAYLOAD_REQUERIDO',
      'La operación requiere el documento local cerrado.',
    );
  }
}

export function crearServicioSincronizacion({
  repositorio,
  reloj = () => new Date().toISOString(),
}) {
  return {
    procesar(operacion) {
      validarOperacion(operacion);
      const huella = createHash('sha256').update(serializarEstable(operacion)).digest('hex');
      return repositorio.aplicarUnaVez({ operacion, huella, fechaServidor: reloj() });
    },
  };
}
