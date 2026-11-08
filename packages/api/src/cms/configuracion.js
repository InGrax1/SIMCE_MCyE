import { resolve } from 'node:path';
import { access } from 'node:fs/promises';
import { AlmacenCmsArchivo, AlmacenCmsMysql } from './almacen.js';
import { crearAutenticacion } from './autenticacion.js';
import { crearPublicador } from './publicacion.js';
import { crearRutasCms } from './rutas.js';
import { crearConexionBaseDatos } from '../infra/baseDatos.js';
import { configurarCorreo } from './correo.js';
import { crearRecuperacion } from './recuperacion.js';
import { configurarAvisoTalleres } from '../talleres/aviso.js';
import { validarAvisoConfigurado } from './avisoPrivacidad.js';
import { avisosPrivacidad } from '../../../portal/src/avisoPrivacidad.js';
import { crearCorreoConsultas } from '../talleres/correoConsultas.js';
import { crearAlmacenCatalogo } from '../catalogo/almacen.js';
import { crearAlmacenOperacion } from '../operacion/almacen.js';
import { crearServicioOperacion } from '../operacion/servicio.js';
import { configurarPerfil } from '../operacion/perfil.js';

export async function configurarCms() {
  const raiz = resolve(import.meta.dirname, '../../../..');
  const carpeta = resolve(process.env.CMS_DIR ?? resolve(raiz, '.local/cms'));
  const carpetaPortal = resolve(process.env.PORTAL_DIST ?? resolve(raiz, 'packages/portal/dist'));
  const avisoInteres = validarAvisoConfigurado(
    process.env.AVISO_INTERES_URL,
    process.env.AVISO_INTERES_VERSION,
  );
  validarAvisoConfigurado(process.env.AVISO_TALLERES_URL, process.env.AVISO_TALLERES_VERSION);
  for (const aviso of avisosPrivacidad)
    if ([process.env.AVISO_INTERES_URL, process.env.AVISO_TALLERES_URL].includes(aviso.url))
      await access(resolve(carpetaPortal, aviso.url.slice(1)));
  let db;
  if (process.env.NODE_ENV === 'production' && process.env.STORAGE !== 'mysql')
    throw new Error('En producción el gestor requiere STORAGE=mysql.');
  if (process.env.NODE_ENV === 'production' && !process.env.CMS_ORIGENES)
    throw new Error('Configura CMS_ORIGENES con los orígenes autorizados.');
  const almacen =
    process.env.STORAGE === 'mysql'
      ? ((db = crearConexionBaseDatos()), new AlmacenCmsMysql(db))
      : new AlmacenCmsArchivo(resolve(carpeta, 'estado.json'));
  if (db) await almacen.iniciar();
  await configurarAvisoTalleres(almacen);
  if (JSON.stringify((await almacen.leer()).avisoInteres ?? null) !== JSON.stringify(avisoInteres))
    await almacen.cambiar((s) => {
      s.avisoInteres = avisoInteres;
      s.revisionPortal++;
    });
  const carpetaMedios = resolve(carpeta, 'medios');
  const auth = await crearAutenticacion({
    almacen,
    secreto: process.env.JWT_SECRET,
    origenes: (
      process.env.CMS_ORIGENES ??
      'http://127.0.0.1:3000,http://localhost:3000,http://127.0.0.1:5174,http://localhost:5174'
    )
      .split(',')
      .map((v) => v.trim()),
    segura: process.env.NODE_ENV === 'production',
  });
  const publicador = crearPublicador({
    almacen,
    carpetaPortal,
    carpetaMedios,
    moduloSsr: resolve(raiz, 'packages/portal/dist-ssr/entry-server.js'),
  });
  const enviarCorreo = configurarCorreo(carpeta);
  const origenPanel =
    process.env.PANEL_ORIGEN_PUBLICO ||
    (process.env.CMS_ORIGENES ?? 'http://127.0.0.1:3000').split(',')[0].trim();
  const recuperacion = crearRecuperacion({
    almacen,
    enviarCorreo,
    origenPublico: origenPanel,
    produccion: process.env.NODE_ENV === 'production',
    limpiarCookie: auth.limpiarCookie,
  });
  const enviarReciboConsulta = crearCorreoConsultas({
    almacen,
    enviarCorreo,
    secreto: process.env.JWT_SECRET,
    origenPublico: process.env.PORTAL_ORIGEN_PUBLICO || origenPanel,
    produccion: process.env.NODE_ENV === 'production',
  });
  const catalogo = crearAlmacenCatalogo(almacen, db);
  const perfil = configurarPerfil();
  const rutas = crearRutasCms({
    almacen,
    auth,
    publicador,
    carpetaMedios,
    recuperacion,
    enviarReciboConsulta,
    catalogo,
    perfil,
    operacion: crearServicioOperacion(
      crearAlmacenOperacion(almacen, catalogo, db),
      undefined,
      perfil,
    ),
  });
  return {
    almacen,
    auth,
    publicador,
    rutas,
    carpetaPortal,
    carpetaPanel: resolve(raiz, 'packages/panel/dist'),
    cerrar: () => db?.destroy(),
  };
}
