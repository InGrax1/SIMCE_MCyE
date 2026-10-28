import { afterEach, expect, it, vi } from 'vitest';
import {
  renovarSesion,
  establecerSesion,
  consultarApi,
  cabecerasSesion,
} from '../src/servicios/sesion.js';
afterEach(() => {
  vi.unstubAllGlobals();
  establecerSesion(null, () => {});
});
it('vuelve al login si la API sigue rechazando la sesión después de renovarla', async () => {
  const notificar = vi.fn();
  establecerSesion('token-vencido', notificar);
  const rechazo = () =>
    new Response(
      JSON.stringify({ error: 'NO_AUTENTICADO', mensaje: 'Inicia sesión para continuar.' }),
      { status: 401 },
    );
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(rechazo())
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ token: 'token-renovado', usuario: { debeCambiar: true } })),
    )
    .mockResolvedValueOnce(rechazo());
  vi.stubGlobal('fetch', fetch);
  await expect(
    consultarApi('/auth/clave', { metodo: 'POST', datos: { anterior: 'prueba' } }),
  ).rejects.toMatchObject({ codigo: 'NO_AUTENTICADO' });
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(notificar).toHaveBeenLastCalledWith(null);
  expect(cabecerasSesion()).toEqual({});
});
it('no pierde la sesión ni renueva el token cuando la contraseña actual es incorrecta', async () => {
  const notificar = vi.fn();
  establecerSesion('token-vigente', notificar);
  const fetch = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        error: 'CLAVE_ACTUAL_INVALIDA',
        mensaje: 'La contraseña actual no es correcta.',
      }),
      { status: 422 },
    ),
  );
  vi.stubGlobal('fetch', fetch);
  await expect(
    consultarApi('/auth/clave', { metodo: 'POST', datos: { anterior: 'incorrecta' } }),
  ).rejects.toMatchObject({ codigo: 'CLAVE_ACTUAL_INVALIDA' });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(notificar).not.toHaveBeenCalled();
  expect(cabecerasSesion()).toEqual({ Authorization: 'Bearer token-vigente' });
});
it('regresa al login si el refresco ya no es válido', async () => {
  const notificar = vi.fn();
  establecerSesion('token-revocado', notificar);
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(async () => new Response('{}', { status: 401 })),
  );
  await expect(consultarApi('/auth/yo')).rejects.toThrow('La sesión terminó.');
  expect(notificar).toHaveBeenLastCalledWith(null);
  expect(cabecerasSesion()).toEqual({});
});
it('comparte el refresco concurrente para evitar una falsa reutilización del token', async () => {
  const fetch = vi.fn(async () => {
    await new Promise((ok) => setTimeout(ok, 10));
    return new Response(
      JSON.stringify({ token: 'token-de-prueba', usuario: { id: 'usuario-prueba' } }),
      { status: 200 },
    );
  });
  vi.stubGlobal('fetch', fetch);
  const resultado = await Promise.all([renovarSesion(), renovarSesion(), renovarSesion()]);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(resultado.every((r) => r.token === 'token-de-prueba')).toBe(true);
});
