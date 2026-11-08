import { exigir } from './errores.js';
import {
  buscarOperativo,
  cambioOperativo,
  comprobarVersion,
  enteroOperativo,
  fechaOperativa,
  motivoOperativo,
  rolesResponsables,
  textoOperativo,
  uuidOperativo,
} from './operacionComun.js';

export const accionesInventario = [
  'CREAR_LOTE',
  'CORREGIR_LOTE',
  'REGISTRAR_MERMA',
  'AJUSTAR_EXISTENCIA',
  'ABRIR_EXISTENCIA',
  'REGISTRAR_DEVOLUCION',
];

export function saldoPorProducto(movimientos, fecha) {
  const saldos = new Map();
  for (const mov of movimientos) {
    if (fecha && mov.fecha > fecha) continue;
    saldos.set(mov.productoUuid, (saldos.get(mov.productoUuid) ?? 0) + mov.direccion * mov.gramos);
  }
  return saldos;
}

function peso(valor) {
  return enteroOperativo(valor, 999_999_999, 'El peso');
}

function movimiento(estado, registro) {
  uuidOperativo(registro.uuid);
  comprobarVersion(
    estado.movimientos.find((m) => m.uuid === registro.uuid),
    0,
  );
  if (registro.reversaDe)
    exigir(
      !estado.movimientos.some((m) => m.reversaDe === registro.reversaDe),
      'REVERSA_DUPLICADA',
      'El movimiento ya fue revertido.',
    );
  return cambioOperativo('movimientos', { version: 1, ...registro });
}

function guardarLote(estado, comando, contexto) {
  const { tipo, agregadoId, versionBase, payload, operacionUuid } = comando;
  const crear = tipo === 'CREAR_LOTE';
  const anterior = estado.lotes.find((l) => l.uuid === agregadoId);
  if (!crear) exigir(anterior, 'REGISTRO_NO_ENCONTRADO', 'El lote no está disponible.');
  comprobarVersion(anterior, versionBase);
  if (crear) comprobarVersion(anterior, 0);
  const productoUuid = anterior?.productoUuid ?? payload.productoUuid;
  buscarOperativo(estado.catalogo.productos, productoUuid, 'El producto', { activo: crear });
  const fecha = anterior?.fecha ?? fechaOperativa(payload.fecha);
  const caducidad = fechaOperativa(payload.caducidad);
  exigir(
    caducidad >= fecha,
    'FECHA_INVALIDA',
    'La caducidad debe ser igual o posterior a la elaboración.',
  );
  const gramos = peso(payload.gramos);
  const cambios = [];
  const motivo = crear ? null : motivoOperativo(payload.motivo);
  const base = {
    productoUuid,
    fecha,
    loteUuid: agregadoId,
    autorUuid: contexto.usuario.id,
    registradoEn: contexto.momento,
  };
  let entradaUuid = anterior?.entradaUuid;
  if (crear || gramos !== anterior.gramos) {
    if (!crear) {
      const entrada = buscarOperativo(estado.movimientos, entradaUuid, 'La entrada anterior');
      cambios.push(
        movimiento(estado, {
          ...base,
          uuid: payload.reversionUuid,
          tipo: 'REVERSA',
          direccion: -1,
          gramos: entrada.gramos,
          reversaDe: entrada.uuid,
          motivo,
        }),
      );
      exigir(
        payload.reversionUuid !== operacionUuid,
        'UUID_INVALIDO',
        'La reversión requiere su propio identificador.',
      );
    }
    entradaUuid = operacionUuid;
    cambios.push(
      movimiento(estado, {
        ...base,
        uuid: entradaUuid,
        tipo: 'PRODUCCION',
        direccion: 1,
        gramos,
        motivo,
      }),
    );
  }
  const lote = {
    ...base,
    uuid: agregadoId,
    version: versionBase + 1,
    caducidad,
    gramos,
    entradaUuid,
    motivo,
    area: textoOperativo(payload.area, 'El área'),
    responsable: textoOperativo(payload.responsable, 'La persona responsable'),
    piezas: enteroOperativo(payload.piezas, 999_999, 'Las piezas', 0),
  };
  return [cambioOperativo('lotes', lote), ...cambios];
}

export function aplicarInventario(estado, comando, contexto) {
  const { tipo, agregadoId, versionBase, payload } = comando;
  if (tipo === 'CREAR_LOTE' || tipo === 'CORREGIR_LOTE')
    return guardarLote(estado, comando, contexto);
  const ajuste = tipo === 'AJUSTAR_EXISTENCIA' || tipo === 'ABRIR_EXISTENCIA';
  exigir(
    !ajuste || rolesResponsables.includes(contexto.usuario.rol),
    'SIN_PERMISO',
    'Solo responsable y administración pueden ajustar existencias.',
  );
  comprobarVersion(null, versionBase);
  const producto = buscarOperativo(estado.catalogo.productos, payload.productoUuid, 'El producto', {
    activo: !ajuste,
  });
  const motivo = motivoOperativo(payload.motivo);
  const fecha = fechaOperativa(payload.fecha);
  const gramos = peso(payload.gramos);
  const base = {
    uuid: agregadoId,
    productoUuid: producto.uuid,
    fecha,
    gramos,
    motivo,
    autorUuid: contexto.usuario.id,
    registradoEn: contexto.momento,
  };
  if (tipo === 'REGISTRAR_MERMA')
    return [movimiento(estado, { ...base, tipo: 'MERMA', direccion: -1 })];
  if (tipo === 'ABRIR_EXISTENCIA') {
    exigir(
      !estado.movimientos.some((m) => m.productoUuid === producto.uuid && m.tipo === 'APERTURA'),
      'APERTURA_EXISTENTE',
      'El producto ya tiene apertura. Registra una corrección mediante ajuste.',
    );
    return [movimiento(estado, { ...base, tipo: 'APERTURA', direccion: 1 })];
  }
  if (tipo === 'AJUSTAR_EXISTENCIA') {
    exigir(
      payload.direccion === 1 || payload.direccion === -1,
      'DIRECCION_INVALIDA',
      'Selecciona si el ajuste suma o resta.',
    );
    return [movimiento(estado, { ...base, tipo: 'AJUSTE', direccion: payload.direccion })];
  }
  const destino = buscarOperativo(estado.catalogo.destinos, payload.destinoUuid, 'El destino');
  const remision = payload.remisionUuid
    ? buscarOperativo(estado.remisiones, payload.remisionUuid, 'La remisión')
    : null;
  exigir(
    !remision ||
      (remision.estado === 'CERRADA' &&
        remision.destinoUuid === destino.uuid &&
        remision.renglones.some((r) => r.productoUuid === producto.uuid)),
    'DEVOLUCION_INVALIDA',
    'La remisión de origen debe estar cerrada e incluir el producto y destino indicados.',
  );
  return [
    movimiento(estado, {
      ...base,
      tipo: 'DEVOLUCION',
      direccion: 1,
      destinoUuid: destino.uuid,
      remisionUuid: remision?.uuid ?? null,
    }),
  ];
}
