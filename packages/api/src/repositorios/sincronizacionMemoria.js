import { ErrorApi } from '../errores.js';

export class RepositorioSincronizacionMemoria {
  #documentos = new Map();
  #operaciones = new Map();
  #consecutivo = 0;

  aplicarUnaVez({ operacion, huella, fechaServidor }) {
    const anterior = this.#operaciones.get(operacion.operacionUuid);
    if (anterior) {
      if (anterior.huella !== huella) {
        throw new ErrorApi(
          409,
          'OPERACION_REUTILIZADA',
          'El identificador de operación ya fue usado con otro contenido.',
        );
      }
      return { ...structuredClone(anterior.resultado), repetida: true };
    }

    const documentoAnterior = this.#documentos.get(operacion.agregadoId);
    const versionActual = documentoAnterior?.versionServidor ?? 0;
    if (operacion.versionBase !== versionActual) {
      throw new ErrorApi(
        409,
        'VERSION_CONFLICTO',
        'La versión base ya no coincide con el servidor.',
        {
          versionBase: operacion.versionBase,
          versionServidor: versionActual,
        },
      );
    }

    this.#consecutivo += 1;
    const anio = new Date(fechaServidor).getUTCFullYear();
    const resultado = Object.freeze({
      operacionUuid: operacion.operacionUuid,
      agregadoId: operacion.agregadoId,
      estado: 'APLICADA',
      repetida: false,
      folioFinal: `REM-${anio}-${String(this.#consecutivo).padStart(6, '0')}`,
      versionServidor: versionActual + 1,
      fechaServidor,
    });

    this.#documentos.set(
      operacion.agregadoId,
      Object.freeze({
        documento: structuredClone(operacion.payload),
        folioFinal: resultado.folioFinal,
        versionServidor: resultado.versionServidor,
      }),
    );
    this.#operaciones.set(
      operacion.operacionUuid,
      Object.freeze({ huella, resultado: structuredClone(resultado) }),
    );

    return structuredClone(resultado);
  }

  obtenerDocumento(agregadoId) {
    const documento = this.#documentos.get(agregadoId);
    return documento ? structuredClone(documento) : null;
  }

  verificarConexion() {
    return true;
  }

  cerrar() {}
}
