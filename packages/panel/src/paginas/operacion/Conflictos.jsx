import { useEffect, useState } from 'react';
import { consultarApi } from '../../servicios/sesion.js';
import { BandejaOperacion } from './BandejaOperacion.jsx';
import { FormularioOperacion, Motivo } from './controles.jsx';

export function Conflictos({ cola, conectado, administra, ocupado, intentar, reconciliar }) {
  const [servidor, cambiarServidor] = useState([]);
  const [error, cambiarError] = useState('');
  const [seleccion, seleccionar] = useState(null);
  const [detalleMovil, mostrarDetalle] = useState(false);
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
  const filas = [...incidentes.values()];
  const actual = incidentes.get(seleccion) ?? filas[0];
  const estado = (c) =>
    c.resolucion
      ? 'Resuelta'
      : { ESPERA: 'En espera', CONFLICTO: 'Conflicto', RECHAZADA: 'Rechazada' }[c.resultado.estado];
  return (
    <BandejaOperacion
      tituloLista="Operaciones por revisar"
      mostrarDetalle={detalleMovil && Boolean(actual)}
      claveDetalle={actual?.uuid}
      volver={() => mostrarDetalle(false)}
      ocupado={ocupado}
      listado={
        <>
          <div className="cms-bandeja-filtros">
            <div className="operacion-encabezado-lista">
              <h2>Operaciones por revisar</h2>
            </div>
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
          </div>
          {filas.length ? (
            <ul className="cms-bandeja-registros">
              {filas.map((c) => (
                <li key={c.uuid}>
                  <button
                    type="button"
                    className="cms-bandeja-fila"
                    aria-pressed={actual?.uuid === c.uuid}
                    disabled={ocupado}
                    onClick={() => {
                      seleccionar(c.uuid);
                      mostrarDetalle(true);
                    }}
                  >
                    <span className="cms-bandeja-fila-cabecera">
                      <strong>{c.comando.tipo.replaceAll('_', ' ')}</strong>
                      <span
                        className="cms-estado-etiqueta"
                        data-estado={c.resolucion ? 'confirmada' : 'rechazada'}
                      >
                        {estado(c)}
                      </span>
                    </span>
                    <span className="cms-bandeja-meta">{c.comando.ocurridaEn.slice(0, 10)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="cms-vacio">Sin conflictos registrados.</p>
          )}
        </>
      }
      detalle={
        actual ? (
          <DetalleConflicto
            key={actual.uuid}
            c={actual}
            {...{ estado, administra, conectado, servidor, ocupado, intentar, cargar }}
          />
        ) : (
          <div className="cms-vacio cms-detalle-vacio">
            <strong>Selecciona una operación</strong>
            <p>El detalle de la revisión se muestra en este espacio.</p>
          </div>
        )
      }
    />
  );
}

function DetalleConflicto({
  c,
  estado,
  administra,
  conectado,
  servidor,
  ocupado,
  intentar,
  cargar,
}) {
  return (
    <>
      <header className="cms-detalle-encabezado">
        <p>
          {estado(c)} · {c.comando.ocurridaEn.slice(0, 10)}
        </p>
        <h2>{c.comando.tipo.replaceAll('_', ' ')}</h2>
        <p>Revisa la versión vigente y registra un cambio nuevo si corresponde.</p>
      </header>
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
    </>
  );
}
