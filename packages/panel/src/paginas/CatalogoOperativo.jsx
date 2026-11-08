import { useEffect, useState } from 'react';
import { centavosDesdeDecimal, formatearDinero } from '@simce/dominio';
import { consultarApi } from '../servicios/sesion.js';

const tipos = [
  ['lineas', 'Líneas'],
  ['especies', 'Especies'],
  ['destinos', 'Destinos'],
];
const dinero = (precio) => `$${formatearDinero(precio.precio_kg_centavos)} MXN/kg`;

function enviar(e, ejecutar, guardar, limpiar = false) {
  e.preventDefault();
  const formulario = e.currentTarget;
  const datos = Object.fromEntries(new FormData(formulario));
  ejecutar(async () => {
    await guardar(datos);
    if (limpiar) formulario.reset();
  });
}

function Activo({ activo }) {
  return (
    <label className="cms-check">
      <input name="activo" type="checkbox" defaultChecked={activo} />
      Activo
    </label>
  );
}

function Clasificacion({ tipo, titulo, registros, ocupado, ejecutar, guardar }) {
  const [seleccion, elegir] = useState('');
  const actual = registros.find((item) => item.uuid === seleccion);
  const ruta = `/catalogos-operativos/${tipo}`;
  return (
    <div className="cms-form-gestion">
      <h3>{titulo}</h3>
      <label>
        Registro de {titulo.toLowerCase()}
        <select value={seleccion} disabled={ocupado} onChange={(e) => elegir(e.target.value)}>
          <option value="">Nuevo registro</option>
          {registros.map((item) => (
            <option key={item.uuid} value={item.uuid}>
              {item.nombre}
              {item.activo ? '' : ' (inactivo)'}
            </option>
          ))}
        </select>
      </label>
      <form
        key={actual ? `${actual.uuid}:${actual.version}` : 'nuevo'}
        onSubmit={(e) =>
          enviar(
            e,
            ejecutar,
            async ({ nombre, activo }) => {
              await guardar(
                actual ? `${ruta}/${actual.uuid}` : ruta,
                actual ? 'PATCH' : 'POST',
                actual ? { nombre, activo: activo === 'on', version: actual.version } : { nombre },
              );
            },
            !actual,
          )
        }
      >
        <label>
          Nombre
          <input name="nombre" required maxLength={120} defaultValue={actual?.nombre} />
        </label>
        {actual && <Activo activo={actual.activo} />}
        <button disabled={ocupado}>{actual ? 'Guardar cambios' : 'Agregar registro'}</button>
      </form>
    </div>
  );
}

function CampoCatalogo({ nombre, etiqueta, registros, actual }) {
  return (
    <label>
      {etiqueta}
      <select name={nombre} required defaultValue={actual ?? ''}>
        <option value="" disabled>
          Selecciona
        </option>
        {registros
          .filter((item) => item.activo || item.uuid === actual)
          .map((item) => (
            <option key={item.uuid} value={item.uuid}>
              {item.nombre}
              {item.activo ? '' : ' (inactivo)'}
            </option>
          ))}
      </select>
    </label>
  );
}

function FichaProducto({ producto, clasificaciones, ocupado, ejecutar, guardar }) {
  const longitudPlu = clasificaciones.perfil?.longitudPlu ?? 6;
  const faltanCatalogos =
    !producto &&
    !['lineas', 'especies'].every((tipo) => clasificaciones[tipo].some((item) => item.activo));
  if (faltanCatalogos)
    return <p>Agrega una línea y una especie activas para dar de alta productos.</p>;
  return (
    <form
      className="cms-form-gestion"
      onSubmit={(e) =>
        enviar(
          e,
          ejecutar,
          ({ activo, ...datos }) =>
            guardar(
              producto ? `/productos/${producto.uuid}` : '/productos',
              producto ? 'PATCH' : 'POST',
              producto ? { ...datos, activo: activo === 'on', version: producto.version } : datos,
            ),
          !producto,
        )
      }
    >
      <label>
        Nombre del producto
        <input name="nombre" required maxLength={120} defaultValue={producto?.nombre} />
      </label>
      <CampoCatalogo
        nombre="linea_uuid"
        etiqueta="Línea"
        registros={clasificaciones.lineas}
        actual={producto?.linea_uuid}
      />
      <CampoCatalogo
        nombre="especie_uuid"
        etiqueta="Especie"
        registros={clasificaciones.especies}
        actual={producto?.especie_uuid}
      />
      <label>
        Presentación
        <input name="presentacion" required maxLength={80} defaultValue={producto?.presentacion} />
      </label>
      {!producto && (
        <label>
          PLU ({longitudPlu} dígitos)
          <input
            name="plu"
            required
            inputMode="numeric"
            pattern={`[0-9]{${longitudPlu}}`}
            maxLength={longitudPlu}
          />
        </label>
      )}
      {producto && <Activo activo={producto.activo} />}
      <button disabled={ocupado}>{producto ? 'Guardar producto' : 'Registrar producto'}</button>
    </form>
  );
}

function DetalleProducto({
  producto,
  clasificaciones,
  administra,
  fecha,
  ocupado,
  ejecutar,
  guardar,
}) {
  const [historial, cambiarHistorial] = useState(null);
  const [error, cambiarError] = useState('');
  const [inicio, cambiarInicio] = useState(fecha);
  const ruta = `/productos/${producto.uuid}/precios`;
  const retroactivo = inicio && inicio < fecha;
  useEffect(() => {
    let vigente = true;
    consultarApi(ruta).then(
      (lista) => {
        if (vigente) {
          cambiarHistorial(lista);
          cambiarError('');
        }
      },
      (e) => {
        if (vigente) cambiarError(e.message);
      },
    );
    return () => {
      vigente = false;
    };
  }, [ruta, producto]);
  return (
    <section aria-labelledby="titulo-producto-operativo">
      <h2 id="titulo-producto-operativo">{producto.nombre}</h2>
      <p>
        PLU {producto.plu} · {producto.presentacion} · Unidad kg
      </p>
      <p>
        {clasificaciones.lineas.find((item) => item.uuid === producto.linea_uuid)?.nombre}
        {' · '}
        {clasificaciones.especies.find((item) => item.uuid === producto.especie_uuid)?.nombre}
      </p>
      <h3>Historial de precios</h3>
      {error ? (
        <p role="alert">{error}</p>
      ) : historial === null ? (
        <p role="status">Cargando historial…</p>
      ) : historial.length === 0 ? (
        <p>Aún no hay precios registrados.</p>
      ) : (
        <ul>
          {historial.toReversed().map((precio) => (
            <li key={precio.uuid}>
              <strong>{dinero(precio)}</strong>
              {' · Desde '}
              <time dateTime={precio.vigente_desde}>{precio.vigente_desde}</time>
              {precio.vigente_hasta && ` hasta ${precio.vigente_hasta}`}
              {producto.precio?.uuid === precio.uuid && ' · Vigente'}
              {precio.motivo && <p>{precio.motivo}</p>}
            </li>
          ))}
        </ul>
      )}
      {administra && (
        <>
          <details className="cms-medios">
            <summary>Editar producto</summary>
            <FichaProducto
              key={producto.version}
              {...{ producto, clasificaciones, ocupado, ejecutar, guardar }}
            />
          </details>
          <details className="cms-medios">
            <summary>Registrar vigencia de precio</summary>
            <form
              className="cms-form-gestion"
              onSubmit={(e) =>
                enviar(
                  e,
                  ejecutar,
                  async (datos) => {
                    await guardar(ruta, 'POST', {
                      precio_kg_centavos: centavosDesdeDecimal(datos.precio),
                      vigente_desde: inicio,
                      motivo: datos.motivo,
                      revision_documentos: datos.revision === 'on',
                    });
                    cambiarInicio(fecha);
                  },
                  true,
                )
              }
            >
              <label>
                Precio por kilogramo (MXN)
                <input
                  name="precio"
                  required
                  inputMode="decimal"
                  pattern="[0-9]{1,8}(\.[0-9]{1,2})?"
                />
              </label>
              <label>
                Vigente desde
                <input
                  type="date"
                  required
                  min="1000-01-01"
                  max="9999-12-31"
                  value={inicio}
                  onChange={(e) => cambiarInicio(e.target.value)}
                />
              </label>
              {retroactivo && (
                <>
                  <label>
                    Motivo del precio retroactivo
                    <textarea name="motivo" required maxLength={500} />
                  </label>
                  <label className="cms-check">
                    <input type="checkbox" name="revision" required />
                    Revisé los documentos afectados.
                  </label>
                </>
              )}
              <button disabled={ocupado}>Guardar precio</button>
            </form>
          </details>
        </>
      )}
    </section>
  );
}

async function consultarCatalogo() {
  const [clasificaciones, productos] = await Promise.all([
    consultarApi('/catalogos-operativos'),
    consultarApi('/productos'),
  ]);
  return { clasificaciones, ...productos };
}

export function CatalogoOperativo({ administra, ocupado, ejecutar, avisar }) {
  const [catalogo, cambiarCatalogo] = useState(null);
  const [error, cambiarError] = useState('');
  const [filtro, cambiarFiltro] = useState('');
  const [seleccion, elegir] = useState(null);
  useEffect(() => {
    let vigente = true;
    consultarCatalogo().then(
      (datos) => {
        if (vigente) cambiarCatalogo(datos);
      },
      (e) => {
        if (vigente) cambiarError(e.message);
      },
    );
    return () => {
      vigente = false;
    };
  }, []);
  async function actualizar() {
    cambiarCatalogo(await consultarCatalogo());
    cambiarError('');
  }
  async function guardar(ruta, metodo, datos) {
    await consultarApi(ruta, { metodo, datos });
    avisar('Cambios guardados en el catálogo operativo.');
    await actualizar();
  }
  const producto = catalogo?.productos.find((item) => item.uuid === seleccion);
  const busqueda = filtro.trim().toLocaleLowerCase('es-MX');
  const resultados = catalogo?.productos.filter(
    (item) =>
      item.plu.includes(busqueda) || item.nombre.toLocaleLowerCase('es-MX').includes(busqueda),
  );
  return (
    <section className="cms-bandeja" aria-labelledby="titulo-catalogo">
      <header className="cms-bandeja-barra">
        <h2 id="titulo-catalogo">Catálogo operativo</h2>
        <button
          type="button"
          className="secundario"
          disabled={ocupado}
          onClick={() => ejecutar(actualizar)}
        >
          Actualizar catálogo
        </button>
      </header>
      {error && (
        <p className="cms-bandeja-detalle" role="alert">
          {error}
        </p>
      )}
      {!catalogo ? (
        !error && (
          <p className="cms-vacio" role="status">
            Cargando catálogo…
          </p>
        )
      ) : (
        <>
          {administra && (
            <div className="cms-bandeja-detalle">
              <details className="cms-medios">
                <summary>Administrar líneas, especies y destinos</summary>
                {tipos.map(([tipo, titulo]) => (
                  <Clasificacion
                    key={tipo}
                    registros={catalogo.clasificaciones[tipo]}
                    {...{ tipo, titulo, ocupado, ejecutar, guardar }}
                  />
                ))}
              </details>
              <details className="cms-medios">
                <summary>Dar de alta un producto</summary>
                <FichaProducto
                  clasificaciones={catalogo.clasificaciones}
                  {...{ ocupado, ejecutar, guardar }}
                />
              </details>
            </div>
          )}
          <div className="cms-bandeja-columnas" data-detalle={Boolean(producto)}>
            <div className="cms-bandeja-listado">
              <div className="cms-bandeja-filtros">
                <label>
                  Buscar por nombre o PLU
                  <input
                    type="search"
                    value={filtro}
                    onChange={(e) => cambiarFiltro(e.target.value)}
                  />
                </label>
              </div>
              {!resultados.length ? (
                <p className="cms-vacio">No se encontraron productos.</p>
              ) : (
                <ul className="cms-bandeja-registros">
                  {resultados.map((item) => (
                    <li key={item.uuid}>
                      <button
                        type="button"
                        className="cms-bandeja-fila"
                        disabled={ocupado}
                        aria-pressed={seleccion === item.uuid}
                        onClick={() => elegir(item.uuid)}
                      >
                        <strong>{item.nombre}</strong>
                        <span>
                          PLU {item.plu} · {item.activo ? 'Activo' : 'Inactivo'}
                        </span>
                        {item.precio ? (
                          <span>{dinero(item.precio)}</span>
                        ) : (
                          item.activo && <span>Sin precio vigente</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {producto && (
              <div className="cms-bandeja-detalle">
                <button
                  type="button"
                  className="secundario cms-volver-lista"
                  disabled={ocupado}
                  onClick={() => elegir(null)}
                >
                  Volver a productos
                </button>
                <DetalleProducto
                  key={producto.uuid}
                  clasificaciones={catalogo.clasificaciones}
                  fecha={catalogo.fecha}
                  {...{ producto, administra, ocupado, ejecutar, guardar }}
                />
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
