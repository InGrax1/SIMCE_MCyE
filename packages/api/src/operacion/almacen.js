import { aplicarCambiosOperativos, tablasOperativas } from '@simce/dominio';

const json = (dato) => (typeof dato === 'string' ? JSON.parse(dato) : dato);
const registrosVacios = () => Object.fromEntries(tablasOperativas.map((tipo) => [tipo, []]));
const inicial = () => ({
  registros: registrosVacios(),
  eventos: [],
  recibos: {},
  conflictos: {},
  series: {},
});

function sesionDatos(estado, trx, catalogo) {
  const local = trx ? null : (estado.operacion ??= inicial());
  return {
    estado,
    async catalogo() {
      const datos = await catalogo.leerEn(estado, trx);
      return {
        ...datos,
        precios: datos.precios.map(
          ({ uuid, producto_uuid, precio_kg_centavos, vigente_desde }) => ({
            uuid,
            producto_uuid,
            precio_kg_centavos,
            vigente_desde,
          }),
        ),
      };
    },
    async registros() {
      if (!trx) return local.registros;
      const salida = registrosVacios();
      for (const fila of await trx('operacion_registros').select('tipo', 'documento'))
        salida[fila.tipo].push(json(fila.documento));
      return salida;
    },
    async recibo(uuid) {
      if (!trx) return local.recibos[uuid];
      const fila = await trx('operacion_recibos').where({ uuid }).first();
      return fila && { ...fila, resultado: json(fila.resultado) };
    },
    async guardarRecibo(uuid, recibo, conflicto) {
      if (!trx) {
        local.recibos[uuid] = recibo;
        if (conflicto) local.conflictos[uuid] = conflicto;
        return;
      }
      await trx('operacion_recibos').insert({
        uuid,
        ...recibo,
        resultado: JSON.stringify(recibo.resultado),
      });
      if (conflicto)
        await trx('operacion_conflictos').insert({
          uuid,
          autor_uuid: recibo.autor_uuid,
          documento: JSON.stringify(conflicto),
        });
    },
    async guardarCambios(cambios) {
      if (!trx) {
        aplicarCambiosOperativos(local.registros, cambios);
        local.eventos.push({ cursor: local.eventos.length + 1, cambios });
        return;
      }
      for (const { tipo, registro } of cambios) {
        const llave = { tipo, uuid: registro.uuid };
        const datos = {
          documento: JSON.stringify(registro),
          folio: tipo === 'remisiones' ? (registro.folioFinal ?? null) : null,
        };
        const actualizado = await trx('operacion_registros').where(llave).update(datos);
        if (!actualizado) await trx('operacion_registros').insert({ ...llave, ...datos });
      }
      await trx('operacion_eventos').insert({ cambios: JSON.stringify(cambios) });
    },
    async pagina(cursor, limite) {
      if (!trx) return local.eventos.slice(cursor, cursor + limite);
      const filas = await trx('operacion_eventos')
        .where('cursor', '>', cursor)
        .orderBy('cursor')
        .limit(limite);
      return filas.map((fila) => ({ cursor: Number(fila.cursor), cambios: json(fila.cambios) }));
    },
    async conflictos(autorUuid) {
      if (!trx)
        return Object.values(local.conflictos).filter(
          (c) => !autorUuid || c.comando.autorUuid === autorUuid,
        );
      const consulta = trx('operacion_conflictos');
      if (autorUuid) consulta.where({ autor_uuid: autorUuid });
      return (await consulta.select('documento')).map(({ documento }) => json(documento));
    },
    async guardarResolucion(conflicto) {
      if (!trx) local.conflictos[conflicto.uuid] = conflicto;
      else
        await trx('operacion_conflictos')
          .where({ uuid: conflicto.uuid })
          .update({ documento: JSON.stringify(conflicto) });
    },
    async siguienteFolio(serie, momento) {
      if (!trx) {
        const numero = (local.series[serie] ?? 0) + 1;
        local.series[serie] = numero;
        return numero;
      }
      const contadores = () => trx('consecutivos_folio');
      await contadores().insert({ serie, valor: 0 }).onConflict('serie').ignore();
      const actual = await contadores().where({ serie }).forUpdate().first();
      const numero = Number(actual.valor) + 1;
      await contadores()
        .where({ serie })
        .update({ valor: numero, actualizado_en: new Date(momento) });
      return numero;
    },
  };
}

export function crearAlmacenOperacion(almacen, catalogo, db) {
  return {
    async leer(funcion) {
      if (db) return db.transaction((trx) => funcion(sesionDatos(null, trx, catalogo)));
      return funcion(sesionDatos(await almacen.leer(), null, catalogo));
    },
    cambiar(funcion) {
      return almacen.cambiar((estado, trx) => funcion(sesionDatos(estado, trx, catalogo)));
    },
  };
}
