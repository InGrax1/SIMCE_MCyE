import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, writeFile, readFile, readdir, cp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';
import { crearAplicacion } from '../packages/api/src/app.js';
import { AlmacenCmsArchivo } from '../packages/api/src/cms/almacen.js';
import { crearAutenticacion, hashClave } from '../packages/api/src/cms/autenticacion.js';
import { crearRutasCms } from '../packages/api/src/cms/rutas.js';
import { crearPublicador } from '../packages/api/src/cms/publicacion.js';
import { crearRecuperacion } from '../packages/api/src/cms/recuperacion.js';
import { configurarCorreo } from '../packages/api/src/cms/correo.js';

const raiz = resolve(import.meta.dirname, '..');
const artefactos = join(raiz, 'artifacts/fase-1');
await mkdir(artefactos, { recursive: true });
const temporal = await mkdtemp(join(artefactos, 'ejecucion-'));
const puerto = Number(process.env.FASE1_PORT ?? 4178);
const origen = `http://127.0.0.1:${puerto}`;
const carpetaPortal = join(temporal, 'portal');
await cp(join(raiz, 'packages/portal/dist'), carpetaPortal, { recursive: true });
const almacen = new AlmacenCmsArchivo(join(temporal, 'estado.json'));
const clave = randomBytes(18).toString('base64url');
const nuevaClave = randomBytes(18).toString('base64url');
const hash = await hashClave(clave);
await almacen.cambiar((s) => {
  s.usuarios.push({
    id: randomUUID(),
    correo: 'prueba@example.test',
    rol: 'responsable',
    hash,
    activo: true,
    debeCambiar: true,
  });
});
const auth = await crearAutenticacion({
  almacen,
  secreto: randomBytes(48).toString('hex'),
  origenes: [origen],
});
const carpetaMedios = join(temporal, 'medios');
const publicador = crearPublicador({
  almacen,
  carpetaPortal,
  carpetaMedios,
  moduloSsr: join(raiz, 'packages/portal/dist-ssr/entry-server.js'),
});
await publicador.publicar();
const recuperacion = crearRecuperacion({
  almacen,
  origenPublico: origen,
  enviarCorreo: configurarCorreo(temporal, { NODE_ENV: 'test', CORREO_MODO: 'archivo' }),
  limpiarCookie: auth.limpiarCookie,
});
const rutas = crearRutasCms({ almacen, auth, publicador, carpetaMedios, recuperacion });
const app = crearAplicacion({
  cms: { auth, rutas, carpetaPortal, carpetaPanel: join(raiz, 'packages/panel/dist') },
});
const servidor = app.listen(puerto, '127.0.0.1');
await new Promise((ok, no) => {
  servidor.once('listening', ok);
  servidor.once('error', no);
});
let browser, chrome;
const reporte = { flujo: [], accesibilidad: [], errores: [] };
try {
  browser = await chromium.launch({ headless: true });
  const contexto = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  });
  const pagina = await contexto.newPage();
  pagina.on('pageerror', (e) => reporte.errores.push(e.message));
  async function axe(nombre) {
    const auditoria = await new AxeBuilder({ page: pagina })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      // Centinelas internos que redirigen el foco, no controles del portal.
      // Base UI documenta este aviso de axe como comportamiento esperado:
      // https://github.com/mui/base-ui/issues/4845
      .exclude('[data-base-ui-focus-guard]')
      .analyze();
    const problemas = auditoria.violations
      .filter((v) => ['serious', 'critical'].includes(v.impact))
      .map((v) => ({ id: v.id, nodos: v.nodes.map((n) => n.target) }));
    assert.deepEqual(problemas, [], nombre);
    reporte.accesibilidad.push({ nombre, graves: problemas.length });
  }
  await pagina.goto(origen);
  await pagina.evaluate(() => document.fonts.ready);
  await axe('Portal escritorio');
  assert.equal(await pagina.locator('.area-galeria summary').count(), 3);
  for (const resumen of await pagina.locator('.area-galeria summary').all()) {
    await resumen.focus();
    await pagina.keyboard.press('Enter');
  }
  assert.equal(await pagina.locator('.area-galeria[open]').count(), 3);
  await axe('Galerías por área abiertas');
  for (const ancho of [320, 390, 768, 1024, 1440]) {
    await pagina.setViewportSize({ width: ancho, height: 1000 });
    assert.equal(
      await pagina.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
      `Galerías a ${ancho}px`,
    );
  }
  await pagina.locator('#areas').scrollIntoViewIfNeeded();
  await pagina.screenshot({ path: join(artefactos, 'galerias-areas-escritorio.png') });
  await pagina.setViewportSize({ width: 390, height: 844 });
  await pagina.locator('.area-galeria summary').first().scrollIntoViewIfNeeded();
  await pagina.screenshot({ path: join(artefactos, 'galerias-areas-movil.png') });
  await pagina.setViewportSize({ width: 1440, height: 1000 });
  reporte.flujo.push('Galerías por área con teclado y sin desbordamiento entre 320 y 1440 px');
  await pagina.getByRole('combobox', { name: 'Filtrar por licenciatura' }).click();
  await axe('Selector de licenciatura abierto');
  await pagina.getByRole('option', { name: 'MVZ', exact: true }).click();
  assert.ok((await pagina.locator('.practica h3').count()) > 0);
  await pagina.getByRole('button', { name: 'Mostrar todas', exact: true }).click();
  await pagina.emulateMedia({ reducedMotion: 'no-preference' });
  for (const nombre of ['Pastor', 'Jamón', 'Hamburguesa']) {
    await pagina.getByRole('button', { name: nombre, exact: true }).click();
  }
  await pagina.waitForFunction(
    () =>
      getComputedStyle(document.querySelector('#producto-detalle')).opacity === '1' &&
      !document.querySelector('[data-saliendo]'),
  );
  assert.equal(await pagina.locator('#producto-detalle h3').textContent(), 'Hamburguesa');
  assert.equal(await pagina.locator('.producto-ficha[aria-hidden="false"]').count(), 1);
  for (const nombre of ['Asesorías académicas', 'Formación de estudiantes', 'Matanza y faenado']) {
    await pagina.getByRole('button', { name: nombre, exact: true }).click();
  }
  await pagina.waitForFunction(
    () =>
      getComputedStyle(document.querySelector('#actividad-detalle')).opacity === '1' &&
      !document.querySelector('[data-saliendo]'),
  );
  assert.equal(await pagina.locator('#actividad-detalle h3').textContent(), 'Matanza y faenado');
  await pagina.getByRole('combobox', { name: 'Filtrar por licenciatura' }).click();
  await pagina.getByRole('listbox').waitFor();
  await pagina.keyboard.press('Escape');
  await pagina.getByRole('listbox').waitFor({ state: 'hidden' });
  await pagina.waitForFunction(() => document.activeElement.id === 'filtro-licenciatura');
  assert.equal(
    await pagina
      .getByRole('combobox', { name: 'Filtrar por licenciatura' })
      .evaluate((elemento) => elemento === document.activeElement),
    true,
  );
  await pagina.emulateMedia({ reducedMotion: 'reduce' });
  await pagina.getByRole('button', { name: 'Pastor', exact: true }).focus();
  await pagina.keyboard.press('Enter');
  assert.equal(
    await pagina
      .locator('#producto-detalle')
      .evaluate((elemento) => getComputedStyle(elemento).opacity),
    '1',
  );
  reporte.flujo.push('Selecciones rápidas, desplegable accesible, Escape y movimiento reducido');
  await pagina.goto(`${origen}/panel/`);
  async function entrar(contrasena) {
    await pagina.getByLabel('Correo', { exact: true }).fill('prueba@example.test');
    await pagina.getByLabel('Contraseña', { exact: true }).fill(contrasena);
    await pagina.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  }
  await entrar(clave);
  await pagina.getByRole('button', { name: 'Volver al inicio de sesión', exact: true }).click();
  await pagina.getByRole('button', { name: 'Iniciar sesión', exact: true }).waitFor();
  await pagina.reload();
  await pagina.getByRole('button', { name: 'Iniciar sesión', exact: true }).waitFor();
  await entrar(clave);
  await pagina.getByLabel('Contraseña inicial', { exact: true }).waitFor();
  await almacen.cambiar((s) => {
    for (const sesion of s.sesiones) sesion.ultimaActividad = Date.now() - 8 * 3600_000 - 1;
  });
  await pagina.getByLabel('Contraseña inicial', { exact: true }).fill(clave);
  await pagina.getByLabel('Nueva contraseña', { exact: true }).fill(nuevaClave);
  await pagina.getByRole('button', { name: 'Actualizar contraseña' }).click();
  await pagina.getByRole('button', { name: 'Iniciar sesión', exact: true }).waitFor();
  assert.equal(
    await pagina.getByRole('heading', { name: 'Cambia tu contraseña inicial' }).count(),
    0,
  );
  await entrar(clave);
  await pagina.getByLabel('Contraseña inicial', { exact: true }).fill('Contraseña incorrecta');
  await pagina.getByLabel('Nueva contraseña', { exact: true }).fill(nuevaClave);
  await pagina.getByRole('button', { name: 'Actualizar contraseña' }).click();
  await pagina
    .getByRole('alert')
    .filter({ hasText: 'La contraseña actual no es correcta' })
    .waitFor();
  await pagina.getByRole('heading', { name: 'Cambia tu contraseña inicial' }).waitFor();
  await pagina.setViewportSize({ width: 390, height: 844 });
  await axe('Cambio de contraseña móvil con error');
  await pagina.screenshot({ path: join(artefactos, 'cambio-clave-movil.png'), fullPage: true });
  await pagina.setViewportSize({ width: 1440, height: 1000 });
  await pagina.getByLabel('Contraseña inicial', { exact: true }).fill(clave);
  await pagina.getByLabel('Nueva contraseña', { exact: true }).fill(nuevaClave);
  await pagina.getByRole('button', { name: 'Actualizar contraseña' }).click();
  await pagina.getByRole('heading', { name: 'Solicitudes', exact: true }).waitFor();
  await pagina.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await entrar(nuevaClave);
  await pagina
    .getByRole('navigation', { name: 'Navegación del panel' })
    .getByRole('button', { name: 'Contenido', exact: true })
    .click();
  await pagina.getByLabel('Tipo de contenido').waitFor();
  reporte.flujo.push(
    'Volver al login desde el cambio inicial',
    'Recuperar el login al vencer la sesión',
    'Corregir contraseña actual errónea sin perder la sesión',
    'Cerrar sesión y acceder con la contraseña nueva',
  );
  await pagina.getByLabel('Tipo de contenido').selectOption('aviso');
  const titulo = `Aviso técnico ${randomUUID().slice(0, 8)}`;
  await pagina.getByLabel('Nombre o título', { exact: true }).fill(titulo);
  await pagina
    .getByLabel('Descripción', { exact: true })
    .fill('Contenido sintético para verificar el flujo de publicación.');
  await pagina.getByLabel('Fecha del aviso').fill('2026-10-27');
  await pagina.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
  await pagina.getByRole('status').filter({ hasText: 'Borrador guardado' }).waitFor();
  assert.ok(!(await (await fetch(`${origen}/`)).text()).includes(titulo));
  await pagina.getByRole('button', { name: 'Vista previa', exact: true }).click();
  await pagina.frameLocator('iframe').getByRole('heading', { name: titulo, exact: true }).waitFor();
  await pagina.getByRole('button', { name: 'Cerrar vista previa', exact: true }).click();
  await pagina
    .getByLabel('Revisé el texto, las imágenes y la información antes de publicar.')
    .check();
  await pagina.getByRole('button', { name: 'Publicar', exact: true }).click();
  await pagina.getByRole('status').filter({ hasText: 'Entrada publicada' }).waitFor();
  assert.ok((await (await fetch(`${origen}/`)).text()).includes(titulo));
  const sinJs = await browser.newPage({ javaScriptEnabled: false });
  await sinJs.goto(origen);
  assert.equal(await sinJs.getByRole('heading', { name: titulo, exact: true }).count(), 1);
  await sinJs.locator('.area-galeria summary').first().click();
  assert.ok((await sinJs.locator('.area-galeria[open] figure').count()) > 0);
  await sinJs.close();
  await pagina.getByRole('button', { name: 'Despublicar', exact: true }).click();
  await pagina.getByRole('status').filter({ hasText: 'ya no aparece' }).waitFor();
  assert.ok(!(await (await fetch(`${origen}/`)).text()).includes(titulo));
  reporte.flujo.push(
    'Acceso y cambio inicial de contraseña',
    'Guardar borrador sin filtrarlo al visitante',
    'Vista previa privada',
    'Publicar y generar HTML legible sin JavaScript',
    'Despublicar y retirar del HTML',
  );
  await pagina
    .getByRole('navigation', { name: 'Navegación del panel' })
    .getByRole('button', { name: 'Talleres', exact: true })
    .click();
  const taller = `Taller de prueba ${randomUUID().slice(0, 8)}`;
  await pagina.getByLabel('Nombre o título', { exact: true }).fill(taller);
  await pagina
    .getByLabel('Descripción', { exact: true })
    .fill('Convocatoria sintética: no corresponde a un evento institucional.');
  await pagina.getByLabel('Estado del taller').selectOption('abierto');
  await pagina.getByLabel('Fecha de inicio').fill('2026-11-01');
  await pagina.getByLabel('Fecha de conclusión').fill('2026-11-02');
  await pagina.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
  await pagina.getByRole('status').filter({ hasText: 'Borrador guardado' }).waitFor();
  await pagina
    .getByLabel('Revisé el texto, las imágenes y la información antes de publicar.')
    .check();
  await pagina.getByRole('button', { name: 'Publicar', exact: true }).click();
  await pagina.getByRole('status').filter({ hasText: 'Entrada publicada' }).waitFor();
  const publico = await contexto.newPage();
  await publico.goto(`${origen}/#talleres`);
  await publico.getByRole('heading', { name: taller, exact: true }).waitFor();
  assert.equal(await publico.getByText('Convocatoria abierta', { exact: true }).count(), 1);
  await publico.close();
  await pagina.getByRole('button', { name: 'Despublicar', exact: true }).click();
  await pagina.getByRole('status').filter({ hasText: 'ya no aparece' }).waitFor();
  assert.ok(!(await (await fetch(`${origen}/`)).text()).includes(taller));
  reporte.flujo.push('Publicar un taller con estado y fechas; retirarlo del portal');
  await axe('Gestor escritorio');
  await pagina.screenshot({ path: join(artefactos, 'gestor-escritorio.png'), fullPage: true });
  await pagina.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await pagina.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
  );
  await axe('Gestor móvil');
  await pagina.screenshot({ path: join(artefactos, 'gestor-movil.png'), fullPage: true });
  await pagina.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await pagina.getByRole('button', { name: 'Olvidé mi contraseña', exact: true }).click();
  await pagina.getByLabel('Correo de tu cuenta', { exact: true }).fill('prueba@example.test');
  await pagina.getByRole('button', { name: 'Solicitar enlace', exact: true }).click();
  await pagina.getByRole('status').filter({ hasText: 'Si el correo corresponde' }).waitFor();
  await axe('Recuperación de acceso móvil');
  const archivosCorreo = await readdir(join(temporal, 'correos'));
  assert.equal(archivosCorreo.length, 1);
  const correo = JSON.parse(await readFile(join(temporal, 'correos', archivosCorreo[0]), 'utf8'));
  const enlace = correo.texto.match(/http:\/\/[^\s]+/)[0];
  const claveRestablecida = randomBytes(20).toString('hex');
  await pagina.goto(enlace);
  await pagina.getByRole('heading', { name: 'Define tu nueva contraseña' }).waitFor();
  assert.equal(new URL(pagina.url()).hash, '', 'El enlace secreto se retira del historial visible');
  await pagina.getByLabel('Nueva contraseña', { exact: true }).fill(claveRestablecida);
  await pagina.getByLabel('Confirma la nueva contraseña', { exact: true }).fill(claveRestablecida);
  await axe('Restablecer contraseña móvil');
  await pagina.getByRole('button', { name: 'Guardar nueva contraseña', exact: true }).click();
  await pagina.getByRole('status').filter({ hasText: 'Contraseña actualizada' }).waitFor();
  await entrar(claveRestablecida);
  await pagina
    .getByRole('navigation', { name: 'Navegación del panel' })
    .getByRole('button', { name: 'Contenido', exact: true })
    .click();
  await pagina.getByLabel('Tipo de contenido').waitFor();
  reporte.flujo.push(
    'Recuperación mediante buzón local, enlace de un solo uso y acceso con contraseña restablecida',
  );
  await pagina.goto(origen);
  await axe('Portal móvil');
  assert.equal(
    await pagina.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
  );
  await pagina.screenshot({ path: join(artefactos, 'portal-movil.png'), fullPage: true });
  assert.deepEqual(reporte.errores, [], 'Errores JavaScript');
  if (process.env.OMITIR_LIGHTHOUSE !== '1') {
    chrome = await launch({
      chromePath: chromium.executablePath(),
      chromeFlags: ['--headless', '--no-sandbox', '--disable-dev-shm-usage'],
    });
    const resultado = await lighthouse(origen, {
      port: chrome.port,
      output: 'json',
      logLevel: 'error',
      onlyCategories: ['performance', 'accessibility'],
      throttlingMethod: 'devtools',
    });
    await writeFile(join(artefactos, 'lighthouse.json'), JSON.stringify(resultado.lhr, null, 2));
    const lcp = resultado.lhr.audits['largest-contentful-paint'].numericValue;
    reporte.lighthouse = {
      lcp,
      performance: resultado.lhr.categories.performance.score,
      accesibilidad: resultado.lhr.categories.accessibility.score,
    };
    assert.ok(
      lcp < 2500,
      `LCP ${Math.round(lcp)} ms; la especificación exige menos de 2500 ms en móvil/4G simulada.`,
    );
  }
  await writeFile(join(artefactos, 'resultado.json'), JSON.stringify(reporte, null, 2));
  console.log(JSON.stringify(reporte));
} finally {
  await browser?.close();
  await chrome?.kill();
  await new Promise((ok) => servidor.close(ok));
  if (temporal.startsWith(join(artefactos, 'ejecucion-')))
    await rm(temporal, { recursive: true, force: true });
}
