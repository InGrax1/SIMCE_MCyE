import { describe, expect, it } from 'vitest';
import { paginarRemision } from '../src/documentoRemision.js';

describe('paginación de la Lista de Envío', () => {
  it('continúa tres partidas con 60, 40 y 20 renglones sin repetir cantidades', () => {
    const renglones = [60, 40, 20].flatMap((cantidad, grupo) =>
      Array.from({ length: cantidad }, (_, i) => ({
        uuid: `${grupo}-${i}`,
        partidaUuid: `partida-${grupo}`,
        productoUuid: `p-${grupo}`,
        precioUuid: 'precio',
        gramos: 470,
        centavos: 8695,
      })),
    );
    const paginas = paginarRemision(renglones);
    expect(paginas.map((cols) => cols.map((p) => p.filas.length))).toEqual([
      [25, 25, 20],
      [25, 15, 0],
      [10, 0, 0],
    ]);
    expect(paginas[2][0].acumulado).toEqual({ gramos: 28_200, centavos: 521_700 });
    expect(
      paginas
        .flatMap((cols) => cols.flatMap((p) => p.filas))
        .map((r) => r.uuid)
        .sort(),
    ).toEqual(renglones.map((r) => r.uuid).sort());
  });
});
