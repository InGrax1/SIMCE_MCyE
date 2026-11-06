export async function configurarAvisoTalleres(almacen, entorno = process.env) {
  const url = entorno.AVISO_TALLERES_URL;
  const version = entorno.AVISO_TALLERES_VERSION;
  if (Boolean(url) !== Boolean(version))
    throw new Error('Configura URL y versión del aviso de talleres juntas.');
  if (url) {
    const direccion = new URL(url);
    if (
      direccion.protocol !== 'https:' ||
      direccion.username ||
      direccion.password ||
      url.length > 1000 ||
      !/^[A-Za-z0-9._-]{1,80}$/.test(version)
    )
      throw new Error('El aviso de talleres necesita HTTPS y una versión de hasta 80 caracteres.');
  }
  const aviso = url ? { url, version } : null;
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
