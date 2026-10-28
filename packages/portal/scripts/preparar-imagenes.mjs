import sharp from 'sharp';
import { mkdir, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const origen = resolve(import.meta.dirname, '../public/figma');
const destino = resolve(import.meta.dirname, '../public/optimizadas');
await mkdir(destino, { recursive: true });
for (const archivo of await readdir(origen)) {
  if (!/\.png$/i.test(archivo)) continue;
  const medida = /^Logo/i.test(archivo)
    ? 256
    : archivo === 'Cilantro1.png'
      ? 448
      : archivo === 'Image2.png'
        ? 1024
        : 1200;
  await sharp(resolve(origen, archivo))
    .resize({ width: medida, height: medida, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(resolve(destino, archivo.replace(/\.png$/i, '.webp')));
}
console.log('Imágenes del portal optimizadas en WebP.');
