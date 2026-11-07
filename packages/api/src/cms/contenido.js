import { randomUUID } from 'node:crypto';
import * as inicial from '../../../portal/src/contenido.js';
import { ErrorApi } from '../errores.js';
import { proyectarTaller } from '../talleres/reglas.js';

export const tipos = [
  'area',
  'practica',
  'actividad',
  'producto',
  'programa',
  'taller',
  'aviso',
  'institucion',
  'galeria',
];
const listas = {
  area: 'areas',
  practica: 'practicas',
  actividad: 'actividades',
  producto: 'productos',
  programa: 'programas',
  galeria: 'galeria',
};
const campos = [
  'nombre',
  'titulo',
  'descripcion',
  'foto',
  'alt',
  'etiqueta',
  'carrera',
  'asignatura',
  'enfoque',
  'codigo',
  'correo',
  'mapa',
  'responsable',
  'ubicacion',
  'objetivo',
  'especies',
  'areas',
  'areaId',
  'actividades',
  'licenciaturas',
  'inicio',
  'fin',
  'estadoTaller',
  'precio',
  'mostrarPrecio',
  'costo',
  'requisitos',
  'fecha',
];
const texto = (valor, max = 4000) => {
  if (
    typeof valor !== 'string' ||
    valor.length > max ||
    /[<>]/u.test(valor) ||
    [...valor].some((letra) => letra.charCodeAt(0) < 9)
  )
    throw new ErrorApi(
      422,
      'CONTENIDO_INVALIDO',
      'Usa texto sin HTML y respeta la longitud máxima.',
    );
  return valor.trim();
};

export function validarContenido(tipo, datos) {
  if (!tipos.includes(tipo) || !datos || typeof datos !== 'object' || Array.isArray(datos))
    throw new ErrorApi(422, 'CONTENIDO_INVALIDO', 'Tipo de contenido no válido.');
  const resultado = {};
  for (const campo of campos) {
    const valor = datos[campo];
    if (valor === undefined) continue;
    if (
      ['areas', 'actividades', 'licenciaturas', 'especies'].includes(campo) &&
      !Array.isArray(valor)
    )
      throw new ErrorApi(
        422,
        'CONTENIDO_INVALIDO',
        'Las listas deben contener elementos de texto.',
      );
    if (['mostrarPrecio'].includes(campo)) {
      if (typeof valor !== 'boolean')
        throw new ErrorApi(422, 'CONTENIDO_INVALIDO', 'Mostrar precio debe ser booleano.');
      resultado[campo] = valor;
    } else if (Array.isArray(valor)) {
      if (
        !['areas', 'actividades', 'licenciaturas', 'especies'].includes(campo) ||
        valor.length > 40
      )
        throw new ErrorApi(422, 'CONTENIDO_INVALIDO', 'Lista no válida.');
      resultado[campo] = valor.map((item) => texto(item, 500)).filter(Boolean);
    } else
      resultado[campo] = texto(
        valor,
        campo === 'descripcion' || campo === 'objetivo' ? 4000 : 1000,
      );
  }
  if (!(resultado.nombre || resultado.titulo))
    throw new ErrorApi(422, 'CONTENIDO_INVALIDO', 'Escribe un título o nombre.');
  if ((resultado.nombre || resultado.titulo).length > 160)
    throw new ErrorApi(422, 'CONTENIDO_INVALIDO', 'El título admite hasta 160 caracteres.');
  if (
    resultado.foto &&
    !/^\/medios\/[a-f0-9-]{36}\.webp$/.test(resultado.foto) &&
    !/^[A-Za-z0-9][A-Za-z0-9_.-]*\.(?:png|jpg|jpeg|webp)$/i.test(resultado.foto)
  )
    throw new ErrorApi(422, 'CONTENIDO_INVALIDO', 'Selecciona una imagen del gestor.');
  if (resultado.foto && !resultado.alt)
    throw new ErrorApi(422, 'ALT_REQUERIDO', 'La imagen necesita un texto alternativo.');
  if (resultado.mapa && !/^https:\/\/www\.google\.com\/maps\//.test(resultado.mapa))
    throw new ErrorApi(
      422,
      'CONTENIDO_INVALIDO',
      'Utiliza una ubicación de Google Maps mediante HTTPS.',
    );
  if (resultado.correo && !/^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(resultado.correo))
    throw new ErrorApi(422, 'CONTENIDO_INVALIDO', 'El correo no es válido.');
  if (resultado.precio && !/^\d{1,6}(\.\d{1,2})?$/.test(resultado.precio))
    throw new ErrorApi(
      422,
      'CONTENIDO_INVALIDO',
      'El precio debe tener como máximo dos decimales.',
    );
  if (tipo === 'actividad' && !Array.isArray(resultado.areas)) resultado.areas = [];
  if (tipo === 'programa' && !Array.isArray(resultado.actividades)) resultado.actividades = [];
  for (const campo of ['inicio', 'fin', 'fecha'])
    if (
      resultado[campo] &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(resultado[campo]) ||
        Number.isNaN(Date.parse(resultado[campo])) ||
        new Date(resultado[campo]).toISOString().slice(0, 10) !== resultado[campo])
    )
      throw new ErrorApi(422, 'CONTENIDO_INVALIDO', 'Usa fechas con formato AAAA-MM-DD.');
  if (
    tipo === 'taller' &&
    !['informativo', 'abierto', 'cerrado', 'concluido'].includes(resultado.estadoTaller)
  )
    throw new ErrorApi(422, 'CONTENIDO_INVALIDO', 'Selecciona el estado del taller.');
  if (resultado.inicio && resultado.fin && resultado.inicio > resultado.fin)
    throw new ErrorApi(
      422,
      'CONTENIDO_INVALIDO',
      'La fecha final no puede ser anterior al inicio.',
    );
  return resultado;
}

export function validarPublicacion(entrada) {
  const datos = entrada.borrador;
  const obligatorios =
    {
      area: ['descripcion', 'foto', 'alt'],
      practica: ['descripcion', 'carrera', 'asignatura', 'foto', 'alt'],
      actividad: ['descripcion', 'areas'],
      producto: ['descripcion', 'foto', 'alt'],
      programa: ['descripcion', 'codigo', 'actividades', 'licenciaturas'],
      taller: ['descripcion', 'estadoTaller'],
      aviso: ['descripcion', 'fecha'],
      institucion: ['responsable', 'correo', 'ubicacion', 'objetivo', 'mapa'],
      galeria: ['foto', 'alt'],
    }[entrada.tipo] ?? [];
  const faltantes = obligatorios.filter((c) =>
    Array.isArray(datos[c]) ? !datos[c].length : !datos[c],
  );
  if (datos.mostrarPrecio && !datos.precio) faltantes.push('precio');
  if (entrada.tipo === 'taller' && datos.estadoTaller === 'abierto')
    for (const c of ['inicio', 'fin']) if (!datos[c]) faltantes.push(c);
  if (faltantes.length)
    throw new ErrorApi(
      422,
      'CONTENIDO_INCOMPLETO',
      `Completa estos campos antes de publicar: ${faltantes.join(', ')}.`,
    );
}

export function crearEstadoInicial() {
  const entradas = [];
  for (const [tipo, lista] of Object.entries(listas)) {
    inicial[lista].forEach((item, orden) => {
      const datos = { ...item };
      delete datos.nodo;
      datos.nombre ??= datos.titulo;
      if (datos.foto) datos.alt ??= `Imagen de referencia: ${datos.nombre}`;
      if (tipo === 'actividad') {
        if (datos.especies) datos.enfoque = datos.especies;
        delete datos.especies;
      }
      if (tipo === 'practica') datos.asignatura ??= 'Por confirmar con la coordinación académica';
      entradas.push({
        id: randomUUID(),
        tipo,
        orden,
        version: 1,
        borrador: datos,
        publicado: structuredClone(datos),
        validacion: 'referencia',
        actualizadoEn: new Date().toISOString(),
        historial: [],
      });
    });
  }
  entradas.push({
    id: randomUUID(),
    tipo: 'institucion',
    orden: 0,
    version: 1,
    borrador: {
      ...inicial.institucion,
      correo: inicial.correo,
      mapa: inicial.mapa,
    },
    historial: [],
    validacion: 'referencia',
  });
  entradas.at(-1).publicado = structuredClone(entradas.at(-1).borrador);
  for (const entrada of entradas.filter((e) => e.tipo === 'actividad')) {
    entrada.borrador.areas = entrada.borrador.areas.map(
      (nombre) =>
        entradas.find((e) => e.tipo === 'area' && e.borrador.nombre === nombre)?.id ?? nombre,
    );
    entrada.publicado = structuredClone(entrada.borrador);
  }
  return {
    versionEsquema: 2,
    usuarios: [],
    recuperaciones: [],
    intereses: [],
    avisoInteres: null,
    avisoTalleres: null,
    avisosTalleres: [],
    inscripciones: [],
    consultasTalleres: [],
    consecutivoConsultaTaller: 0,
    consecutivoInteres: 0,
    consecutivoInscripcion: 0,
    sesiones: [],
    entradas,
    medios: [],
    auditoria: [],
    revisionPortal: 0,
    revisionHtml: -1,
  };
}

// Adapta los datos del avance anterior sin reemplazar ediciones ni cuentas locales.
export function actualizarEstado(estado) {
  estado.recuperaciones ??= [];
  estado.inscripciones ??= [];
  estado.consultasTalleres ??= [];
  estado.avisosTalleres ??= [];
  estado.intereses ??= [];
  estado.consecutivoInteres = estado.intereses.reduce(
    (maximo, s) => Math.max(maximo, Number(/^SS-\d{4}-(\d{8})$/.exec(s.folio ?? '')?.[1] ?? 0)),
    estado.consecutivoInteres ?? 0,
  );
  for (const solicitud of estado.intereses) {
    if (!solicitud.folio) {
      estado.consecutivoInteres++;
      const anio = new Date(solicitud.momento ?? '').getUTCFullYear();
      solicitud.folio = `SS-${Number.isInteger(anio) ? anio : new Date().getUTCFullYear()}-${String(estado.consecutivoInteres).padStart(8, '0')}`;
    }
    solicitud.creadoEn ??= solicitud.momento ?? null;
    solicitud.programaNombre ??=
      estado.entradas.find((e) => e.id === solicitud.programaId)?.publicado?.nombre ??
      'Programa de servicio social';
    solicitud.estado ??= 'pendiente';
    solicitud.version ??= 1;
    solicitud.respuestas ??= [];
    solicitud.seguimientos ??= [];
    solicitud.historial ??= [];
  }
  if ((estado.versionEsquema ?? 1) < 2) {
    for (const entrada of estado.entradas.filter(
      (e) => e.tipo === 'galeria' && e.validacion === 'referencia',
    )) {
      for (const datos of [entrada.borrador, entrada.publicado].filter(Boolean)) {
        const referencia = inicial.galeria.find((f) => f.foto === datos.foto);
        if (datos.areaId === undefined && referencia?.areaId)
          datos.areaId =
            estado.entradas.find(
              (a) =>
                a.tipo === 'area' &&
                (a.borrador.nombre === referencia.areaId ||
                  a.publicado?.nombre === referencia.areaId),
            )?.id ?? '';
      }
    }
  }
  for (const entrada of estado.entradas.filter((e) => e.tipo === 'galeria')) {
    for (const datos of [entrada.borrador, entrada.publicado].filter(Boolean)) {
      const area = estado.entradas.find(
        (a) =>
          a.tipo === 'area' &&
          (a.borrador.nombre === datos.areaId || a.publicado?.nombre === datos.areaId),
      );
      if (area) datos.areaId = area.id;
    }
  }
  estado.versionEsquema = 2;
  return estado;
}

export function validarAsociacionGaleria(estado, tipo, datos, publicar = false) {
  if (tipo !== 'galeria' || !datos.areaId) return;
  const area = estado.entradas.find((e) => e.id === datos.areaId && e.tipo === 'area');
  if (!area || (publicar && !area.publicado))
    throw new ErrorApi(
      422,
      'AREA_INVALIDA',
      'Selecciona un área existente y publícala antes de publicar su galería.',
    );
}

export function proyectarPortal(estado) {
  const contenido = { revision: estado.revisionPortal, avisoInteres: estado.avisoInteres ?? null };
  for (const [tipo, lista] of Object.entries(listas))
    contenido[lista] = estado.entradas
      .filter((e) => e.tipo === tipo && e.publicado)
      .sort((a, b) => a.orden - b.orden)
      .map((e) => {
        const datos = { ...e.publicado, id: e.id };
        if (tipo === 'producto' && !datos.mostrarPrecio) delete datos.precio;
        return datos;
      });
  contenido.institucion =
    estado.entradas.find((e) => e.tipo === 'institucion' && e.publicado)?.publicado ?? {};
  contenido.talleres = estado.entradas
    .filter((e) => e.tipo === 'taller' && e.publicado)
    .map((e) => proyectarTaller(estado, e));
  contenido.avisoTalleres = estado.avisoTalleres ?? null;
  contenido.avisos = estado.entradas
    .filter((e) => e.tipo === 'aviso' && e.publicado)
    .map((e) => ({ ...e.publicado, id: e.id }));
  return contenido;
}

export function auditar(estado, usuario, accion, recurso) {
  estado.auditoria.push({
    id: randomUUID(),
    usuarioId: usuario.id,
    accion,
    recurso,
    momento: new Date().toISOString(),
  });
}
