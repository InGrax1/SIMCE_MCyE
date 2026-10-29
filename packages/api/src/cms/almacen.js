import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { crearEstadoInicial } from './contenido.js';
import { renombrarAtomico } from './archivoAtomico.js';

export class AlmacenCmsArchivo {
  constructor(archivo, inicial = crearEstadoInicial()) {
    this.archivo = archivo;
    this.inicial = inicial;
    this.cola = Promise.resolve();
  }
  async leer() {
    try {
      return JSON.parse(await readFile(this.archivo, 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      return structuredClone(this.inicial);
    }
  }
  cambiar(funcion) {
    const operacion = this.cola.then(async () => {
      const estado = await this.leer();
      const resultado = await funcion(estado);
      await mkdir(dirname(this.archivo), { recursive: true });
      const temporal = `${this.archivo}.${randomUUID()}.tmp`;
      await writeFile(temporal, JSON.stringify(estado), { mode: 0o600 });
      await renombrarAtomico(temporal, this.archivo);
      return resultado;
    });
    this.cola = operacion.catch(() => {});
    return operacion;
  }
}

export class AlmacenCmsMysql {
  constructor(db) {
    this.db = db;
  }
  async iniciar() {
    await this.db('cms_estado')
      .insert({ id: 1, documento: JSON.stringify(crearEstadoInicial()) })
      .onConflict('id')
      .ignore();
  }
  async leer() {
    const fila = await this.db('cms_estado').where({ id: 1 }).first();
    if (!fila) throw new Error('Inicializa el gestor antes de utilizarlo.');
    return typeof fila.documento === 'string' ? JSON.parse(fila.documento) : fila.documento;
  }
  cambiar(funcion) {
    return this.db.transaction(async (trx) => {
      const fila = await trx('cms_estado').where({ id: 1 }).forUpdate().first();
      const estado =
        typeof fila.documento === 'string' ? JSON.parse(fila.documento) : fila.documento;
      const resultado = await funcion(estado);
      await trx('cms_estado')
        .where({ id: 1 })
        .update({ documento: JSON.stringify(estado), actualizado_en: trx.fn.now() });
      return resultado;
    });
  }
}
