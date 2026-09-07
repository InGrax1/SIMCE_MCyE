import { Router } from 'express';

export function crearRutasSincronizacion(servicio) {
  const rutas = Router();
  rutas.post('/push', async (solicitud, respuesta, siguiente) => {
    try {
      respuesta.json(await servicio.procesar(solicitud.body));
    } catch (error) {
      siguiente(error);
    }
  });
  return rutas;
}
