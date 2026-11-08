import { expect, it } from 'vitest';
import { sincronizarOperacionLocal } from '../src/servicios/operacion.js';

it('reanuda más de 500 operaciones en lotes ordenados tras perder una respuesta', async () => {
  const usuario = { id: 'operador-prueba' };
  const cola = Array.from({ length: 511 }, (_, i) => ({
    operacionUuid: `op-${i + 1}`,
    secuencia: i + 1,
  }));
  const servidor = new Set();
  const confirmadas = new Set();
  let interrumpir = true;
  const repositorio = {
    pendientes: async () => cola.filter((c) => !confirmadas.has(c.operacionUuid)),
    cursor: async () => ({ cursor: 0, revisionCatalogo: '' }),
    aplicarPagina: async () => {},
    confirmar: async (_usuario, recibos) => {
      for (const recibo of recibos) confirmadas.add(recibo.operacionUuid);
    },
  };
  const api = async (ruta, opciones) => {
    if (ruta.startsWith('/sync/pull')) return { mas: false };
    const { operaciones } = opciones.datos;
    expect(operaciones.length).toBeLessThanOrEqual(30);
    const resultados = operaciones.map(({ operacionUuid, secuencia }) => {
      const repetida = servidor.has(operacionUuid);
      if (!repetida) expect(secuencia).toBe(servidor.size + 1);
      servidor.add(operacionUuid);
      return { operacionUuid, estado: 'APLICADA', repetida };
    });
    if (interrumpir) {
      interrumpir = false;
      throw new Error('Respuesta perdida');
    }
    return { resultados };
  };
  await expect(sincronizarOperacionLocal(repositorio, usuario, api)).rejects.toThrow(
    'Respuesta perdida',
  );
  expect(servidor.size).toBe(30);
  expect(confirmadas.size).toBe(0);
  await sincronizarOperacionLocal(repositorio, usuario, api);
  expect(servidor.size).toBe(511);
  expect(confirmadas.size).toBe(511);
});
