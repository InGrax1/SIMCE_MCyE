import Dexie from 'dexie';

export function crearBaseDatosLocal(nombre = 'simce-fase-cero') {
  const baseDatos = new Dexie(nombre);
  baseDatos.version(1).stores({
    remisiones: 'remisionUuid, estado, fechaCreacion',
    operaciones: 'operacionUuid, estadoCola, agregadoId, fechaCreacion',
  });
  baseDatos.version(2).stores({
    dispositivo: 'id',
    replica: 'usuarioId',
    colaOperativa: '[usuarioId+operacionUuid], usuarioId, [usuarioId+estado]',
    pdfOperativos: '[usuarioId+uuid], usuarioId',
  });
  return baseDatos;
}

export const baseDatosLocal = crearBaseDatosLocal();
