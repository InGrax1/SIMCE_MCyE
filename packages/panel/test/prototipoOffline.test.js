import '@simce/dominio';
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  agregarEtiqueta,
  cerrarRemisionLocal,
  crearOperacionCierre,
  crearRemision,
} from '@simce/dominio';
import { crearBaseDatosLocal } from '../src/local/baseDatos.js';
import { RepositorioLocal } from '../src/local/repositorioLocal.js';
import { generarPdfProvisional } from '../src/pdf/remisionProvisional.js';
import { sincronizarPendientes } from '../src/servicios/sincronizacion.js';

const crearCierre = () => {
  const borrador = crearRemision({
    centroId: 'CENTRO-DEMO',
    remisionUuid: '11111111-1111-4111-8111-111111111111',
  });
  const capturada = agregarEtiqueta(borrador, {
    codigo: '2010101086955',
    productoId: 'PRODUCTO-DEMO',
    precioKgCentavos: 18_500,
    partidaUuid: '22222222-2222-4222-8222-222222222222',
  });
  return cerrarRemisionLocal(capturada);
};

describe('prototipo fuera de línea', () => {
  let baseDatos;
  let repositorio;

  beforeEach(() => {
    baseDatos = crearBaseDatosLocal(`simce-prueba-${crypto.randomUUID()}`);
    repositorio = new RepositorioLocal(baseDatos);
  });

  afterEach(async () => {
    baseDatos.close();
    await baseDatos.delete();
  });

  it('guarda el cierre y la operación en una transacción local', async () => {
    const cerrada = crearCierre();
    const operacion = crearOperacionCierre(cerrada, {
      operacionUuid: '33333333-3333-4333-8333-333333333333',
    });
    await repositorio.guardarCierre(cerrada, operacion);

    expect(await repositorio.obtenerRemision(cerrada.remisionUuid)).toMatchObject({
      estado: 'CERRADA_LOCAL',
      folioProvisional: 'PROV-11111111',
    });
    expect(await repositorio.listarPendientes()).toHaveLength(1);
  });

  it('reintenta el mismo UUID después de perder la primera respuesta', async () => {
    const cerrada = crearCierre();
    const operacion = crearOperacionCierre(cerrada, {
      operacionUuid: '33333333-3333-4333-8333-333333333333',
    });
    await repositorio.guardarCierre(cerrada, operacion);

    const servidor = new Map();
    let llamadas = 0;
    const enviarOperacion = async (entrada) => {
      llamadas += 1;
      if (!servidor.has(entrada.operacionUuid)) {
        servidor.set(entrada.operacionUuid, {
          folioFinal: 'REM-2026-000001',
          versionServidor: 1,
          repetida: false,
        });
        throw new Error('Se perdió la respuesta del servidor');
      }
      return { ...servidor.get(entrada.operacionUuid), repetida: true };
    };

    expect(await sincronizarPendientes({ repositorio, enviarOperacion })).toEqual({
      aplicadas: 0,
      fallidas: 1,
    });
    expect(await sincronizarPendientes({ repositorio, enviarOperacion })).toEqual({
      aplicadas: 1,
      fallidas: 0,
    });

    const sincronizada = await repositorio.obtenerRemision(cerrada.remisionUuid);
    expect(llamadas).toBe(2);
    expect(servidor).toHaveLength(1);
    expect(sincronizada).toMatchObject({
      estado: 'SINCRONIZADA',
      folioFinal: 'REM-2026-000001',
    });
    expect(await repositorio.listarPendientes()).toHaveLength(0);
  });

  it('genera un PDF provisional válido', () => {
    const bytes = generarPdfProvisional(crearCierre());
    expect(new TextDecoder().decode(bytes.slice(0, 8))).toContain('%PDF-');
    expect(bytes.length).toBeGreaterThan(1_000);
  });
});
