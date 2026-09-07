import express from 'express';

export function crearAplicacion() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.get('/api/v1/salud', (_solicitud, respuesta) => {
    respuesta.json({ estado: 'ok', servicio: 'simce-api' });
  });
  return app;
}
