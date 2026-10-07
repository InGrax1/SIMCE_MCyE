# Contenido orientativo y animaciones del portal

Este avance completa la vista pública conservando el diseño recuperado de Figma. El portal continúa en React 19.2.8 con Vite 8.2.2 y prerenderizado para entregar HTML legible antes de cargar JavaScript.

## Contenido añadido

- Nueve tarjetas de prácticas: procesamiento cárnico, anatomía aplicada, despiece, higiene, formulación, calidad, conservación, trazabilidad y desarrollo de productos.
- Cinco actividades con descripción, área relacionada, enfoque y fotografía de referencia.
- Ocho fichas de productos con una explicación de su proceso, imagen y consulta por correo sobre presentaciones y disponibilidad.
- Galería de ocho imágenes con leyendas, manteniendo la distribución original.

Los textos nuevos son propuestas editoriales basadas en los objetivos de docencia, investigación y formación del módulo. Los temas no acreditan asignaturas, talleres programados, cupos ni horarios confirmados. Las imágenes procedentes de Figma se reutilizan como referencias visuales y no como evidencia de prácticas nuevas en la institución. La revisión institucional sigue pendiente.

## Imagen de salchicha

La imagen del diseño repetía la fotografía de jamón en la ficha de salchicha. Se genera una imagen ilustrativa mediante la herramienta integrada de la habilidad [imagegen](C:/Users/lolgr/.codex/skills/.system/imagegen/SKILL.md); no se utiliza la alternativa CLI/API.

Archivo incorporado al proyecto: `packages/portal/public/figma/salchichas-referencia.png`. La carpeta conserva la ruta común de recursos del portal; esta imagen nueva no procede de Figma. El catálogo la identifica como imagen de referencia y no como fotografía de un producto real del módulo.

Texto final enviado a la herramienta:

> Use case: product-mockup. Asset type: illustrative product photo for an educational university meat-processing website catalog, not a specific institution's actual product. Primary request: a clean realistic catalog photograph of five plain cooked frankfurter-style sausages (salchichas), pale pink-brown, smooth intact casing, arranged neatly on a small dark slate board. Scene/backdrop: light neutral studio background, no people. Composition: horizontal photograph, close three-quarter top view, all sausages centered and visible with generous margins for responsive crops. Lighting: soft daylight, realistic food texture, subtle natural shadows. Constraints: no bread, no garnish, no raw meat, no sliced ham, no packaging, no text, no logos, no watermark.

## Animaciones

La dependencia `animejs` se fija en 4.5.0 en el paquete del portal y el lockfile. Los hooks en `packages/portal/src/animaciones.js` implementan:

- Entrada coordinada de título, descripción, botones e imagen de portada mediante una línea de tiempo.
- Aparición de títulos de sección y tarjetas de cronología, áreas, procesos, prácticas, servicio social, galería y contacto cuando entran en pantalla. Las tarjetas añaden una escala leve y escalonado limitado; en móvil se reduce la distancia de desplazamiento.
- Acercamiento suave de las imágenes de áreas y galería; transiciones de texto e imagen en las fichas de actividades y productos al cambiar la selección.
- Microinteracciones de flechas al pasar el cursor con un puntero preciso o enfocar el botón mediante teclado. Se reutilizan instancias de `createAnimatable` y se eliminan los eventos al limpiar el ámbito.

La integración utiliza `createScope`, `animate` y `stagger` según la documentación oficial de [Anime.js con React](https://animejs.com/documentation/getting-started/using-with-react/) y [Scope](https://animejs.com/documentation/scope/). Las animaciones se registran dentro de cada ámbito; `revert()` limpia los efectos y los estilos al desmontar React o cambiar de selección. El observador se desconecta mediante la limpieza del ámbito.

El refinamiento usa [Timeline](https://animejs.com/documentation/timeline/) para coordinar la portada y [Animatable](https://animejs.com/documentation/animatable/) para las flechas. Las curvas `outCubic`, los zooms de 2,5–3,5% y los recorridos cortos dan mayor presencia a las animaciones sin modificar la composición. Los valores de duración y amplitud se detallan en [diseno-ui.md](diseno-ui.md); no se usan parallax, rebotes ni movimientos continuos.

`prefers-reduced-motion: reduce` se observa durante toda la sesión. Al activarlo se cancelan los efectos, se desconecta la aparición por desplazamiento y se restauran los estilos. Al desactivarlo se crea un solo observador. Las imágenes y los textos no se ocultan por defecto: siguen disponibles en el HTML prerenderizado y cuando JavaScript está desactivado.

## Comprobaciones

Compilación cliente/SSR y prerenderizado, ESLint, Prettier, comprobación del repositorio y suite existente de 22 pruebas aprobadas. La prueba de integración MySQL se omite sin `TEST_MYSQL=1`.

Chromium verifica los trece cambios de ficha, la carga de los 110 elementos de imagen, los nueve títulos distintos de prácticas, las ocho leyendas de galería, entradas de portada/títulos/tarjetas, zoom de fotografías, flechas con cursor y teclado, cambios rápidos de selección y cambios de preferencia de movimiento. También se comprueba el contenido inicial con JavaScript desactivado.

La revisión responsiva cubre 320–1920 px y texto al 200% sin desbordamientos ni recortes detectados. axe-core no detecta infracciones en los estados comprobados; se revisan capturas de prácticas, galería, actividades y productos a 390, 768 y 1440 px. Los informes y capturas quedan en `artifacts/`, excluido de Git.
