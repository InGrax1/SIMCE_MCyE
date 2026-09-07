import knex from 'knex';
import configuracion from '../../knexfile.js';

export function crearConexionBaseDatos(entorno = process.env.NODE_ENV ?? 'development') {
  const opciones = configuracion[entorno];
  if (!opciones) {
    throw new Error(`No existe configuración de base de datos para ${entorno}.`);
  }
  return knex(opciones);
}
