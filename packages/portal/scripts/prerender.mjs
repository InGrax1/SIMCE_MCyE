import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const raiz = resolve(import.meta.dirname, '..');
const archivoHtml = resolve(raiz, 'dist/index.html');
const moduloServidor = pathToFileURL(resolve(raiz, 'dist-ssr/entry-server.js')).href;
const plantilla = await readFile(archivoHtml, 'utf8');
const { render } = await import(moduloServidor);
const html = plantilla.replace('<div id="root"></div>', `<div id="root">${render()}</div>`);

await writeFile(archivoHtml, html);
await writeFile(resolve(raiz, 'dist/plantilla.html'), plantilla);
console.log('Portal prerenderizado');
