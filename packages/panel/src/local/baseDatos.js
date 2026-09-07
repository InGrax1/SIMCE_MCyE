import Dexie from 'dexie';

export function crearBaseDatosLocal(nombre = 'simce-fase-cero') {
  const baseDatos = new Dexie(nombre);
  baseDatos.version(1).stores({
    remisiones: 'remisionUuid, estado, fechaCreacion',
    operaciones: 'operacionUuid, estadoCola, agregadoId, fechaCreacion',
  });
  return baseDatos;
}

export const baseDatosLocal = crearBaseDatosLocal();
