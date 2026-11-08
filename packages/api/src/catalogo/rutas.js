import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { PERFIL_EAN13_POR_IMPORTE } from '@simce/dominio';
import { ErrorApi } from '../errores.js';

const tiposCatalogo = ['lineas', 'especies', 'destinos'];
const ordenarNombre = (a, b) => a.nombre.localeCompare(b.nombre, 'es-MX');
const compararNombre = new Intl.Collator('es-MX', { sensitivity: 'base' });
const fechaMexico = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Mexico_City' });
const longitudPlu = PERFIL_EAN13_POR_IMPORTE.longitudPlu;
const formatoPlu = new RegExp(`^\\d{${longitudPlu}}$`);
const pluGenerico = '0'.repeat(longitudPlu);
const administran = ['responsable', 'admin'];
const operan = ['operador', ...administran];
const rolesInternos = ['editor', ...operan];

function texto(valor, maximo, etiqueta) {
  const limpio = typeof valor === 'string' ? valor.trim() : '';
  if (!limpio || limpio.length > maximo || /\p{Cc}/u.test(limpio))
    throw new ErrorApi(
      422,
      'CAMPO_INVALIDO',
      `${etiqueta} debe tener de 1 a ${maximo} caracteres.`,
    );
  return limpio;
}

function fechaValida(fecha) {
  const patron = /^[1-9]\d{3}-\d{2}-\d{2}$/;
  if (typeof fecha === 'string' && patron.test(fecha)) {
    const dia = new Date(`${fecha}T00:00:00Z`);
    if (!Number.isNaN(dia.valueOf()) && dia.toISOString().startsWith(fecha)) return fecha;
  }
  throw new ErrorApi(422, 'FECHA_INVALIDA', 'Indica una fecha válida con formato AAAA-MM-DD.');
}

function diaAnterior(fecha) {
  return new Date(Date.parse(`${fecha}T00:00:00Z`) - 86400_000).toISOString().slice(0, 10);
}

function preciosProducto({ precios }, uuid) {
  return precios
    .filter((precio) => precio.producto_uuid === uuid)
    .sort((a, b) => a.vigente_desde.localeCompare(b.vigente_desde))
    .map((precio, indice, lista) => ({
      ...precio,
      vigente_hasta: lista[indice + 1] ? diaAnterior(lista[indice + 1].vigente_desde) : null,
    }));
}

function precioAplicable(catalogo, uuid, fecha) {
  return preciosProducto(catalogo, uuid).findLast((p) => p.vigente_desde <= fecha) ?? null;
}

function buscarPorUuid(lista, uuid) {
  const fila = lista.find((elemento) => elemento.uuid === uuid);
  if (!fila) throw new ErrorApi(404, 'NO_ENCONTRADO', 'El registro no existe en el catálogo.');
  return fila;
}

function camposEdicion(anterior, datos) {
  if (datos.version !== anterior.version)
    throw new ErrorApi(409, 'VERSION_DESACTUALIZADA', 'El registro cambió. Actualiza el catálogo.');
  if (typeof datos.activo !== 'boolean')
    throw new ErrorApi(422, 'ESTADO_INVALIDO', 'Indica si el registro queda activo.');
  return { activo: datos.activo, version: anterior.version + 1 };
}

function cambioCatalogo(catalogo, tipo, datos, uuid) {
  if (!tiposCatalogo.includes(tipo))
    throw new ErrorApi(404, 'CATALOGO_DESCONOCIDO', 'Ese catálogo no existe.');
  const anterior = uuid ? buscarPorUuid(catalogo[tipo], uuid) : null;
  const campos = anterior ? camposEdicion(anterior, datos) : { activo: true, version: 1 };
  const nombre = texto(datos.nombre, 120, 'El nombre');
  if (
    catalogo[tipo].some(
      (item) => item !== anterior && compararNombre.compare(item.nombre, nombre) === 0,
    )
  )
    throw new ErrorApi(409, 'NOMBRE_DUPLICADO', 'Ya existe un registro con ese nombre.');
  const referencia = tipo === 'lineas' ? 'linea_uuid' : 'especie_uuid';
  if (
    anterior &&
    tipo !== 'destinos' &&
    !campos.activo &&
    catalogo.productos.some((p) => p.activo && p[referencia] === anterior.uuid)
  )
    throw new ErrorApi(409, 'CATALOGO_EN_USO', 'Hay productos activos que usan este registro.');
  return {
    tipo,
    anterior,
    fila: { uuid: anterior?.uuid ?? randomUUID(), nombre, ...campos },
    accion: anterior ? 'ACTUALIZAR_CATALOGO_OPERATIVO' : 'CREAR_CATALOGO_OPERATIVO',
  };
}

function cambioProducto(catalogo, datos, uuid) {
  const anterior = uuid ? buscarPorUuid(catalogo.productos, uuid) : null;
  const campos = anterior ? camposEdicion(anterior, datos) : { activo: true, version: 1 };
  const plu = anterior?.plu ?? datos.plu;
  if (anterior && datos.plu !== undefined && datos.plu !== plu)
    throw new ErrorApi(422, 'PLU_INMUTABLE', 'El PLU asignado al producto se conserva.');
  if (
    typeof plu !== 'string' ||
    plu.length !== longitudPlu ||
    !formatoPlu.test(plu) ||
    plu === pluGenerico
  )
    throw new ErrorApi(
      422,
      'PLU_INVALIDO',
      `Escribe un PLU de ${longitudPlu} dígitos que no sea ${pluGenerico}.`,
    );
  if (!anterior && catalogo.productos.some((producto) => producto.plu === plu))
    throw new ErrorApi(409, 'PLU_DUPLICADO', 'Ese PLU ya está asignado a un producto.');
  const linea = catalogo.lineas.find((item) => item.uuid === datos.linea_uuid);
  const especie = catalogo.especies.find((item) => item.uuid === datos.especie_uuid);
  if (!linea || !especie || (campos.activo && (!linea.activo || !especie.activo)))
    throw new ErrorApi(
      422,
      'CLASIFICACION_INVALIDA',
      'Selecciona una línea y una especie activas.',
    );
  return {
    tipo: 'productos',
    anterior,
    fila: {
      uuid: anterior?.uuid ?? randomUUID(),
      plu,
      nombre: texto(datos.nombre, 120, 'El nombre'),
      presentacion: texto(datos.presentacion, 80, 'La presentación'),
      linea_uuid: linea.uuid,
      especie_uuid: especie.uuid,
      ...campos,
    },
    accion: anterior ? 'ACTUALIZAR_PRODUCTO_OPERATIVO' : 'CREAR_PRODUCTO_OPERATIVO',
  };
}

function nuevoPrecio(catalogo, uuid, datos) {
  buscarPorUuid(catalogo.productos, uuid);
  const { precio_kg_centavos, revision_documentos } = datos;
  if (
    !Number.isInteger(precio_kg_centavos) ||
    precio_kg_centavos < 1 ||
    precio_kg_centavos > 9_999_999_999
  )
    throw new ErrorApi(
      422,
      'PRECIO_RANGO',
      'Indica un precio positivo en centavos y de hasta $99,999,999.99.',
    );
  const vigente_desde = fechaValida(datos.vigente_desde);
  const retroactivo = vigente_desde < fechaMexico.format();
  const motivo = retroactivo || datos.motivo ? texto(datos.motivo, 500, 'El motivo') : null;
  if (retroactivo && revision_documentos !== true)
    throw new ErrorApi(
      422,
      'REVISION_REQUERIDA',
      'Confirma la revisión de los documentos afectados.',
    );
  if (catalogo.precios.some((p) => p.producto_uuid === uuid && p.vigente_desde === vigente_desde))
    throw new ErrorApi(
      409,
      'VIGENCIA_DUPLICADA',
      'El producto ya tiene un precio con esa fecha de inicio.',
    );
  return {
    tipo: 'precios',
    fila: {
      uuid: randomUUID(),
      producto_uuid: uuid,
      precio_kg_centavos,
      vigente_desde,
      motivo,
      revision_documentos: retroactivo,
    },
    accion: 'REGISTRAR_PRECIO_OPERATIVO',
  };
}

export function crearRutasCatalogo({ auth, catalogo }) {
  const router = Router();
  const escribir = [auth.permitir(administran), auth.origen];
  router.use(
    ['/catalogos-operativos', '/productos'],
    auth.identificar,
    auth.permitir(rolesInternos),
  );

  router.get('/catalogos-operativos', async (_req, res) => {
    const estado = await catalogo.leer();
    res.json(
      Object.fromEntries(tiposCatalogo.map((tipo) => [tipo, estado[tipo].sort(ordenarNombre)])),
    );
  });
  router.post('/catalogos-operativos/:tipo', escribir, async (req, res) => {
    res
      .status(201)
      .json(
        await catalogo.guardar(req.usuario, (estado) =>
          cambioCatalogo(estado, req.params.tipo, req.body ?? {}),
        ),
      );
  });
  router.patch('/catalogos-operativos/:tipo/:uuid', escribir, async (req, res) => {
    res.json(
      await catalogo.guardar(req.usuario, (estado) =>
        cambioCatalogo(estado, req.params.tipo, req.body ?? {}, req.params.uuid),
      ),
    );
  });
  router.get('/productos', async (req, res) => {
    const fecha = fechaValida(req.query.fecha ?? fechaMexico.format());
    const estado = await catalogo.leer();
    res.json({
      fecha,
      productos: estado.productos.sort(ordenarNombre).map((p) => ({
        ...p,
        unidad: 'kg',
        precio: precioAplicable(estado, p.uuid, fecha),
      })),
    });
  });
  router.get('/productos/plu/:plu', auth.permitir(operan), async (req, res) => {
    const estado = await catalogo.leer();
    const producto = estado.productos.find((p) => p.plu === req.params.plu);
    if (!producto)
      throw new ErrorApi(404, 'PLU_DESCONOCIDO', 'El PLU no identifica un producto del catálogo.');
    if (!producto.activo) throw new ErrorApi(409, 'PLU_INACTIVO', 'El producto está desactivado.');
    res.json({
      ...producto,
      unidad: 'kg',
      precio: precioAplicable(estado, producto.uuid, fechaMexico.format()),
    });
  });
  router.post('/productos', escribir, async (req, res) => {
    const producto = await catalogo.guardar(req.usuario, (estado) =>
      cambioProducto(estado, req.body ?? {}),
    );
    res.status(201).json({ ...producto, unidad: 'kg' });
  });
  router.patch('/productos/:uuid', escribir, async (req, res) => {
    const producto = await catalogo.guardar(req.usuario, (estado) =>
      cambioProducto(estado, req.body ?? {}, req.params.uuid),
    );
    res.json({ ...producto, unidad: 'kg' });
  });
  router.get('/productos/:uuid/precios', async (req, res) => {
    const estado = await catalogo.leer();
    buscarPorUuid(estado.productos, req.params.uuid);
    res.json(preciosProducto(estado, req.params.uuid));
  });
  router.post('/productos/:uuid/precios', escribir, async (req, res) => {
    res
      .status(201)
      .json(
        await catalogo.guardar(req.usuario, (estado) =>
          nuevoPrecio(estado, req.params.uuid, req.body ?? {}),
        ),
      );
  });
  return router;
}
