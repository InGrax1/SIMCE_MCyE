import { useState } from 'react';
import { hoyOperativo } from '@simce/dominio';
import { consultarApi } from '../../servicios/sesion.js';
import { Campo, descargarBlob, FormularioOperacion, Selector } from './controles.jsx';

const tipos = [
  ['produccion', 'Producción'],
  ['salidas', 'Salidas'],
  ['existencias', 'Existencias a la fecha'],
  ['canceladas', 'Remisiones canceladas'],
  ['mermas', 'Mermas por motivo'],
];
const grupos = {
  produccion: [
    ['producto', 'Producto'],
    ['linea', 'Línea'],
    ['especie', 'Especie'],
    ['area', 'Área'],
  ],
  salidas: [
    ['destino', 'Destino'],
    ['producto', 'Producto'],
    ['linea', 'Línea'],
  ],
};

export function Reportes({ ocupado, intentar }) {
  const [tipo, cambiarTipo] = useState('produccion');
  const [reporte, cambiarReporte] = useState(null);
  const hoy = hoyOperativo();
  const gruposReporte = grupos[tipo];
  const ruta = (tipoReporte, parametros) =>
    `/reportes/${tipoReporte}?${new URLSearchParams(parametros)}`;
  function consultar(filtros) {
    return intentar(async () => cambiarReporte(await consultarApi(ruta(tipo, filtros))));
  }
  function exportar(formato) {
    return intentar(async () => {
      const parametros = { hasta: reporte.hasta, formato };
      if (reporte.desde) parametros.desde = reporte.desde;
      if (reporte.agrupar) parametros.agrupar = reporte.agrupar;
      const archivo = await consultarApi(ruta(reporte.tipo, parametros));
      descargarBlob(archivo, `simce-${reporte.tipo}-${reporte.hasta}.${formato}`);
    });
  }
  return (
    <section className="cms-bandeja-detalle" aria-labelledby="titulo-reportes">
      <h2 id="titulo-reportes">Reportes operativos</h2>
      <p>
        Los reportes usan registros confirmados por el servidor. Sincroniza primero si tienes
        operaciones pendientes.
      </p>
      <FormularioOperacion accion={consultar} ocupado={ocupado} boton="Consultar reporte">
        <Selector
          titulo="Tipo de reporte"
          valores={tipos}
          vacio={null}
          value={tipo}
          onChange={(e) => {
            cambiarTipo(e.target.value);
            cambiarReporte(null);
          }}
        />
        <div className="operacion-campos">
          {tipo !== 'existencias' && (
            <Campo
              titulo="Desde"
              nombre="desde"
              type="date"
              defaultValue={`${hoy.slice(0, 7)}-01`}
              required
            />
          )}
          <Campo
            titulo={tipo === 'existencias' ? 'Fecha de existencia' : 'Hasta'}
            nombre="hasta"
            type="date"
            defaultValue={hoy}
            required
          />
          {gruposReporte && (
            <Selector
              key={tipo}
              titulo="Agrupar por"
              nombre="agrupar"
              valores={gruposReporte}
              vacio={null}
            />
          )}
        </div>
      </FormularioOperacion>
      {reporte && (
        <div>
          <h3>{reporte.titulo}</h3>
          <p>
            {reporte.desde ? `${reporte.desde} al ${reporte.hasta}` : `Al ${reporte.hasta}`} ·{' '}
            {reporte.filas.length} registros
          </p>
          <div className="operacion-acciones">
            <button
              type="button"
              className="secundario"
              disabled={ocupado}
              onClick={() => exportar('csv')}
            >
              Descargar reporte CSV
            </button>
            <button
              type="button"
              className="secundario"
              disabled={ocupado}
              onClick={() => exportar('pdf')}
            >
              Descargar reporte PDF
            </button>
          </div>
          {reporte.filas.length ? (
            <div
              className="operacion-tabla"
              tabIndex={0}
              role="region"
              aria-label={`Resultados de ${reporte.titulo}`}
            >
              <table>
                <thead>
                  <tr>
                    {reporte.columnas.map((columna) => (
                      <th key={columna} scope="col">
                        {columna}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reporte.filas.map((fila, i) => (
                    <tr key={i}>
                      {fila.map((celda, j) => (
                        <td key={reporte.columnas[j]}>{celda}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                {reporte.totales && (
                  <tfoot>
                    <tr>
                      {reporte.totales.map((celda, j) => (
                        <td key={reporte.columnas[j]}>{celda}</td>
                      ))}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          ) : (
            <p>Sin registros para los filtros elegidos.</p>
          )}
        </div>
      )}
    </section>
  );
}
