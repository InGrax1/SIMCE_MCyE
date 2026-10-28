import { crearAplicacion } from './app.js';
import { crearRepositorioConfigurado } from './infra/repositorioConfigurado.js';
import { configurarCms } from './cms/configuracion.js';

const host = process.env.HOST ?? '127.0.0.1';
const port = Number(process.env.PORT ?? 3000);
const repositorio = crearRepositorioConfigurado();
const cms = await configurarCms();
await cms.publicador.publicar();

const servidor = crearAplicacion({ repositorio, cms }).listen(port, host, () => {
  console.log(`API SIMCE disponible en http://${host}:${port}`);
});

async function cerrar() {
  servidor.close();
  await repositorio.cerrar();
  await cms.cerrar();
}

process.once('SIGINT', cerrar);
process.once('SIGTERM', cerrar);
