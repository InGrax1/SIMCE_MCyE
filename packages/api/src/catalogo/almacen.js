import { auditar } from '../cms/contenido.js';

const tablas = {
  lineas: 'lineas_producto',
  especies: 'especies',
  destinos: 'destinos',
  productos: 'productos_operativos',
  precios: 'precios_producto',
};

async function leerTablas(trx) {
  const entradas = await Promise.all(
    Object.entries(tablas).map(async ([tipo, tabla]) => {
      const consulta = trx(tabla).select('*');
      if (tipo === 'precios') consulta.select(trx.raw('CAST(vigente_desde AS CHAR) AS fecha_iso'));
      const filas = await consulta;
      return [
        tipo,
        tipo === 'precios'
          ? filas.map(({ fecha_iso, ...fila }) => ({
              ...fila,
              vigente_desde: fecha_iso,
              precio_kg_centavos: Number(fila.precio_kg_centavos),
              revision_documentos: Boolean(fila.revision_documentos),
            }))
          : filas.map((fila) => ({ ...fila, activo: Boolean(fila.activo) })),
      ];
    }),
  );
  return Object.fromEntries(entradas);
}

const catalogoVacio = () => Object.fromEntries(Object.keys(tablas).map((tipo) => [tipo, []]));

export function crearAlmacenCatalogo(almacen, db) {
  return {
    async leer() {
      if (db) return db.transaction(leerTablas);
      return (await almacen.leer()).catalogoOperativo ?? catalogoVacio();
    },
    guardar(usuario, preparar) {
      return almacen.cambiar(async (estado, trx) => {
        const catalogo = trx
          ? await leerTablas(trx)
          : (estado.catalogoOperativo ??= catalogoVacio());
        const { tipo, fila, accion, anterior } = preparar(catalogo);
        if (trx) {
          const tabla = trx(tablas[tipo]);
          if (anterior) await tabla.where({ uuid: anterior.uuid }).update(fila);
          else await tabla.insert(fila);
        } else if (anterior) catalogo[tipo][catalogo[tipo].indexOf(anterior)] = fila;
        else catalogo[tipo].push(fila);
        auditar(estado, usuario, accion, fila.uuid);
        return fila;
      });
    },
  };
}
