export async function up(knex) {
  await knex.schema.createTable('operacion_registros', (t) => {
    t.string('tipo', 20).notNullable();
    t.uuid('uuid').notNullable();
    t.primary(['tipo', 'uuid']);
    t.string('folio', 40).unique();
    t.json('documento').notNullable();
  });
  await knex.schema.createTable('operacion_eventos', (t) => {
    t.bigIncrements('cursor');
    t.json('cambios').notNullable();
  });
  await knex.schema.createTable('operacion_recibos', (t) => {
    t.uuid('uuid').primary();
    t.uuid('autor_uuid').notNullable();
    t.string('huella', 64).notNullable();
    t.json('resultado').notNullable();
  });
  await knex.schema.createTable('operacion_conflictos', (t) => {
    t.uuid('uuid').primary().references('uuid').inTable('operacion_recibos');
    t.uuid('autor_uuid').notNullable().index();
    t.json('documento').notNullable();
  });
}

export async function down(knex) {
  for (const tabla of [
    'operacion_conflictos',
    'operacion_recibos',
    'operacion_eventos',
    'operacion_registros',
  ])
    await knex.schema.dropTableIfExists(tabla);
}
