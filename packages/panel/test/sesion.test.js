import { afterEach, expect, it, vi } from 'vitest';
import { renovarSesion, establecerSesion } from '../src/servicios/sesion.js';
afterEach(() => {
  vi.unstubAllGlobals();
  establecerSesion(null);
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
