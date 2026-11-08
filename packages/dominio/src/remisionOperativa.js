import { decodificarEtiqueta, PERFIL_EAN13_POR_IMPORTE } from './codigoBarras.js';
import { ErrorDominio, exigir } from './errores.js';
import { saldoPorProducto } from './inventarioOperativo.js';
import { calcularPesoDesdeImporte } from './precio.js';
import {
  buscarOperativo,
  cambioOperativo,
  comprobarVersion,
  enteroOperativo,
  fechaOperativa,
  hoyOperativo,
  motivoOperativo,
  rolesResponsables,
  textoOperativo,
  uuidOperativo,
} from './operacionComun.js';

export const accionesRemision = [
  'CREAR_REMISION',
  'EDITAR_REMISION',
  'AGREGAR_RENGLON',
  'QUITAR_RENGLON',
  'CERRAR_REMISION',
  'CANCELAR_REMISION',
];

export const perfilOperativoInicial = Object.freeze({
  ...PERFIL_EAN13_POR_IMPORTE,
  version: 'EAN13-6PLU-5IMP-v1',
  resolucionGramos: 5,
});
const maximoGramos = 999_999_999;
const maximoCentavos = 9_999_999_999;

export function totalesRenglones(renglones) {
  return renglones.reduce(
    (t, r) => ({ gramos: t.gramos + r.gramos, centavos: t.centavos + r.centavos }),
    { gramos: 0, centavos: 0 },
  );
}

export function agruparPartidas(renglones) {
  const grupos = new Map();
  for (const renglon of renglones) {
    const llave = `${renglon.productoUuid}:${renglon.precioUuid}`;
    if (!grupos.has(llave))
      grupos.set(llave, {
        uuid: renglon.partidaUuid,
        productoUuid: renglon.productoUuid,
        productoNombre: renglon.productoNombre,
        precioUuid: renglon.precioUuid,
        precioKgCentavos: renglon.precioKgCentavos,
        renglones: [],
      });
    grupos.get(llave).renglones.push(renglon);
  }
  return [...grupos.values()].map((p) => ({ ...p, ...totalesRenglones(p.renglones) }));
}

export function identificarEtiqueta(codigo, catalogo, perfil = perfilOperativoInicial) {
  let lectura;
  try {
    lectura = decodificarEtiqueta(codigo, perfil);
  } catch (error) {
    if (!(error instanceof ErrorDominio)) throw error;
    throw new ErrorDominio('CODIGO_INVALIDO', error.message);
  }
  const producto = catalogo.productos.find((p) => p.plu === lectura.plu);
  exigir(
    producto && !/^0+$/.test(lectura.plu),
    'PLU_DESCONOCIDO',
    'El código no identifica un producto. Usa la captura manual y conserva el código leído.',
  );
  exigir(producto.activo, 'PLU_INACTIVO', 'El PLU pertenece a un producto inactivo.');
  return {
    ...lectura,
    producto,
    precios: catalogo.precios.filter((p) => p.producto_uuid === producto.uuid),
  };
}

function importeCalculado(gramos, precioKgCentavos) {
  const total = (BigInt(gramos) * BigInt(precioKgCentavos) + 500n) / 1000n;
  return Number(total);
}

export function calcularRenglon(estado, datos, contexto, anteriores = []) {
  const perfil = contexto.perfil ?? perfilOperativoInicial;
  exigir(
    datos.origen === 'ESCANEO' || datos.origen === 'MANUAL',
    'ORIGEN_INVALIDO',
    'Selecciona el modo de captura.',
  );
  const codigo = datos.codigo ? textoOperativo(datos.codigo, 'El código leído', 80) : null;
  const escaneo = datos.origen === 'ESCANEO';
  if (escaneo && datos.versionPerfil !== undefined)
    exigir(
      datos.versionPerfil === perfil.version,
      'PERFIL_DESACTUALIZADO',
      'El perfil de báscula cambió. Revisa el código con el perfil actualizado.',
    );
  const lectura = escaneo ? identificarEtiqueta(codigo, estado.catalogo, perfil) : null;
  const producto =
    lectura?.producto ??
    buscarOperativo(estado.catalogo.productos, datos.productoUuid, 'El producto', { activo: true });
  if (datos.versionProducto !== undefined) comprobarVersion(producto, datos.versionProducto);
  const repetida = Boolean(codigo && anteriores.some((r) => r.codigo === codigo));
  exigir(
    !repetida || datos.confirmarRepeticion === true,
    'ETIQUETA_DUPLICADA',
    'El código ya aparece en esta remisión. Confirma si corresponde a otra pieza.',
  );
  const precio = estado.catalogo.precios.find(
    (p) => p.uuid === datos.precioUuid && p.producto_uuid === producto.uuid,
  );
  const partida = anteriores.find(
    (r) => r.productoUuid === producto.uuid && r.precioUuid === (precio?.uuid ?? null),
  );
  const base = {
    uuid: uuidOperativo(datos.renglonUuid),
    partidaUuid: partida?.partidaUuid ?? uuidOperativo(datos.partidaUuid),
    productoUuid: producto.uuid,
    productoNombre: producto.nombre,
    lineaUuid: producto.linea_uuid,
    autorUuid: contexto.usuario.id,
    codigo,
    origen: datos.origen,
    repetida,
  };
  if (!escaneo && !datos.precioUuid && datos.gramos !== undefined && datos.centavos !== undefined) {
    return {
      ...base,
      precioUuid: null,
      precioKgCentavos: null,
      fuentePrecio: null,
      perfilVersion: null,
      verificadoEn: null,
      motivoRevision: null,
      gramos: enteroOperativo(datos.gramos, maximoGramos, 'El peso'),
      centavos: enteroOperativo(datos.centavos, maximoCentavos, 'El importe'),
    };
  }
  exigir(
    precio,
    'PLU_SIN_PRECIO',
    'Selecciona la versión del precio aplicado a la etiqueta o la captura.',
  );
  exigir(
    typeof datos.fuentePrecio === 'string' && datos.fuentePrecio.trim(),
    'PRECIO_ETIQUETA_NO_VERIFICADO',
    'Indica la fuente que confirma el precio aplicado.',
  );
  const fuentePrecio = textoOperativo(datos.fuentePrecio, 'La fuente del precio', 160);
  const precioKgCentavos = precio.precio_kg_centavos;

  const importeEntrada = lectura?.importeCentavos ?? datos.centavos;
  const pesoEntrada = escaneo ? undefined : datos.gramos;
  if (importeEntrada !== undefined) enteroOperativo(importeEntrada, maximoCentavos, 'El importe');
  const gramos = enteroOperativo(
    pesoEntrada ??
      calcularPesoDesdeImporte({
        importeCentavos: importeEntrada,
        precioKgCentavos,
        resolucionGramos: perfil.resolucionGramos,
      }),
    maximoGramos,
    'El peso',
  );
  const esperado = importeCalculado(gramos, precioKgCentavos);
  const centavos = enteroOperativo(importeEntrada ?? esperado, maximoCentavos, 'El importe');
  const diferencia = Math.abs(centavos - esperado);
  exigir(
    diferencia <= 1 || (typeof datos.motivoRevision === 'string' && datos.motivoRevision.trim()),
    'TOLERANCIA_PRECIO',
    'El peso y el importe difieren del precio por más de un centavo. Revisa los valores o confirma con motivo.',
    { gramos, centavos, diferencia },
  );
  return {
    ...base,
    precioUuid: precio.uuid,
    precioKgCentavos,
    fuentePrecio,
    verificadoEn: contexto.momento,
    gramos,
    centavos,
    perfilVersion: escaneo ? perfil.version : null,
    motivoRevision: diferencia > 1 ? motivoOperativo(datos.motivoRevision) : null,
  };
}

export function faltantesRemision(remision, movimientos) {
  const saldos = saldoPorProducto(movimientos, remision.fecha);
  const faltantes = new Map();
  for (const r of remision.renglones) {
    const saldo = (saldos.get(r.productoUuid) ?? 0) - r.gramos;
    saldos.set(r.productoUuid, saldo);
    if (saldo < 0)
      faltantes.set(r.productoUuid, {
        productoUuid: r.productoUuid,
        productoNombre: r.productoNombre,
        gramos: -saldo,
      });
  }
  return [...faltantes.values()];
}

function encabezado(estado, datos) {
  const destino = buscarOperativo(estado.catalogo.destinos, datos.destinoUuid, 'El destino', {
    activo: true,
  });
  if (datos.versionDestino !== undefined) comprobarVersion(destino, datos.versionDestino);
  return {
    fecha: fechaOperativa(datos.fecha),
    destinoUuid: destino.uuid,
    destinoNombre: destino.nombre,
    folioPapel: datos.folioPapel ? textoOperativo(datos.folioPapel, 'El folio de papel', 40) : null,
  };
}

function cerrar(estado, remision, comando, contexto) {
  exigir(
    remision.renglones.length,
    'REMISION_VACIA',
    'Agrega al menos un renglón antes de cerrar.',
  );
  exigir(
    remision.renglones.every((r) => r.precioUuid && r.fuentePrecio),
    'PARTIDA_SIN_PRECIO',
    'Completa la verificación del precio de todos los renglones antes de cerrar.',
  );
  const { payload, ocurridaEn } = comando;
  if (remision.revisarFecha)
    exigir(
      payload.confirmarFecha === true,
      'REVISION_REQUERIDA',
      'Revisa los renglones después del cambio de fecha.',
    );
  const folioProvisional = `PROV-${remision.uuid.toUpperCase()}`;
  const documento = {
    uuid: uuidOperativo(payload.documentoUuid),
    remisionUuid: remision.uuid,
    tipo: 'PROVISIONAL',
    folio: folioProvisional,
    emitidoEn: ocurridaEn,
    plantilla: 'envio-carta-v1',
  };
  comprobarVersion(
    estado.documentos.find((d) => d.uuid === documento.uuid),
    0,
  );
  const faltantes = faltantesRemision(remision, estado.movimientos);
  const existentes = new Set(estado.movimientos.map((m) => m.uuid));
  const salidas = remision.renglones.map((r) => {
    exigir(
      !existentes.has(r.uuid),
      'UUID_INVALIDO',
      'Un renglón coincide con un movimiento existente.',
    );
    return cambioOperativo('movimientos', {
      uuid: r.uuid,
      version: 1,
      tipo: 'SALIDA',
      direccion: -1,
      productoUuid: r.productoUuid,
      gramos: r.gramos,
      fecha: remision.fecha,
      registradoEn: contexto.momento,
      autorUuid: contexto.usuario.id,
      destinoUuid: remision.destinoUuid,
      remisionUuid: remision.uuid,
      renglonUuid: r.uuid,
    });
  });
  return [
    cambioOperativo('remisiones', {
      ...remision,
      estado: 'CERRADA',
      cerradaEn: ocurridaEn,
      folioProvisional,
      provisionalUuid: documento.uuid,
      faltantes,
    }),
    cambioOperativo('documentos', documento),
    ...salidas,
  ];
}

function cancelar(estado, remision, comando, contexto) {
  const { motivo, reversiones } = comando.payload;
  exigir(remision.estado !== 'CANCELADA', 'REMISION_CANCELADA', 'La remisión ya está cancelada.');
  const cerrada = remision.estado === 'CERRADA';
  exigir(
    cerrada
      ? rolesResponsables.includes(contexto.usuario.rol)
      : remision.autorUuid === contexto.usuario.id ||
          rolesResponsables.includes(contexto.usuario.rol),
    'SIN_PERMISO',
    'Tu cuenta no puede cancelar esta remisión.',
  );
  const justificacion = motivoOperativo(motivo);
  const fecha = hoyOperativo(new Date(comando.ocurridaEn));
  const reversas = [];
  if (cerrada) {
    exigir(
      Array.isArray(reversiones) && reversiones.length === remision.renglones.length,
      'REVERSA_INVALIDA',
      'La cancelación requiere un identificador de reversión por salida.',
    );
    const movimientos = new Map(estado.movimientos.map((m) => [m.uuid, m]));
    const revertidos = new Set(estado.movimientos.map((m) => m.reversaDe));
    const ids = new Set();
    remision.renglones.forEach((r, indice) => {
      const salida = movimientos.get(r.uuid);
      const uuid = uuidOperativo(reversiones[indice]);
      exigir(
        salida?.remisionUuid === remision.uuid &&
          !revertidos.has(r.uuid) &&
          !ids.has(uuid) &&
          !movimientos.has(uuid),
        'REVERSA_INVALIDA',
        'No se puede identificar una salida pendiente de reversión.',
      );
      ids.add(uuid);
      reversas.push(
        cambioOperativo('movimientos', {
          ...salida,
          uuid,
          tipo: 'REVERSA',
          direccion: 1,
          fecha,
          registradoEn: contexto.momento,
          autorUuid: contexto.usuario.id,
          motivo: justificacion,
          reversaDe: salida.uuid,
        }),
      );
    });
  }
  return [
    cambioOperativo('remisiones', {
      ...remision,
      estado: 'CANCELADA',
      cancelacion: {
        motivo: justificacion,
        fecha,
        autorUuid: contexto.usuario.id,
        momento: contexto.momento,
      },
    }),
    ...reversas,
  ];
}

export function aplicarRemision(estado, comando, contexto) {
  const { tipo, agregadoId, payload, versionBase } = comando;
  const anterior = estado.remisiones.find((r) => r.uuid === agregadoId);
  if (tipo === 'CREAR_REMISION') {
    comprobarVersion(anterior, 0);
    comprobarVersion(null, versionBase);
    return [
      cambioOperativo('remisiones', {
        uuid: agregadoId,
        version: 1,
        estado: 'BORRADOR',
        autorUuid: contexto.usuario.id,
        renglones: [],
        creadaEn: comando.ocurridaEn,
        ...encabezado(estado, payload),
      }),
    ];
  }
  exigir(anterior, 'REGISTRO_NO_ENCONTRADO', 'La remisión no está disponible.');
  comprobarVersion(anterior, versionBase);
  const remision = { ...anterior, version: anterior.version + 1 };
  if (tipo === 'CANCELAR_REMISION') return cancelar(estado, remision, comando, contexto);
  exigir(
    anterior.estado === 'BORRADOR',
    'REMISION_CERRADA',
    'Solo se pueden editar y cerrar remisiones en borrador.',
  );
  if (tipo === 'EDITAR_REMISION') {
    const datos = encabezado(estado, payload);
    return [
      cambioOperativo('remisiones', {
        ...remision,
        ...datos,
        revisarFecha:
          remision.revisarFecha ||
          (remision.renglones.length > 0 && remision.fecha !== datos.fecha),
      }),
    ];
  }
  if (tipo === 'CERRAR_REMISION') return cerrar(estado, remision, comando, contexto);
  let renglones;
  if (tipo === 'AGREGAR_RENGLON') {
    exigir(
      remision.renglones.length < 2000,
      'REMISION_LIMITE',
      'La remisión admite hasta 2000 renglones.',
    );
    const renglon = calcularRenglon(estado, payload, contexto, remision.renglones);
    exigir(
      !remision.renglones.some((r) => r.uuid === renglon.uuid),
      'UUID_INVALIDO',
      'El renglón ya existe.',
    );
    renglones = [...remision.renglones, renglon];
  } else {
    buscarOperativo(remision.renglones, payload.renglonUuid, 'El renglón');
    renglones = remision.renglones.filter((r) => r.uuid !== payload.renglonUuid);
  }
  return [cambioOperativo('remisiones', { ...remision, renglones })];
}
