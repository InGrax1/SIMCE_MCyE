import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, rm, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { crearAplicacion } from '../packages/api/src/app.js';
import { crearAlmacenCatalogo } from '../packages/api/src/catalogo/almacen.js';
import { AlmacenCmsArchivo } from '../packages/api/src/cms/almacen.js';
import { crearAutenticacion, hashClave } from '../packages/api/src/cms/autenticacion.js';
import { crearRutasCms } from '../packages/api/src/cms/rutas.js';
import { crearAlmacenOperacion } from '../packages/api/src/operacion/almacen.js';
import { crearServicioOperacion } from '../packages/api/src/operacion/servicio.js';

const carpeta = await mkdtemp(join(tmpdir(), 'simce-fase-tres-'));
const archivo = join(carpeta, 'estado.json');
const almacen = new AlmacenCmsArchivo(archivo);
const clave = randomBytes(18).toString('base64url');
const usuario = {
  id: randomUUID(),
  correo: 'responsable@example.test',
  rol: 'responsable',
  activo: true,
  debeCambiar: false,
  hash: await hashClave(clave),
};
await almacen.cambiar((s) => s.usuarios.push(usuario));
const catalogo = crearAlmacenCatalogo(almacen);
const guardar = (tipo, fila) =>
  catalogo.guardar(usuario, () => ({ tipo, fila, accion: 'DATOS_SINTETICOS' }));
const linea = await guardar('lineas', {
  uuid: randomUUID(),
  nombre: 'Hamburguesas',
  activo: true,
  version: 1,
});
const especie = await guardar('especies', {
  uuid: randomUUID(),
  nombre: 'Conejo',
  activo: true,
  version: 1,
});
const destino = await guardar('destinos', {
  uuid: randomUUID(),
  nombre: 'Destino sintético',
  activo: true,
  version: 1,
});
const producto = await guardar('productos', {
  uuid: randomUUID(),
  nombre: 'Hamburguesa de prueba',
  activo: true,
  version: 1,
  plu: '010101',
  linea_uuid: linea.uuid,
  especie_uuid: especie.uuid,
  presentacion: 'Estándar',
});
await guardar('precios', {
  uuid: randomUUID(),
  producto_uuid: producto.uuid,
  precio_kg_centavos: 18500,
  vigente_desde: '2025-01-01',
  revision_documentos: false,
});
const operacion = crearServicioOperacion(crearAlmacenOperacion(almacen, catalogo));
const origenes = [];
const auth = await crearAutenticacion({
  almacen,
  secreto: randomBytes(48).toString('hex'),
  origenes,
});
const rutas = crearRutasCms({ almacen, auth, catalogo, operacion });
const app = crearAplicacion({
  cms: { auth, rutas, carpetaPortal: carpeta, carpetaPanel: resolve('packages/panel/dist') },
});
const servidor = app.listen(0, '127.0.0.1');
await new Promise((ok, no) => {
  servidor.once('listening', ok);
  servidor.once('error', no);
});
const origen = `http://127.0.0.1:${servidor.address().port}`;
origenes.push(origen);

let browser;
const errores = [];
try {
  browser = await chromium.launch({ headless: true });
  const contexto = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
    acceptDownloads: true,
  });
  const pagina = await contexto.newPage();
  pagina.setDefaultTimeout(12_000);
  pagina.on('pageerror', (error) => errores.push(error.message));
  await pagina.goto(`${origen}/panel/`);
  await pagina.getByLabel('Correo', { exact: true }).fill(usuario.correo);
  await pagina.getByLabel('Contraseña', { exact: true }).fill(clave);
  await pagina.getByRole('button', { name: 'Iniciar sesión' }).click();
  await pagina.getByRole('button', { name: 'Operación', exact: true }).click();
  await pagina.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await pagina.getByRole('button', { name: 'Preparar este dispositivo' }).click();
  await pagina.getByText(/Dispositivo preparado para continuar/).waitFor();
  await contexto.setOffline(true);
  await pagina.reload();
  await pagina.getByRole('heading', { name: 'Remisiones', exact: true }).waitFor();
  await pagina.getByText(/Sin conexión · 0 pendientes/).waitFor();
  await pagina.getByRole('button', { name: 'Inventario', exact: true }).click();
  await pagina.getByText('Registrar lote de producción', { exact: true }).click();
  await pagina.getByRole('combobox', { name: 'Producto del lote' }).selectOption(producto.uuid);
  await pagina.getByLabel('Área', { exact: true }).fill('Prueba local');
  await pagina.getByLabel('Persona responsable').fill('Responsable de ensayo');
  await pagina.getByLabel('Cantidad producida (kg)').fill('2.500');
  await pagina.getByLabel('Caducidad', { exact: true }).fill('2099-12-31');
  await pagina.getByRole('button', { name: 'Registrar lote', exact: true }).click();
  await pagina.getByText('Existencia 2.500 kg', { exact: true }).waitFor();
  await pagina.getByRole('button', { name: 'Remisiones', exact: true }).click();
  await pagina.getByText('Nueva remisión', { exact: true }).click();
  await pagina.getByRole('combobox', { name: 'Destino del envío' }).selectOption(destino.uuid);
  await pagina.getByLabel('Folio de la hoja en papel (opcional)').fill('P-01');
  await pagina.getByRole('button', { name: 'Crear borrador' }).click();
  const ean = pagina.getByLabel('Código EAN-13', { exact: true });
  await ean.fill('2010101086955');
  await ean.press('Enter');
  await pagina
    .getByRole('combobox', { name: 'Precio de etiquetado por kg' })
    .selectOption({ label: '$185.00 MXN · desde 2025-01-01' });
  await pagina.getByLabel('Fuente de verificación del precio').fill('Etiqueta sintética');
  await pagina.getByRole('button', { name: 'Agregar renglón', exact: true }).click();
  await pagina.getByText('Total de remisión 0.470 kg · $86.95 MXN').waitFor();
  await pagina.getByRole('button', { name: 'Cerrar remisión', exact: true }).click();
  await pagina.getByText(/Sin conexión · 4 pendientes/).waitFor();
  await pagina.reload();
  await pagina.getByRole('button', { name: /^PROV-.*Destino sintético/ }).click();
  const descargar = async (nombre) => {
    const descarga = pagina.waitForEvent('download');
    await pagina.getByRole('button', { name: nombre }).click();
    const archivo = await descarga;
    assert.equal(await archivo.failure(), null);
    return archivo.suggestedFilename();
  };
  assert.match(await descargar('Descargar PDF provisional'), /^PROV-.+\.pdf$/);
  assert.equal((await operacion.datos()).remisiones.length, 0);
  await contexto.setOffline(false);
  await pagina
    .getByRole('heading', { name: /^REM-\d{4}-\d+ · Destino sintético/ })
    .waitFor({ timeout: 35_000 });
  await pagina.getByText(/Con conexión · 0 pendientes/).waitFor();
  assert.match(await descargar('Descargar PDF definitivo'), /^REM-\d{4}-\d+\.pdf$/);
  const estado = await operacion.datos();
  assert.equal(estado.remisiones.length, 1);
  assert.equal(estado.remisiones[0].renglones[0].gramos, 470);
  assert.equal(estado.movimientos.filter((m) => m.tipo === 'SALIDA').length, 1);
  for (const ancho of [320, 1366]) {
    await pagina.setViewportSize({ width: ancho, height: 900 });
    assert.ok(await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const axe = await new AxeBuilder({ page: pagina })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    assert.deepEqual(
      axe.violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id),
      [],
    );
  }
  assert.deepEqual(errores, []);
  console.log(
    'Fase 3: preparación PWA, lote y cierre sin conexión, recarga, PDF y recuperación automática validados.',
  );
} finally {
  await browser?.close();
  await new Promise((ok) => servidor.close(ok));
  await rm(archivo, { force: true });
  await rmdir(carpeta);
}
