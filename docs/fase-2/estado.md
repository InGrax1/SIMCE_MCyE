# Estado de Fase 2

Inicio técnico: 6 de noviembre de 2026, por instrucción del usuario. Alcance de referencia: §15.1 y requisitos M de RF-3 en `Especificacion_SIMCE_MCyE_v0.2.docx`. La fase corresponde a talleres e inscripciones. La aceptación institucional de Fase 1 y sus pruebas de alojamiento continúan pendientes.

## Avance implementado

| Requisito        | Implementación                                                                                                                                                          |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF-3.1           | Taller del gestor con título, descripción, fechas, requisitos y costo indicativo; configuración adicional de temario, sede, cupo y periodo de inscripción.              |
| RF-3.2           | Publicación en el portal y formulario conectado. Sin aviso autorizado, conserva la consulta informativa y el contacto.                                                  |
| RF-3.3           | Apertura inclusiva y cierre exclusivo según el reloj del servidor. Cupo verificado dentro de la misma transacción que registra la inscripción.                          |
| RF-3.4           | Nombre, correo, teléfono, procedencia y, para comunidad interna, licenciatura y número de cuenta. Consentimiento afirmativo con versión y momento conservados.          |
| RF-3.5           | Un registro por taller y correo normalizado, incluso si está cancelado. La reinscripción requiere reactivación autorizada.                                              |
| RF-3.6           | Confirmación pública con folio persistido, sin cuenta de visitante.                                                                                                     |
| RF-3.8           | Consulta y exportación CSV/PDF exclusivamente por responsable o administrador, con auditoría y respuesta sin caché.                                                     |
| RF-3.9, avance S | Cancelación, reactivación con consentimiento vigente y registro de asistencia, con versión e historial. La cancelación libera plaza; la asistencia continúa ocupándola. |

La publicación y el estado operativo son independientes. Cancelar un taller cancela sus inscripciones confirmadas, conserva las asistencias ya registradas e impide republicarlo o reactivar participantes. Un taller concluido conserva sus datos y no puede cancelarse. Los cambios de fechas requieren motivo; el cupo no se reduce por debajo de la ocupación.

## Persistencia y alcance técnico

Las inscripciones y la configuración operativa se incorporan al estado persistente del gestor. Los datos existentes se adaptan al leerlos sin sustituir cuentas ni contenido. No se necesita una migración SQL adicional: MySQL conserva el documento de `cms_estado` y usa su bloqueo `FOR UPDATE` para serializar altas, cambios y cancelaciones. Este bloqueo abarca el gestor completo; es correcto para el volumen inicial y debe revisarse antes de ampliar considerablemente la carga.

El modo de archivos conserva el límite de una sola instancia del servidor. El límite de cinco intentos públicos por IP y hora vive en memoria del proceso; una instalación con varias instancias necesitará coordinarlo. Las inscripciones no se replican a IndexedDB ni se incluyen en la operación sin conexión. Los endpoints públicos no entregan participantes ni historiales.

La disponibilidad se consulta al abrir el formulario y se verifica nuevamente al enviar. El HTML publicado conserva la información del taller; los cambios de cupo o periodo y de estado regeneran ese HTML. La ocupación puede cambiar sin recompilar ni publicar de nuevo.

## Validación

`npm run check` ejecuta análisis estático, formato, revisión del repositorio y pruebas. `npm run build` compila los tres productos. `npm run check:fase2` comprueba un ciclo real de navegador con datos sintéticos aislados: creación y publicación desde el gestor, inscripción interna con folio, duplicado, cupo agotado, consulta privada, descargas CSV/PDF, cancelación y reapertura, y ausencia de formulario sin aviso. También revisa desbordamiento entre 320 y 1440 px y axe en escritorio y móvil. Las evidencias se guardan en `artifacts/fase-2/`, excluido de Git, y la comprobación está incorporada al pipeline.

`npm run check:mysql-local -- --solo-integracion` prueba dos repositorios concurrentes compitiendo por una plaza y la conservación del historial al cancelar y reactivar. La integración general omite estas pruebas si no se configura MySQL; esa omisión no equivale a validarlas.

Resultado local del 6 de noviembre: 64 pruebas aprobadas en la verificación general, tres pruebas de integración MySQL aprobadas por separado, compilación correcta y cuatro flujos de navegador con cuatro revisiones axe sin incidencias graves o críticas. La regresión de Fase 1 pasó sus flujos y nueve revisiones de accesibilidad; Lighthouse móvil local registró LCP de 1984 ms, rendimiento de 97/100 y accesibilidad de 100/100. Se inspeccionaron el PDF descargado y un caso de cuatro páginas con nombres y correos largos, sin recortes ni solapamientos. Estas comprobaciones locales no sustituyen la aceptación institucional.

## Pendientes para aceptar la fase

- Resolver DE-06: recibir el aviso autorizado, su versión y su URL institucional estable. No se asume autorización a partir de un texto o enlace de prueba.
- Validar los talleres, sus fechas, temarios, sedes y cupos con la responsable, y ejecutar el ciclo desde un dispositivo externo en el alojamiento institucional.
- Revisar el formulario con teclado y navegador del teléfono físico. La emulación y axe no sustituyen esa prueba.
- Acordar y verificar la retención institucional, incluida la depuración prevista a 24 meses y el tratamiento de exportaciones y respaldos, antes de usar datos reales.
- Programar RF-3.7 (correos de confirmación y notificación) y decidir si se incluye RF-3.10 (lista de espera). Esta entrega no envía correos de inscripción ni mantiene lista de espera.

El avance técnico inicia la fase; no acredita su aceptación institucional ni su disponibilidad en producción. La operación local se explica en [la guía de talleres e inscripciones](talleres-inscripciones.md).
