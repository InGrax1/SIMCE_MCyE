import { exigir } from './errores.js';

export const PERFIL_EAN13_POR_IMPORTE = Object.freeze({
  longitud: 13,
  prefijo: '2',
  inicioPlu: 1,
  longitudPlu: 6,
  inicioImporte: 7,
  longitudImporte: 5,
  divisorImporte: 100,
});

export function calcularDigitoControlEan13(primerosDoceDigitos) {
  exigir(
    /^\d{12}$/.test(primerosDoceDigitos),
    'EAN_LONGITUD',
    'El cuerpo EAN debe tener 12 dígitos.',
  );

  const suma = [...primerosDoceDigitos].reduce((total, digito, indice) => {
    const factor = indice % 2 === 0 ? 1 : 3;
    return total + Number(digito) * factor;
  }, 0);

  return String((10 - (suma % 10)) % 10);
}

export function validarEan13(codigo) {
  const normalizado = String(codigo ?? '').trim();
  exigir(
    /^\d{13}$/.test(normalizado),
    'EAN_FORMATO',
    'La etiqueta debe contener exactamente 13 dígitos.',
  );

  const esperado = calcularDigitoControlEan13(normalizado.slice(0, 12));
  exigir(
    normalizado.at(-1) === esperado,
    'EAN_CONTROL',
    'El dígito de control de la etiqueta no es válido.',
    { esperado, recibido: normalizado.at(-1) },
  );

  return normalizado;
}

export function decodificarEtiqueta(codigo, perfil = PERFIL_EAN13_POR_IMPORTE) {
  const ean = validarEan13(codigo);
  exigir(
    ean.length === perfil.longitud,
    'PERFIL_LONGITUD',
    'La etiqueta no coincide con la longitud del perfil.',
  );
  exigir(
    ean.startsWith(perfil.prefijo),
    'PERFIL_PREFIJO',
    'La etiqueta no coincide con el prefijo configurado.',
  );

  const plu = ean.slice(perfil.inicioPlu, perfil.inicioPlu + perfil.longitudPlu);
  const importeCrudo = ean.slice(
    perfil.inicioImporte,
    perfil.inicioImporte + perfil.longitudImporte,
  );
  const importeCentavos = Number(importeCrudo);

  exigir(
    Number.isSafeInteger(importeCentavos),
    'IMPORTE_INVALIDO',
    'El importe codificado no es válido.',
  );
  exigir(
    perfil.divisorImporte === 100,
    'PERFIL_IMPORTE',
    'La fase cero solo admite perfiles con importe expresado en centavos.',
  );

  return Object.freeze({
    codigo: ean,
    plu,
    importeCentavos,
    digitoControl: ean.at(-1),
  });
}
