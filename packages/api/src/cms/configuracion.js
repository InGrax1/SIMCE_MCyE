import { resolve } from 'node:path';
import { AlmacenCmsArchivo, AlmacenCmsMysql } from './almacen.js';
import { crearAutenticacion } from './autenticacion.js';
import { crearPublicador } from './publicacion.js';
import { crearRutasCms } from './rutas.js';
import { crearConexionBaseDatos } from '../infra/baseDatos.js';
import { configurarCorreo } from './correo.js';
import { crearRecuperacion } from './recuperacion.js';

export async function configurarCms() {
  const raiz = resolve(import.meta.dirname, '../../../..');
  const carpeta = resolve(process.env.CMS_DIR ?? resolve(raiz, '.local/cms'));
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
  const url = process.env.AVISO_INTERES_URL;
  const versionAviso = process.env.AVISO_INTERES_VERSION;
  if (url && !/^https:\/\//.test(url))
    throw new Error('El aviso de privacidad necesita una URL HTTPS.');
  const avisoInteres = url && versionAviso ? { url, version: versionAviso } : null;
  if (JSON.stringify((await almacen.leer()).avisoInteres ?? null) !== JSON.stringify(avisoInteres))
    await almacen.cambiar((s) => {
      s.avisoInteres = avisoInteres;
      s.revisionPortal++;
    });
  const carpetaPortal = resolve(process.env.PORTAL_DIST ?? resolve(raiz, 'packages/portal/dist'));
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
  const recuperacion = crearRecuperacion({
    almacen,
    enviarCorreo: configurarCorreo(carpeta),
    origenPublico:
      process.env.PANEL_ORIGEN_PUBLICO ||
      (process.env.CMS_ORIGENES ?? 'http://127.0.0.1:3000').split(',')[0].trim(),
    produccion: process.env.NODE_ENV === 'production',
    limpiarCookie: auth.limpiarCookie,
  });
  const rutas = crearRutasCms({ almacen, auth, publicador, carpetaMedios, recuperacion });
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
