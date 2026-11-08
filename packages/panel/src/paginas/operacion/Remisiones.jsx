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
import { BandejaOperacion } from './BandejaOperacion.jsx';
import { Campo, FormularioOperacion, kg, Motivo, mxn, opciones, Selector } from './controles.jsx';

const uuid = () => crypto.randomUUID();
const estados = [
  ['BORRADOR', 'Borrador'],
  ['CERRADA', 'Cerrada'],
  ['CANCELADA', 'Cancelada'],
];
const folio = (r) => r.folioFinal ?? r.folioProvisional ?? 'Borrador';

function EstadoRemision({ estado }) {
  return (
    <span
      className="cms-estado-etiqueta"
      data-estado={{ CERRADA: 'confirmada', CANCELADA: 'cancelada' }[estado]}
    >
      {estados.find(([e]) => e === estado)?.[1]}
    </span>
  );
}

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
    <article aria-labelledby="titulo-detalle-remision">
      <header className="cms-detalle-encabezado">
        <div className="cms-detalle-folio">
          <span>{folio(remision)}</span>
          <EstadoRemision estado={remision.estado} />
        </div>
        <h2 id="titulo-detalle-remision">{remision.destinoNombre}</h2>
        <p>
          {remision.fecha}
          {remision.folioPapel ? ` · Hoja en papel ${remision.folioPapel}` : ''}
        </p>
      </header>
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
  const [seleccion, seleccionar] = useState(null);
  const [nueva, cambiarNueva] = useState(false);
  const [detalleMovil, mostrarDetalle] = useState(false);
  const [busqueda, cambiarBusqueda] = useState('');
  const [filtros, cambiarFiltros] = useState({
    desde: '',
    hasta: '',
    destino: '',
    producto: '',
    estado: '',
  });
  const { destinos, productos } = vista.catalogo;
  const termino = busqueda.trim().toLocaleLowerCase('es-MX');
  const actualizar = (campo) => ({
    value: filtros[campo],
    onChange: (e) => {
      cambiarFiltros({ ...filtros, [campo]: e.target.value });
      seleccionar(null);
    },
  });
  const filtradas = vista.remisiones
    .filter(
      (r) =>
        (!filtros.desde || r.fecha >= filtros.desde) &&
        (!filtros.hasta || r.fecha <= filtros.hasta) &&
        (!filtros.destino || r.destinoUuid === filtros.destino) &&
        (!filtros.estado || r.estado === filtros.estado) &&
        [r.folioFinal, r.folioProvisional, r.folioPapel, r.destinoNombre].some((valor) =>
          valor?.toLocaleLowerCase('es-MX').includes(termino),
        ) &&
        (!filtros.producto || r.renglones.some((fila) => fila.productoUuid === filtros.producto)),
    )
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creadaEn.localeCompare(a.creadaEn));
  const remision = vista.remisiones.find((r) => r.uuid === seleccion) ?? filtradas[0];
  function abrir(uuid) {
    seleccionar(uuid);
    cambiarNueva(false);
    mostrarDetalle(true);
  }
  return (
    <BandejaOperacion
      tituloLista="Histórico de remisiones"
      mostrarDetalle={detalleMovil && (nueva || Boolean(remision))}
      claveDetalle={nueva ? 'nueva' : remision?.uuid}
      volver={() => {
        cambiarNueva(false);
        mostrarDetalle(false);
      }}
      ocupado={ocupado}
      textoVolver="Volver a remisiones"
      listado={
        <>
          <div className="cms-bandeja-filtros">
            <div className="operacion-encabezado-lista">
              <h2>Remisiones</h2>
              <button
                type="button"
                disabled={ocupado}
                onClick={() => {
                  cambiarNueva(true);
                  mostrarDetalle(true);
                }}
              >
                Nueva remisión
              </button>
            </div>
            <Campo
              titulo="Buscar por folio o destino"
              type="search"
              value={busqueda}
              onChange={(e) => {
                cambiarBusqueda(e.target.value);
                seleccionar(null);
              }}
            />
            <Selector titulo="Estado" valores={estados} vacio="Todos" {...actualizar('estado')} />
            <details className="cms-medios operacion-filtros">
              <summary>Más filtros</summary>
              <div className="cms-filtros-fila">
                <Campo titulo="Envíos desde" type="date" {...actualizar('desde')} />
                <Campo titulo="Envíos hasta" type="date" {...actualizar('hasta')} />
              </div>
              <Selector
                titulo="Destino"
                valores={opciones(destinos)}
                vacio="Todos"
                {...actualizar('destino')}
              />
              <Selector
                titulo="Producto"
                valores={opciones(productos)}
                vacio="Todos"
                {...actualizar('producto')}
              />
            </details>
            <p className="cms-resultado-cantidad">
              {filtradas.length} {filtradas.length === 1 ? 'remisión' : 'remisiones'}
            </p>
          </div>
          {filtradas.length ? (
            <ul className="cms-bandeja-registros">
              {filtradas.map((r) => (
                <li key={r.uuid}>
                  <button
                    type="button"
                    className="cms-bandeja-fila"
                    aria-pressed={!nueva && remision?.uuid === r.uuid}
                    disabled={ocupado}
                    onClick={() => abrir(r.uuid)}
                  >
                    <span className="cms-bandeja-fila-cabecera">
                      <strong>{r.destinoNombre}</strong>
                      <EstadoRemision estado={r.estado} />
                    </span>
                    <span className="cms-bandeja-asunto">{folio(r)}</span>
                    <span className="cms-bandeja-meta">
                      {r.fecha} · {r.renglones.length}{' '}
                      {r.renglones.length === 1 ? 'renglón' : 'renglones'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="cms-vacio">
              <strong>
                {vista.remisiones.length ? 'Sin resultados' : 'Todavía no hay remisiones'}
              </strong>
              <p>
                {vista.remisiones.length
                  ? 'Cambia la búsqueda o los filtros.'
                  : 'Crea una remisión para registrar un envío.'}
              </p>
            </div>
          )}
        </>
      }
      detalle={
        nueva ? (
          <>
            <header className="cms-detalle-encabezado">
              <h2>Nueva remisión</h2>
              <p>Selecciona el destino y la fecha para empezar el borrador.</p>
            </header>
            <Cabecera {...{ destinos, registrar, ocupado, abrir }} />
            <button
              type="button"
              className="secundario operacion-cancelar-formulario"
              onClick={() => {
                cambiarNueva(false);
                mostrarDetalle(false);
              }}
            >
              Cancelar alta
            </button>
          </>
        ) : remision ? (
          <Detalle
            key={remision.uuid}
            {...{ remision, vista, registrar, ocupado, administra, usuario, descargar, abrir }}
          />
        ) : (
          <div className="cms-vacio cms-detalle-vacio">
            <strong>Selecciona una remisión</strong>
            <p>El detalle, la captura y los documentos se muestran en este espacio.</p>
          </div>
        )
      }
    />
  );
}
