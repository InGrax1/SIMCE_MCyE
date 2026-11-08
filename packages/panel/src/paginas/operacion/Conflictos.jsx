import { useEffect, useState } from 'react';
import { consultarApi } from '../../servicios/sesion.js';
import { FormularioOperacion, Motivo } from './controles.jsx';

export function Conflictos({ cola, conectado, administra, ocupado, intentar, reconciliar }) {
  const [servidor, cambiarServidor] = useState([]);
  const [error, cambiarError] = useState('');
  async function cargar() {
    const datos = await consultarApi('/operacion/conflictos');
    cambiarServidor(datos);
    cambiarError('');
    await reconciliar(datos);
  }
  useEffect(() => {
    if (conectado) cargar().catch((e) => cambiarError(e.message));
  }, [conectado]);
  const incidentes = new Map(
    cola
      .filter(
        (e) =>
          ['CONFLICTO', 'RECHAZADA', 'RESUELTA'].includes(e.estado) ||
          e.resultado?.estado === 'ESPERA',
      )
      .map((e) => [
        e.operacionUuid,
        {
          uuid: e.operacionUuid,
          comando: e.comando,
          resultado: e.resultado,
          resolucion: e.resolucion,
        },
      ]),
  );
  for (const incidente of servidor) incidentes.set(incidente.uuid, incidente);
  return (
    <section className="cms-bandeja-detalle" aria-labelledby="titulo-conflictos">
      <h2 id="titulo-conflictos">Operaciones por revisar</h2>
      <p>
        Una operación rechazada conserva su autor y los datos capturados. Para corregirla, revisa la
        versión vigente y registra un cambio nuevo si corresponde.
      </p>
      {conectado && (
        <button
          className="secundario"
          type="button"
          disabled={ocupado}
          onClick={() => intentar(cargar)}
        >
          Actualizar revisión
        </button>
      )}
      {error && <p role="alert">{error}</p>}
      {incidentes.size === 0 && <p>Sin conflictos registrados.</p>}
      {[...incidentes.values()].map((c) => (
        <details key={c.uuid} className="cms-medios">
          <summary>
            {c.resolucion ? 'Resuelta' : c.resultado.estado} · {c.comando.tipo} ·{' '}
            {c.comando.ocurridaEn.slice(0, 10)}
          </summary>
          <p>{c.resultado.mensaje}</p>
          <p>
            Autor {c.comando.autorUuid} · Versión base {c.comando.versionBase}
          </p>
          <h3>Datos capturados</h3>
          <pre className="operacion-datos">{JSON.stringify(c.comando.payload, null, 2)}</pre>
          {c.servidor && (
            <>
              <h3>Versión del servidor al detectar el conflicto</h3>
              <pre className="operacion-datos">{JSON.stringify(c.servidor, null, 2)}</pre>
            </>
          )}
          {c.resolucion && <p>Resolución registrada. {c.resolucion.motivo}</p>}
          {administra &&
            conectado &&
            !c.resolucion &&
            servidor.some((item) => item.uuid === c.uuid) && (
              <FormularioOperacion
                ocupado={ocupado}
                boton="Conservar la versión del servidor"
                accion={({ motivo }) =>
                  intentar(async () => {
                    await consultarApi(`/operacion/conflictos/${c.uuid}/resolver`, {
                      metodo: 'POST',
                      datos: { motivo },
                    });
                    await cargar();
                  })
                }
              >
                <Motivo titulo="Motivo de resolución" />
              </FormularioOperacion>
            )}
        </details>
      ))}
    </section>
  );
}
