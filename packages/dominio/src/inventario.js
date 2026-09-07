import { exigir } from './errores.js';

export const TIPO_MOVIMIENTO = Object.freeze({
  ENTRADA: 'ENTRADA',
  SALIDA: 'SALIDA',
  AJUSTE: 'AJUSTE',
});

export function aplicarMovimiento(saldoGramos, movimiento) {
  exigir(
    Number.isSafeInteger(saldoGramos),
    'SALDO_FORMATO',
    'El saldo debe expresarse en gramos enteros.',
  );
  exigir(
    Object.values(TIPO_MOVIMIENTO).includes(movimiento.tipo),
    'MOVIMIENTO_TIPO',
    'El tipo de movimiento no es válido.',
  );
  exigir(
    Number.isSafeInteger(movimiento.gramos),
    'MOVIMIENTO_FORMATO',
    'El movimiento debe expresarse en gramos enteros.',
  );

  const delta = movimiento.tipo === TIPO_MOVIMIENTO.SALIDA ? -movimiento.gramos : movimiento.gramos;
  const nuevoSaldo = saldoGramos + delta;
  exigir(nuevoSaldo >= 0, 'SALDO_NEGATIVO', 'El movimiento produciría un saldo negativo.');
  return nuevoSaldo;
}
