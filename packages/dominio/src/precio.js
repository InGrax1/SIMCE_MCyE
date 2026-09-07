import { exigir } from './errores.js';

export function centavosDesdeDecimal(valor) {
  const texto = String(valor ?? '').trim();
  exigir(
    /^\d+(?:\.\d{1,2})?$/.test(texto),
    'PRECIO_FORMATO',
    'El precio debe tener hasta dos decimales.',
  );

  const [enteros, decimales = ''] = texto.split('.');
  const centavos = Number(enteros) * 100 + Number(decimales.padEnd(2, '0'));
  exigir(
    Number.isSafeInteger(centavos) && centavos > 0,
    'PRECIO_RANGO',
    'El precio debe ser mayor que cero.',
  );
  return centavos;
}

function redondearDivisionPositiva(numerador, denominador) {
  return (numerador + denominador / 2n) / denominador;
}

export function calcularPesoDesdeImporte({
  importeCentavos,
  precioKgCentavos,
  resolucionGramos = 5,
}) {
  exigir(
    Number.isSafeInteger(importeCentavos) && importeCentavos > 0,
    'IMPORTE_RANGO',
    'El importe debe ser un entero positivo en centavos.',
  );
  exigir(
    Number.isSafeInteger(precioKgCentavos) && precioKgCentavos > 0,
    'PRECIO_RANGO',
    'El precio verificado debe ser un entero positivo en centavos.',
  );
  exigir(
    Number.isSafeInteger(resolucionGramos) && resolucionGramos > 0,
    'RESOLUCION_RANGO',
    'La resolución de la báscula debe ser un entero positivo en gramos.',
  );

  const unidadesResolucion = redondearDivisionPositiva(
    BigInt(importeCentavos) * 1000n,
    BigInt(precioKgCentavos) * BigInt(resolucionGramos),
  );
  const gramos = Number(unidadesResolucion * BigInt(resolucionGramos));

  exigir(gramos > 0, 'PESO_RANGO', 'El peso calculado debe ser mayor que cero.');
  return gramos;
}

export function formatearDinero(centavos) {
  exigir(
    Number.isSafeInteger(centavos),
    'DINERO_FORMATO',
    'El dinero debe expresarse en centavos enteros.',
  );
  const signo = centavos < 0 ? '-' : '';
  const absoluto = Math.abs(centavos);
  return `${signo}${Math.floor(absoluto / 100)}.${String(absoluto % 100).padStart(2, '0')}`;
}

export function formatearKilogramos(gramos) {
  exigir(
    Number.isSafeInteger(gramos) && gramos >= 0,
    'PESO_FORMATO',
    'El peso debe expresarse en gramos enteros.',
  );
  return (gramos / 1000).toFixed(3);
}
