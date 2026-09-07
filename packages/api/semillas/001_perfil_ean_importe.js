export async function seed(knex) {
  await knex('perfiles_etiqueta').del();
  await knex('perfiles_etiqueta').insert({
    nombre: 'EAN-13 por importe de fase cero',
    prefijo: '2',
    inicio_plu: 1,
    longitud_plu: 6,
    inicio_importe: 7,
    longitud_importe: 5,
    resolucion_gramos: 5,
    activo: true,
  });
}
