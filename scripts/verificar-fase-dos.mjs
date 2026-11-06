import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, writeFile, readFile, cp, rm } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import assert from 'node:assert/strict';
import { crearAplicacion } from '../packages/api/src/app.js';
import { AlmacenCmsArchivo } from '../packages/api/src/cms/almacen.js';
import { crearAutenticacion, hashClave } from '../packages/api/src/cms/autenticacion.js';
import { crearRutasCms } from '../packages/api/src/cms/rutas.js';
import { crearPublicador } from '../packages/api/src/cms/publicacion.js';

const raiz = resolve(import.meta.dirname, '..');
const artefactos = join(raiz, 'artifacts/fase-2');
await mkdir(artefactos, { recursive: true });
const temporal = await mkdtemp(join(artefactos, 'ejecucion-'));
const carpetaPortal = join(temporal, 'portal');
await cp(join(raiz, 'packages/portal/dist'), carpetaPortal, { recursive: true });
const almacen = new AlmacenCmsArchivo(join(temporal, 'estado.json'));
const clave = randomBytes(18).toString('base64url');
await almacen.cambiar(async (s) => {
  s.usuarios.push({
    id: randomUUID(),
    correo: 'responsable@example.test',
    rol: 'responsable',
    hash: await hashClave(clave),
    activo: true,
    debeCambiar: false,
  });
  s.avisoTalleres = { url: 'https://example.test/aviso-sintetico', version: 'solo-pruebas-v1' };
});
const origenes = [];
const auth = await crearAutenticacion({
  almacen,
  secreto: randomBytes(48).toString('hex'),
  origenes,
});
const publicador = crearPublicador({
  almacen,
  carpetaPortal,
  carpetaMedios: temporal,
  moduloSsr: join(raiz, 'packages/portal/dist-ssr/entry-server.js'),
});
await publicador.publicar();
const rutas = crearRutasCms({ almacen, auth, publicador, carpetaMedios: temporal });
const app = crearAplicacion({
  cms: { auth, rutas, carpetaPortal, carpetaPanel: join(raiz, 'packages/panel/dist') },
});
const servidor = app.listen(0, '127.0.0.1');
await new Promise((ok, no) => {
  servidor.once('listening', ok);
  servidor.once('error', no);
});
const origen = `http://127.0.0.1:${servidor.address().port}`;
origenes.push(origen);
const reporte = { flujo: [], accesibilidad: [], errores: [], fecha: new Date().toISOString() };
let browser;
async function axe(pagina, nombre) {
  const resultado = await new AxeBuilder({ page: pagina })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .exclude('[data-base-ui-focus-guard]')
    .analyze();
  const problemas = resultado.violations
    .filter((v) => ['serious', 'critical'].includes(v.impact))
    .map((v) => ({ id: v.id, nodos: v.nodes.map((n) => n.target) }));
  reporte.accesibilidad.push({ nombre, problemas });
  assert.deepEqual(problemas, [], nombre);
}
try {
  browser = await chromium.launch({ headless: true });
  const contexto = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  });
  const panel = await contexto.newPage();
  panel.on('pageerror', (e) => reporte.errores.push(e.message));
  await panel.goto(`${origen}/panel/`);
  await panel.getByLabel('Correo', { exact: true }).fill('responsable@example.test');
  await panel.getByLabel('Contraseña', { exact: true }).fill(clave);
  await panel.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await panel.getByLabel('Tipo de contenido').selectOption('taller');
  await panel.getByLabel('Nombre o título').fill('Taller de elaboración de embutidos · prueba');
  await panel
    .getByLabel('Descripción', { exact: true })
    .fill('Convocatoria sintética para verificar la inscripción.');
  await panel.getByLabel('Fecha de inicio', { exact: true }).fill('2099-11-10');
  await panel.getByLabel('Fecha de conclusión', { exact: true }).fill('2099-11-11');
  await panel.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
  await panel
    .getByText('Borrador guardado. Los cambios aún no están publicados.', { exact: true })
    .waitFor();
  await panel
    .getByLabel('Contenido temático', { exact: true })
    .fill('Higiene y formulación.\nElaboración de embutidos.');
  await panel.getByLabel('Sede', { exact: true }).fill('Sala de pruebas del CEA');
  await panel.getByLabel('Cupo', { exact: true }).fill('1');
  await panel.getByLabel('Apertura de inscripción', { exact: true }).fill('2020-01-01T09:00');
  await panel.getByLabel('Cierre de inscripción', { exact: true }).fill('2099-11-09T18:00');
  await panel.getByRole('button', { name: 'Guardar inscripción', exact: true }).click();
  await panel.getByText('Inscripción del taller actualizada.', { exact: true }).waitFor();
  await panel
    .getByLabel('Revisé el texto, las imágenes y la información antes de publicar.')
    .check();
  await panel.getByRole('button', { name: 'Publicar', exact: true }).click();
  await panel
    .getByText('Entrada publicada. El portal público ya está actualizado.', { exact: true })
    .waitFor();
  reporte.flujo.push('Crear, configurar y publicar un taller desde el panel');
  const taller = (await almacen.leer()).entradas.find((e) => e.tipo === 'taller');
  const pagina = await contexto.newPage();
  pagina.on('pageerror', (e) => reporte.errores.push(e.message));
  await pagina.goto(`${origen}/#talleres`);
  await pagina.locator('.taller-inscripcion summary').click();
  await pagina.getByRole('button', { name: 'Confirmar inscripción' }).waitFor();
  assert.equal(await pagina.getByLabel(/He leído y acepto/).isChecked(), false);
  for (const ancho of [1440, 1024, 768, 390, 320]) {
    await pagina.setViewportSize({ width: ancho, height: 1000 });
    assert.equal(
      await pagina.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
      `Formulario a ${ancho}px`,
    );
  }
  await pagina.setViewportSize({ width: 390, height: 844 });
  await pagina.locator('.taller-inscripcion').scrollIntoViewIfNeeded();
  await axe(pagina, 'Formulario de inscripción móvil');
  await pagina.screenshot({ path: join(artefactos, 'inscripcion-movil.png'), fullPage: true });
  await pagina.setViewportSize({ width: 1440, height: 1000 });
  await axe(pagina, 'Formulario de inscripción escritorio');
  await pagina.locator('#talleres').scrollIntoViewIfNeeded();
  await pagina.screenshot({ path: join(artefactos, 'inscripcion-escritorio.png') });
  await pagina.getByLabel('Nombre completo', { exact: true }).fill('María López de la Cruz');
  await pagina.getByLabel('Correo', { exact: true }).fill('participante@example.test');
  await pagina.getByLabel('Teléfono', { exact: true }).fill('5500000000');
  await pagina.getByRole('combobox', { name: /Procedencia/ }).selectOption('interna');
  await pagina.getByLabel('Licenciatura', { exact: true }).fill('Medicina Veterinaria y Zootecnia');
  await pagina.getByLabel('Número de cuenta', { exact: true }).fill('000000000');
  await pagina.getByLabel(/He leído y acepto/).check();
  await pagina.getByRole('button', { name: 'Confirmar inscripción', exact: true }).click();
  await pagina.getByRole('heading', { name: 'Inscripción confirmada', exact: true }).waitFor();
  assert.match(await pagina.locator('.inscripcion-confirmada').textContent(), /INS-\d{4}-\d{8}/);
  assert.equal(
    await pagina.locator('.inscripcion-confirmada').evaluate((e) => document.activeElement === e),
    true,
  );
  const duplicado = await contexto.request.post(
    `${origen}/api/v1/publico/talleres/${taller.id}/inscripciones`,
    {
      headers: { Origin: origen },
      data: {
        nombre: 'Duplicado',
        correo: 'PARTICIPANTE@example.test',
        telefono: '5500000000',
        procedencia: 'externa',
        aceptoAviso: true,
        versionAviso: 'solo-pruebas-v1',
      },
    },
  );
  assert.equal((await duplicado.json()).error, 'INSCRIPCION_DUPLICADA');
  reporte.flujo.push(
    'Inscripción pública interna con consentimiento, folio, foco y bloqueo de duplicados',
  );
  await pagina.reload();
  await pagina.locator('.taller-inscripcion summary').click();
  await pagina.getByText('Cupo agotado.', { exact: true }).waitFor();
  assert.equal(await pagina.locator('.formulario-inscripcion').count(), 0);
  await panel.getByRole('button', { name: 'Consultar asistentes', exact: true }).click();
  await panel
    .locator('.cms-asistentes h4')
    .getByText('María López de la Cruz', { exact: true })
    .waitFor();
  await axe(panel, 'Gestión de inscripciones escritorio');
  await panel.locator('.cms-inscripciones').scrollIntoViewIfNeeded();
  await panel.screenshot({ path: join(artefactos, 'asistentes-escritorio.png') });
  await panel.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await panel.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
  );
  await axe(panel, 'Gestión de inscripciones móvil');
  await panel.locator('.cms-asistentes').scrollIntoViewIfNeeded();
  await panel.screenshot({ path: join(artefactos, 'asistentes-movil.png') });
  for (const formato of ['CSV', 'PDF']) {
    const descarga = panel.waitForEvent('download');
    await panel.getByRole('button', { name: `Exportar ${formato}`, exact: true }).click();
    await (await descarga).saveAs(join(artefactos, `asistentes.${formato.toLowerCase()}`));
  }
  assert.ok((await readFile(join(artefactos, 'asistentes.csv'), 'utf8')).includes('María López'));
  await panel
    .getByLabel('Motivo de la acción sobre taller o inscripción')
    .fill('Solicitud sintética del participante');
  await panel.getByRole('button', { name: 'Cancelar inscripción', exact: true }).click();
  await panel
    .getByText(`${(await almacen.leer()).inscripciones[0].folio} · cancelada`, { exact: true })
    .waitFor();
  await pagina.reload();
  await pagina.locator('.taller-inscripcion summary').click();
  await pagina.getByRole('button', { name: 'Confirmar inscripción', exact: true }).waitFor();
  reporte.flujo.push('Cupo agotado, lista privada, CSV/PDF y reapertura al cancelar');
  await almacen.cambiar((s) => {
    s.avisoTalleres = null;
  });
  await pagina.getByLabel('Nombre completo', { exact: true }).fill('Otra persona de prueba');
  await pagina.getByLabel('Correo', { exact: true }).fill('otra@example.test');
  await pagina.getByLabel('Teléfono', { exact: true }).fill('5500000000');
  await pagina.getByLabel(/He leído y acepto/).check();
  await pagina.getByRole('button', { name: 'Confirmar inscripción', exact: true }).click();
  await pagina
    .getByText('La inscripción aún no está disponible. Solicita información al módulo.', {
      exact: true,
    })
    .waitFor();
  assert.equal(await pagina.locator('.formulario-inscripcion').count(), 0);
  reporte.flujo.push('Formulario ausente al retirar el aviso autorizado');
  assert.deepEqual(reporte.errores, []);
  reporte.resultado = 'Aprobado';
  console.log(
    `Fase 2: ${reporte.flujo.length} flujos y ${reporte.accesibilidad.length} controles de accesibilidad aprobados.`,
  );
} finally {
  await writeFile(join(artefactos, 'validacion.json'), JSON.stringify(reporte, null, 2));
  await browser?.close();
  await new Promise((ok) => servidor.close(ok));
  if (temporal.startsWith(artefactos + sep)) await rm(temporal, { recursive: true, force: true });
}
