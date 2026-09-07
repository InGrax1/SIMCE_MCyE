import express from 'express';
import { ErrorApi } from './errores.js';
import { RepositorioSincronizacionMemoria } from './repositorios/sincronizacionMemoria.js';
import { crearRutasSincronizacion } from './rutas/sincronizacion.js';
import { crearServicioSincronizacion } from './servicios/sincronizarOperacion.js';

export function crearAplicacion({ repositorio = new RepositorioSincronizacionMemoria() } = {}) {
  const app = express();
  const sincronizacion = crearServicioSincronizacion({ repositorio });

  app.use(express.json({ limit: '1mb' }));
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
  app.use('/api/v1/sync', crearRutasSincronizacion(sincronizacion));

  app.use((error, _solicitud, respuesta, _siguiente) => {
    if (error instanceof ErrorApi) {
      respuesta.status(error.estadoHttp).json({
        error: error.codigo,
        mensaje: error.message,
        detalles: error.detalles,
      });
      return;
    }
    respuesta
      .status(500)
      .json({ error: 'ERROR_INTERNO', mensaje: 'Ocurrió un error no controlado.' });
  });

  return app;
}
