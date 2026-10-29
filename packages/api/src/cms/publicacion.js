import { readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { proyectarPortal } from './contenido.js';
import { renombrarAtomico } from './archivoAtomico.js';

const escapar = (texto) =>
  String(texto).replace(
    /[&<>"']/g,
    (letra) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[letra],
  );
export function crearPublicador({ almacen, carpetaPortal, moduloSsr, carpetaMedios }) {
  let cola = Promise.resolve();
  async function html(contenido, privada = false) {
    const datos = structuredClone(contenido);
    if (privada) {
      for (const lista of Object.values(datos).filter(Array.isArray))
        for (const item of lista) {
          if (/^\/medios\/[a-f0-9-]{36}\.webp$/.test(item.foto ?? ''))
            item.foto = `data:image/webp;base64,${(await readFile(join(carpetaMedios, item.foto.slice(8)))).toString('base64')}`;
        }
    }
    const { render } = await import(pathToFileURL(resolve(moduloSsr)).href);
    const plantilla = await readFile(join(carpetaPortal, 'plantilla.html'), 'utf8');
    const serializado = JSON.stringify(datos)
      .replace(/</g, '\\u003c')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');
    const nombre = escapar(datos.institucion?.nombre ?? 'Carnes y Embutidos');
    return plantilla
      .replace(
        '<div id="root"></div>',
        `<div id="root">${render(datos)}</div><script type="application/json" id="contenido-publicado">${serializado}</script>`,
      )
      .replace(
        /<title>.*?<\/title>/,
        `<title>${nombre} | CEA · FES Cuautitlán</title><meta property="og:title" content="${nombre}" /><meta property="og:type" content="website" /><meta property="og:description" content="${escapar((datos.institucion?.objetivo ?? 'Docencia e investigación en procesos cárnicos.').slice(0, 180))}" />`,
      );
  }
  function publicar() {
    const trabajo = cola.then(async () => {
      const estado = await almacen.leer();
      const contenido = proyectarPortal(estado);
      const documento = await html(contenido);
      const temporal = join(carpetaPortal, `index-${randomUUID()}.tmp`);
      await writeFile(temporal, documento);
      await renombrarAtomico(temporal, join(carpetaPortal, 'index.html'));
      await almacen.cambiar((actual) => {
        actual.revisionHtml = contenido.revision;
      });
      return contenido.revision;
    });
    cola = trabajo.catch(() => {});
    return trabajo;
  }
  return { publicar, previsualizar: (contenido) => html(contenido, true) };
}
