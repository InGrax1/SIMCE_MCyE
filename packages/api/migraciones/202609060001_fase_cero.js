export async function up(knex) {
  await knex.schema.createTable('perfiles_etiqueta', (tabla) => {
    tabla.increments('id').primary();
    tabla.string('nombre', 100).notNullable();
    tabla.string('prefijo', 4).notNullable();
    tabla.unsignedInteger('inicio_plu').notNullable();
    tabla.unsignedInteger('longitud_plu').notNullable();
    tabla.unsignedInteger('inicio_importe').notNullable();
    tabla.unsignedInteger('longitud_importe').notNullable();
    tabla.unsignedInteger('resolucion_gramos').notNullable();
    tabla.boolean('activo').notNullable().defaultTo(true);
    tabla.timestamp('creado_en').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('remisiones', (tabla) => {
    tabla.string('remision_uuid', 36).primary();
    tabla.string('centro_id', 100).notNullable();
    tabla.string('estado', 30).notNullable();
    tabla.unsignedInteger('version_servidor').notNullable();
    tabla.string('folio_final', 40).notNullable().unique();
    tabla.bigInteger('total_centavos').unsigned().notNullable();
    tabla.bigInteger('total_gramos').unsigned().notNullable();
    tabla.json('documento').notNullable();
    tabla.timestamp('creado_en').notNullable().defaultTo(knex.fn.now());
    tabla.timestamp('actualizado_en').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('operaciones_sincronizacion', (tabla) => {
    tabla.string('operacion_uuid', 36).primary();
    tabla.string('agregado_id', 36).notNullable().index();
    tabla.string('tipo', 50).notNullable();
    tabla.string('huella', 64).notNullable();
    tabla.unsignedInteger('version_base').notNullable();
    tabla.json('resultado').notNullable();
    tabla.timestamp('procesado_en').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('consecutivos_folio', (tabla) => {
    tabla.string('serie', 20).primary();
    tabla.unsignedBigInteger('valor').notNullable().defaultTo(0);
    tabla.timestamp('actualizado_en').notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('consecutivos_folio');
  await knex.schema.dropTableIfExists('operaciones_sincronizacion');
  await knex.schema.dropTableIfExists('remisiones');
  await knex.schema.dropTableIfExists('perfiles_etiqueta');
}
