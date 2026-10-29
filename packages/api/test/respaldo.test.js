import { randomBytes, randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { cifrarRespaldo, abrirRespaldo, sha256 } from '../../../scripts/lib/respaldo.mjs';

const imagen = Buffer.from('contenido sintético');
const datos = () => ({
  baseOrigen: 'simce_test',
  sql: 'CREATE TABLE ejemplo (id INT);',
  revision: 1,
  versionApp: '0.2.0',
  medios: [
    {
      nombre: `${randomUUID()}.webp`,
      contenido: imagen.toString('base64'),
      sha256: sha256(imagen),
    },
  ],
});
it('conserva SQL e imágenes y oculta el contenido del archivo cifrado', () => {
  const clave = randomBytes(32);
  const contenido = datos();
  const archivo = cifrarRespaldo(contenido, clave);
  expect(archivo.includes(Buffer.from(contenido.sql))).toBe(false);
  expect(abrirRespaldo(archivo, clave)).toMatchObject(contenido);
});
it('rechaza claves distintas y archivos alterados antes de restaurar', () => {
  const clave = randomBytes(32);
  const archivo = cifrarRespaldo(datos(), clave);
  expect(() => abrirRespaldo(archivo, randomBytes(32))).toThrow('verificar el respaldo');
  archivo[archivo.length - 1] ^= 1;
  expect(() => abrirRespaldo(archivo, clave)).toThrow('verificar el respaldo');
});
it('rechaza rutas que salgan de medios y un manifiesto con imágenes dañadas', () => {
  const contenido = datos();
  contenido.medios[0].nombre = '../estado.json';
  expect(() => cifrarRespaldo(contenido, randomBytes(32))).toThrow('rutas');
  const imagenCorrupta = datos();
  imagenCorrupta.medios[0].contenido = Buffer.from('otra imagen').toString('base64');
  expect(() => cifrarRespaldo(imagenCorrupta, randomBytes(32))).toThrow('integridad');
});
