import { useState } from 'react';
import { hoyOperativo, identificarEtiqueta } from '@simce/dominio';
import { BandejaOperacion } from './BandejaOperacion.jsx';
import { Campo, FormularioOperacion, mxn, opciones, Selector } from './controles.jsx';

export function CatalogoDescargado({ vista, ocupado }) {
  const [seleccion, cambiarSeleccion] = useState('');
  const [busqueda, cambiarBusqueda] = useState('');
  const [detalleMovil, mostrarDetalle] = useState(false);
  const { productos, precios } = vista.catalogo;
  const filtro = busqueda.trim().toLocaleLowerCase('es-MX');
  const filtrados = productos.filter(
    (p) => p.plu.includes(filtro) || p.nombre.toLocaleLowerCase('es-MX').includes(filtro),
  );
  const producto = filtrados.find((p) => p.uuid === seleccion) ?? filtrados[0];
  return (
    <BandejaOperacion
      tituloLista="Productos del catálogo descargado"
      claveDetalle={producto?.uuid}
      mostrarDetalle={detalleMovil && Boolean(producto)}
      volver={() => mostrarDetalle(false)}
      textoVolver="Volver a productos"
      ocupado={ocupado}
      listado={
        <>
          <div className="cms-bandeja-filtros">
            <h2>Catálogo descargado</h2>
            <Campo
              titulo="Buscar en el catálogo descargado"
              type="search"
              value={busqueda}
              onChange={(e) => {
                cambiarBusqueda(e.target.value);
                cambiarSeleccion('');
              }}
            />
            <p className="cms-resultado-cantidad">
              {filtrados.length} {filtrados.length === 1 ? 'producto' : 'productos'}
            </p>
          </div>
          {filtrados.length ? (
            <ul className="cms-bandeja-registros">
              {filtrados.map((p) => {
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
                      aria-pressed={p.uuid === producto?.uuid}
                      disabled={ocupado}
                      onClick={() => {
                        cambiarSeleccion(p.uuid);
                        mostrarDetalle(true);
                      }}
                    >
                      <strong>{p.nombre}</strong>
                      <span className="cms-bandeja-meta">PLU {p.plu}</span>
                      <span className="cms-bandeja-asunto">
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
          ) : (
            <p className="cms-vacio">No se encontraron productos.</p>
          )}
        </>
      }
      detalle={
        producto ? (
          <>
            <header className="cms-detalle-encabezado">
              <p className="cms-detalle-folio">PLU {producto.plu}</p>
              <h2>{producto.nombre}</h2>
              <p>
                {producto.presentacion} · Perfil {vista.perfil.version}
              </p>
            </header>
            <h3>Precios registrados</h3>
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
          </>
        ) : (
          <div className="cms-vacio cms-detalle-vacio">
            <strong>Selecciona un producto</strong>
            <p>Consulta sus datos y el historial de precios.</p>
          </div>
        )
      }
    />
  );
}

export function ComprobarEtiqueta({ vista, ocupado, intentar }) {
  const [resultado, cambiarResultado] = useState('');
  return (
    <div className="operacion-verificacion">
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
            valores={opciones(vista.catalogo.productos, { soloActivos: true })}
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
    </div>
  );
}
