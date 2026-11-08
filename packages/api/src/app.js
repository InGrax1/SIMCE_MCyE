import express from 'express';
import compression from 'compression';
import { join } from 'node:path';
import { ErrorApi } from './errores.js';
import { RepositorioSincronizacionMemoria } from './repositorios/sincronizacionMemoria.js';
import { crearRutasSincronizacion } from './rutas/sincronizacion.js';
import { crearServicioSincronizacion } from './servicios/sincronizarOperacion.js';
import { ErrorDominio } from '@simce/dominio';

export function crearAplicacion({
  repositorio = new RepositorioSincronizacionMemoria(),
  cms,
} = {}) {
  const app = express();
  app.set('trust proxy', process.env.TRUST_PROXY_HOPS === '1' ? 1 : false);
  const sincronizacion = crearServicioSincronizacion({ repositorio });

  app.use(express.json({ limit: '1mb' }));
  app.disable('x-powered-by');
  app.use(compression());
  app.use((_req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self' mailto:",
    );
    next();
  });
  if (cms) {
    app.use('/api/v1', cms.rutas);
    app.get('/medios/:archivo', cms.rutas.servirMedio);
    app.get('/', (_req, res) =>
      res.set('Cache-Control', 'no-cache').sendFile(join(cms.carpetaPortal, 'index.html')),
    );
    app.use('/panel', express.static(cms.carpetaPanel, { index: 'index.html' }));
    app.get('/panel/{*ruta}', (_req, res) => res.sendFile(join(cms.carpetaPanel, 'index.html')));
    app.use((req, res, next) => (req.path === '/plantilla.html' ? res.sendStatus(404) : next()));
    app.use(express.static(cms.carpetaPortal, { index: false }));
  }
  app.get('/api/v1/salud', (_solicitud, respuesta) => {
    respuesta.json({ estado: 'ok', servicio: 'simce-api' });
  });
  app.get('/api/v1/salud/listo', async (_solicitud, respuesta, siguiente) => {
    try {
      await repositorio.verificarConexion();
      respuesta.json({ estado: 'listo', almacenamiento: repositorio.constructor.name });
    } catch (error) {
      siguiente(error);
    }
  });
  if (cms)
    app.use(
      '/api/v1/sync',
      cms.auth.identificar,
      cms.auth.permitir(['operador', 'responsable', 'admin']),
    );
  app.use('/api/v1/sync', crearRutasSincronizacion(sincronizacion));

  app.use((error, _solicitud, respuesta, _siguiente) => {
    if (error instanceof ErrorDominio)
      error = new ErrorApi(422, error.codigo, error.message, error.detalles);
    if (error.type === 'entity.too.large')
      return respuesta.status(413).json({
        error: 'CUERPO_DEMASIADO_GRANDE',
        mensaje: 'El archivo o documento excede el tamaño permitido.',
      });
    if (error.type === 'entity.parse.failed')
      return respuesta
        .status(400)
        .json({ error: 'JSON_INVALIDO', mensaje: 'El documento JSON no es válido.' });
    if (error instanceof ErrorApi) {
      respuesta.status(error.estadoHttp).json({
        error: error.codigo,
        mensaje: error.message,
        detalles: error.detalles,
      });
      return;
    }
    console.error('ERROR_INTERNO', error.code ?? error.name);
    respuesta
      .status(500)
      .json({ error: 'ERROR_INTERNO', mensaje: 'Ocurrió un error no controlado.' });
  });

  return app;
}
