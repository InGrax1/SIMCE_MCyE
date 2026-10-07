# Estado de Fase 1

- Fecha de corte: 2026-10-06.
- Estado: desarrollo técnico iniciado; fase sin cerrar.
- Alcance de este avance: vista principal del portal público, dentro de RF-1.
- Referencia visual: [CEA, frame 1:3](https://www.figma.com/design/Rw9Bb37khwyJnL2wUEjK89/CEA?node-id=1-3), facilitado por el usuario para su implementación.

## Avance entregado

La página principal sustituye el esqueleto de Fase 0. Incluye encabezado, presentación del módulo, áreas, procesos, prácticas académicas, actividades, productos, servicio social, galería, contacto y pie. Conserva React/Vite, el prerenderizado existente y la separación entre el portal público y el panel operativo.

La navegación interna lleva a cada sección; el menú móvil se cierra al elegir un enlace, pulsar Escape, tocar fuera o ampliar a escritorio. Los selectores de actividades y productos actualizan el detalle y exponen su selección con `aria-pressed`. Los programas conservan sus listas visibles. Los enlaces de correo abren el cliente de correo del visitante y el mapa abre la ubicación indicada por el diseño. No hay envío automático de mensajes ni inscripción en este avance.

Las imágenes y SVG del diseño están en `packages/portal/public/figma/`; las fuentes Poppins y su licencia OFL están en `packages/portal/public/fonts/`. No se depende de enlaces temporales de Figma. La decoración estática de la portada con efecto de refracción se exportó desde su capa original `47:577` a PNG con escala 2; el efecto está incorporado en la imagen y no requiere un runtime WebGPU en el portal.

Se recupera la composición inicial de Figma después de que el usuario indicara que el rediseño había cambiado demasiado su apariencia. Se mantienen portada, colores, decoraciones, separadores, mosaicos y estilos de tarjetas, con mejoras limitadas de legibilidad, espaciado, contraste e interacción. El ancho máximo sigue siendo 1440 px; las secciones crecen para evitar recortes y las cuadrículas se adaptan al espacio disponible. El criterio completo está en [diseno-ui.md](diseno-ui.md).

La paleta conserva el vino de la marca, separa colores semánticos y corrige contrastes. Se incluye navegación por teclado, foco visible, enlace para saltar al contenido, nombres accesibles y respeto por la preferencia de movimiento reducido. Las fuentes en `rem` y el flujo flexible permiten ampliar el texto.

Se completan los nueve temas de prácticas con descripciones e imágenes, las cinco actividades con detalle, áreas relacionadas y enfoque académico, y los ocho productos con descripciones de su proceso. La galería conserva sus ocho espacios y ahora muestra imágenes con leyendas. Este contenido orientativo se apoya en el propósito académico del módulo; requiere revisión institucional y no constituye una programación de cursos, confirmación de existencias ni ficha comercial definitiva.

Anime.js 4.5.0 añade entradas breves en portada, aparición de tarjetas al desplazarse y transiciones al cambiar actividades y productos. Los efectos se registran en ámbitos de Anime.js y se limpian al desmontar React o cambiar de selección. La preferencia `prefers-reduced-motion` desactiva los efectos y restaura el contenido incluso si cambia durante la sesión. El HTML prerenderizado permanece visible sin JavaScript; no se ocultan secciones mediante CSS para preparar las animaciones.

## Validación de este avance

- Comprobación del repositorio, ESLint y Prettier.
- Suite existente: 22 pruebas aprobadas; la integración MySQL se omite sin `TEST_MYSQL=1`.
- Compilación de API, panel PWA y portal prerenderizado.
- Navegador Chromium: imágenes cargadas, enlaces internos válidos, ausencia de errores de página/HTTP y funcionamiento de todos los selectores y el menú móvil.
- Revisión de tamaños táctiles, texto y desbordamiento a 320, 360, 390, 640, 768, 896, 1024, 1120, 1280, 1440 y 1920 px.
- axe-core 4.14.0: comprobación automática WCAG 2 A/AA, 2.1 AA y 2.2 AA en móvil, tableta y escritorio, además de menú abierto, catálogo y actividades, sin infracciones detectadas. Esto no equivale a una auditoría manual completa ni a la integración de axe en el pipeline.
- Revisión visual en móvil, tableta y escritorio y ampliación independiente del texto al 200%. Las capturas y los informes se guardan en `artifacts/`, excluido de Git.
- Verificación adicional del portal compilado: las trece fichas de actividades/productos tienen descripción e imagen cargada; las nueve prácticas tienen títulos distintos y la galería tiene ocho imágenes con leyenda. Los 103 elementos de imagen de la página cargan sin errores.
- Anime.js: entrada de portada y tarjetas, cambios rápidos de ficha, restauración al activar movimiento reducido y un solo observador de aparición después del montaje de React StrictMode. El contenido inicial, prácticas y galería también se revisan con JavaScript desactivado.

## Contenido por validar

La galería y las prácticas utilizan imágenes de referencia disponibles en el diseño; sus textos alternativos y notas aclaran su carácter ilustrativo. La ficha de salchicha sustituye la imagen repetida de jamón por una imagen generada de referencia. Su procedencia y el texto de generación se documentan en [contenido-animaciones.md](contenido-animaciones.md). Estas imágenes no acreditan instalaciones, sesiones ni productos reales adicionales del módulo.

El frame indica cinco variantes de hamburguesa, pero nombra cuatro especies. La interfaz cuenta las cuatro especies de la ficha, mientras el total de variantes queda por aclarar; no se inventa la quinta especie. Los textos añadidos explican temas y procesos relacionados, y el catálogo ofrece consulta a la responsable para confirmar especies, presentaciones y disponibilidad. No se muestran precios ni disponibilidad operativa.

Las redes sociales aún no tienen una URL institucional proporcionada; el icono de la portada dirige al contacto del módulo con un nombre accesible que indica ese destino. Los códigos de servicio social, fotografías, textos e identidad visual requieren validación institucional antes de publicación oficial.

## Trabajo pendiente para cerrar la fase

- Gestión de contenido (RF-2): autenticación y permisos, persistencia, borradores, publicación/despublicación, edición de secciones y gestión de imágenes con auditoría.
- Conectar la publicación del contenido con la actualización del HTML público prerenderizado.
- Completar y validar los contenidos institucionales, incluidas prácticas, galería y la sección de talleres de RF-1; la inscripción corresponde a Fase 2.
- Incorporar Lighthouse y axe al pipeline con los umbrales de la especificación.
- Validar la publicación de una entrada por la responsable sin asistencia y mostrar el portal en staging.

El alojamiento, subdominio y TLS y la comprobación física de la báscula siguen abiertos en [Fase 0](../fase-0/estado.md). Este avance no registra aprobaciones institucionales ni cierra esos pendientes.
