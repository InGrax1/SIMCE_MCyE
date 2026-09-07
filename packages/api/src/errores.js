export class ErrorApi extends Error {
  constructor(estadoHttp, codigo, mensaje, detalles = {}) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.estadoHttp = estadoHttp;
    this.codigo = codigo;
    this.detalles = detalles;
  }
}
