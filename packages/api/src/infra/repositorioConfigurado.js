import { RepositorioSincronizacionMemoria } from '../repositorios/sincronizacionMemoria.js';
import { RepositorioSincronizacionMysql } from '../repositorios/sincronizacionMysql.js';
import { crearConexionBaseDatos } from './baseDatos.js';

export function crearRepositorioConfigurado() {
  if ((process.env.STORAGE ?? 'memory') === 'mysql') {
    return new RepositorioSincronizacionMysql(crearConexionBaseDatos());
  }
  return new RepositorioSincronizacionMemoria();
}
