import { perfilOperativoInicial } from '@simce/dominio';

export function configurarPerfil(entorno = process.env) {
  const {
    BASCULA_PREFIJO,
    BASCULA_PLU_DIGITOS,
    BASCULA_IMPORTE_DIGITOS,
    BASCULA_RESOLUCION_GRAMOS,
    BASCULA_VERSION,
  } = entorno;
  if (
    ![
      BASCULA_PREFIJO,
      BASCULA_PLU_DIGITOS,
      BASCULA_IMPORTE_DIGITOS,
      BASCULA_RESOLUCION_GRAMOS,
      BASCULA_VERSION,
    ].some(Boolean)
  )
    return perfilOperativoInicial;
  const prefijo = BASCULA_PREFIJO || perfilOperativoInicial.prefijo;
  const longitudPlu = Number(BASCULA_PLU_DIGITOS || perfilOperativoInicial.longitudPlu);
  const longitudImporte = Number(BASCULA_IMPORTE_DIGITOS || perfilOperativoInicial.longitudImporte);
  const resolucionGramos = Number(
    BASCULA_RESOLUCION_GRAMOS || perfilOperativoInicial.resolucionGramos,
  );
  if (
    !/^\d{1,4}$/.test(prefijo) ||
    !Number.isInteger(longitudPlu) ||
    longitudPlu < 1 ||
    longitudPlu > 10 ||
    !Number.isInteger(longitudImporte) ||
    longitudImporte < 1 ||
    longitudImporte > 10 ||
    prefijo.length + longitudPlu + longitudImporte !== 12 ||
    !Number.isInteger(resolucionGramos) ||
    resolucionGramos < 1 ||
    resolucionGramos > 1000 ||
    !/^[\w.-]{1,60}$/.test(BASCULA_VERSION ?? '')
  )
    throw new Error(
      'El perfil de báscula requiere campos válidos de EAN-13, resolución entera y BASCULA_VERSION.',
    );
  return {
    ...perfilOperativoInicial,
    prefijo,
    longitudPlu,
    longitudImporte,
    resolucionGramos,
    inicioPlu: prefijo.length,
    inicioImporte: prefijo.length + longitudPlu,
    version: BASCULA_VERSION,
  };
}
