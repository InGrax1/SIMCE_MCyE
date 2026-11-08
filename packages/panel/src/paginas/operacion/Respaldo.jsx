import { useState } from 'react';
import { hoyOperativo } from '@simce/dominio';
import { operacionLocal } from '../../local/operacion.js';
import {
  crearRespaldoOperacion,
  leerRespaldoOperacion,
  limiteRespaldo,
} from '../../local/respaldoOperacion.js';
import { descargarBlob } from './controles.jsx';

export function Respaldo({ usuario, ocupado, intentar, alRestaurar, incidencias }) {
  const [previa, cambiarPrevia] = useState(null);
  const [resultado, cambiarResultado] = useState(null);
  return (
    <section className="cms-bandeja-detalle" aria-labelledby="titulo-respaldo-local">
      <h2 id="titulo-respaldo-local">Respaldo de pendientes</h2>
      <p>
        Guarda las operaciones sin confirmar o por revisar y sus PDF provisionales. Restaura con la
        misma cuenta en un dispositivo con el catálogo descargado. Guarda el archivo en un lugar de
        acceso restringido.
      </p>
      <button
        type="button"
        className="secundario"
        disabled={ocupado}
        onClick={() =>
          intentar(async () => {
            const datos = await operacionLocal.exportarRespaldo(usuario);
            if (!datos.cola.length)
              throw new Error('Esta cuenta no tiene operaciones pendientes o por revisar.');
            const archivo = await crearRespaldoOperacion(usuario, datos);
            descargarBlob(
              new Blob([archivo], { type: 'application/json' }),
              `simce-pendientes-${hoyOperativo()}.json`,
            );
          })
        }
      >
        Exportar respaldo local
      </button>
      <div className="cms-form-gestion">
        <label>
          Seleccionar respaldo local
          <input
            type="file"
            accept="application/json,.json"
            disabled={ocupado}
            onChange={(e) => {
              const archivo = e.currentTarget.files[0];
              e.currentTarget.value = '';
              cambiarPrevia(null);
              cambiarResultado(null);
              if (archivo)
                intentar(async () => {
                  if (archivo.size > limiteRespaldo) throw new Error('El archivo supera 20 MB.');
                  cambiarPrevia(await leerRespaldoOperacion(await archivo.text(), usuario));
                });
            }}
          />
        </label>
        {previa && (
          <div aria-label="Vista previa del respaldo">
            <p>
              Respaldo del {previa.momento.slice(0, 10)} · {previa.cola.length} operaciones ·{' '}
              {previa.documentos.length} PDF provisionales.
            </p>
            <ul className="operacion-lista">
              {previa.cola.slice(0, 10).map(({ comando, estado }) => (
                <li key={comando.operacionUuid}>
                  {comando.tipo} · {estado} · {comando.ocurridaEn.slice(0, 10)}
                </li>
              ))}
            </ul>
            {previa.cola.length > 10 && <p>Vista previa de las primeras diez operaciones.</p>}
            <button
              type="button"
              disabled={ocupado}
              onClick={() =>
                intentar(async () => {
                  cambiarResultado(await operacionLocal.restaurarRespaldo(usuario, previa));
                  cambiarPrevia(null);
                  await alRestaurar();
                })
              }
            >
              Restaurar operaciones
            </button>
          </div>
        )}
        {resultado && (
          <p role="status">
            {resultado.recuperadas} recuperadas · {resultado.duplicadas} duplicadas ·{' '}
            {resultado.conflictos} diferencias guardadas para revisión.
          </p>
        )}
      </div>
      {incidencias.length > 0 && (
        <div>
          <h3>Diferencias conservadas</h3>
          {incidencias.map(({ tipo, uuid, momento, alternativa }, indice) => (
            <details className="cms-medios" key={`${uuid}:${indice}`}>
              <summary>
                {tipo} · {uuid} · {momento.slice(0, 10)}
              </summary>
              {tipo === 'Documento' ? (
                <button
                  type="button"
                  className="secundario"
                  onClick={() =>
                    descargarBlob(
                      new Blob([alternativa.bytes], { type: 'application/pdf' }),
                      `respaldo-${uuid}.pdf`,
                    )
                  }
                >
                  Descargar copia alternativa
                </button>
              ) : (
                <pre className="operacion-datos">{JSON.stringify(alternativa, null, 2)}</pre>
              )}
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
