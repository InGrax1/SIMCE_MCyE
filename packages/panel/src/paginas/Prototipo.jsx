import {
  agregarEtiqueta,
  centavosDesdeDecimal,
  cerrarRemisionLocal,
  crearOperacionCierre,
  crearRemision,
  formatearDinero,
  formatearKilogramos,
} from '@simce/dominio';
import { useMemo, useState } from 'react';
import { baseDatosLocal } from '../local/baseDatos.js';
import { RepositorioLocal } from '../local/repositorioLocal.js';
import { enviarOperacionHttp, sincronizarPendientes } from '../servicios/sincronizacion.js';

const crearBorrador = () => crearRemision({ centroId: 'CENTRO-DEMO' });

export function Prototipo() {
  const repositorio = useMemo(() => new RepositorioLocal(baseDatosLocal), []);
  const [remision, setRemision] = useState(crearBorrador);
  const [codigo, setCodigo] = useState('2010101086955');
  const [precio, setPrecio] = useState('185.00');
  const [precioVerificado, setPrecioVerificado] = useState(true);
  const [mensaje, setMensaje] = useState('Prototipo listo para capturar una etiqueta sintética.');
  const [ocupado, setOcupado] = useState(false);

  function capturarEtiqueta(evento) {
    evento.preventDefault();
    try {
      if (!precioVerificado) throw new Error('Verifica el precio por kilogramo antes de capturar.');
      const actualizada = agregarEtiqueta(remision, {
        codigo,
        precioKgCentavos: centavosDesdeDecimal(precio),
        productoId: 'PRODUCTO-DEMO',
      });
      setRemision(actualizada);
      setCodigo('');
      setMensaje('Etiqueta validada y añadida a la remisión local.');
    } catch (error) {
      setMensaje(error.message);
    }
  }

  async function cerrar() {
    setOcupado(true);
    try {
      const cerrada = cerrarRemisionLocal(remision);
      const operacion = crearOperacionCierre(cerrada);
      await repositorio.guardarCierre(cerrada, operacion);
      setRemision(cerrada);
      setMensaje('Cierre guardado en IndexedDB y operación colocada en la cola.');
    } catch (error) {
      setMensaje(error.message);
    } finally {
      setOcupado(false);
    }
  }

  async function descargarPdf() {
    const { generarPdfProvisional, nombrePdfProvisional } =
      await import('../pdf/remisionProvisional.js');
    const bytes = generarPdfProvisional(remision);
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombrePdfProvisional(remision);
    enlace.click();
    URL.revokeObjectURL(url);
  }

  async function sincronizar() {
    setOcupado(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL ?? '/api/v1';
      const resumen = await sincronizarPendientes({
        repositorio,
        enviarOperacion: (operacion) => enviarOperacionHttp(operacion, apiUrl),
      });
      const actualizada = await repositorio.obtenerRemision(remision.remisionUuid);
      if (actualizada) setRemision(actualizada);
      setMensaje(
        `Sincronización: ${resumen.aplicadas} aplicada(s), ${resumen.fallidas} pendiente(s).`,
      );
    } finally {
      setOcupado(false);
    }
  }

  function reiniciar() {
    setRemision(crearBorrador());
    setMensaje('Nueva remisión local preparada.');
  }

  const cerrada = remision.estado !== 'BORRADOR';
  const codigoDuplicado = remision.partidas.some((partida) => partida.codigo === codigo.trim());

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 py-10">
      <header className="rounded-3xl bg-cyan-950 px-7 py-8 text-white shadow-xl shadow-cyan-950/10">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-200">
          SIMCE · Fase 0
        </p>
        <h1 className="mt-3 text-3xl font-bold">Captura local de remisión</h1>
        <p className="mt-3 max-w-2xl text-cyan-100">
          Valida una etiqueta, conserva el cierre sin conexión y reintenta la misma operación sin
          duplicarla.
        </p>
      </header>

      <section className="mt-7 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <form
          onSubmit={capturarEtiqueta}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-slate-900">Etiqueta por importe</h2>
          <label className="mt-5 block text-sm font-medium text-slate-700">
            Código EAN-13
            <input
              value={codigo}
              onChange={(evento) => setCodigo(evento.target.value)}
              disabled={cerrada}
              inputMode="numeric"
              aria-invalid={codigoDuplicado}
              aria-describedby={codigoDuplicado ? 'aviso-etiqueta-duplicada' : undefined}
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-mono text-lg focus:border-cyan-700 focus:outline-none"
            />
          </label>
          {codigoDuplicado && (
            <p
              id="aviso-etiqueta-duplicada"
              role="alert"
              className="mt-2 text-sm font-medium text-red-700"
            >
              Esta etiqueta ya está incluida en la remisión y no se sumará nuevamente.
            </p>
          )}
          <label className="mt-4 block text-sm font-medium text-slate-700">
            Precio verificado por kg
            <input
              value={precio}
              onChange={(evento) => setPrecio(evento.target.value)}
              disabled={cerrada}
              inputMode="decimal"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-cyan-700 focus:outline-none"
            />
          </label>
          <label className="mt-4 flex items-center gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={precioVerificado}
              onChange={(evento) => setPrecioVerificado(evento.target.checked)}
              disabled={cerrada}
              className="size-4 accent-cyan-800"
            />
            Confirmo que el precio corresponde al catálogo verificado.
          </label>
          <button
            type="submit"
            disabled={cerrada || ocupado || codigoDuplicado}
            className="mt-6 w-full rounded-xl bg-cyan-800 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Validar y añadir
          </button>
        </form>

        <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-900">Resumen local</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
              {remision.estado}
            </span>
          </div>
          <dl className="mt-6 space-y-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Partidas</dt>
              <dd>{remision.partidas.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Peso</dt>
              <dd>{formatearKilogramos(remision.totalGramos)} kg</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Importe</dt>
              <dd>${formatearDinero(remision.totalCentavos)}</dd>
            </div>
            {remision.folioProvisional && (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Folio local</dt>
                <dd className="font-mono">{remision.folioProvisional}</dd>
              </div>
            )}
            {remision.folioFinal && (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Folio final</dt>
                <dd className="font-mono font-bold text-emerald-700">{remision.folioFinal}</dd>
              </div>
            )}
          </dl>
          <div className="mt-6 grid gap-3">
            {!cerrada && (
              <button
                type="button"
                onClick={cerrar}
                disabled={ocupado}
                className="rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-40"
              >
                Cerrar y guardar localmente
              </button>
            )}
            {cerrada && !remision.folioFinal && (
              <button
                type="button"
                onClick={sincronizar}
                disabled={ocupado}
                className="rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white disabled:opacity-40"
              >
                Sincronizar o reintentar
              </button>
            )}
            {cerrada && (
              <button
                type="button"
                onClick={descargarPdf}
                className="rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-800"
              >
                Descargar PDF provisional
              </button>
            )}
            {remision.folioFinal && (
              <button
                type="button"
                onClick={reiniciar}
                className="rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-800"
              >
                Iniciar otra remisión
              </button>
            )}
          </div>
        </aside>
      </section>

      <p role="status" className="mt-6 rounded-xl bg-cyan-50 px-5 py-4 text-sm text-cyan-950">
        {mensaje}
      </p>
    </main>
  );
}
