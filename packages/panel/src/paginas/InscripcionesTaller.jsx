import { useState } from 'react';
import { consultarApi } from '../servicios/sesion.js';

// datetime-local se presenta siempre en Ciudad de México, independientemente del equipo.
const local = (iso) =>
  iso
    ? new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'America/Mexico_City',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      })
        .format(new Date(iso))
        .replace(' ', 'T')
    : '';
const utc = (valor) => new Date(`${valor}:00-06:00`).toISOString();

export function InscripcionesTaller({ entrada, ejecutar, ocupado, actualizar, alEditar }) {
  const configuracion = entrada.inscripcion;
  const terminado = configuracion && configuracion.estado !== 'programado';
  return (
    <section className="cms-inscripciones" aria-labelledby="titulo-inscripciones">
      <h3 id="titulo-inscripciones">Inscripciones del taller</h3>
      <p>
        Configura el cupo y el periodo de inscripción. El formulario se habilita al publicar el
        taller y disponer del aviso autorizado.
      </p>
      <form
        onChange={alEditar}
        onSubmit={(e) => {
          e.preventDefault();
          const datos = Object.fromEntries(new FormData(e.currentTarget));
          ejecutar(async () => {
            await consultarApi(`/talleres/${entrada.id}`, {
              metodo: 'PUT',
              datos: {
                ...datos,
                cupo: Number(datos.cupo),
                apertura: utc(datos.apertura),
                cierre: utc(datos.cierre),
                version: entrada.version,
              },
            });
            await actualizar();
          });
        }}
      >
        <fieldset disabled={ocupado || terminado}>
          <legend>Cupo y periodo · hora de Ciudad de México</legend>
          <label>
            Contenido temático
            <textarea
              name="temario"
              defaultValue={configuracion?.temario ?? ''}
              maxLength={4000}
              required
            />
          </label>
          <label>
            Sede
            <input name="sede" defaultValue={configuracion?.sede ?? ''} maxLength={300} required />
          </label>
          <label>
            Cupo
            <input
              name="cupo"
              type="number"
              min={1}
              max={10000}
              step={1}
              defaultValue={configuracion?.cupo ?? 25}
              required
            />
          </label>
          <label>
            Apertura de inscripción
            <input
              name="apertura"
              type="datetime-local"
              defaultValue={local(configuracion?.apertura)}
              required
            />
          </label>
          <label>
            Cierre de inscripción
            <input
              name="cierre"
              type="datetime-local"
              defaultValue={local(configuracion?.cierre)}
              required
            />
          </label>
          {configuracion && (
            <label>
              Motivo del cambio de periodo
              <input name="motivo" maxLength={500} />
            </label>
          )}
          <button disabled={ocupado || terminado}>Guardar inscripción</button>
        </fieldset>
      </form>
    </section>
  );
}

export function OperacionTaller({ entrada, ejecutar, ocupado, actualizar }) {
  const [motivo, cambiarMotivo] = useState('');
  const configuracion = entrada.inscripcion;
  async function descargar(formato) {
    const archivo = await consultarApi(`/talleres/${entrada.id}/inscripciones?formato=${formato}`);
    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `inscripciones-${entrada.id}.${formato}`;
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="cms-operacion-taller" aria-labelledby="titulo-operacion-taller">
      <h3 id="titulo-operacion-taller">Operación del taller</h3>
      {configuracion ? (
        <p>
          Estado operativo: <strong>{configuracion.estado}</strong>.
        </p>
      ) : (
        <p>Configura el cupo y el periodo en «Inscripciones» para gestionar el taller.</p>
      )}
      <div className="cms-acciones">
        {['csv', 'pdf'].map((formato) => (
          <button
            type="button"
            className="secundario"
            key={formato}
            disabled={ocupado}
            onClick={() => ejecutar(() => descargar(formato))}
          >
            Exportar {formato.toUpperCase()}
          </button>
        ))}
      </div>
      {configuracion?.estado === 'programado' && (
        <>
          <label>
            Motivo de la acción del taller
            <input value={motivo} onChange={(e) => cambiarMotivo(e.target.value)} maxLength={500} />
          </label>
          <div className="cms-acciones">
            {['concluir', 'cancelar'].map((accion) => (
              <button
                type="button"
                className="secundario"
                key={accion}
                disabled={ocupado || !motivo.trim()}
                onClick={() =>
                  ejecutar(async () => {
                    if (
                      !window.confirm(
                        `¿${accion === 'cancelar' ? 'Cancelar' : 'Concluir'} el taller?${accion === 'cancelar' ? ' Se cancelarán las inscripciones confirmadas.' : ''}`,
                      )
                    )
                      return;
                    await consultarApi(`/talleres/${entrada.id}/acciones`, {
                      metodo: 'POST',
                      datos: { accion, motivo, version: entrada.version },
                    });
                    await actualizar();
                  })
                }
              >
                {accion === 'cancelar' ? 'Cancelar taller' : 'Concluir taller'}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
