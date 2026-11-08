import { exigir } from './errores.js';

export const rolesOperativos = ['operador', 'responsable', 'admin'];
export const rolesResponsables = ['responsable', 'admin'];
export const tablasOperativas = ['lotes', 'movimientos', 'remisiones', 'documentos'];

const calendarioMexico = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Mexico_City' });

export function hoyOperativo(fecha = new Date()) {
  return calendarioMexico.format(fecha);
}

export function fechaOperativa(valor) {
  exigir(
    typeof valor === 'string' &&
      /^[1-9]\d{3}-\d{2}-\d{2}$/.test(valor) &&
      !Number.isNaN(Date.parse(`${valor}T00:00:00Z`)) &&
      new Date(`${valor}T00:00:00Z`).toISOString().slice(0, 10) === valor,
    'FECHA_INVALIDA',
    'Indica una fecha válida.',
  );
  return valor;
}

export function uuidOperativo(valor) {
  exigir(
    typeof valor === 'string' &&
      /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(valor) &&
      valor.length === 36,
    'UUID_INVALIDO',
    'El identificador del registro no es válido.',
  );
  return valor;
}

export function textoOperativo(valor, etiqueta, maximo = 120) {
  const texto = typeof valor === 'string' ? valor.trim() : '';
  exigir(
    texto && texto.length <= maximo && !/\p{Cc}/u.test(texto),
    'CAMPO_INVALIDO',
    `${etiqueta} debe tener entre 1 y ${maximo} caracteres.`,
  );
  return texto;
}

export function motivoOperativo(valor) {
  exigir(typeof valor === 'string' && valor.trim(), 'MOTIVO_REQUERIDO', 'Indica el motivo.');
  return textoOperativo(valor, 'El motivo', 500);
}

export function enteroOperativo(valor, maximo, etiqueta, minimo = 1) {
  exigir(
    Number.isSafeInteger(valor) && valor >= minimo && valor <= maximo,
    'CANTIDAD_INVALIDA',
    `${etiqueta} está fuera del intervalo permitido.`,
  );
  return valor;
}

export function gramosDesdeDecimal(valor) {
  const texto = String(valor ?? '').trim();
  exigir(
    /^\d{1,6}(?:\.\d{1,3})?$/.test(texto),
    'PESO_FORMATO',
    'Indica el peso en kg con hasta tres decimales.',
  );
  const [entero, decimales = ''] = texto.split('.');
  return enteroOperativo(
    Number(entero) * 1000 + Number(decimales.padEnd(3, '0')),
    999_999_999,
    'El peso',
  );
}

export function buscarOperativo(lista, uuid, nombre, { activo = false } = {}) {
  const registro = lista.find((item) => item.uuid === uuid);
  exigir(registro, 'REGISTRO_NO_ENCONTRADO', `${nombre} no existe en el catálogo o historial.`);
  exigir(!activo || registro.activo, 'REGISTRO_INACTIVO', `${nombre} está inactivo.`);
  return registro;
}

export function comprobarVersion(registro, base) {
  const versionServidor = registro?.version ?? 0;
  exigir(
    base === versionServidor,
    'CONFLICTO_SINCRONIZACION',
    'El registro cambió. Revisa la versión del servidor antes de volver a aplicar el cambio.',
    { versionBase: base, versionServidor },
  );
}

export function cambioOperativo(tipo, registro) {
  return { tipo, registro };
}

export function aplicarCambiosOperativos(estado, cambios) {
  for (const { tipo, registro, agregarRenglon, quitarRenglon } of cambios) {
    const lista = estado[tipo];
    const indice = lista.findIndex(({ uuid }) => uuid === registro.uuid);
    if ((estado.bajas?.[tipo]?.[registro.uuid] ?? 0) >= (registro.version ?? 1)) continue;
    if (registro.eliminado === true) {
      if ((lista[indice]?.version ?? 0) > registro.version) continue;
      estado.bajas ??= {};
      (estado.bajas[tipo] ??= {})[registro.uuid] = registro.version;
      if (indice !== -1) lista.splice(indice, 1);
      continue;
    }
    if (agregarRenglon || quitarRenglon) {
      const anterior = lista[indice];
      if (anterior?.version >= registro.version) continue;
      exigir(
        anterior?.version === registro.version - 1,
        'REPLICA_INCOMPLETA',
        'Falta una versión de la remisión en la réplica.',
      );
      const renglones = agregarRenglon
        ? [...anterior.renglones, agregarRenglon]
        : anterior.renglones.filter((r) => r.uuid !== quitarRenglon);
      lista[indice] = { ...registro, renglones };
      continue;
    }
    if (indice === -1) lista.push(registro);
    else if ((lista[indice].version ?? 1) <= (registro.version ?? 1)) lista[indice] = registro;
  }
  return estado;
}
