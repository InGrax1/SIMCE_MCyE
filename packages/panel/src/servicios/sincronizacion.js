import { cabecerasSesion, consultarApi } from './sesion.js';

export async function enviarOperacionHttp(operacion, apiUrl = '/api/v1') {
  if (apiUrl === '/api/v1') return consultarApi('/sync/push', { metodo: 'POST', datos: operacion });
  const respuesta = await fetch(`${apiUrl}/sync/push`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...cabecerasSesion() },
    body: JSON.stringify(operacion),
  });
  const cuerpo = await respuesta.json();
  if (!respuesta.ok) {
    const error = new Error(cuerpo.mensaje ?? 'La sincronización fue rechazada.');
    error.codigo = cuerpo.error;
    throw error;
  }
  return cuerpo;
}

export async function sincronizarPendientes({ repositorio, enviarOperacion }) {
  const pendientes = await repositorio.listarPendientes();
  const resumen = { aplicadas: 0, fallidas: 0 };

  for (const operacionLocal of pendientes) {
    const operacion = structuredClone(operacionLocal);
    delete operacion.estadoCola;
    delete operacion.intentos;
    delete operacion.ultimoError;
    try {
      const resultado = await enviarOperacion(operacion);
      await repositorio.marcarAplicada(operacion.operacionUuid, resultado);
      resumen.aplicadas += 1;
    } catch (error) {
      await repositorio.registrarFallo(operacion.operacionUuid, error);
      resumen.fallidas += 1;
    }
  }

  return resumen;
}
