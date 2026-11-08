const catalogos = ['lineas_producto', 'especies', 'destinos'];

export async function up(knex) {
  for (const nombre of catalogos)
    await knex.schema.createTable(nombre, (tabla) => {
      tabla.uuid('uuid').primary();
      tabla.string('nombre', 120).notNullable();
      tabla.boolean('activo').notNullable();
      tabla.integer('version').unsigned().notNullable();
    });
  await knex.schema.createTable('productos_operativos', (tabla) => {
    tabla.uuid('uuid').primary();
    tabla.string('plu', 12).notNullable().unique();
    tabla.string('nombre', 120).notNullable();
    tabla.uuid('linea_uuid').notNullable().references('uuid').inTable('lineas_producto');
    tabla.uuid('especie_uuid').notNullable().references('uuid').inTable('especies');
    tabla.string('presentacion', 80).notNullable();
    tabla.boolean('activo').notNullable();
    tabla.integer('version').unsigned().notNullable();
  });
  await knex.schema.createTable('precios_producto', (tabla) => {
    tabla.uuid('uuid').primary();
    tabla.uuid('producto_uuid').notNullable().references('uuid').inTable('productos_operativos');
    tabla.bigInteger('precio_kg_centavos').unsigned().notNullable();
    tabla.date('vigente_desde').notNullable();
    tabla.string('motivo', 500).nullable();
    tabla.boolean('revision_documentos').notNullable();
    tabla.unique(['producto_uuid', 'vigente_desde']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('precios_producto');
  await knex.schema.dropTableIfExists('productos_operativos');
  for (const nombre of [...catalogos].reverse()) await knex.schema.dropTableIfExists(nombre);
}
