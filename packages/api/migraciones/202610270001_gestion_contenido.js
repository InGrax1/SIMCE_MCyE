export async function up(knex) {
  await knex.schema.createTable('cms_estado', (tabla) => {
    tabla.integer('id').primary();
    tabla.json('documento').notNullable();
    tabla.timestamp('actualizado_en').notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('cms_estado');
}
