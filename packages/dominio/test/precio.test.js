import { describe, expect, it } from 'vitest';
import {
  calcularPesoDesdeImporte,
  centavosDesdeDecimal,
  formatearDinero,
  formatearKilogramos,
} from '../src/index.js';

describe('precio y peso', () => {
  it('convierte el precio decimal sin usar punto flotante', () => {
    expect(centavosDesdeDecimal('185')).toBe(18_500);
    expect(centavosDesdeDecimal('185.00')).toBe(18_500);
  });

  it('reconstruye 0.470 kg desde el importe y el precio verificado', () => {
    expect(
      calcularPesoDesdeImporte({
        importeCentavos: 8695,
        precioKgCentavos: 18_500,
        resolucionGramos: 5,
      }),
    ).toBe(470);
  });

  it('formatea dinero y peso con precisión fija', () => {
    expect(formatearDinero(8695)).toBe('86.95');
    expect(formatearDinero(-5)).toBe('-0.05');
    expect(formatearKilogramos(470)).toBe('0.470');
  });

  it('rechaza precios con más de dos decimales', () => {
    expect(() => centavosDesdeDecimal('185.001')).toThrowError(/decimales/);
  });
});
