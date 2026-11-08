import { useState } from 'react';
import {
  formatearKilogramos,
  gramosDesdeDecimal,
  hoyOperativo,
  saldoPorProducto,
} from '@simce/dominio';
import { BandejaOperacion } from './BandejaOperacion.jsx';
import { Campo, FormularioOperacion, kg, Motivo, opciones, Selector } from './controles.jsx';

function FormularioLote({ lote, productos, registrar, ocupado, alGuardar }) {
  return (
    <FormularioOperacion
      ocupado={ocupado}
      boton={lote ? 'Guardar corrección' : 'Registrar lote'}
      limpiar={!lote}
      accion={async (datos) => {
        const guardado = await registrar(
          lote ? 'CORREGIR_LOTE' : 'CREAR_LOTE',
          () => ({
            ...datos,
            gramos: gramosDesdeDecimal(datos.peso),
            piezas: Number(datos.piezas),
            ...(lote ? { reversionUuid: crypto.randomUUID() } : {}),
          }),
          lote,
        );
        if (guardado) alGuardar(lote?.productoUuid ?? datos.productoUuid, datos.fecha);
        return guardado;
      }}
    >
      {lote ? (
        <p>El producto y la fecha de elaboración se conservan al corregir el lote.</p>
      ) : (
        <>
          <Selector
            nombre="productoUuid"
            titulo="Producto del lote"
            valores={opciones(productos, { soloActivos: true })}
            required
          />
          <Campo
            titulo="Fecha de elaboración"
            nombre="fecha"
            type="date"
            defaultValue={hoyOperativo()}
            required
          />
        </>
      )}
      <div className="operacion-campos">
        <Campo titulo="Área" nombre="area" defaultValue={lote?.area} maxLength={120} required />
        <Campo
          titulo="Persona responsable"
          nombre="responsable"
          defaultValue={lote?.responsable}
          maxLength={120}
          required
        />
        <Campo
          titulo="Cantidad producida (kg)"
          nombre="peso"
          inputMode="decimal"
          defaultValue={lote ? formatearKilogramos(lote.gramos) : ''}
          required
        />
        <Campo
          titulo="Número de piezas"
          nombre="piezas"
          type="number"
          defaultValue={lote?.piezas ?? 0}
          min={0}
          max={999999}
          required
        />
        <Campo
          titulo="Caducidad"
          nombre="caducidad"
          type="date"
          defaultValue={lote?.caducidad}
          required
        />
      </div>
      {lote && <Motivo titulo="Motivo de corrección" />}
    </FormularioOperacion>
  );
}

function FormularioMovimiento({ vista, administra, registrar, ocupado, alGuardar }) {
  const [tipo, cambiarTipo] = useState('REGISTRAR_MERMA');
  const [destino, cambiarDestino] = useState('');
  const [producto, cambiarProducto] = useState('');
  const ajuste = tipo === 'AJUSTAR_EXISTENCIA';
  const devolucion = tipo === 'REGISTRAR_DEVOLUCION';
  const apertura = tipo === 'ABRIR_EXISTENCIA';
  const tipos = [
    ['REGISTRAR_MERMA', 'Merma'],
    ['REGISTRAR_DEVOLUCION', 'Devolución'],
    ...(administra
      ? [
          ['AJUSTAR_EXISTENCIA', 'Ajuste'],
          ['ABRIR_EXISTENCIA', 'Apertura al corte'],
        ]
      : []),
  ];
  const remisiones = vista.remisiones.filter(
    (r) =>
      r.estado === 'CERRADA' &&
      r.destinoUuid === destino &&
      r.renglones.some((fila) => fila.productoUuid === producto),
  );
  return (
    <FormularioOperacion
      ocupado={ocupado}
      boton="Registrar movimiento"
      limpiar
      accion={async (datos) => {
        const guardado = await registrar(tipo, () => ({
          ...datos,
          gramos: gramosDesdeDecimal(datos.peso),
          ...(ajuste ? { direccion: Number(datos.direccion) } : {}),
        }));
        if (guardado) alGuardar(datos.productoUuid, datos.fecha);
        return guardado;
      }}
    >
      <Selector
        nombre="tipo"
        titulo="Tipo de movimiento"
        valores={tipos}
        vacio={null}
        value={tipo}
        onChange={(e) => cambiarTipo(e.target.value)}
      />
      <Selector
        nombre="productoUuid"
        titulo="Producto del movimiento"
        valores={opciones(vista.catalogo.productos, { soloActivos: !ajuste && !apertura })}
        value={producto}
        onChange={(e) => cambiarProducto(e.target.value)}
        required
      />
      <div className="operacion-campos">
        <Campo
          titulo={apertura ? 'Fecha de corte' : 'Fecha del movimiento'}
          nombre="fecha"
          type="date"
          defaultValue={hoyOperativo()}
          required
        />
        <Campo titulo="Cantidad (kg)" nombre="peso" inputMode="decimal" required />
      </div>
      {ajuste && (
        <Selector
          nombre="direccion"
          titulo="Dirección del ajuste"
          valores={[
            [1, 'Sumar al inventario'],
            [-1, 'Restar del inventario'],
          ]}
          required
        />
      )}
      {devolucion && (
        <>
          <Selector
            nombre="destinoUuid"
            titulo="Destino que devuelve"
            valores={opciones(vista.catalogo.destinos)}
            value={destino}
            onChange={(e) => cambiarDestino(e.target.value)}
            required
          />
          <Selector
            nombre="remisionUuid"
            titulo="Remisión de origen"
            valores={remisiones.map((r) => [r.uuid, r.folioFinal ?? r.folioProvisional])}
            vacio="Desconocida"
          />
        </>
      )}
      <Motivo titulo={apertura ? 'Acta de recuento y motivo' : 'Motivo del movimiento'} />
    </FormularioOperacion>
  );
}

export function Inventario({ vista, administra, registrar, ocupado }) {
  const [productoId, cambiarProducto] = useState('');
  const [busqueda, cambiarBusqueda] = useState('');
  const [fecha, cambiarFecha] = useState(hoyOperativo);
  const [loteId, cambiarLote] = useState(null);
  const [formulario, cambiarFormulario] = useState(null);
  const [detalleMovil, mostrarDetalle] = useState(false);
  const { productos } = vista.catalogo;
  const termino = busqueda.trim().toLocaleLowerCase('es-MX');
  const filtrados = productos.filter(
    (p) => p.plu.includes(termino) || p.nombre.toLocaleLowerCase('es-MX').includes(termino),
  );
  const producto = productos.find((p) => p.uuid === productoId) ?? filtrados[0];
  const id = producto?.uuid;
  const lote = vista.lotes.find((l) => l.uuid === loteId);
  const kardex = vista.movimientos
    .filter((m) => m.productoUuid === id && (!fecha || m.fecha <= fecha))
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.registradoEn.localeCompare(a.registradoEn));
  const existencia = saldoPorProducto(kardex).get(id) ?? 0;
  const lotes = vista.lotes
    .filter((l) => l.productoUuid === id)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  function abrir(uuid, fechaOperacion) {
    cambiarProducto(uuid);
    cambiarFormulario(null);
    cambiarLote(null);
    if (fechaOperacion && fechaOperacion > fecha) cambiarFecha(fechaOperacion);
    mostrarDetalle(true);
  }
  function volver() {
    cambiarFormulario(null);
    mostrarDetalle(false);
  }

  return (
    <BandejaOperacion
      tituloLista="Productos del inventario"
      mostrarDetalle={detalleMovil && Boolean(formulario || producto)}
      claveDetalle={formulario ?? id}
      volver={volver}
      ocupado={ocupado}
      textoVolver="Volver a productos"
      listado={
        <>
          <div className="cms-bandeja-filtros">
            <div className="operacion-encabezado-lista">
              <h2>Inventario</h2>
            </div>
            <div className="operacion-acciones">
              <button
                type="button"
                disabled={ocupado}
                onClick={() => {
                  cambiarFormulario('lote');
                  mostrarDetalle(true);
                }}
              >
                Registrar lote de producción
              </button>
              <button
                type="button"
                className="secundario"
                disabled={ocupado}
                onClick={() => {
                  cambiarFormulario('movimiento');
                  mostrarDetalle(true);
                }}
              >
                Registrar movimiento
              </button>
            </div>
            <Campo
              titulo="Buscar por producto o PLU"
              type="search"
              value={busqueda}
              onChange={(e) => {
                cambiarBusqueda(e.target.value);
                cambiarProducto('');
                cambiarLote(null);
              }}
            />
            <p className="cms-resultado-cantidad">
              {filtrados.length} {filtrados.length === 1 ? 'producto' : 'productos'}
            </p>
          </div>
          {filtrados.length ? (
            <ul className="cms-bandeja-registros">
              {filtrados.map((p) => (
                <li key={p.uuid}>
                  <button
                    type="button"
                    className="cms-bandeja-fila"
                    aria-pressed={!formulario && p.uuid === id}
                    disabled={ocupado}
                    onClick={() => abrir(p.uuid)}
                  >
                    <span className="cms-bandeja-fila-cabecera">
                      <strong>{p.nombre}</strong>
                      {!p.activo && (
                        <span className="cms-estado-etiqueta" data-estado="cancelada">
                          Inactivo
                        </span>
                      )}
                    </span>
                    <span className="cms-bandeja-meta">PLU {p.plu}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="cms-vacio">
              {productos.length
                ? 'Sin resultados para esa búsqueda.'
                : 'Agrega productos al catálogo para empezar.'}
            </p>
          )}
        </>
      }
      detalle={
        formulario ? (
          <>
            <header className="cms-detalle-encabezado">
              <h2>
                {formulario === 'lote' ? 'Registrar lote de producción' : 'Registrar movimiento'}
              </h2>
              <p>
                {formulario === 'lote'
                  ? 'La producción registrada suma al kardex del producto.'
                  : 'Registra una merma, devolución, ajuste o apertura según tu rol.'}
              </p>
            </header>
            {formulario === 'lote' ? (
              <FormularioLote {...{ productos, registrar, ocupado }} alGuardar={abrir} />
            ) : (
              <FormularioMovimiento
                {...{ vista, administra, registrar, ocupado }}
                alGuardar={abrir}
              />
            )}
            <button
              type="button"
              className="secundario operacion-cancelar-formulario"
              onClick={volver}
            >
              Cancelar registro
            </button>
          </>
        ) : producto ? (
          <>
            <header className="cms-detalle-encabezado">
              <p className="cms-detalle-folio">PLU {producto.plu}</p>
              <h2>{producto.nombre}</h2>
              <p>Kardex y lotes registrados</p>
            </header>
            <section className="cms-detalle-cuerpo" aria-labelledby="titulo-kardex">
              <h3 id="titulo-kardex">Kardex por producto</h3>
              <div className="operacion-campos">
                <Campo
                  titulo="Existencia al"
                  type="date"
                  value={fecha}
                  onChange={(e) => cambiarFecha(e.target.value)}
                />
              </div>
              <p className="operacion-existencia" role="status">
                <strong>Existencia {kg(existencia)}</strong>
                {existencia < 0 ? ' · Saldo negativo para revisión' : ''}
              </p>
              <ul className="operacion-lista">
                {kardex.map((m) => (
                  <li key={m.uuid}>
                    <strong>
                      {m.fecha} · {m.tipo} · {kg(m.direccion * m.gramos)}
                    </strong>
                    {m.motivo && <span>{m.motivo}</span>}
                    {m.reversaDe && <small>Revierte {m.reversaDe}</small>}
                  </li>
                ))}
              </ul>
              {!kardex.length && <p>Sin movimientos para la selección.</p>}
            </section>
            <section
              className="cms-detalle-cuerpo operacion-seccion"
              aria-labelledby="titulo-lotes"
            >
              <h3 id="titulo-lotes">Lotes registrados</h3>
              <ul className="operacion-lista">
                {lotes.map((l) => (
                  <li key={l.uuid}>
                    <strong>
                      {l.fecha} · {kg(l.gramos)}
                    </strong>
                    <span>
                      {l.area} · {l.piezas} piezas · Caducidad registrada {l.caducidad}
                      {l.caducidad < hoyOperativo() ? ' (vencida)' : ''}
                    </span>
                    <button
                      className="secundario"
                      type="button"
                      disabled={ocupado}
                      onClick={() => cambiarLote(l.uuid)}
                    >
                      Corregir lote del {l.fecha}
                    </button>
                  </li>
                ))}
              </ul>
              {!lotes.length && <p>Sin lotes para la selección.</p>}
              {lote && (
                <section aria-label="Corrección de lote">
                  <h3>Corregir lote del {lote.fecha}</h3>
                  <FormularioLote
                    key={`${lote.uuid}:${lote.version}`}
                    {...{ lote, productos, registrar, ocupado }}
                    alGuardar={() => cambiarLote(null)}
                  />
                  <button className="secundario" type="button" onClick={() => cambiarLote(null)}>
                    Cerrar corrección
                  </button>
                </section>
              )}
            </section>
          </>
        ) : (
          <div className="cms-vacio cms-detalle-vacio">
            <strong>Selecciona un producto</strong>
            <p>Consulta su existencia, los movimientos y los lotes.</p>
          </div>
        )
      }
    />
  );
}
