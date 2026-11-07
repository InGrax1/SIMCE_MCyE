import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  guardarConsulta,
  leerConsultasGuardadas,
  quitarConsulta,
} from '../src/consultasGuardadas.js';

describe('acceso a consultas en el navegador', () => {
  let datos;
  const consulta = (n) => ({
    folio: `CT-2026-${String(n).padStart(8, '0')}`,
    acceso: 'a'.repeat(43),
    tallerNombre: 'Taller de pruebas',
  });
  beforeEach(() => {
    datos = new Map();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (clave) => datos.get(clave) ?? null,
        setItem: (clave, valor) => datos.set(clave, valor),
        removeItem: (clave) => datos.delete(clave),
      },
      dispatchEvent: () => {},
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('guarda solo el acceso, evita duplicados y permite quitarlo sin borrar otras consultas', () => {
    guardarConsulta({
      ...consulta(1),
      nombre: 'Privado',
      correo: 'persona@example.test',
      mensaje: 'Pregunta privada',
    });
    guardarConsulta(consulta(2));
    guardarConsulta({ ...consulta(1), acceso: 'b'.repeat(43) });
    expect(leerConsultasGuardadas()).toEqual([
      { ...consulta(1), acceso: 'b'.repeat(43) },
      consulta(2),
    ]);
    expect([...datos.values()].join()).not.toMatch(/Privado|persona@example|Pregunta privada/);
    expect(quitarConsulta(consulta(1).folio)).toBe(true);
    expect(leerConsultasGuardadas()).toEqual([consulta(2)]);
    quitarConsulta(consulta(2).folio);
    expect(datos.size).toBe(0);
  });
  it('tolera datos dañados y limita la lista a los veinte accesos más recientes', () => {
    guardarConsulta(consulta(1));
    const clave = [...datos.keys()][0];
    datos.set(clave, '{json roto');
    expect(leerConsultasGuardadas()).toEqual([]);
    datos.set(clave, JSON.stringify([null, { ...consulta(2), acceso: 'incorrecto' }]));
    expect(leerConsultasGuardadas()).toEqual([]);
    for (let n = 1; n <= 21; n++) guardarConsulta(consulta(n));
    expect(leerConsultasGuardadas()).toHaveLength(20);
    expect(leerConsultasGuardadas()[0].folio).toBe(consulta(21).folio);
    expect(leerConsultasGuardadas().some((c) => c.folio === consulta(1).folio)).toBe(false);
  });
  it('degrada sin impedir la consulta cuando el navegador bloquea el almacenamiento', () => {
    Object.defineProperty(window, 'localStorage', {
      get: () => {
        throw new Error('Bloqueado');
      },
    });
    expect(leerConsultasGuardadas()).toEqual([]);
    expect(guardarConsulta(consulta(1))).toBe(false);
    expect(quitarConsulta(consulta(1).folio)).toBe(false);
  });
  it('conserva accesos de consultas e inscripciones por separado y quita solo el solicitado', () => {
    const inscripcion = { ...consulta(1), folio: 'INS-2026-00000001' };
    guardarConsulta(consulta(1));
    guardarConsulta(inscripcion);
    expect(leerConsultasGuardadas()).toEqual([consulta(1)]);
    expect(leerConsultasGuardadas('INS')).toEqual([inscripcion]);
    quitarConsulta(inscripcion.folio);
    expect(leerConsultasGuardadas('INS')).toEqual([]);
    expect(leerConsultasGuardadas()).toHaveLength(1);
  });
});
