# Estado de Fase 2

Inicio técnico: 6 de noviembre de 2026, por instrucción del usuario. Alcance de referencia: §15.1 y requisitos M de RF-3 en `Especificacion_SIMCE_MCyE_v0.2.docx`. El contenido está aceptado según comunicación del usuario, quien también autoriza el aviso y los roles. El aviso se integra al portal y a la revisión local. La publicación autónoma por la responsable y las pruebas de alojamiento siguen pendientes.

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

Se incorpora por petición del usuario el [recorrido de consultas y respuestas dentro de la web](consultas-web.md): formulario por taller, folio y enlace privado, atención por responsable/admin y lectura de la respuesta desde el sitio. El acceso se guarda en el navegador, aparece en «Mis consultas de talleres» al regresar y se prepara una copia por correo con botón de recuperación. Las tarjetas de servicio social también llevan a su formulario y preseleccionan el programa. La versión vigente del aviso pasa a v3 y se conservan intactas las páginas v1 y v2.

Las inscripciones y la configuración operativa se incorporan al estado persistente del gestor. Los datos existentes se adaptan al leerlos sin sustituir cuentas ni contenido. No se necesita una migración SQL adicional: MySQL conserva el documento de `cms_estado` y usa su bloqueo `FOR UPDATE` para serializar altas, cambios y cancelaciones. Este bloqueo abarca el gestor completo; es correcto para el volumen inicial y debe revisarse antes de ampliar considerablemente la carga.

El modo de archivos conserva el límite de una sola instancia del servidor. El límite de cinco intentos públicos por IP y hora vive en memoria del proceso; una instalación con varias instancias necesitará coordinarlo. Las inscripciones no se replican a IndexedDB ni se incluyen en la operación sin conexión. Los endpoints públicos no entregan participantes ni historiales.

La disponibilidad se consulta al abrir el formulario y se verifica nuevamente al enviar. El HTML publicado conserva la información del taller; los cambios de cupo o periodo y de estado regeneran ese HTML. La ocupación puede cambiar sin recompilar ni publicar de nuevo.

## Validación

`npm run check` ejecuta análisis estático, formato, revisión del repositorio y pruebas. `npm run build` compila los tres productos. `npm run check:fase2` comprueba un ciclo real de navegador con datos sintéticos aislados: creación y publicación desde el gestor, inscripción interna con folio, duplicado, cupo agotado, consulta privada, descargas CSV/PDF, cancelación y reapertura, y ausencia de formulario sin aviso. También revisa desbordamiento entre 320 y 1440 px y axe en escritorio y móvil. Las evidencias se guardan en `artifacts/fase-2/`, excluido de Git, y la comprobación está incorporada al pipeline.

`npm run check:mysql-local -- --solo-integracion` prueba dos repositorios concurrentes compitiendo por una plaza y la conservación del historial al cancelar y reactivar. La integración general omite estas pruebas si no se configura MySQL; esa omisión no equivale a validarlas.

Resultado local del 6 de noviembre: 64 pruebas aprobadas en la verificación general, tres pruebas de integración MySQL aprobadas por separado, compilación correcta y cuatro flujos de navegador con cuatro revisiones axe sin incidencias graves o críticas. La regresión de Fase 1 pasó sus flujos y nueve revisiones de accesibilidad; Lighthouse móvil local registró LCP de 1984 ms, rendimiento de 97/100 y accesibilidad de 100/100. Se inspeccionaron el PDF descargado y un caso de cuatro páginas con nombres y correos largos, sin recortes ni solapamientos. Estas comprobaciones locales no sustituyen la aceptación institucional.

Actualización tras la autorización del aviso: 66 pruebas generales aprobadas, compilación correcta y cinco flujos de navegador con seis revisiones axe sin incidencias graves o críticas, incluidas la página del aviso en escritorio/móvil y su enlace desde la casilla de consentimiento. Se verificó la consulta sin JavaScript. La regresión de Fase 1 conserva sus flujos y nueve revisiones de accesibilidad aprobados; Lighthouse local registró LCP de 2054 ms, rendimiento de 96/100 y accesibilidad de 100/100. El servidor local utiliza el aviso autorizado para ambos formularios y el administrador de pruebas exige cambio inicial de contraseña.

Tras incorporar las consultas web: 71 pruebas generales y cuatro de integración MySQL aprobadas por separado, compilación correcta, siete flujos de navegador y nueve revisiones axe sin incidencias graves o críticas. El recorrido verifica envío, respuesta desde el panel, lectura mediante enlace privado y selección del programa de servicio social.

Tras añadir acceso guardado y copia por correo: 78 pruebas generales y cuatro de integración MySQL aprobadas por separado, compilación correcta, diez flujos de navegador y once revisiones axe sin incidencias graves o críticas. Se verifican regreso al sitio, recuperación desde la copia local en otro navegador y tras borrar los datos, retirada del acceso local y almacenamiento bloqueado. También se prueban rechazo del proveedor de correo, HTML escapado, origen configurado y ausencia de claves en el estado y la auditoría del servidor. Las copias siguen usando el buzón local; estos resultados no acreditan entrega SMTP real.

## Pendientes para aceptar la fase

- DE-06 queda autorizado por el usuario para la versión `simce-2026-11-06-v1`, disponible en `/privacidad/simce-2026-11-06-v1.html`. La consulta del aviso y su enlace desde el formulario se verifican localmente; el origen institucional HTTPS depende del alojamiento.
- Con el contenido y las convocatorias presentados ya aceptados según confirmación del usuario, ejecutar el ciclo desde un dispositivo externo en el alojamiento institucional. Las nuevas convocatorias se revisarán al publicarlas.
- Revisar el formulario con teclado y navegador del teléfono físico. La emulación y axe no sustituyen esa prueba.
- Implementar y verificar la depuración correspondiente a los plazos del aviso autorizado, junto con el tratamiento de exportaciones y respaldos y los instrumentos archivísticos aplicables, antes de operar con datos reales.
- Configurar y comprobar SMTP para las copias de consultas de talleres. Continuar RF-3.7 (correos de confirmación de inscripción y notificación) y decidir si se incluye RF-3.10 (lista de espera). La copia de consulta no equivale al correo de inscripción ni a una notificación de respuesta.

El avance técnico inicia la fase; no acredita su aceptación institucional ni su disponibilidad en producción. La operación local se explica en [la guía de talleres e inscripciones](talleres-inscripciones.md).
