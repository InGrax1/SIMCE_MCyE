import { expect, it } from 'vitest';
import { avisoConexion, mensajeSolicitud } from '../src/mensajesSolicitud.js';

it('traduce fallos técnicos de conexión y conserva los avisos concretos del formulario', () => {
  expect(mensajeSolicitud(new TypeError('Failed to fetch'))).toBe(avisoConexion);
  expect(mensajeSolicitud(new Error('Load failed'))).toBe(avisoConexion);
  expect(mensajeSolicitud(new SyntaxError('Unexpected end of JSON input'))).toBe(
    'El sitio no pudo completar la solicitud. Inténtalo de nuevo en unos momentos.',
  );
  const duplicado = 'Ya existe una consulta para este correo y taller.';
  expect(mensajeSolicitud(new Error(duplicado))).toBe(duplicado);
});
