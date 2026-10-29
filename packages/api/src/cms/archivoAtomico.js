import { rename } from 'node:fs/promises';
import { setTimeout as esperar } from 'node:timers/promises';

export async function renombrarAtomico(origen, destino) {
  for (let intento = 0; ; intento++) {
    try {
      await rename(origen, destino);
      return;
    } catch (error) {
      // Windows puede mantener un bloqueo breve durante el análisis/sincronización.
      if (intento >= 6 || !['EBUSY', 'EPERM', 'EACCES'].includes(error.code)) throw error;
      await esperar(50 * (intento + 1));
    }
  }
}
