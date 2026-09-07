import { describe, expect, it } from 'vitest';
import {
  ErrorDominio,
  calcularDigitoControlEan13,
  decodificarEtiqueta,
  validarEan13,
} from '../src/index.js';

describe('etiqueta EAN-13 por importe', () => {
  it('decodifica el PLU e importe del ejemplo validado', () => {
    expect(calcularDigitoControlEan13('201010108695')).toBe('5');
    expect(decodificarEtiqueta('2010101086955')).toEqual({
      codigo: '2010101086955',
      plu: '010101',
      importeCentavos: 8695,
      digitoControl: '5',
    });
  });

  it('rechaza un dígito de control incorrecto', () => {
    expect(() => validarEan13('2010101086954')).toThrowError(ErrorDominio);
    expect(() => validarEan13('2010101086954')).toThrowError(/control/);
  });

  it('rechaza etiquetas que no coinciden con el perfil', () => {
    expect(() => decodificarEtiqueta('7501055300075')).toThrowError(/prefijo/);
  });
});
