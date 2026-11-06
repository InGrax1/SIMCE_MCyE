const clave = 'simce.consultas-talleres.v1';
export const eventoConsultas = 'simce:consultas-actualizadas';
const valida = (dato) =>
  dato &&
  typeof dato.folio === 'string' &&
  /^CT-\d{4}-\d{8}$/.test(dato.folio) &&
  typeof dato.acceso === 'string' &&
  /^[A-Za-z0-9_-]{43}$/.test(dato.acceso) &&
  typeof dato.tallerNombre === 'string' &&
  dato.tallerNombre.length <= 160;

export function leerConsultasGuardadas() {
  try {
    const datos = JSON.parse(window.localStorage.getItem(clave) ?? '[]');
    return Array.isArray(datos) ? datos.filter(valida).slice(0, 20) : [];
  } catch {
    return [];
  }
}

function escribir(datos) {
  try {
    if (datos.length) window.localStorage.setItem(clave, JSON.stringify(datos));
    else window.localStorage.removeItem(clave);
    window.dispatchEvent(new Event(eventoConsultas));
    return true;
  } catch {
    return false;
  }
}

export function guardarConsulta(dato) {
  if (!valida(dato)) return false;
  const { folio, acceso, tallerNombre } = dato;
  return escribir(
    [
      { folio, acceso, tallerNombre },
      ...leerConsultasGuardadas().filter((c) => c.folio !== folio),
    ].slice(0, 20),
  );
}

export function quitarConsulta(folio) {
  return escribir(leerConsultasGuardadas().filter((c) => c.folio !== folio));
}

export function enlaceConsulta({ folio, acceso }) {
  return `/#consulta-taller=${encodeURIComponent(folio)}&acceso=${encodeURIComponent(acceso)}`;
}
