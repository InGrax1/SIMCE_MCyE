const claves = { CT: 'simce.consultas-talleres.v1', INS: 'simce.inscripciones-talleres.v1' };
export const eventoConsultas = 'simce:consultas-actualizadas';
const valida = (dato, tipo = 'CT') =>
  dato &&
  typeof dato.folio === 'string' &&
  new RegExp(`^${tipo}-\\d{4}-\\d{8}$`).test(dato.folio) &&
  typeof dato.acceso === 'string' &&
  /^[A-Za-z0-9_-]{43}$/.test(dato.acceso) &&
  typeof dato.tallerNombre === 'string' &&
  dato.tallerNombre.length <= 160;

export function leerConsultasGuardadas(tipo = 'CT') {
  try {
    const datos = JSON.parse(window.localStorage.getItem(claves[tipo]) ?? '[]');
    return Array.isArray(datos) ? datos.filter((dato) => valida(dato, tipo)).slice(0, 20) : [];
  } catch {
    return [];
  }
}

function escribir(datos, tipo) {
  try {
    if (datos.length) window.localStorage.setItem(claves[tipo], JSON.stringify(datos));
    else window.localStorage.removeItem(claves[tipo]);
    window.dispatchEvent(new Event(eventoConsultas));
    return true;
  } catch {
    return false;
  }
}

export function guardarConsulta(dato) {
  const tipo = dato?.folio?.startsWith('INS-') ? 'INS' : 'CT';
  if (!valida(dato, tipo)) return false;
  const { folio, acceso, tallerNombre } = dato;
  return escribir(
    [
      { folio, acceso, tallerNombre },
      ...leerConsultasGuardadas(tipo).filter((c) => c.folio !== folio),
    ].slice(0, 20),
    tipo,
  );
}

export function quitarConsulta(folio) {
  const tipo = folio.startsWith('INS-') ? 'INS' : 'CT';
  return escribir(
    leerConsultasGuardadas(tipo).filter((c) => c.folio !== folio),
    tipo,
  );
}

export function enlaceConsulta({ folio, acceso }) {
  return `/#${folio.startsWith('INS-') ? 'inscripcion-taller' : 'consulta-taller'}=${encodeURIComponent(folio)}&acceso=${encodeURIComponent(acceso)}`;
}
