import { ErrorApi } from '../errores.js';

function deserializarJson(valor) {
  return typeof valor === 'string' ? JSON.parse(valor) : valor;
}

export class RepositorioSincronizacionMysql {
  constructor(baseDatos) {
    this.baseDatos = baseDatos;
  }

  async aplicarUnaVez({ operacion, huella, fechaServidor }) {
    try {
      return await this.baseDatos.transaction(async (transaccion) => {
        const fechaBaseDatos = new Date(fechaServidor);
        const anterior = await transaccion('operaciones_sincronizacion')
          .where({ operacion_uuid: operacion.operacionUuid })
          .forUpdate()
          .first();
        if (anterior) return this.#resolverRepetida(anterior, huella);

        const documentoAnterior = await transaccion('remisiones')
          .where({ remision_uuid: operacion.agregadoId })
          .forUpdate()
          .first();
        const versionActual = Number(documentoAnterior?.version_servidor ?? 0);
        if (operacion.versionBase !== versionActual) {
          throw new ErrorApi(
            409,
            'VERSION_CONFLICTO',
            'La versión base ya no coincide con el servidor.',
            { versionBase: operacion.versionBase, versionServidor: versionActual },
          );
        }

        const anio = new Date(fechaServidor).getUTCFullYear();
        const serie = `REM-${anio}`;
        await transaccion('consecutivos_folio')
          .insert({ serie, valor: 0, actualizado_en: fechaBaseDatos })
          .onConflict('serie')
          .ignore();
        const consecutivo = await transaccion('consecutivos_folio')
          .where({ serie })
          .forUpdate()
          .first();
        const siguiente = Number(consecutivo.valor) + 1;
        await transaccion('consecutivos_folio')
          .where({ serie })
          .update({ valor: siguiente, actualizado_en: fechaBaseDatos });

        const resultado = {
          operacionUuid: operacion.operacionUuid,
          agregadoId: operacion.agregadoId,
          estado: 'APLICADA',
          repetida: false,
          folioFinal: `${serie}-${String(siguiente).padStart(6, '0')}`,
          versionServidor: versionActual + 1,
          fechaServidor,
        };
        const remision = operacion.payload;
        const registroRemision = {
          remision_uuid: operacion.agregadoId,
          centro_id: remision.centroId,
          estado: 'SINCRONIZADA',
          version_servidor: resultado.versionServidor,
          folio_final: resultado.folioFinal,
          total_centavos: remision.totalCentavos,
          total_gramos: remision.totalGramos,
          documento: JSON.stringify(remision),
          actualizado_en: fechaBaseDatos,
        };

        await transaccion('remisiones')
          .insert({ ...registroRemision, creado_en: fechaBaseDatos })
          .onConflict('remision_uuid')
          .merge(registroRemision);
        await transaccion('operaciones_sincronizacion').insert({
          operacion_uuid: operacion.operacionUuid,
          agregado_id: operacion.agregadoId,
          tipo: operacion.tipo,
          huella,
          version_base: operacion.versionBase,
          resultado: JSON.stringify(resultado),
          procesado_en: fechaBaseDatos,
        });

        return resultado;
      });
    } catch (error) {
      if (error.code !== 'ER_DUP_ENTRY') throw error;
      const anterior = await this.baseDatos('operaciones_sincronizacion')
        .where({ operacion_uuid: operacion.operacionUuid })
        .first();
      if (!anterior) throw error;
      return this.#resolverRepetida(anterior, huella);
    }
  }

  #resolverRepetida(anterior, huella) {
    if (anterior.huella !== huella) {
      throw new ErrorApi(
        409,
        'OPERACION_REUTILIZADA',
        'El identificador de operación ya fue usado con otro contenido.',
      );
    }
    return { ...deserializarJson(anterior.resultado), repetida: true };
  }

  async verificarConexion() {
    await this.baseDatos.raw('SELECT 1 AS disponible');
    return true;
  }

  cerrar() {
    return this.baseDatos.destroy();
  }
}
