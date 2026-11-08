export async function up(knex) {
  await knex.schema.createTable('operacion_pdf', (t) => {
    t.uuid('uuid').primary();
    t.specificType('archivo', 'MEDIUMBLOB').notNullable();
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('operacion_pdf');
}
