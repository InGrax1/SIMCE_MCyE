import 'fake-indexeddb/auto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  agregarEtiqueta,
  centavosDesdeDecimal,
  cerrarRemisionLocal,
  crearOperacionCierre,
  crearRemision,
} from '@simce/dominio';
import { crearAplicacion } from '../packages/api/src/app.js';
import { crearBaseDatosLocal } from '../packages/panel/src/local/baseDatos.js';
import { RepositorioLocal } from '../packages/panel/src/local/repositorioLocal.js';
import { generarPdfProvisional } from '../packages/panel/src/pdf/remisionProvisional.js';
import {
  enviarOperacionHttp,
  sincronizarPendientes,
} from '../packages/panel/src/servicios/sincronizacion.js';

const remisionUuid = '11111111-1111-4111-8111-111111111111';
const operacionUuid = '33333333-3333-4333-8333-333333333333';
const baseDatos = crearBaseDatosLocal(`simce-demostracion-${Date.now()}`);
const repositorio = new RepositorioLocal(baseDatos);
const servidor = crearAplicacion().listen(0, '127.0.0.1');

await new Promise((resolver, rechazar) => {
  servidor.once('listening', resolver);
  servidor.once('error', rechazar);
});

try {
  const direccion = servidor.address();
  const apiUrl = `http://127.0.0.1:${direccion.port}/api/v1`;
  const borrador = crearRemision({
    centroId: 'CENTRO-DEMO',
    remisionUuid,
    fecha: '2026-09-06T12:00:00.000Z',
  });
  const capturada = agregarEtiqueta(borrador, {
    codigo: '2010101086955',
    productoId: 'PRODUCTO-DEMO',
    precioKgCentavos: centavosDesdeDecimal('185.00'),
    partidaUuid: '22222222-2222-4222-8222-222222222222',
  });
  const cerrada = cerrarRemisionLocal(capturada, { fecha: '2026-09-06T12:01:00.000Z' });
  const operacion = crearOperacionCierre(cerrada, {
    operacionUuid,
    fecha: '2026-09-06T12:02:00.000Z',
  });
  await repositorio.guardarCierre(cerrada, operacion);

  let primeraRespuesta;
  const primerIntento = await sincronizarPendientes({
    repositorio,
    enviarOperacion: async (entrada) => {
      primeraRespuesta = await enviarOperacionHttp(entrada, apiUrl);
      throw new Error('Pérdida de red simulada después de aplicar la operación');
    },
  });
  const segundoIntento = await sincronizarPendientes({
    repositorio,
    enviarOperacion: (entrada) => enviarOperacionHttp(entrada, apiUrl),
  });
  const sincronizada = await repositorio.obtenerRemision(remisionUuid);

  if (
    primerIntento.fallidas !== 1 ||
    segundoIntento.aplicadas !== 1 ||
    sincronizada.folioFinal !== primeraRespuesta.folioFinal ||
    (await repositorio.listarPendientes()).length !== 0
  ) {
    throw new Error('La comprobación integral del reintento idempotente no fue satisfactoria.');
  }

  const directorioArtefactos = resolve('artifacts');
  await mkdir(directorioArtefactos, { recursive: true });
  const rutaPdf = resolve(directorioArtefactos, `${cerrada.folioProvisional}.pdf`);
  await writeFile(rutaPdf, generarPdfProvisional(cerrada));
  await writeFile(
    resolve(directorioArtefactos, 'resultado-prototipo.json'),
    `${JSON.stringify(
      {
        etiqueta: '2010101086955',
        plu: cerrada.partidas[0].plu,
        importeCentavos: cerrada.totalCentavos,
        pesoGramos: cerrada.totalGramos,
        folioProvisional: cerrada.folioProvisional,
        folioFinal: sincronizada.folioFinal,
        operacionUuid,
        reenvioDetectado: true,
        operacionesPendientes: 0,
        pdf: rutaPdf,
      },
      null,
      2,
    )}\n`,
  );

  console.log('Prototipo de fase cero verificado');
  console.log(`Etiqueta: 2010101086955 · PLU 010101 · 0.470 kg · $86.95`);
  console.log(`Folio final preservado tras el reintento: ${sincronizada.folioFinal}`);
  console.log(`PDF provisional: ${rutaPdf}`);
} finally {
  await new Promise((resolver) => servidor.close(resolver));
  baseDatos.close();
  await baseDatos.delete();
}
