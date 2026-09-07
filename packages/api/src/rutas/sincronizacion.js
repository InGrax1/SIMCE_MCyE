import { Router } from 'express';

export function crearRutasSincronizacion(servicio) {
  const rutas = Router();
  rutas.post('/push', (solicitud, respuesta, siguiente) => {
    try {
      respuesta.json(servicio.procesar(solicitud.body));
    } catch (error) {
      siguiente(error);
    }
  });
  return rutas;
}
