# Estado de Fase 1

- Fecha de corte: 2026-10-27.
- Estado: implementación técnica ampliada; fase sin cerrar.
- Referencia visual: [CEA, frame 1:3](https://www.figma.com/design/Rw9Bb37khwyJnL2wUEjK89/CEA?node-id=1-3).

## Avance de los cinco pasos

| Paso                            | Implementado                                                                                                                                                                                                                           | Pendiente para aceptación                                                                                                       |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1. Gestión de contenido, RF-2   | Acceso, cambio inicial de contraseña, roles, borradores, edición, publicación/despublicación, imágenes con recorte y compresión, orden, vista previa, últimas tres versiones y auditoría. Persistencia MySQL y modo local de revisión. | Probar la integración MySQL en un entorno disponible y dar de alta las cuentas institucionales.                                 |
| 2. Publicación del HTML         | El servidor regenera el portal a partir de las versiones publicadas, incorpora sus datos para React y reemplaza el HTML mediante escritura atómica. Conserva borradores separados; ofrece reintento de generación.                     | Confirmar el recorrido en el alojamiento y su política de respaldo.                                                             |
| 3. Talleres y contenido público | Talleres con información, convocatoria abierta, cerrado o concluido; fechas, requisitos y costo indicativo; avisos fechados; filtro académico; información institucional editable.                                                     | Cargar y validar convocatorias reales. La inscripción corresponde a Fase 2.                                                     |
| 4. Validación institucional     | Inventario de contenido y guion de aceptación preparados. El gestor permite sustituir textos e imágenes de referencia. El formulario de interés requiere aviso autorizado y registra su versión y consentimiento.                      | La institución debe confirmar identidad, contacto, textos, fotografías, asignaturas, programas, talleres y aviso de privacidad. |
| 5. Calidad y entrega            | Pruebas de permisos, sesiones, medios, publicación y privacidad; comprobación en navegador; axe y Lighthouse incorporados al pipeline; configuración de staging y guía de operación.                                                   | Ejecutar staging con MySQL y TLS, completar revisión manual y documentar que la responsable publica sin asistencia.             |

## Portal y gestor

El portal conserva React, Vite y Anime.js, la portada de Figma, colores, decoraciones, separadores, mosaicos y tarjetas. Los fondos cubren la pantalla y las cuadrículas se adaptan al espacio disponible. Las fichas de productos conservan una altura uniforme; las áreas de las actividades son indicadores sin interacción; «Explora más opciones» mantiene una jerarquía legible. El criterio visual está en [diseno-ui.md](diseno-ui.md).

El gestor incluye áreas, prácticas, actividades, productos, programas de servicio social, talleres, avisos, información institucional y galería. Un editor puede guardar y revisar borradores; responsable y administrador pueden publicar, despublicar y eliminar. El operador conserva el acceso al prototipo operativo, sin permisos de edición pública. El formulario usa texto plano: no admite HTML. Una publicación exige los campos necesarios según su tipo.

Las imágenes subidas aceptan JPEG, PNG y WebP hasta 5 MB y 25 megapíxeles; se decodifican, recortan cuando se solicita, reducen y vuelven a codificar a WebP, eliminando metadatos. El texto alternativo es obligatorio. Las imágenes sin asociación a contenido publicado no son públicas. Los precios solo aparecen cuando se habilitan expresamente.

La publicación utiliza el renderizado React del servidor; no ejecuta una compilación completa por cada cambio. La vista previa es privada y no modifica el portal. Si falla la generación, el estado conserva el cambio y permite reintentar mediante «Regenerar portal». El despliegue inicial admite una sola instancia publicadora; el modo de archivo es exclusivamente local. Consulte [gestor-contenido.md](gestor-contenido.md).

Se optimizaron las imágenes originales y se incluyeron subconjuntos WOFF2 derivados de Poppins bajo el nombre SIMCE Sans, con licencia y procedencia conservadas. La apariencia tipográfica se mantiene. Las animaciones respetan el movimiento reducido y el contenido sigue disponible sin JavaScript.

## Verificación técnica

Los controles incluyen ESLint, Prettier, compilación y 36 pruebas aprobadas de dominio, panel y API; las dos pruebas de integración MySQL se omiten localmente. La suite nueva verifica permisos, sesiones y su rotación, inactividad, versiones concurrentes, borradores privados, campos de publicación, auditoría, recorte y privacidad de imágenes, recuperación de generación y consentimiento del formulario de interés. La prueba MySQL requiere `TEST_MYSQL=1` y una base cuyo nombre termine en `_test`.

`npm run check:fase1` comprueba el recorrido completo con datos sintéticos: cambio inicial de contraseña, borrador, vista previa, publicación, HTML sin JavaScript, despublicación y publicación de un taller. Ejecuta axe en portal y gestor en escritorio y móvil, comprueba desbordamientos y registra capturas.

Lighthouse utiliza su perfil móvil y los parámetros predeterminados de red lenta 4G y CPU, con `throttlingMethod: devtools`: emula directamente la red y CPU, sin estimación posterior de Lantern. El límite es LCP inferior a 2500 ms. La ejecución local de este corte registró LCP de 1928 ms, rendimiento 98/100 y accesibilidad 100/100; los resultados fluctúan según la máquina. axe no detectó infracciones graves o críticas en los cuatro estados comprobados. Los informes reproducibles se generan en `artifacts/fase-1/`. Estos controles automáticos no sustituyen la revisión manual ni la aceptación institucional.

La auditoría de dependencias aprueba el umbral de severidad alta/crítica. Quedan cuatro avisos bajos de la cadena de compilación PWA (`deepmerge` y dependientes); no se aplica la degradación incompatible de PWA que sugiere la herramienta.

El pipeline incluye navegador, recorrido de publicación, axe, Lighthouse, auditoría de dependencias y pruebas MySQL. Su configuración está versionada; una ejecución local no acredita que un pipeline remoto ya haya terminado. Docker está instalado en la máquina de desarrollo, pero su motor no estuvo disponible; no se declara comprobado el arranque de contenedores ni la prueba MySQL de este avance.

## Contenido por validar y cierre

Los nueve temas de prácticas, cinco actividades, ocho productos y ocho espacios de galería conservan el contenido orientativo del avance anterior. Las asignaturas sin confirmación se indican expresamente. Las fotografías de referencia no acreditan instalaciones ni sesiones reales; la procedencia de la imagen ilustrativa de salchicha está en [contenido-animaciones.md](contenido-animaciones.md). No se inventan fechas de talleres, existencias, precios ni una quinta especie de hamburguesa.

La información de identidad, responsable, correo, códigos de servicio social y ubicación procede del diseño base y requiere confirmación institucional. El icono social de la portada continúa dirigiendo al contacto mientras no se entregue una URL institucional. El formulario de interés permanece deshabilitado hasta configurar la URL y versión del aviso de privacidad autorizado; entretanto se ofrece contacto por correo.

El guion [aceptacion-institucional.md](aceptacion-institucional.md) permite registrar la revisión y la publicación de una entrada y un taller sin asistencia. No se ha realizado esa prueba con una persona responsable ni se registran aprobaciones en su nombre.

El alojamiento, subdominio y TLS y la comprobación física de la báscula siguen abiertos en [Fase 0](../fase-0/estado.md). Este avance permite continuar la revisión local y preparar staging, pero no cierra esos pendientes.
