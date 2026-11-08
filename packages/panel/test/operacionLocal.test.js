import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { expect, it } from 'vitest';
import { perfilOperativoInicial } from '@simce/dominio';
import { crearBaseDatosLocal } from '../src/local/baseDatos.js';
import { crearOperacionLocal } from '../src/local/operacion.js';

it('migra IndexedDB, guarda operaciones y PDF en conjunto y aísla cuentas', async () => {
  const nombre = `simce-operacion-${crypto.randomUUID()}`;
  const anterior = new Dexie(nombre);
  anterior.version(1).stores({
    remisiones: 'remisionUuid, estado, fechaCreacion',
    operaciones: 'operacionUuid, estadoCola, agregadoId, fechaCreacion',
  });
  await anterior.operaciones.add({ operacionUuid: 'demo', estadoCola: 'PENDIENTE' });
  anterior.close();
  const base = crearBaseDatosLocal(nombre);
  try {
    const repositorio = crearOperacionLocal(base);
    const usuario = { id: crypto.randomUUID(), rol: 'operador', correo: 'prueba@example.test' };
    const otro = { ...usuario, id: crypto.randomUUID() };
    const destino = { uuid: crypto.randomUUID(), nombre: 'Destino', activo: true, version: 1 };
    const producto = {
      uuid: crypto.randomUUID(),
      nombre: 'Producto',
      activo: true,
      version: 1,
      plu: '010101',
    };
    const precio = {
      uuid: crypto.randomUUID(),
      producto_uuid: producto.uuid,
      precio_kg_centavos: 18500,
      vigente_desde: '2025-01-01',
    };
    await repositorio.aplicarPagina(usuario, 0, {
      cursor: 5,
      revisionCatalogo: 'catalogo-1',
      eventos: [],
      catalogo: { destinos: [destino], productos: [producto], precios: [precio] },
      perfil: perfilOperativoInicial,
    });
    await repositorio.preparar(usuario);
    expect(await repositorio.accesoLocal()).toEqual({ ...usuario, debeCambiar: false });
    const { agregadoId } = await repositorio.registrar(usuario, 'CREAR_REMISION', {
      fecha: '2026-11-07',
      destinoUuid: destino.uuid,
    });
    const documentoUuid = crypto.randomUUID();
    const cerrar = () =>
      repositorio.registrar(
        usuario,
        'CERRAR_REMISION',
        { documentoUuid },
        { agregadoId, versionBase: 2 },
      );
    await expect(
      repositorio.registrar(
        usuario,
        'CERRAR_REMISION',
        { documentoUuid },
        { agregadoId, versionBase: 1 },
      ),
    ).rejects.toMatchObject({ codigo: 'REMISION_VACIA' });
    expect(await repositorio.pendientes(usuario)).toHaveLength(1);
    expect(await repositorio.obtenerPdf(usuario, documentoUuid)).toBeUndefined();
    await repositorio.registrar(
      usuario,
      'AGREGAR_RENGLON',
      {
        origen: 'ESCANEO',
        codigo: '2010101086955',
        precioUuid: precio.uuid,
        fuentePrecio: 'Etiqueta',
        renglonUuid: crypto.randomUUID(),
        partidaUuid: crypto.randomUUID(),
      },
      { agregadoId, versionBase: 1 },
    );
    await cerrar();
    base.close();
    await base.open();
    const recargado = crearOperacionLocal(base);
    const { vista, cola } = await recargado.modelo(usuario);
    expect(vista.remisiones[0]).toMatchObject({
      estado: 'CERRADA',
      provisionalUuid: documentoUuid,
    });
    expect(cola[2].comando.dependeDe).toBe(cola[1].operacionUuid);
    expect(
      new TextDecoder().decode(
        (await recargado.obtenerPdf(usuario, documentoUuid)).bytes.slice(0, 4),
      ),
    ).toBe('%PDF');
    expect(await recargado.obtenerPdf(otro, documentoUuid)).toBeUndefined();
    expect(await recargado.pendientes(otro)).toHaveLength(0);
    expect(await base.operaciones.get('demo')).toMatchObject({ estadoCola: 'PENDIENTE' });
    await recargado.actualizarAcceso({ ...usuario, rol: 'editor' });
    expect(await recargado.accesoLocal()).toBeNull();
    expect(await recargado.pendientes(usuario)).toHaveLength(3);
  } finally {
    await base.delete();
  }
});
