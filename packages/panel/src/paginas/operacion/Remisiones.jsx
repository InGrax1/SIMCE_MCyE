import { useState } from 'react';
import {
  agruparPartidas,
  centavosDesdeDecimal,
  faltantesRemision,
  gramosDesdeDecimal,
  hoyOperativo,
  identificarEtiqueta,
  totalesRenglones,
} from '@simce/dominio';
import { Camara } from './Camara.jsx';
import { Campo, FormularioOperacion, kg, Motivo, mxn, opciones, Selector } from './controles.jsx';

const uuid = () => crypto.randomUUID();
const estados = [
  ['BORRADOR', 'Borrador'],
  ['CERRADA', 'Cerrada'],
  ['CANCELADA', 'Cancelada'],
];
const folio = (r) => r.folioFinal ?? r.folioProvisional ?? 'Borrador';

function Cabecera({ destinos, remision, registrar, ocupado, abrir }) {
  return (
    <FormularioOperacion
      ocupado={ocupado}
      boton={remision ? 'Guardar encabezado' : 'Crear borrador'}
      limpiar={!remision}
      accion={async (datos) => {
        const resultado = await registrar(
          remision ? 'EDITAR_REMISION' : 'CREAR_REMISION',
          () => ({
            ...datos,
            versionDestino: destinos.find((d) => d.uuid === datos.destinoUuid)?.version,
          }),
          remision,
        );
        if (resultado) abrir(resultado.agregadoId);
        return resultado;
      }}
    >
      <div className="operacion-campos">
        <Campo
          titulo="Fecha de envío"
          nombre="fecha"
          type="date"
          defaultValue={remision?.fecha ?? hoyOperativo()}
          required
        />
        <Selector
          titulo="Destino del envío"
          nombre="destinoUuid"
          defaultValue={remision?.destinoUuid ?? ''}
          valores={opciones(destinos, { soloActivos: true })}
          required
        />
        <Campo
          titulo="Folio de la hoja en papel (opcional)"
          nombre="folioPapel"
          defaultValue={remision?.folioPapel ?? ''}
          maxLength={40}
        />
      </div>
    </FormularioOperacion>
  );
}

function Captura({ remision, vista, registrar, ocupado }) {
  const [origen, cambiarOrigen] = useState('ESCANEO');
  const [codigo, cambiarCodigo] = useState('');
  const [producto, cambiarProducto] = useState('');
  const [precio, cambiarPrecio] = useState('');
  const [lectura, cambiarLectura] = useState('');
  const [errorLectura, cambiarErrorLectura] = useState('');
  const [camara, cambiarCamara] = useState(false);
  const manual = origen === 'MANUAL';
  const { catalogo, perfil } = vista;
  const vigente = catalogo.productos.find((p) => p.uuid === producto);
  const precios = catalogo.precios
    .filter((p) => p.producto_uuid === producto)
    .toSorted((a, b) => b.vigente_desde.localeCompare(a.vigente_desde));
  const repetida = Boolean(
    codigo.trim() && remision.renglones.some((r) => r.codigo === codigo.trim()),
  );

  function identificar(valor) {
    cambiarCodigo(valor);
    cambiarPrecio('');
    cambiarErrorLectura('');
    cambiarLectura('');
    try {
      const resultado = identificarEtiqueta(valor, catalogo, perfil);
      cambiarProducto(resultado.producto.uuid);
      cambiarLectura(
        `${resultado.producto.nombre} · ${mxn(resultado.importeCentavos)} en la etiqueta. Verifica el precio aplicado.`,
      );
    } catch (error) {
      cambiarProducto('');
      cambiarErrorLectura(error.message);
    }
  }

  async function capturar(datos) {
    const guardado = await registrar(
      'AGREGAR_RENGLON',
      () => ({
        origen,
        codigo: codigo.trim(),
        productoUuid: producto,
        precioUuid: precio,
        ...(vigente ? { versionProducto: vigente.version } : {}),
        versionPerfil: perfil.version,
        fuentePrecio: datos.fuentePrecio ?? '',
        motivoRevision: datos.motivoRevision ?? '',
        confirmarRepeticion: datos.repeticion === 'on',
        ...(manual && datos.peso ? { gramos: gramosDesdeDecimal(datos.peso) } : {}),
        ...(manual && datos.importe ? { centavos: centavosDesdeDecimal(datos.importe) } : {}),
        renglonUuid: uuid(),
        partidaUuid: uuid(),
      }),
      remision,
    );
    if (guardado) {
      cambiarCodigo('');
      cambiarLectura('');
      cambiarErrorLectura('');
      cambiarProducto('');
      cambiarPrecio('');
    }
    return guardado;
  }

  return (
    <div className="operacion-captura">
      <h3>Agregar renglón</h3>
      <div className="cms-categorias" aria-label="Modo de captura">
        <button
          type="button"
          aria-pressed={!manual}
          onClick={() => {
            cambiarOrigen('ESCANEO');
            if (codigo.trim()) identificar(codigo);
          }}
        >
          Escáner
        </button>
        <button
          type="button"
          aria-pressed={manual}
          onClick={() => {
            cambiarOrigen('MANUAL');
            cambiarErrorLectura('');
            cambiarCamara(false);
          }}
        >
          Captura manual
        </button>
      </div>
      <FormularioOperacion ocupado={ocupado} boton="Agregar renglón" accion={capturar} limpiar>
        <Campo
          titulo={manual ? 'Código leído (opcional)' : 'Código EAN-13'}
          nombre="codigo"
          inputMode="numeric"
          value={codigo}
          required={!manual}
          maxLength={80}
          onChange={(e) => {
            cambiarCodigo(e.target.value);
            cambiarLectura('');
            cambiarErrorLectura('');
            if (!manual) {
              cambiarPrecio('');
              cambiarProducto('');
            }
          }}
          onKeyDown={(e) => {
            if (
              !manual &&
              (e.key === 'Enter' || (e.key === 'Tab' && /^\d{13}$/.test(codigo.trim())))
            ) {
              if (e.key === 'Enter') e.preventDefault();
              identificar(codigo);
            }
          }}
        />
        {!manual && (
          <div className="operacion-acciones">
            <button
              type="button"
              className="secundario"
              disabled={ocupado || !codigo.trim()}
              onClick={() => identificar(codigo)}
            >
              Identificar etiqueta
            </button>
            <button
              type="button"
              className="secundario"
              disabled={ocupado || camara}
              onClick={() => cambiarCamara(true)}
            >
              Leer con cámara
            </button>
          </div>
        )}
        {camara && <Camara alLeer={identificar} cerrar={() => cambiarCamara(false)} />}
        {errorLectura && <p role="alert">{errorLectura}</p>}
        {lectura && <p role="status">{lectura}</p>}
        {manual && (
          <Selector
            titulo="Producto de la captura"
            valores={opciones(catalogo.productos, { soloActivos: true })}
            required
            value={producto}
            onChange={(e) => {
              cambiarProducto(e.target.value);
              cambiarPrecio('');
            }}
          />
        )}
        {producto && (
          <Selector
            titulo="Precio de etiquetado por kg"
            value={precio}
            required={!manual}
            onChange={(e) => cambiarPrecio(e.target.value)}
            valores={precios.map((p) => [
              p.uuid,
              `${mxn(p.precio_kg_centavos)} · desde ${p.vigente_desde}`,
            ])}
            vacio={manual ? 'Pendiente de verificar' : 'Selecciona el precio verificado'}
          />
        )}
        {precio && (
          <Campo
            titulo="Fuente de verificación del precio"
            nombre="fuentePrecio"
            required
            maxLength={160}
            placeholder="Etiqueta o registro de etiquetado"
          />
        )}
        {manual && (
          <div className="operacion-campos">
            <Campo
              titulo="Peso capturado (kg)"
              nombre="peso"
              inputMode="decimal"
              required={!precio}
            />
            <Campo
              titulo="Importe capturado (MXN)"
              nombre="importe"
              inputMode="decimal"
              required={!precio}
            />
          </div>
        )}
        {manual && !precio && (
          <p>
            Puedes guardar el peso e importe en el borrador. Verifica el precio antes del cierre.
          </p>
        )}
        {repetida && (
          <label className="cms-check">
            <input type="checkbox" name="repeticion" required /> Confirmo que este código
            corresponde a otra pieza.
          </label>
        )}
        {precio && (
          <details className="cms-medios">
            <summary>Justificar una diferencia de peso e importe</summary>
            <Motivo nombre="motivoRevision" requerido={false} />
          </details>
        )}
      </FormularioOperacion>
    </div>
  );
}

function Detalle({ remision, vista, registrar, ocupado, administra, usuario, descargar, abrir }) {
  const total = totalesRenglones(remision.renglones);
  const partidas = agruparPartidas(remision.renglones);
  const borrador = remision.estado === 'BORRADOR';
  const puedeCancelar =
    remision.estado !== 'CANCELADA' &&
    (administra || (borrador && remision.autorUuid === usuario.id));
  const faltantes = borrador
    ? faltantesRemision(remision, vista.movimientos)
    : (remision.faltantes ?? []);
  return (
    <article className="cms-bandeja-detalle" aria-labelledby="titulo-detalle-remision">
      <h3 id="titulo-detalle-remision">
        {folio(remision)} · {remision.destinoNombre}
      </h3>
      <p>
        {remision.fecha} · {estados.find(([e]) => e === remision.estado)?.[1]}
        {remision.folioPapel ? ` · Hoja en papel ${remision.folioPapel}` : ''}
      </p>
      {borrador && (
        <>
          <details className="cms-medios">
            <summary>Editar encabezado</summary>
            <Cabecera
              key={remision.version}
              destinos={vista.catalogo.destinos}
              {...{ remision, registrar, ocupado, abrir }}
            />
          </details>
          <Captura {...{ remision, vista, registrar, ocupado }} />
        </>
      )}
      <h3>Partidas y totales</h3>
      <p role="status">
        <strong>
          Total de remisión {kg(total.gramos)} · {mxn(total.centavos)}
        </strong>
      </p>
      {!partidas.length && <p>Agrega el primer renglón para calcular las cantidades.</p>}
      {partidas.map((p) => (
        <details key={`${p.productoUuid}:${p.precioUuid}`} className="cms-medios" open>
          <summary>
            {p.productoNombre} ·{' '}
            {p.precioUuid ? `${mxn(p.precioKgCentavos)}/kg` : 'Precio pendiente'} · {kg(p.gramos)} ·{' '}
            {mxn(p.centavos)}
          </summary>
          <ol className="operacion-lista">
            {p.renglones.map((r, indice) => (
              <li key={r.uuid}>
                <strong>
                  {kg(r.gramos)} · {mxn(r.centavos)}
                </strong>
                <span>
                  {r.origen === 'ESCANEO' ? 'Escaneo' : 'Manual'}
                  {r.codigo ? ` · ${r.codigo}` : ''}
                </span>
                {r.motivoRevision && <small>{r.motivoRevision}</small>}
                {borrador && (
                  <button
                    className="secundario"
                    type="button"
                    disabled={ocupado}
                    onClick={() =>
                      registrar('QUITAR_RENGLON', () => ({ renglonUuid: r.uuid }), remision)
                    }
                  >
                    Quitar renglón {indice + 1} de {p.productoNombre}
                  </button>
                )}
              </li>
            ))}
          </ol>
        </details>
      ))}
      {faltantes.length > 0 && (
        <p className="operacion-aviso">
          Existencia insuficiente al cierre para{' '}
          {faltantes.map((f) => `${f.productoNombre} (${kg(f.gramos)})`).join(', ')}. Quedará
          registrada para revisión.
        </p>
      )}
      {borrador && partidas.length > 0 && (
        <FormularioOperacion
          ocupado={ocupado}
          boton="Cerrar remisión"
          accion={(datos) =>
            registrar(
              'CERRAR_REMISION',
              () => ({ documentoUuid: uuid(), confirmarFecha: datos.revisada === 'on' }),
              remision,
            )
          }
        >
          {remision.revisarFecha && (
            <label className="cms-check">
              <input type="checkbox" name="revisada" required /> Revisé los renglones con la nueva
              fecha.
            </label>
          )}
          <p>El cierre congela los renglones y registra las salidas de inventario.</p>
        </FormularioOperacion>
      )}
      {remision.provisionalUuid && (
        <div className="operacion-acciones">
          <button
            className="secundario"
            type="button"
            disabled={ocupado}
            onClick={() => descargar(remision.provisionalUuid, remision.folioProvisional)}
          >
            Descargar PDF provisional
          </button>
          {remision.definitivoUuid && (
            <button
              className="secundario"
              type="button"
              disabled={ocupado}
              onClick={() => descargar(remision.definitivoUuid, remision.folioFinal)}
            >
              Descargar PDF definitivo
            </button>
          )}
        </div>
      )}
      {puedeCancelar && (
        <details className="cms-medios">
          <summary>{borrador ? 'Descartar borrador' : 'Cancelar remisión'}</summary>
          <FormularioOperacion
            ocupado={ocupado}
            boton={borrador ? 'Descartar borrador' : 'Confirmar cancelación'}
            accion={(datos) =>
              registrar(
                'CANCELAR_REMISION',
                () => ({ motivo: datos.motivo, reversiones: remision.renglones.map(uuid) }),
                remision,
              )
            }
          >
            <Motivo titulo="Motivo de cancelación" />
          </FormularioOperacion>
        </details>
      )}
      {remision.cancelacion && (
        <p>
          Cancelada el {remision.cancelacion.fecha}. {remision.cancelacion.motivo}
        </p>
      )}
    </article>
  );
}

export function Remisiones({
  vista,
  registra: registrar,
  ocupado,
  administra,
  usuario,
  descargar,
}) {
  const [seleccion, abrir] = useState(null);
  const [filtros, cambiarFiltros] = useState({
    desde: '',
    hasta: '',
    destino: '',
    producto: '',
    estado: '',
  });
  const remision = vista.remisiones.find((r) => r.uuid === seleccion);
  const { destinos, productos } = vista.catalogo;
  const actualizar = (campo) => ({
    value: filtros[campo],
    onChange: (e) => cambiarFiltros({ ...filtros, [campo]: e.target.value }),
  });
  const filtradas = vista.remisiones
    .filter(
      (r) =>
        (!filtros.desde || r.fecha >= filtros.desde) &&
        (!filtros.hasta || r.fecha <= filtros.hasta) &&
        (!filtros.destino || r.destinoUuid === filtros.destino) &&
        (!filtros.estado || r.estado === filtros.estado) &&
        (!filtros.producto || r.renglones.some((fila) => fila.productoUuid === filtros.producto)),
    )
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creadaEn.localeCompare(a.creadaEn));
  return (
    <section aria-labelledby="titulo-remisiones">
      <div className="cms-bandeja-detalle">
        <h2 id="titulo-remisiones">Remisiones</h2>
        <details className="cms-medios">
          <summary>Nueva remisión</summary>
          <Cabecera {...{ destinos, registrar, ocupado, abrir }} />
        </details>
      </div>
      {remision && (
        <Detalle
          key={remision.uuid}
          {...{ remision, vista, registrar, ocupado, administra, usuario, descargar, abrir }}
        />
      )}
      <div className="cms-bandeja-detalle">
        <h3>Histórico de remisiones</h3>
        <div className="operacion-campos">
          <Campo titulo="Envíos desde" type="date" {...actualizar('desde')} />
          <Campo titulo="Envíos hasta" type="date" {...actualizar('hasta')} />
          <Selector
            titulo="Filtrar por destino"
            valores={opciones(destinos)}
            vacio="Todos"
            {...actualizar('destino')}
          />
          <Selector
            titulo="Filtrar por producto"
            valores={opciones(productos)}
            vacio="Todos"
            {...actualizar('producto')}
          />
          <Selector
            titulo="Filtrar por estado"
            valores={estados}
            vacio="Todos"
            {...actualizar('estado')}
          />
        </div>
        <ul className="operacion-lista">
          {filtradas.map((r) => (
            <li key={r.uuid}>
              <button
                type="button"
                className="cms-bandeja-fila"
                aria-pressed={seleccion === r.uuid}
                onClick={() => abrir(r.uuid)}
              >
                <strong>
                  {folio(r)} · {r.destinoNombre}
                </strong>
                <span>
                  {r.fecha} · {estados.find(([e]) => e === r.estado)?.[1]} · {r.renglones.length}{' '}
                  renglones
                </span>
              </button>
            </li>
          ))}
        </ul>
        {!filtradas.length && <p>Sin remisiones para esos filtros.</p>}
      </div>
    </section>
  );
}
