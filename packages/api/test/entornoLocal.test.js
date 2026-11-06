import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { cargarEntornoLocal } from '../../../scripts/entorno-local.mjs';

let carpeta;
beforeEach(async () => {
  await mkdir(resolve('artifacts'), { recursive: true });
  carpeta = await mkdtemp(resolve('artifacts/entorno-local-'));
  for (const clave of ['CORREO_MODO', 'SMTP_HOST', 'SMTP_PASSWORD', 'PORT'])
    vi.stubEnv(clave, undefined);
});
afterEach(async () => {
  vi.unstubAllEnvs();
  if (carpeta?.startsWith(resolve('artifacts') + sep + 'entorno-local-'))
    await rm(carpeta, { recursive: true, force: true });
});

it('carga el correo y puerto de .env desde la raíz indicada, con valores entre comillas', async () => {
  await writeFile(
    join(carpeta, '.env'),
    'CORREO_MODO=smtp\nSMTP_HOST=smtp.example.test\nSMTP_PASSWORD="valor ficticio # de prueba"\nPORT=3080\n',
  );
  expect(cargarEntornoLocal(carpeta)).toBe(true);
  expect(process.env.CORREO_MODO).toBe('smtp');
  expect(process.env.SMTP_HOST).toBe('smtp.example.test');
  expect(process.env.SMTP_PASSWORD).toBe('valor ficticio # de prueba');
  expect(process.env.PORT).toBe('3080');
});

it('respeta las variables definidas explícitamente en el entorno de ejecución', async () => {
  await writeFile(join(carpeta, '.env'), 'CORREO_MODO=smtp\nPORT=3080\n');
  vi.stubEnv('CORREO_MODO', 'archivo');
  vi.stubEnv('PORT', '3090');
  cargarEntornoLocal(carpeta);
  expect(process.env.CORREO_MODO).toBe('archivo');
  expect(process.env.PORT).toBe('3090');
});

it('permite el arranque sin archivo .env y conserva las opciones predeterminadas del lanzador', () => {
  expect(cargarEntornoLocal(carpeta)).toBe(false);
  expect(process.env.CORREO_MODO).toBeUndefined();
  expect(process.env.PORT).toBeUndefined();
});
