import { exigir } from './errores.js';
import { accionesInventario, aplicarInventario } from './inventarioOperativo.js';
import { enteroOperativo, rolesOperativos, uuidOperativo } from './operacionComun.js';

export function validarComandoOperativo(comando) {
  exigir(
    comando && typeof comando === 'object' && !Array.isArray(comando),
    'OPERACION_INVALIDA',
    'Se requiere una operación.',
  );
  for (const campo of ['operacionUuid', 'agregadoId', 'autorUuid', 'dispositivoUuid'])
    uuidOperativo(comando[campo]);
  enteroOperativo(comando.secuencia, Number.MAX_SAFE_INTEGER, 'La secuencia');
  enteroOperativo(comando.versionBase, Number.MAX_SAFE_INTEGER - 1, 'La versión', 0);
  exigir(
    typeof comando.ocurridaEn === 'string' &&
      comando.ocurridaEn.length <= 32 &&
      Number.isFinite(Date.parse(comando.ocurridaEn)),
    'OPERACION_INVALIDA',
    'El momento de captura no es válido.',
  );
  exigir(
    comando.payload && typeof comando.payload === 'object' && !Array.isArray(comando.payload),
    'OPERACION_INVALIDA',
    'Se requieren los datos de la operación.',
  );
  exigir(
    accionesInventario.includes(comando.tipo),
    'OPERACION_TIPO',
    'La operación no está habilitada.',
  );
}

export function aplicarComandoOperativo(estado, comando, contexto) {
  validarComandoOperativo(comando);
  exigir(
    rolesOperativos.includes(contexto.usuario.rol) && contexto.usuario.id === comando.autorUuid,
    'SIN_PERMISO',
    'La sesión actual debe corresponder a la persona que capturó la operación.',
  );
  return aplicarInventario(estado, comando, contexto);
}
