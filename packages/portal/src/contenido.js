export const correo = 'janelisolis@cuautitlan.unam.mx';
export const mapa =
  'https://www.google.com/maps/search/?api=1&query=FES+Cuautitl%C3%A1n+Campo+4+UNAM';

export const secciones = [
  ['el-modulo', 'El Módulo'],
  ['areas', 'Áreas'],
  ['practicas', 'Prácticas'],
  ['actividades', 'Actividades'],
  ['productos', 'Productos'],
  ['servicio-social', 'Servicio social'],
];

export const areas = [
  {
    nombre: 'Área de Rastro',
    etiqueta: 'NOM-033',
    foto: 'BioseguridadRastros31.png',
    nodo: '47:409',
    descripcion:
      'Matanza y faenado de especies domésticas de abasto conforme a la NOM-033-SAG/ZOO-2014, con supervisión académica.',
  },
  {
    nombre: 'Sala de Cortes',
    etiqueta: 'Despiece',
    foto: 'Saladespiec2E495X4001.png',
    nodo: '47:412',
    descripcion:
      'Despiece de canales, deshuese y obtención de cortes comerciales y cortes tipo americano de bovino.',
  },
  {
    nombre: 'Área de Embutidos',
    etiqueta: 'BPH',
    foto: 'Images5.png',
    nodo: '47:419',
    descripcion:
      'Elaboración de productos cárnicos y embutidos aplicando buenas prácticas de higiene y manufactura.',
  },
];

export const procesos = [
  [
    'NOM-033-SAG/ZOO-2014',
    'La matanza y el faenado de las especies domésticas de abasto se realizan conforme a la norma oficial mexicana.',
    'Frame.svg',
    '47:624',
  ],
  [
    'Buenas prácticas',
    'Los productos cárnicos y embutidos se elaboran aplicando buenas prácticas de higiene y de manufactura.',
    'Frame1.svg',
    '47:630',
  ],
  [
    'Empacado y etiquetado',
    'El rebanado, el empacado al vacío y el etiquetado se hacen en el propio módulo antes del envío.',
    'Frame2.svg',
    '47:636',
  ],
  [
    'Docencia e investigación',
    'Cada área da servicio a las licenciaturas de la FESC, a otras dependencias de la UNAM y a instituciones externas.',
    'Frame3.svg',
    '47:642',
  ],
];

// El frame solo desarrolla el detalle de la segunda actividad.
export const actividades = [
  { nombre: 'Asesorías académicas' },
  {
    nombre: 'Matanza y faenado',
    descripcion:
      'Matanza y faenado de diferentes especies domésticas de acuerdo con la NOM-033-SAG/ZOO-2014.',
    area: 'Área de Rastro',
    especies: 'bovino · ovino · caprino · cerdo · conejo · pavo · pollo',
    foto: 'ResiduosProcesosMatanzasFaenamiento1.png',
  },
  { nombre: 'Despiece y cortes comerciales' },
  { nombre: 'Elaboración de productos cárnicos' },
  { nombre: 'Formación de estudiantes' },
];

export const productos = [
  {
    nombre: 'Hamburguesa',
    foto: 'CarneDeHamburguesa1200X7092.png',
    nodo: '47:344',
    variantes: 5,
    especies: ['Conejo', 'Pavo', 'Res', 'Pollo'],
  },
  { nombre: 'Pastor', foto: 'Images1.png', nodo: '47:352' },
  { nombre: 'Jamón', foto: 'FiambreJamonCocido1.png', nodo: '47:363' },
  { nombre: 'Salchicha', foto: 'FiambreJamonCocido1.png', nodo: '47:369' },
  { nombre: 'Chorizo', foto: 'Images4.png', nodo: '47:401' },
  {
    nombre: 'Chistorra',
    foto: '613Fb100844FaChistorraEspaOlaDeCerdoOloTiendas1600X16001.png',
    nodo: '47:398',
  },
  { nombre: 'Paté', foto: 'Images3.png', nodo: '47:395' },
  { nombre: 'Butifarra', foto: 'Images2.png', nodo: '47:392' },
];

export const programas = [
  {
    codigo: '2026-12/41-5177',
    nombre:
      'Manejo y procesamiento de la carne de diferentes especies de abasto en el Módulo de Carnes y Embutidos del CEA',
    actividades: [
      'Elaboración de productos cárnicos aplicando las Buenas Prácticas de Higiene.',
      'Realizar material digital sobre las actividades realizadas en el Módulo.',
      'Apoyo en el despiece, deshuese y preparación de cortes de carne.',
      'Apoyo en el deshuese de canal de conejo.',
      'Apoyo en el registro y preparación de productos cárnicos para el envío al módulo de ventas.',
      'Empacado y etiquetado de productos cárnicos.',
      'Realizar registros de temperaturas de las cámaras de refrigeración y congelación.',
      'Apoyo durante las prácticas académicas en el área de Embutidos.',
    ],
  },
  {
    codigo: '2026-12/41-5178',
    nombre:
      'Evaluación de la calidad de la carne de conejo mediante pruebas físicas, fisicoquímicas y de textura',
    actividades: [
      'Elaboración de productos cárnicos y embutidos de conejo aplicando las Buenas Prácticas de Higiene.',
      'Apoyo en el despiece, deshuese y preparación de cortes de carne.',
      'Apoyo en el deshuese de canal de conejo.',
      'Empacado y etiquetado de productos cárnicos.',
      'Apoyo durante las prácticas académicas en el área de Embutidos.',
      'Realizar pruebas físicas, fisicoquímicas y de textura para evaluar la calidad de carne de conejo.',
      'Elaboración de infografías sobre la calidad de la carne de conejo.',
      'Elaboración de infografías sobre el aprovechamiento del conejo para la elaboración de productos cárnicos.',
    ],
  },
];
