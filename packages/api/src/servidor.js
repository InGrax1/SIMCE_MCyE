import { crearAplicacion } from './app.js';

const host = process.env.HOST ?? '127.0.0.1';
const port = Number(process.env.PORT ?? 3000);

crearAplicacion().listen(port, host, () => {
  console.log(`API SIMCE disponible en http://${host}:${port}`);
});
