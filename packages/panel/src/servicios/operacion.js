import { consultarApi } from './sesion.js';

export async function sincronizarOperacionLocal(repositorio, usuario, api = consultarApi) {
  async function descargar() {
    let pagina;
    do {
      const { cursor, revisionCatalogo } = await repositorio.cursor(usuario.id);
      pagina = await api(
        `/sync/pull?${new URLSearchParams({ cursor, catalogo: revisionCatalogo })}`,
      );
      await repositorio.aplicarPagina(usuario, cursor, pagina);
    } while (pagina.mas);
  }
  const sincronizar = async () => {
    await descargar();
    let cola = await repositorio.pendientes(usuario);
    if (!cola.length) return;
    while (cola.length) {
      const operaciones = cola.slice(0, 30);
      const { resultados } = await api('/sync/push', { metodo: 'POST', datos: { operaciones } });
      await repositorio.confirmar(usuario, resultados);
      if (resultados.every((r) => r.estado === 'ESPERA')) break;
      cola = await repositorio.pendientes(usuario);
    }
    await descargar();
  };
  if (globalThis.navigator?.locks) {
    return navigator.locks.request(
      `simce-operacion-${usuario.id}`,
      { ifAvailable: true },
      (bloqueo) => (bloqueo ? sincronizar() : undefined),
    );
  }
  await sincronizar();
}
