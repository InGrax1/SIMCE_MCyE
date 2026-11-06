import { validarAvisoConfigurado } from '../cms/avisoPrivacidad.js';

export async function configurarAvisoTalleres(almacen, entorno = process.env) {
  const url = entorno.AVISO_TALLERES_URL;
  const version = entorno.AVISO_TALLERES_VERSION;
  const aviso = validarAvisoConfigurado(url, version);
  await almacen.cambiar((estado) => {
    const anterior = estado.avisosTalleres.find((a) => a.version === version);
    if (anterior && anterior.url !== url)
      throw new Error('La versión del aviso de talleres es inmutable. Usa una versión nueva.');
    if (JSON.stringify(estado.avisoTalleres ?? null) === JSON.stringify(aviso)) return;
    if (aviso && !anterior) estado.avisosTalleres.push(aviso);
    estado.avisoTalleres = aviso;
    estado.revisionPortal++;
  });
}
