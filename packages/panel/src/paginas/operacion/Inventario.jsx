import { useState } from 'react';
import {
  formatearKilogramos,
  gramosDesdeDecimal,
  hoyOperativo,
  saldoPorProducto,
} from '@simce/dominio';
import { Campo, FormularioOperacion, kg, Motivo, opciones, Selector } from './controles.jsx';

function FormularioLote({ lote, productos, registrar, ocupado, cerrar }) {
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
        if (guardado && lote) cerrar();
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

function FormularioMovimiento({ vista, administra, registrar, ocupado }) {
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
      accion={(datos) =>
        registrar(tipo, () => ({
          ...datos,
          gramos: gramosDesdeDecimal(datos.peso),
          ...(ajuste ? { direccion: Number(datos.direccion) } : {}),
        }))
      }
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
  const [producto, cambiarProducto] = useState('');
  const [fecha, cambiarFecha] = useState(hoyOperativo);
  const [loteId, cambiarLote] = useState(null);
  const { productos } = vista.catalogo;
  const id = producto || productos[0]?.uuid;
  const lote = vista.lotes.find((l) => l.uuid === loteId);
  const kardex = vista.movimientos
    .filter((m) => m.productoUuid === id && (!fecha || m.fecha <= fecha))
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.registradoEn.localeCompare(a.registradoEn));
  const existencia = saldoPorProducto(kardex).get(id) ?? 0;
  const nombre = (uuid) => productos.find((p) => p.uuid === uuid)?.nombre ?? uuid;
  const lotes = vista.lotes
    .filter((l) => l.productoUuid === id)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  return (
    <section className="cms-bandeja-detalle" aria-labelledby="titulo-inventario">
      <h2 id="titulo-inventario">Producción y existencias</h2>
      <details className="cms-medios">
        <summary>Registrar lote de producción</summary>
        <FormularioLote {...{ productos, registrar, ocupado }} />
      </details>
      <details className="cms-medios">
        <summary>Registrar merma, devolución o ajuste</summary>
        <FormularioMovimiento {...{ vista, administra, registrar, ocupado }} />
      </details>
      <div className="cms-form-gestion">
        <h3>Kardex por producto</h3>
        <div className="operacion-campos">
          <Selector
            titulo="Producto del kardex"
            valores={opciones(productos)}
            value={id ?? ''}
            onChange={(e) => cambiarProducto(e.target.value)}
            vacio={productos.length ? null : 'Sin productos'}
          />
          <Campo
            titulo="Existencia al"
            type="date"
            value={fecha}
            onChange={(e) => cambiarFecha(e.target.value)}
          />
        </div>
        {id && (
          <p role="status">
            <strong>Existencia {kg(existencia)}</strong>
            {existencia < 0 ? ' · Saldo negativo para revisión' : ''}
          </p>
        )}
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
        <h3>Lotes registrados</h3>
        <ul className="operacion-lista">
          {lotes.map((l) => (
            <li key={l.uuid}>
              <strong>
                {nombre(l.productoUuid)} · {l.fecha} · {kg(l.gramos)}
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
              cerrar={() => cambiarLote(null)}
            />
            <button className="secundario" type="button" onClick={() => cambiarLote(null)}>
              Cerrar corrección
            </button>
          </section>
        )}
      </div>
    </section>
  );
}
