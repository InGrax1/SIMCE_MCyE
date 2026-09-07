export class ErrorDominio extends Error {
  constructor(codigo, mensaje, detalles = {}) {
    super(mensaje);
    this.name = 'ErrorDominio';
    this.codigo = codigo;
    this.detalles = detalles;
  }
}

export function exigir(condicion, codigo, mensaje, detalles) {
  if (!condicion) {
    throw new ErrorDominio(codigo, mensaje, detalles);
  }
}
