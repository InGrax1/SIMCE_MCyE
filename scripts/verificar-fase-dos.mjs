import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, writeFile, readFile, readdir, cp, rm } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import assert from 'node:assert/strict';
import { crearAplicacion } from '../packages/api/src/app.js';
import { AlmacenCmsArchivo } from '../packages/api/src/cms/almacen.js';
import { crearAutenticacion, hashClave } from '../packages/api/src/cms/autenticacion.js';
import { crearRutasCms } from '../packages/api/src/cms/rutas.js';
import { crearPublicador } from '../packages/api/src/cms/publicacion.js';
import { avisoPrivacidad } from '../packages/portal/src/avisoPrivacidad.js';
import { configurarCorreo } from '../packages/api/src/cms/correo.js';
import { crearCorreoConsultas } from '../packages/api/src/talleres/correoConsultas.js';

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
  s.avisoTalleres = { url: avisoPrivacidad.url, version: avisoPrivacidad.version };
  s.avisoInteres = { url: avisoPrivacidad.url, version: avisoPrivacidad.version };
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
let enviarReciboConsulta;
const rutas = crearRutasCms({
  almacen,
  auth,
  publicador,
  carpetaMedios: temporal,
  enviarReciboConsulta: (datos) => enviarReciboConsulta(datos),
});
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
enviarReciboConsulta = crearCorreoConsultas({
  almacen,
  origenPublico: origen,
  secreto: randomBytes(48).toString('hex'),
  enviarCorreo: configurarCorreo(temporal, { NODE_ENV: 'test', CORREO_MODO: 'archivo' }),
});
const reporte = { flujo: [], accesibilidad: [], errores: [], fecha: new Date().toISOString() };
let browser;
async function enlaceDeRespuesta(folio, mensaje) {
  const buzón = join(temporal, 'correos');
  for (const nombre of await readdir(buzón)) {
    const copia = JSON.parse(await readFile(join(buzón, nombre), 'utf8'));
    if (
      copia.asunto.startsWith(`El Módulo respondió tu solicitud ${folio}`) &&
      copia.texto.includes(mensaje)
    ) {
      return copia.html
        .match(/href="([^"]+)"[^>]*>Consulta tu estado<\/a>/)[1]
        .replaceAll('&amp;', '&');
    }
  }
  assert.fail(`No se encontró el correo de respuesta de ${folio}.`);
}
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
  const navegacionPanel = panel.getByRole('navigation', { name: 'Navegación del panel' });
  await navegacionPanel.getByRole('button', { name: 'Talleres', exact: true }).click();
  const seccionesEntrada = panel.getByRole('navigation', { name: 'Secciones de la entrada' });
  const seccion = (name) => seccionesEntrada.getByRole('button', { name, exact: true });
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
  assert.equal(await panel.getByLabel('Cupo', { exact: true }).count(), 0);
  await seccion('Inscripciones').click();
  assert.equal(await panel.getByLabel('Nombre o título').count(), 0);
  assert.equal(await panel.getByRole('button', { name: 'Exportar CSV' }).count(), 0);
  await panel.getByLabel('Sede', { exact: true }).fill('Borrador de sede');
  panel.once('dialog', (dialog) => dialog.dismiss());
  await seccion('Ficha').click();
  assert.equal(await panel.getByLabel('Sede', { exact: true }).inputValue(), 'Borrador de sede');
  panel.once('dialog', (dialog) => dialog.accept());
  await seccion('Ficha').click();
  await seccion('Inscripciones').click();
  assert.equal(await panel.getByLabel('Sede', { exact: true }).inputValue(), '');
  await panel
    .getByLabel('Contenido temático', { exact: true })
    .fill('Higiene y formulación.\nElaboración de embutidos.');
  await panel.getByLabel('Sede', { exact: true }).fill('Sala de pruebas del CEA');
  await panel.getByLabel('Cupo', { exact: true }).fill('1');
  await panel.getByLabel('Apertura de inscripción', { exact: true }).fill('2020-01-01T09:00');
  await panel.getByLabel('Cierre de inscripción', { exact: true }).fill('2099-11-09T18:00');
  await panel.getByRole('button', { name: 'Guardar inscripción', exact: true }).click();
  await panel.getByText('Inscripción del taller actualizada.', { exact: true }).waitFor();
  assert.equal(await seccion('Inscripciones').getAttribute('aria-current'), 'page');
  await axe(panel, 'Configuración de inscripciones escritorio');
  await panel.screenshot({ path: join(artefactos, 'configuracion-inscripciones.png') });
  await panel.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await panel.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
  );
  await axe(panel, 'Configuración de inscripciones móvil');
  await panel.screenshot({
    path: join(artefactos, 'configuracion-inscripciones-movil.png'),
    fullPage: true,
  });
  await panel.setViewportSize({ width: 1440, height: 1000 });
  await seccion('Publicación').click();
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
  assert.equal(await pagina.locator('#talleres a[href^="mailto:"]').count(), 0);
  await pagina.locator('.taller-consulta summary').click();
  const formularioConsulta = pagina.locator('.formulario-consulta');
  assert.equal(await formularioConsulta.getByRole('checkbox').isChecked(), false);
  await formularioConsulta
    .getByLabel('Nombre completo', { exact: true })
    .fill('Persona interesada en el taller');
  await formularioConsulta
    .getByLabel('Correo de contacto', { exact: true })
    .fill('consulta@example.test');
  await formularioConsulta
    .getByLabel('¿Qué te gustaría saber? (opcional)', { exact: true })
    .fill('¿Qué materiales debo llevar al taller?');
  await formularioConsulta.getByRole('checkbox').check();
  await pagina.setViewportSize({ width: 390, height: 844 });
  await axe(pagina, 'Solicitud de información móvil');
  await formularioConsulta.scrollIntoViewIfNeeded();
  await pagina.screenshot({ path: join(artefactos, 'consulta-formulario-movil.png') });
  await pagina.route('**/api/v1/publico/talleres/*/consultas', (ruta) => ruta.abort('failed'), {
    times: 1,
  });
  await formularioConsulta.getByRole('button', { name: 'Enviar consulta', exact: true }).click();
  await formularioConsulta
    .getByRole('alert')
    .getByText('No pudimos conectar con el sitio. Inténtalo de nuevo en unos momentos.', {
      exact: true,
    })
    .waitFor();
  assert.equal(
    await formularioConsulta.getByLabel('Correo de contacto', { exact: true }).inputValue(),
    'consulta@example.test',
  );
  assert.equal(
    await formularioConsulta
      .getByLabel('¿Qué te gustaría saber? (opcional)', { exact: true })
      .inputValue(),
    '¿Qué materiales debo llevar al taller?',
  );
  reporte.flujo.push(
    'Fallo de conexión muestra un aviso en español, conserva el formulario y permite reintentar',
  );
  await formularioConsulta.getByRole('button', { name: 'Enviar consulta', exact: true }).click();
  await pagina.getByRole('heading', { name: 'Recibimos tu consulta', exact: true }).waitFor();
  await pagina.getByText(/Guardamos el acceso en este navegador/).waitFor();
  await pagina
    .getByText(
      'La copia por correo todavía no está disponible. Puedes revisar la respuesta aquí.',
      { exact: true },
    )
    .waitFor();
  const enlacePrivado = await pagina
    .getByRole('link', { name: 'Consultar mi solicitud', exact: true })
    .getAttribute('href');
  assert.equal((await almacen.leer()).inscripciones.length, 0);
  const consultaCreada = (await almacen.leer()).consultasTalleres[0];
  assert.equal(consultaCreada.correoConfirmacion.estado, 'archivo');
  const copias = await readdir(join(temporal, 'correos'));
  assert.equal(copias.length, 1);
  const copia = JSON.parse(await readFile(join(temporal, 'correos', copias[0]), 'utf8'));
  const enlaceCorreo = copia.html
    .match(/href="([^"]+)"[^>]*>Consulta tu estado<\/a>/)[1]
    .replaceAll('&amp;', '&');
  assert.equal(enlaceCorreo, enlacePrivado);
  assert.ok(copia.texto.includes('¿Qué materiales debo llevar al taller?'));
  await pagina.goto(`${origen}/#talleres`);
  await pagina.getByRole('heading', { name: 'Mis consultas de talleres', exact: true }).waitFor();
  await pagina
    .getByRole('link', { name: `Consultar estado de ${consultaCreada.folio}`, exact: true })
    .click();
  await pagina.getByText('Tu consulta está pendiente de respuesta.', { exact: true }).waitFor();
  await pagina.getByRole('link', { name: 'Volver a talleres', exact: true }).click();
  reporte.flujo.push(
    'Volver al sitio recupera el acceso guardado sin conservar un enlace manualmente',
  );
  const contextoSeguimiento = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  });
  const seguimiento = await contextoSeguimiento.newPage();
  seguimiento.on('pageerror', (e) => reporte.errores.push(e.message));
  await seguimiento.goto(`${origen}/#talleres`);
  const misConsultas = seguimiento.getByRole('region', { name: 'Mis consultas de talleres' });
  const sinConsultas = misConsultas.getByText('No hay consultas guardadas en este navegador.', {
    exact: false,
  });
  await sinConsultas.waitFor();
  await seguimiento.locator('.taller-consulta summary').click();
  const formularioDuplicado = seguimiento.locator('.formulario-consulta');
  await formularioDuplicado.getByLabel('Nombre completo', { exact: true }).fill('Otra solicitud');
  await formularioDuplicado
    .getByLabel('Correo de contacto', { exact: true })
    .fill('CONSULTA@EXAMPLE.TEST');
  await formularioDuplicado.getByRole('checkbox').check();
  const respuestaDuplicada = seguimiento.waitForResponse(
    (respuesta) => respuesta.url() === `${origen}/api/v1/publico/talleres/${taller.id}/consultas`,
  );
  await formularioDuplicado.getByRole('button', { name: 'Enviar consulta', exact: true }).click();
  const duplicada = await respuestaDuplicada;
  assert.equal(duplicada.status(), 409);
  assert.equal((await duplicada.json()).error, 'CONSULTA_DUPLICADA');
  await formularioDuplicado
    .getByRole('alert')
    .getByText(/Ya existe una consulta/)
    .waitFor();
  await formularioDuplicado.getByRole('link', { name: 'Ir a Mis consultas de talleres' }).click();
  await seguimiento.waitForURL('**/#mis-consultas-talleres');
  await sinConsultas.waitFor();
  await misConsultas.getByText('Consulta tu estado', { exact: true }).waitFor();
  assert.equal((await almacen.leer()).consultasTalleres.length, 1);
  reporte.flujo.push('Duplicado enlaza a Mis consultas de talleres en un navegador sin accesos');
  await seguimiento.goto(enlaceCorreo);
  await seguimiento
    .getByText('Tu consulta está pendiente de respuesta.', { exact: true })
    .waitFor();
  await navegacionPanel.getByRole('button', { name: 'Solicitudes', exact: true }).click();
  await panel.getByText('Añadir una nota (opcional)', { exact: true }).click();
  await panel
    .getByRole('textbox', { name: 'Nota para el solicitante' })
    .fill('El material está incluido. Puedes llevar una libreta.');
  await panel.getByRole('button', { name: 'Aceptar', exact: true }).click();
  await panel
    .getByText(
      `Solicitud ${consultaCreada.folio} aceptada. Correo preparado en el buzón local de prueba.`,
    )
    .waitFor();
  await panel.screenshot({ path: join(artefactos, 'consulta-panel-escritorio.png') });
  const enlaceRespuesta = await enlaceDeRespuesta(
    consultaCreada.folio,
    'El Módulo aceptó tu solicitud',
  );
  assert.notEqual(enlaceRespuesta, enlaceCorreo);
  await seguimiento.goto(enlaceRespuesta);
  await seguimiento.getByText('Tu solicitud fue aceptada.', { exact: true }).waitFor();
  await seguimiento.getByText(/El material está incluido. Puedes llevar una libreta./).waitFor();
  await seguimiento
    .getByLabel('Continuar esta consulta', { exact: true })
    .fill('¿A qué hora inicia el taller?');
  await seguimiento
    .getByRole('button', { name: 'Enviar mensaje de seguimiento', exact: true })
    .click();
  await seguimiento
    .getByText('Tu consulta está pendiente de respuesta.', { exact: true })
    .waitFor();
  const solicitudesPanel = panel.locator('#solicitudes-panel');
  await solicitudesPanel.getByRole('button', { name: /^Consultas de talleres/ }).click();
  const fichaConsulta = solicitudesPanel.locator('.cms-bandeja-detalle');
  await fichaConsulta.getByText('¿A qué hora inicia el taller?', { exact: true }).waitFor();
  await fichaConsulta.getByRole('button', { name: 'Rechazar', exact: true }).click();
  await solicitudesPanel
    .getByText(
      `Solicitud ${consultaCreada.folio} rechazada. Correo preparado en el buzón local de prueba.`,
    )
    .waitFor();
  assert.equal(
    await enlaceDeRespuesta(consultaCreada.folio, 'El Módulo rechazó tu solicitud'),
    enlaceRespuesta,
  );
  await seguimiento.getByRole('button', { name: 'Actualizar respuesta', exact: true }).click();
  await seguimiento.getByText('Tu solicitud fue rechazada.', { exact: true }).waitFor();
  assert.equal((await almacen.leer()).consultasTalleres.length, 1);
  reporte.flujo.push(
    'Aceptar y rechazar con mensaje automático, nota opcional y correo con el mismo folio',
  );
  reporte.flujo.push(
    'Consulta duplicada bloqueada y mensajes adicionales atendidos desde el apartado central con el mismo folio',
  );
  await fichaConsulta.getByRole('button', { name: 'Cancelar solicitud', exact: true }).click();
  await fichaConsulta
    .getByLabel('Motivo', { exact: true })
    .fill('Cierre solicitado por el visitante');
  await fichaConsulta.getByRole('button', { name: 'Confirmar cancelación', exact: true }).click();
  await fichaConsulta.getByRole('button', { name: 'Reabrir solicitud', exact: true }).waitFor();
  await seguimiento.getByRole('button', { name: 'Actualizar respuesta', exact: true }).click();
  await seguimiento.getByText('La solicitud está cancelada.', { exact: true }).waitFor();
  await seguimiento
    .getByText('Motivo: Cierre solicitado por el visitante', { exact: true })
    .waitFor();
  assert.equal(
    await seguimiento.getByRole('button', { name: 'Enviar mensaje de seguimiento' }).count(),
    0,
  );
  await fichaConsulta.getByRole('button', { name: 'Reabrir solicitud', exact: true }).click();
  await fichaConsulta
    .getByLabel('Motivo', { exact: true })
    .fill('La persona pidió retomar la atención');
  await fichaConsulta.getByRole('button', { name: 'Confirmar reapertura', exact: true }).click();
  await fichaConsulta.getByRole('button', { name: 'Cancelar solicitud', exact: true }).waitFor();
  await seguimiento.getByRole('button', { name: 'Actualizar respuesta', exact: true }).click();
  await seguimiento.getByLabel('Continuar esta consulta', { exact: true }).waitFor();
  reporte.flujo.push(
    'La consulta de taller se cancela y reabre con el mismo folio e historial visible para la persona',
  );
  for (const ancho of [1440, 390]) {
    await seguimiento.setViewportSize({ width: ancho, height: 900 });
    assert.equal(
      await seguimiento.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await axe(seguimiento, `Consulta y respuesta web ${ancho}px`);
    await seguimiento.locator('#consultar-solicitud').scrollIntoViewIfNeeded();
    await seguimiento.screenshot({ path: join(artefactos, `consulta-respuesta-${ancho}.png`) });
  }
  await seguimiento.getByRole('link', { name: 'Volver a talleres', exact: true }).click();
  await seguimiento.locator('#consultar-solicitud').waitFor({ state: 'detached' });
  await seguimiento.reload();
  await seguimiento
    .getByRole('link', { name: `Consultar estado de ${consultaCreada.folio}`, exact: true })
    .waitFor();
  for (const ancho of [1440, 390, 320]) {
    await seguimiento.setViewportSize({ width: ancho, height: 900 });
    assert.equal(
      await seguimiento.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    if (ancho !== 320) await axe(seguimiento, `Mis consultas guardadas ${ancho}px`);
    await misConsultas.scrollIntoViewIfNeeded();
    await seguimiento.screenshot({ path: join(artefactos, `consultas-guardadas-${ancho}.png`) });
  }
  await seguimiento
    .getByRole('button', { name: `Quitar ${consultaCreada.folio} de este navegador`, exact: true })
    .click();
  await sinConsultas.waitFor();
  await seguimiento.reload();
  await sinConsultas.waitFor();
  await seguimiento.goto(enlaceCorreo);
  await seguimiento.getByText(/El material está incluido. Puedes llevar una libreta./).waitFor();
  await seguimiento.evaluate(() => localStorage.clear());
  await seguimiento.goto(`${origen}/#talleres`);
  await sinConsultas.waitFor();
  await seguimiento.goto(enlaceCorreo);
  await seguimiento.getByText(/El material está incluido. Puedes llevar una libreta./).waitFor();
  await seguimiento.getByRole('link', { name: 'Volver a talleres', exact: true }).click();
  await seguimiento
    .getByRole('heading', { name: 'Mis consultas de talleres', exact: true })
    .waitFor();
  assert.equal((await almacen.leer()).consultasTalleres.length, 1);
  await contextoSeguimiento.close();
  reporte.flujo.push(
    'Copia local del correo con botón recupera el acceso en otro navegador, después de quitarlo y después de borrar datos',
  );
  reporte.flujo.push(
    'Consulta desde el taller, folio y enlace privado, respuesta en panel y lectura en la web',
  );
  const contextoBloqueado = await browser.newContext({ reducedMotion: 'reduce' });
  await contextoBloqueado.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get: () => {
        throw new Error('Almacenamiento bloqueado para la prueba');
      },
    });
  });
  const bloqueada = await contextoBloqueado.newPage();
  bloqueada.on('pageerror', (e) => reporte.errores.push(e.message));
  await bloqueada.goto(`${origen}/#talleres`);
  await bloqueada.locator('.taller-consulta summary').click();
  const formularioBloqueado = bloqueada.locator('.formulario-consulta');
  await formularioBloqueado
    .getByLabel('Nombre completo', { exact: true })
    .fill('Persona sin almacenamiento');
  await formularioBloqueado
    .getByLabel('Correo de contacto', { exact: true })
    .fill('sin-almacenamiento@example.test');
  assert.equal(
    await formularioBloqueado
      .getByLabel('¿Qué te gustaría saber? (opcional)', { exact: true })
      .inputValue(),
    '',
  );
  await formularioBloqueado.getByRole('checkbox').check();
  await formularioBloqueado.getByRole('button', { name: 'Enviar consulta', exact: true }).click();
  await bloqueada.getByText(/Este navegador no permitió guardar el acceso/).waitFor();
  assert.ok(
    (await bloqueada.getByLabel('Enlace privado', { exact: true }).inputValue()).includes(
      '#consulta-taller=',
    ),
  );
  await bloqueada.getByRole('link', { name: 'Consultar mi solicitud', exact: true }).click();
  await bloqueada.getByText('Tu consulta está pendiente de respuesta.', { exact: true }).waitFor();
  await bloqueada
    .getByText('Solicitaste información sin agregar un mensaje inicial.', { exact: true })
    .waitFor();
  await contextoBloqueado.close();
  reporte.flujo.push(
    'Consulta sin pregunta genera folio y enlace privado aunque el almacenamiento esté bloqueado',
  );
  await pagina.setViewportSize({ width: 1440, height: 1000 });
  const programaElegido = (await almacen.leer()).entradas.filter(
    (e) => e.tipo === 'programa' && e.publicado,
  )[1];
  await pagina
    .locator('.programas-grid article')
    .nth(1)
    .getByRole('link', { name: /Solicitar Información/ })
    .click();
  await pagina.waitForFunction(() => document.activeElement.id === 'interes-servicio-social');
  assert.ok(
    (await pagina.locator('#programa-interes').textContent()).includes(
      programaElegido.publicado.nombre,
    ),
  );
  const formularioSocial = pagina.locator('.interes-social form');
  await formularioSocial.getByLabel('Nombre', { exact: true }).fill('Interés de servicio social');
  await formularioSocial.getByLabel('Correo', { exact: true }).fill('interes@example.test');
  await formularioSocial.getByRole('checkbox').check();
  await formularioSocial.getByRole('button', { name: 'Enviar interés', exact: true }).click();
  await pagina
    .getByRole('heading', { name: 'Recibimos tu solicitud de servicio social' })
    .waitFor();
  const solicitudSocial = (await almacen.leer()).intereses[0];
  assert.equal(solicitudSocial.programaId, programaElegido.id);
  const enlaceSocial = await pagina
    .getByRole('link', { name: 'Consultar mi solicitud de servicio social' })
    .getAttribute('href');
  const contextoSocial = await browser.newContext({
    reducedMotion: 'reduce',
    viewport: { width: 390, height: 844 },
  });
  const seguimientoSocial = await contextoSocial.newPage();
  seguimientoSocial.on('pageerror', (e) => reporte.errores.push(e.message));
  await seguimientoSocial.goto(enlaceSocial);
  const miSocial = seguimientoSocial.locator('#consultar-servicio-social');
  await miSocial.getByRole('heading', { name: 'Mi solicitud de servicio social' }).waitFor();
  await solicitudesPanel.getByRole('button', { name: /^Servicio social/ }).click();
  const detalleSocial = solicitudesPanel.locator('.cms-bandeja-detalle');
  await detalleSocial.getByText('Añadir una nota (opcional)', { exact: true }).click();
  await detalleSocial
    .getByRole('textbox', { name: 'Nota para el solicitante' })
    .fill('Puedes presentar tu solicitud con tu historial académico.');
  await detalleSocial.getByRole('button', { name: 'Aceptar', exact: true }).click();
  await detalleSocial
    .getByText(
      `Solicitud ${solicitudSocial.folio} aceptada. Correo preparado en el buzón local de prueba.`,
    )
    .waitFor();
  await seguimientoSocial.goto(
    await enlaceDeRespuesta(
      solicitudSocial.folio,
      'La admisión al programa se confirma por separado.',
    ),
  );
  await miSocial.getByText(/Puedes presentar tu solicitud con tu historial académico./).waitFor();
  await miSocial
    .getByLabel('Continuar esta consulta', { exact: true })
    .fill('¿Qué horarios están disponibles?');
  await miSocial
    .getByRole('button', { name: 'Enviar mensaje de seguimiento', exact: true })
    .click();
  await miSocial.getByText('¿Qué horarios están disponibles?', { exact: true }).waitFor();
  await solicitudesPanel.getByRole('button', { name: 'Actualizar', exact: true }).click();
  await detalleSocial.getByText('¿Qué horarios están disponibles?', { exact: true }).waitFor();
  await axe(seguimientoSocial, 'Seguimiento privado de servicio social móvil');
  await seguimientoSocial.screenshot({
    path: join(artefactos, 'servicio-social-seguimiento-movil.png'),
  });
  await miSocial.getByRole('link', { name: 'Volver a servicio social', exact: true }).click();
  await seguimientoSocial.reload();
  await seguimientoSocial
    .getByRole('link', { name: `Consultar estado de ${solicitudSocial.folio}`, exact: true })
    .waitFor();
  await contextoSocial.close();
  reporte.flujo.push(
    'Servicio social conserva el programa, crea folio privado, recibe respuestas y permite continuar la conversación',
  );
  await almacen.cambiar((s) =>
    s.intereses.push({
      id: randomUUID(),
      nombre: 'Registro anterior de prueba',
      correo: 'anterior@example.test',
      programaId: programaElegido.id,
      mensaje: 'Consulta registrada antes del seguimiento',
      momento: '2026-10-01T18:00:00.000Z',
      versionAviso: 'aviso-previo',
    }),
  );
  await solicitudesPanel.getByRole('button', { name: 'Actualizar', exact: true }).click();
  await solicitudesPanel.getByRole('button', { name: /Registro anterior de prueba/ }).click();
  await detalleSocial
    .getByRole('button', { name: 'Enviar acceso de seguimiento', exact: true })
    .click();
  await detalleSocial
    .getByText('Enlace preparado en el buzón local de prueba.', { exact: true })
    .waitFor();
  assert.equal(
    (await almacen.leer()).intereses[1].mensaje,
    'Consulta registrada antes del seguimiento',
  );
  reporte.flujo.push(
    'El panel habilita acceso privado por correo en una solicitud de servicio social anterior',
  );
  await pagina.locator('.taller-inscripcion summary').click();
  const inscripcion = pagina.locator('.taller-inscripcion');
  await pagina.getByRole('button', { name: 'Confirmar inscripción' }).waitFor();
  const paginaAviso = contexto.waitForEvent('page');
  await pagina
    .locator('.formulario-inscripcion')
    .getByRole('link', { name: 'aviso de privacidad', exact: true })
    .click();
  const aviso = await paginaAviso;
  await aviso.waitForLoadState();
  assert.equal(new URL(aviso.url()).pathname, avisoPrivacidad.url);
  await aviso.getByRole('heading', { name: 'Aviso integral', exact: true }).waitFor();
  for (const ancho of [1440, 390]) {
    await aviso.setViewportSize({ width: ancho, height: 900 });
    assert.equal(
      await aviso.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await axe(aviso, `Aviso autorizado ${ancho}px`);
    await aviso.screenshot({ path: join(artefactos, `aviso-${ancho}.png`), fullPage: true });
  }
  await aviso.close();
  reporte.flujo.push(
    'Aviso autorizado accesible desde la casilla de consentimiento, en el mismo origen',
  );
  assert.equal(await inscripcion.getByLabel(/He leído y acepto/).isChecked(), false);
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
  await inscripcion.getByLabel('Nombre completo', { exact: true }).fill('María López de la Cruz');
  await inscripcion.getByLabel('Correo', { exact: true }).fill('participante@example.test');
  await inscripcion.getByLabel('Teléfono', { exact: true }).fill('5500000000');
  await inscripcion.getByRole('combobox', { name: /Procedencia/ }).selectOption('interna');
  await inscripcion
    .getByLabel('Licenciatura', { exact: true })
    .fill('Medicina Veterinaria y Zootecnia');
  await inscripcion.getByLabel('Número de cuenta', { exact: true }).fill('000000000');
  await inscripcion.getByLabel(/He leído y acepto/).check();
  await pagina.getByRole('button', { name: 'Confirmar inscripción', exact: true }).click();
  await pagina.getByRole('heading', { name: 'Inscripción confirmada', exact: true }).waitFor();
  const enlaceInscripcion = await pagina
    .getByRole('link', { name: 'Consultar mi inscripción', exact: true })
    .getAttribute('href');
  const folioInscripcion = (await almacen.leer()).inscripciones[0].folio;
  assert.match(await pagina.locator('.inscripcion-confirmada').textContent(), /INS-\d{4}-\d{8}/);
  await pagina.waitForFunction(() =>
    document.activeElement?.classList.contains('inscripcion-confirmada'),
  );
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
        versionAviso: avisoPrivacidad.version,
      },
    },
  );
  assert.equal((await duplicado.json()).error, 'INSCRIPCION_DUPLICADA');
  reporte.flujo.push(
    'Inscripción pública interna con consentimiento, folio, foco y bloqueo de duplicados',
  );
  const contextoInscrito = await browser.newContext({
    reducedMotion: 'reduce',
    viewport: { width: 1440, height: 1000 },
  });
  const inscrito = await contextoInscrito.newPage();
  inscrito.on('pageerror', (e) => reporte.errores.push(e.message));
  await inscrito.goto(enlaceInscripcion);
  const miInscripcion = inscrito.locator('#consultar-inscripcion');
  await miInscripcion.getByText('María López de la Cruz', { exact: true }).waitFor();
  await miInscripcion
    .getByLabel('Motivo', { exact: true })
    .fill('Cambio de horario del participante');
  await miInscripcion.getByRole('button', { name: 'Cancelar mi inscripción', exact: true }).click();
  await miInscripcion
    .getByText('Cancelaste tu inscripción. La plaza quedó disponible.', { exact: true })
    .waitFor();
  assert.equal((await almacen.leer()).inscripciones[0].estado, 'cancelada');
  await miInscripcion.getByLabel('Motivo', { exact: true }).fill('El participante puede asistir');
  await miInscripcion.getByRole('checkbox').check();
  await miInscripcion
    .getByRole('button', { name: 'Reactivar mi inscripción', exact: true })
    .click();
  await miInscripcion
    .getByText('Tu inscripción fue reactivada con el mismo folio.', { exact: true })
    .waitFor();
  assert.equal((await almacen.leer()).inscripciones[0].folio, folioInscripcion);
  assert.equal((await almacen.leer()).inscripciones.length, 1);
  assert.equal(
    await miInscripcion.getByRole('button', { name: 'Registrar asistencia' }).count(),
    0,
  );
  for (const ancho of [1440, 390, 320]) {
    await inscrito.setViewportSize({ width: ancho, height: 1000 });
    assert.equal(
      await inscrito.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    if (ancho !== 320) await axe(inscrito, `Inscripción privada e historial ${ancho}px`);
    await miInscripcion.scrollIntoViewIfNeeded();
    await miInscripcion.screenshot({
      path: join(artefactos, `inscripcion-privada-${ancho}.png`),
    });
  }
  await inscrito.getByRole('link', { name: 'Volver a talleres', exact: true }).click();
  await inscrito.reload();
  await inscrito
    .getByRole('heading', { name: 'Mis inscripciones a talleres', exact: true })
    .waitFor();
  await inscrito
    .getByRole('link', { name: `Consultar estado de ${folioInscripcion}`, exact: true })
    .click();
  await miInscripcion.getByText('María López de la Cruz', { exact: true }).waitFor();
  reporte.flujo.push(
    'Participante consulta datos e historial, cancela, libera plaza y reactiva con el mismo folio y acceso guardado',
  );
  await pagina.reload();
  await pagina.locator('.taller-inscripcion summary').click();
  await pagina.getByText('Cupo agotado.', { exact: true }).waitFor();
  assert.equal(await pagina.locator('.formulario-inscripcion').count(), 0);
  await navegacionPanel.getByRole('button', { name: 'Talleres', exact: true }).click();
  await seccion('Operación').click();
  assert.equal(await panel.getByLabel('Cupo', { exact: true }).count(), 0);
  for (const formato of ['CSV', 'PDF']) {
    const descarga = panel.waitForEvent('download');
    await panel.getByRole('button', { name: `Exportar ${formato}`, exact: true }).click();
    await (await descarga).saveAs(join(artefactos, `asistentes.${formato.toLowerCase()}`));
  }
  assert.ok((await readFile(join(artefactos, 'asistentes.csv'), 'utf8')).includes('María López'));
  await navegacionPanel.getByRole('button', { name: 'Participantes', exact: true }).click();
  const fichaInscripcion = solicitudesPanel.locator('.cms-bandeja-detalle');
  await fichaInscripcion
    .getByRole('heading', { name: 'María López de la Cruz', exact: true })
    .waitFor();
  await axe(panel, 'Gestión de inscripciones escritorio');
  await panel.screenshot({ path: join(artefactos, 'asistentes-escritorio.png') });
  await fichaInscripcion.getByRole('button', { name: 'Cancelar inscripción', exact: true }).click();
  await fichaInscripcion
    .getByLabel('Motivo', { exact: true })
    .fill('Solicitud sintética del participante');
  await fichaInscripcion
    .getByRole('button', { name: 'Confirmar cancelación', exact: true })
    .click();
  await fichaInscripcion.locator('[data-estado="cancelada"]').waitFor();
  await pagina.reload();
  await pagina.locator('.taller-inscripcion summary').click();
  await pagina.getByRole('button', { name: 'Confirmar inscripción', exact: true }).waitFor();
  reporte.flujo.push('Cupo agotado, lista privada, CSV/PDF y reapertura al cancelar');
  await solicitudesPanel
    .getByLabel('Buscar por nombre, correo o folio', { exact: true })
    .fill('PARTICIPANTE@example.test');
  await fichaInscripcion
    .getByRole('button', { name: 'Reactivar inscripción', exact: true })
    .click();
  await fichaInscripcion
    .getByLabel('Motivo', { exact: true })
    .fill('Reactivación revisada por la responsable');
  await fichaInscripcion.getByRole('checkbox').check();
  await fichaInscripcion
    .getByRole('button', { name: 'Confirmar reactivación', exact: true })
    .click();
  await fichaInscripcion.locator('[data-estado="confirmada"]').waitFor();
  await fichaInscripcion.getByRole('button', { name: 'Registrar asistencia', exact: true }).click();
  await fichaInscripcion
    .getByLabel('Motivo', { exact: true })
    .fill('Asistencia verificada en la sede');
  await fichaInscripcion.getByRole('button', { name: 'Confirmar asistencia', exact: true }).click();
  await fichaInscripcion.locator('[data-estado="asistio"]').waitFor();
  for (const ancho of [1440, 1024, 768, 390, 320]) {
    await panel.setViewportSize({ width: ancho, height: 1000 });
    assert.equal(
      await panel.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    if (ancho === 1440 || ancho === 390) await axe(panel, `Bandeja de participantes ${ancho}px`);
    await panel.screenshot({ path: join(artefactos, `participantes-panel-${ancho}.png`) });
  }
  await panel.setViewportSize({ width: 390, height: 900 });
  await solicitudesPanel.getByRole('button', { name: /María López de la Cruz/ }).click();
  await fichaInscripcion.getByRole('heading', { name: 'Datos del participante' }).waitFor();
  await axe(panel, 'Detalle de participante móvil');
  await panel.screenshot({ path: join(artefactos, 'asistentes-movil.png') });
  await fichaInscripcion.getByRole('button', { name: 'Volver a la lista' }).click();
  await solicitudesPanel.getByRole('button', { name: /María López de la Cruz/ }).waitFor();
  await inscrito.getByRole('button', { name: 'Actualizar inscripción', exact: true }).click();
  await miInscripcion.getByText('Asistencia verificada en la sede', { exact: true }).waitFor();
  await contextoInscrito.close();
  reporte.flujo.push(
    'Participantes tiene su propia bandeja, conserva acciones e historial y funciona en móvil',
  );
  await almacen.cambiar((s) => {
    s.avisoTalleres = null;
  });
  await inscripcion.getByLabel('Nombre completo', { exact: true }).fill('Otra persona de prueba');
  await inscripcion.getByLabel('Correo', { exact: true }).fill('otra@example.test');
  await inscripcion.getByLabel('Teléfono', { exact: true }).fill('5500000000');
  await inscripcion.getByLabel(/He leído y acepto/).check();
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
