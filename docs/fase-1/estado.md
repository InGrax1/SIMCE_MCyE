# Estado de Fase 1

- Fecha de corte: 2026-10-06.
- Estado: desarrollo técnico iniciado; fase sin cerrar.
- Alcance de este avance: vista principal del portal público, dentro de RF-1.
- Referencia visual: [CEA, frame 1:3](https://www.figma.com/design/Rw9Bb37khwyJnL2wUEjK89/CEA?node-id=1-3), facilitado por el usuario para su implementación.

## Avance entregado

La página principal sustituye el esqueleto de Fase 0. Incluye encabezado, presentación del módulo, áreas, procesos, prácticas académicas, actividades, productos, servicio social, galería, contacto y pie. Conserva React/Vite, el prerenderizado existente y la separación entre el portal público y el panel operativo.

La navegación interna lleva a cada sección; el menú móvil abre, cierra y se cierra después de elegir un enlace. Los selectores de actividades y productos actualizan el detalle y exponen su selección con `aria-pressed`. Los enlaces de correo abren el cliente de correo del visitante y el mapa abre la ubicación indicada por el diseño. No hay envío automático de mensajes ni inscripción en este avance.

Las imágenes y SVG del diseño están en `packages/portal/public/figma/`; las fuentes Poppins y su licencia OFL están en `packages/portal/public/fonts/`. No se depende de enlaces temporales de Figma. La decoración estática de la portada con efecto de refracción se exportó desde su capa original `47:577` a PNG con escala 2; el efecto está incorporado en la imagen y no requiere un runtime WebGPU en el portal.

La disposición de escritorio conserva las dimensiones y posiciones de las secciones del frame de 1440 px. La adaptación entre 320 y 1100 px es una decisión de implementación, pues no se proporcionó un frame móvil. Se usan rejillas y flujos de contenido; las posiciones absolutas quedan reservadas para decoraciones, recortes de imagen y elementos superpuestos.

Se ajustaron ligeramente los colores de texto secundario, etiquetas y algunos controles para corregir contrastes detectados por axe. Se añadió navegación por teclado, foco visible, enlace para saltar al contenido, nombres accesibles y respeto por la preferencia de movimiento reducido.

## Validación de este avance

- Comprobación del repositorio, ESLint y Prettier.
- Suite existente: 22 pruebas aprobadas; la integración MySQL se omite sin `TEST_MYSQL=1`.
- Compilación de API, panel PWA y portal prerenderizado.
- Navegador Chromium: carga de las 86 imágenes de la página, enlaces internos válidos, ausencia de errores de página/HTTP y funcionamiento de los selectores y el menú móvil.
- Ausencia de desbordamiento horizontal a 320, 390, 768, 1024, 1280 y 1920 px.
- axe-core 4.14.0: comprobación automática WCAG 2 A/AA y 2.1 AA sobre la vista inicial, sin infracciones detectadas. Esto no equivale a una auditoría manual completa ni a la integración de axe en el pipeline.
- Comparación visual de la portada y revisión de las secciones en escritorio y móvil. Las capturas y el informe se guardan en `artifacts/`, excluido de Git.

## Contenido por validar

La galería y las fotografías de prácticas conservan los espacios grises del diseño. Las tarjetas repetidas de prácticas son parte de la referencia y necesitan sus contenidos definitivos. Las imágenes de producto se mantienen tal como aparecen en Figma, incluida la imagen compartida de jamón y salchicha.

El detalle de hamburguesa indica cinco variantes, pero el frame nombra cuatro especies. Se conserva esa información de referencia hasta la revisión institucional; no se inventa la quinta especie. Los demás productos y las actividades sin descripción en el frame ofrecen consulta a la responsable en lugar de afirmar datos no proporcionados. No se muestran precios ni disponibilidad operativa.

Las redes sociales aún no tienen una URL institucional proporcionada; el icono de la portada lleva al contacto del módulo. Los códigos de servicio social, fotografías, textos e identidad visual requieren validación institucional antes de publicación oficial.

## Trabajo pendiente para cerrar la fase

- Gestión de contenido (RF-2): autenticación y permisos, persistencia, borradores, publicación/despublicación, edición de secciones y gestión de imágenes con auditoría.
- Conectar la publicación del contenido con la actualización del HTML público prerenderizado.
- Completar y validar los contenidos institucionales, incluidas prácticas, galería y la sección de talleres de RF-1; la inscripción corresponde a Fase 2.
- Incorporar Lighthouse y axe al pipeline con los umbrales de la especificación.
- Validar la publicación de una entrada por la responsable sin asistencia y mostrar el portal en staging.

El alojamiento, subdominio y TLS y la comprobación física de la báscula siguen abiertos en [Fase 0](../fase-0/estado.md). Este avance no registra aprobaciones institucionales ni cierra esos pendientes.
