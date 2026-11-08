import { useState } from 'react';
import { hoyOperativo, identificarEtiqueta } from '@simce/dominio';
import { Campo, FormularioOperacion, mxn, opciones, Selector } from './controles.jsx';

export function CatalogoDescargado({ vista, ocupado, intentar }) {
  const [seleccion, cambiarSeleccion] = useState('');
  const [busqueda, cambiarBusqueda] = useState('');
  const [resultado, cambiarResultado] = useState('');
  const { productos, precios } = vista.catalogo;
  const producto = productos.find((p) => p.uuid === seleccion);
  const filtro = busqueda.trim().toLocaleLowerCase('es-MX');
  return (
    <section className="cms-bandeja-detalle" aria-labelledby="titulo-catalogo-descargado">
      <h2 id="titulo-catalogo-descargado">Catálogo descargado</h2>
      <p>
        Perfil de lectura {vista.perfil.version}. El precio se verifica con la etiqueta o el
        registro de etiquetado.
      </p>
      <Campo
        titulo="Buscar en el catálogo descargado"
        type="search"
        value={busqueda}
        onChange={(e) => cambiarBusqueda(e.target.value)}
      />
      <ul className="operacion-lista">
        {productos
          .filter(
            (p) => p.plu.includes(filtro) || p.nombre.toLocaleLowerCase('es-MX').includes(filtro),
          )
          .map((p) => {
            const actual = precios
              .filter(
                (precio) =>
                  precio.producto_uuid === p.uuid && precio.vigente_desde <= hoyOperativo(),
              )
              .sort((a, b) => b.vigente_desde.localeCompare(a.vigente_desde))[0];
            return (
              <li key={p.uuid}>
                <button
                  type="button"
                  className="cms-bandeja-fila"
                  aria-pressed={p.uuid === seleccion}
                  onClick={() => cambiarSeleccion(p.uuid)}
                >
                  <strong>
                    {p.nombre} · PLU {p.plu}
                  </strong>
                  <span>
                    {p.activo
                      ? actual
                        ? `${mxn(actual.precio_kg_centavos)}/kg`
                        : 'Sin precio vigente'
                      : 'Inactivo'}
                  </span>
                </button>
              </li>
            );
          })}
      </ul>
      {producto && (
        <div>
          <h3>Precios registrados de {producto.nombre}</h3>
          <ul className="operacion-lista">
            {precios
              .filter((p) => p.producto_uuid === producto.uuid)
              .toSorted((a, b) => b.vigente_desde.localeCompare(a.vigente_desde))
              .map((p) => (
                <li key={p.uuid}>
                  Desde {p.vigente_desde} · {mxn(p.precio_kg_centavos)}/kg
                </li>
              ))}
          </ul>
        </div>
      )}
      <details className="cms-medios">
        <summary>Comprobar una etiqueta programada</summary>
        <FormularioOperacion
          ocupado={ocupado}
          boton="Comprobar PLU"
          accion={(datos) =>
            intentar(() => {
              cambiarResultado('');
              const lectura = identificarEtiqueta(datos.codigo, vista.catalogo, vista.perfil);
              if (lectura.producto.uuid !== datos.producto)
                throw new Error('El PLU de la etiqueta corresponde a otro producto.');
              cambiarResultado(
                `Coincide con ${lectura.producto.nombre} · PLU ${lectura.plu} · importe leído ${mxn(lectura.importeCentavos)}.`,
              );
            })
          }
        >
          <Selector
            titulo="Producto programado"
            nombre="producto"
            required
            valores={opciones(productos, { soloActivos: true })}
          />
          <Campo
            titulo="Etiqueta de comprobación"
            nombre="codigo"
            inputMode="numeric"
            maxLength={13}
            required
          />
        </FormularioOperacion>
        {resultado && <p role="status">{resultado}</p>}
      </details>
    </section>
  );
}
