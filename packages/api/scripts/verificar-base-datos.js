import { crearConexionBaseDatos } from '../src/infra/baseDatos.js';

const tablasEsperadas = [
  'consecutivos_folio',
  'operaciones_sincronizacion',
  'perfiles_etiqueta',
  'remisiones',
];
const baseDatos = crearConexionBaseDatos();

try {
  const resultados = await Promise.all(
    tablasEsperadas.map(async (tabla) => ({
      tabla,
      existe: await baseDatos.schema.hasTable(tabla),
    })),
  );
  const faltantes = resultados.filter(({ existe }) => !existe).map(({ tabla }) => tabla);

  if (faltantes.length > 0) {
    throw new Error(`Faltan tablas de Fase 0: ${faltantes.join(', ')}`);
  }

  console.log('Tablas de Fase 0 verificadas:');
  for (const tabla of tablasEsperadas) console.log(`- ${tabla}`);
} finally {
  await baseDatos.destroy();
}
