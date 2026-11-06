import request from 'supertest';
import { randomBytes } from 'node:crypto';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { validarAvisoConfigurado } from '../src/cms/avisoPrivacidad.js';
import { configurarCms } from '../src/cms/configuracion.js';
import { crearAplicacion } from '../src/app.js';
import { avisoPrivacidad, avisosPrivacidad } from '../../portal/src/avisoPrivacidad.js';

describe('aviso autorizado y consulta pública', () => {
  let carpeta, cms;
  afterEach(async () => {
    await cms?.cerrar();
    vi.unstubAllEnvs();
    if (carpeta?.startsWith(resolve('artifacts') + sep + 'aviso-'))
      await rm(carpeta, { recursive: true, force: true });
  });

  it('solo acepta la ruta incluida con su versión exacta y conserva HTTPS para avisos externos', () => {
    expect(validarAvisoConfigurado(avisoPrivacidad.url, avisoPrivacidad.version)).toEqual({
      url: avisoPrivacidad.url,
      version: avisoPrivacidad.version,
    });
    expect(
      validarAvisoConfigurado(avisosPrivacidad[0].url, avisosPrivacidad[0].version),
    ).toMatchObject({ version: 'simce-2026-11-06-v1' });
    expect(validarAvisoConfigurado('https://example.test/aviso', 'externo-v1')).toEqual({
      url: 'https://example.test/aviso',
      version: 'externo-v1',
    });
    for (const [url, version] of [
      [avisoPrivacidad.url, 'otra-version'],
      ['/ruta-ajena.html', avisoPrivacidad.version],
      ['//ajeno.example.test/aviso', 'v1'],
      ['http://example.test/aviso', 'v1'],
      ['javascript:alert(1)', 'v1'],
      ['https://usuario:clave@example.test/aviso', 'v1'],
      ['', 'v1'],
      [avisoPrivacidad.url, ''],
    ])
      expect(() => validarAvisoConfigurado(url, version)).toThrow();
    expect(validarAvisoConfigurado('', '')).toBeNull();
    expect(validarAvisoConfigurado(undefined, undefined)).toBeNull();
  });

  it('configura ambos formularios y entrega el aviso sin sesión, JavaScript ni notas administrativas', async () => {
    await mkdir(resolve('artifacts'), { recursive: true });
    carpeta = await mkdtemp(resolve('artifacts/aviso-'));
    for (const [clave, valor] of Object.entries({
      NODE_ENV: 'test',
      STORAGE: 'file',
      CMS_DIR: carpeta,
      PORTAL_DIST: resolve('../portal/public'),
      JWT_SECRET: randomBytes(48).toString('hex'),
      CMS_ORIGENES: 'http://localhost:3000',
      CORREO_MODO: 'archivo',
      AVISO_INTERES_URL: avisoPrivacidad.url,
      AVISO_INTERES_VERSION: avisoPrivacidad.version,
      AVISO_TALLERES_URL: avisoPrivacidad.url,
      AVISO_TALLERES_VERSION: avisoPrivacidad.version,
    }))
      vi.stubEnv(clave, valor);
    cms = await configurarCms();
    const estado = await cms.almacen.leer();
    expect(estado.avisoInteres).toEqual(estado.avisoTalleres);
    expect(estado.avisoInteres.version).toBe(avisoPrivacidad.version);
    const respuesta = await request(crearAplicacion({ cms })).get(avisoPrivacidad.url).expect(200);
    expect(respuesta.headers['content-type']).toContain('text/html');
    expect(respuesta.text).toContain('id="simplificado"');
    expect(respuesta.text).toContain('id="integral"');
    expect(respuesta.text).toContain('unidaddetransparencia@unam.mx');
    expect(respuesta.text).not.toContain('Revisión y autorización');
    expect(respuesta.text).not.toMatch(/<script|JWT_SECRET|Persona y fecha que autorizan/);
    const anterior = await request(crearAplicacion({ cms }))
      .get(avisosPrivacidad[0].url)
      .expect(200);
    expect(anterior.text).toContain('simce-2026-11-06-v1');
  });
});
