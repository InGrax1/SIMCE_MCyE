import { describe, expect, it } from 'vitest';
import { TIPO_MOVIMIENTO, aplicarMovimiento } from '../src/index.js';

describe('inventario', () => {
  it('aplica entradas, salidas y ajustes en gramos enteros', () => {
    const conEntrada = aplicarMovimiento(0, { tipo: TIPO_MOVIMIENTO.ENTRADA, gramos: 1_000 });
    const conSalida = aplicarMovimiento(conEntrada, { tipo: TIPO_MOVIMIENTO.SALIDA, gramos: 470 });
    expect(aplicarMovimiento(conSalida, { tipo: TIPO_MOVIMIENTO.AJUSTE, gramos: 20 })).toBe(550);
  });

  it('impide inventario negativo', () => {
    expect(() => aplicarMovimiento(10, { tipo: TIPO_MOVIMIENTO.SALIDA, gramos: 20 })).toThrowError(
      /saldo negativo/,
    );
  });
});
