function conexionDesdeEntorno() {
  return {
    host: process.env.DATABASE_HOST ?? '127.0.0.1',
    port: Number(process.env.DATABASE_PORT ?? 3306),
    database: process.env.DATABASE_NAME ?? 'simce',
    user: process.env.DATABASE_USER ?? 'simce',
    password: process.env.DATABASE_PASSWORD,
  };
}

const base = {
  client: 'mysql2',
  connection: conexionDesdeEntorno(),
  migrations: { directory: './migraciones' },
  seeds: { directory: './semillas' },
};

export default {
  development: base,
  test: base,
  production: {
    ...base,
    pool: { min: 2, max: 10 },
  },
};
