import { marcarRemisionSincronizada } from '@simce/dominio';

export class RepositorioLocal {
  constructor(baseDatos) {
    this.baseDatos = baseDatos;
  }

  async guardarCierre(remision, operacion) {
    await this.baseDatos.transaction(
      'rw',
      this.baseDatos.remisiones,
      this.baseDatos.operaciones,
      async () => {
        await this.baseDatos.remisiones.put(structuredClone(remision));
        await this.baseDatos.operaciones.put({
          ...structuredClone(operacion),
          estadoCola: 'PENDIENTE',
          intentos: 0,
          ultimoError: null,
        });
      },
    );
  }

  async listarPendientes() {
    return this.baseDatos.operaciones.where('estadoCola').equals('PENDIENTE').toArray();
  }

  async registrarFallo(operacionUuid, error) {
    const operacion = await this.baseDatos.operaciones.get(operacionUuid);
    if (!operacion) return;
    await this.baseDatos.operaciones.update(operacionUuid, {
      intentos: operacion.intentos + 1,
      ultimoError: String(error.message ?? error),
    });
  }

  async marcarAplicada(operacionUuid, resultado) {
    await this.baseDatos.transaction(
      'rw',
      this.baseDatos.remisiones,
      this.baseDatos.operaciones,
      async () => {
        const operacion = await this.baseDatos.operaciones.get(operacionUuid);
        if (!operacion || operacion.estadoCola === 'APLICADA') return;

        const remision = await this.baseDatos.remisiones.get(operacion.agregadoId);
        const sincronizada = marcarRemisionSincronizada(remision, resultado);
        await this.baseDatos.remisiones.put(sincronizada);
        await this.baseDatos.operaciones.update(operacionUuid, {
          estadoCola: 'APLICADA',
          resultado: structuredClone(resultado),
          ultimoError: null,
        });
      },
    );
  }

  obtenerRemision(remisionUuid) {
    return this.baseDatos.remisiones.get(remisionUuid);
  }
}
