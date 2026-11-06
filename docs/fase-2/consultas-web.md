# Consultas y respuestas de talleres dentro de la web

El botón «Solicitar información» de cada taller abre un formulario en la propia tarjeta. El visitante escribe nombre, correo de contacto y pregunta, acepta el aviso y recibe un folio y un enlace privado. La consulta no ocupa una plaza; la inscripción conserva su formulario y su control de cupo independientes.

## Recorrido del visitante

1. Abrir un taller publicado y pulsar «Solicitar información».
2. Completar el formulario y aceptar el aviso vigente. La pregunta admite hasta 1000 caracteres.
3. Enviar y guardar el enlace privado mostrado en la confirmación. No se abre una aplicación de correo ni se envían mensajes externos.
4. Abrir «Consultar mi solicitud» para ver su pregunta y el estado de atención. Cuando la responsable responda, pulsar «Actualizar respuesta» o volver a abrir el enlace guardado.

El enlace contiene una clave aleatoria y es personal: quien lo tenga podrá leer esa consulta. El folio solo no permite verla. La clave viaja en el fragmento de la URL, que el navegador no envía al pedir la página; el cliente la presenta a la API mediante el cuerpo de una solicitud POST. El servidor conserva su huella SHA-256. No se ofrece consulta pública por nombre o correo ni se imprime la clave en la bitácora.

## Atención por la responsable

Entrar al panel con rol responsable o administrador, seleccionar «Talleres» y abrir la entrada correspondiente. En «Solicitudes de información del taller», pulsar «Consultar solicitudes de información», leer la pregunta, escribir la respuesta y pulsar «Publicar respuesta». La respuesta aparece al visitante en su enlace privado. Se conserva la fecha, la versión del registro y la auditoría de la cuenta que respondió.

La respuesta admite hasta 2000 caracteres y texto sin HTML. Los estados son pendiente y respondida. El control de versiones rechaza respuestas basadas en una versión anterior para que se recargue la consulta. Un taller con consultas no puede eliminarse; puede despublicarse y conservar su historial.

## Servicio social

Los botones «Solicitar Información» de las tarjetas llevan al formulario de servicio social y seleccionan el programa elegido. Las solicitudes se envían desde la web y se consultan en el apartado de servicio social del gestor. El seguimiento privado con respuestas implementado aquí corresponde a consultas de talleres.

## API y persistencia

| Ruta bajo `/api/v1`                          | Uso                                                                                                                         |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `POST /publico/talleres/:id/consultas`       | Alta pública con aviso, consentimiento y origen autorizado. Cinco intentos por IP y hora. Devuelve folio y clave de acceso. |
| `POST /publico/consultas-talleres/consultar` | Consulta individual mediante folio y clave. Sesenta intentos por IP y hora; respuesta sin caché.                            |
| `GET /talleres/:id/consultas`                | Lista privada de solicitudes del taller; solo responsable y administrador. No devuelve la huella de acceso.                 |
| `POST /consultas-talleres/:id/respuestas`    | Respuesta por responsable o administrador, con versión y control de origen.                                                 |

Los datos se guardan en el mismo estado transaccional del gestor, en archivos para la revisión de una sola instancia y en `cms_estado` con MySQL. La adaptación de estados anteriores añade la colección sin alterar cuentas, contenido ni inscripciones existentes. La prueba MySQL comprueba la conservación de una respuesta al recrear el repositorio. Los límites de tasa conservan el alcance de un único proceso.

La versión de aviso `simce-2026-11-06-v2` incorpora las consultas y el seguimiento privado solicitados por el usuario. El HTML anterior `simce-2026-11-06-v1` se mantiene sin cambios para los registros históricos. La depuración de contactos y consultas a los plazos previstos continúa pendiente de implementación, como se documenta en el estado de la fase.

## Comprobaciones

Se verificaron 71 pruebas generales del proyecto, cuatro de integración MySQL por separado y la compilación. El ciclo de navegador comprueba la consulta, el folio, la respuesta en panel, su lectura desde otro contexto y el envío de servicio social con el programa seleccionado. La suite completa de Fase 2 supera siete flujos y nueve revisiones axe sin incidencias graves o críticas. Las evidencias sintéticas están en `artifacts/fase-2/`, fuera de Git; no se añaden solicitudes ficticias al contenido local de revisión.
