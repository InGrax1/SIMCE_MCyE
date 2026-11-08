import { jsPDF } from 'jspdf';
import {
  fechaOperativa,
  formatearDinero,
  formatearKilogramos,
  hoyOperativo,
  saldoPorProducto,
  totalesRenglones,
} from '@simce/dominio';
import { ErrorApi } from '../errores.js';
import { csvTabular } from '../formatos/csv.js';

const tipos = {
  produccion: { titulo: 'Producción', grupos: ['producto', 'linea', 'especie', 'area'] },
  salidas: { titulo: 'Salidas', grupos: ['destino', 'producto', 'linea'] },
  existencias: { titulo: 'Existencias a la fecha', grupos: [] },
  canceladas: { titulo: 'Remisiones canceladas', grupos: [] },
  mermas: { titulo: 'Mermas por motivo', grupos: [] },
};

const nombres = (lista) => new Map(lista.map((fila) => [fila.uuid, fila.nombre]));
const kg = (gramos) => `${gramos < 0 ? '-' : ''}${formatearKilogramos(Math.abs(gramos))}`;
const ordenar = (filas) => filas.sort((a, b) => a[0].localeCompare(b[0], 'es-MX'));

function totales(grupos) {
  return [...grupos.values()].reduce(
    (suma, fila) => {
      for (const campo of Object.keys(suma)) suma[campo] += fila[campo];
      return suma;
    },
    { gramos: 0, extra: 0, escaneos: 0, manuales: 0 },
  );
}

function acumular(mapa, llave, nombre, gramos, extra, escaneos = 0, manuales = 0) {
  const actual = mapa.get(llave) ?? { nombre, gramos: 0, extra: 0, escaneos: 0, manuales: 0 };
  actual.gramos += gramos;
  actual.extra += extra;
  actual.escaneos += escaneos;
  actual.manuales += manuales;
  mapa.set(llave, actual);
}

function produccion(estado, { incluye, agrupar }) {
  const productos = new Map(estado.catalogo.productos.map((p) => [p.uuid, p]));
  const lineas = nombres(estado.catalogo.lineas);
  const especies = nombres(estado.catalogo.especies);
  const grupos = new Map();
  for (const lote of estado.lotes) {
    if (!incluye(lote.fecha)) continue;
    const producto = productos.get(lote.productoUuid);
    const [id, etiqueta] = {
      producto: [lote.productoUuid, producto?.nombre],
      linea: [producto?.linea_uuid, lineas.get(producto?.linea_uuid)],
      especie: [producto?.especie_uuid, especies.get(producto?.especie_uuid)],
      area: [lote.area, lote.area],
    }[agrupar];
    acumular(grupos, id, etiqueta ?? 'Sin clasificación', lote.gramos, lote.piezas);
  }
  const fila = (r) => [r.nombre, kg(r.gramos), r.extra];
  return {
    columnas: ['Grupo', 'Producción (kg)', 'Piezas'],
    filas: ordenar([...grupos.values()].map(fila)),
    totales: fila({ ...totales(grupos), nombre: 'Total' }),
  };
}

function salidas(estado, { incluye, agrupar, hasta }) {
  const lineas = nombres(estado.catalogo.lineas);
  const grupos = new Map();
  for (const remision of estado.remisiones) {
    if (
      !remision.cerradaEn ||
      !incluye(remision.fecha) ||
      (remision.cancelacion && remision.cancelacion.fecha <= hasta)
    )
      continue;
    for (const fila of remision.renglones) {
      const [id, etiqueta] = {
        destino: [remision.destinoUuid, remision.destinoNombre],
        producto: [fila.productoUuid, fila.productoNombre],
        linea: [fila.lineaUuid, lineas.get(fila.lineaUuid)],
      }[agrupar];
      acumular(
        grupos,
        id,
        etiqueta ?? 'Sin clasificación',
        fila.gramos,
        fila.centavos,
        Number(fila.origen === 'ESCANEO'),
        Number(fila.origen === 'MANUAL'),
      );
    }
  }
  const fila = (r) => [r.nombre, kg(r.gramos), formatearDinero(r.extra), r.escaneos, r.manuales];
  return {
    columnas: [
      'Grupo',
      'Salida (kg)',
      'Valor (MXN)',
      'Renglones por escaneo',
      'Renglones manuales',
    ],
    filas: ordenar([...grupos.values()].map(fila)),
    totales: fila({ ...totales(grupos), nombre: 'Total' }),
  };
}

function existencias(estado, { hasta }) {
  const saldo = saldoPorProducto(estado.movimientos, hasta);
  return {
    columnas: ['Producto', 'PLU', 'Estado', 'Existencia (kg)'],
    filas: ordenar(
      estado.catalogo.productos.map((p) => [
        p.nombre,
        p.plu,
        p.activo ? 'Activo' : 'Inactivo',
        kg(saldo.get(p.uuid) ?? 0),
      ]),
    ),
  };
}

function canceladas(estado, { incluye }) {
  const filas = estado.remisiones
    .filter((r) => r.estado === 'CANCELADA' && r.cerradaEn && incluye(r.cancelacion.fecha))
    .sort((a, b) => a.cancelacion.fecha.localeCompare(b.cancelacion.fecha))
    .map((r) => {
      const totales = totalesRenglones(r.renglones);
      return [
        r.cancelacion.fecha,
        r.folioFinal,
        r.folioPapel ?? '',
        r.fecha,
        r.destinoNombre,
        kg(totales.gramos),
        formatearDinero(totales.centavos),
        r.cancelacion.motivo,
      ];
    });
  return {
    columnas: [
      'Cancelación',
      'Folio',
      'Hoja en papel',
      'Envío',
      'Destino',
      'Peso (kg)',
      'Valor (MXN)',
      'Motivo',
    ],
    filas,
  };
}

function mermas(estado, { incluye }) {
  const grupos = new Map();
  for (const m of estado.movimientos) {
    if (m.tipo === 'MERMA' && incluye(m.fecha)) acumular(grupos, m.motivo, m.motivo, m.gramos, 1);
  }
  return {
    columnas: ['Motivo', 'Merma (kg)', 'Movimientos'],
    filas: ordenar([...grupos.values()].map((r) => [r.nombre, kg(r.gramos), r.extra])),
  };
}

const generar = { produccion, salidas, existencias, canceladas, mermas };

export function construirReporte(tipo, filtros, estado, reloj = new Date()) {
  if (!Object.hasOwn(tipos, tipo))
    throw new ErrorApi(404, 'REPORTE_DESCONOCIDO', 'Ese reporte no está disponible.');
  const { titulo, grupos } = tipos[tipo];
  const hasta = fechaOperativa(filtros.hasta ?? hoyOperativo(reloj));
  const desde =
    tipo === 'existencias' ? null : fechaOperativa(filtros.desde ?? `${hasta.slice(0, 7)}-01`);
  const agrupar = filtros.agrupar ?? grupos[0] ?? null;
  if (desde && desde > hasta)
    throw new ErrorApi(
      422,
      'RANGO_INVALIDO',
      'La fecha final debe ser igual o posterior a la inicial.',
    );
  if (agrupar !== null && !grupos.includes(agrupar))
    throw new ErrorApi(
      422,
      'GRUPO_INVALIDO',
      'La agrupación no está disponible para este reporte.',
    );
  const incluye = (fecha) => (!desde || fecha >= desde) && fecha <= hasta;
  return {
    tipo,
    titulo,
    desde,
    hasta,
    agrupar,
    consultadoEn: reloj.toISOString(),
    ...generar[tipo](estado, { desde, hasta, agrupar, incluye }),
  };
}

export function reporteCsv(reporte) {
  return csvTabular([
    reporte.columnas,
    ...reporte.filas,
    ...(reporte.totales ? [reporte.totales] : []),
  ]);
}

export function reportePdf(reporte) {
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
    compress: true,
    putOnlyUsedFonts: true,
  });
  const margen = 32;
  const ancho = pdf.internal.pageSize.getWidth() - margen * 2;
  const alto = pdf.internal.pageSize.getHeight();
  const anchoColumna = ancho / reporte.columnas.length;
  let y;
  const celdas = (valores) =>
    valores.map((v) => pdf.splitTextToSize(String(v ?? ''), anchoColumna - 12));
  function renglon(celdas, altura) {
    celdas.forEach((lineas, i) => pdf.text(lineas, margen + 6 + i * anchoColumna, y + 10));
    y += altura;
    pdf.setDrawColor(210).line(margen, y, margen + ancho, y);
    y += 4;
  }
  function encabezado() {
    pdf
      .setFont('helvetica', 'bold')
      .setFontSize(10)
      .text('UNAM · FES Cuautitlán · Centro de Enseñanza Agropecuaria', margen, 30);
    pdf.setFontSize(16).text(reporte.titulo, margen, 50);
    const rango = reporte.desde ? `${reporte.desde} al ${reporte.hasta}` : `Al ${reporte.hasta}`;
    pdf
      .setFont('helvetica', 'normal')
      .setFontSize(9)
      .text(`${rango} · Consulta ${reporte.consultadoEn.slice(0, 19)} UTC`, margen, 66);
    y = 79;
    pdf.setFont('helvetica', 'bold').setFontSize(8);
    const titulos = celdas(reporte.columnas);
    renglon(titulos, Math.max(...titulos.map((c) => c.length)) * 10 + 7);
    pdf.setFont('helvetica', 'normal');
  }
  encabezado();
  for (const valores of [...reporte.filas, ...(reporte.totales ? [reporte.totales] : [])]) {
    const columnas = celdas(valores);
    const altura = Math.max(...columnas.map((c) => c.length)) * 10 + 7;
    if (y + altura > alto - 42) {
      pdf.addPage();
      encabezado();
    }
    renglon(columnas, altura);
  }
  if (!reporte.filas.length) pdf.text('Sin registros en la selección.', margen, y + 16);
  const paginas = pdf.getNumberOfPages();
  for (let pagina = 1; pagina <= paginas; pagina++) {
    pdf
      .setPage(pagina)
      .setFontSize(8)
      .text(`SIMCE MCyE · Hoja ${pagina} de ${paginas}`, margen + ancho, alto - 24, {
        align: 'right',
      });
  }
  return Buffer.from(pdf.output('arraybuffer'));
}
