# Seguimiento de participantes y solicitudes

## Solicitudes e inscripciones

«Solicitar información» abre una conversación con folio `CT`. No reserva una plaza. Cada taller y correo normalizado admite una consulta; una segunda alta devuelve `CONSULTA_DUPLICADA` sin asignar otro folio ni enviar otra copia. El visitante puede continuar la conversación desde su acceso privado, en «Continuar esta consulta». Los mensajes y respuestas se muestran por fecha y los mensajes nuevos dejan la atención pendiente. Las consultas históricas repetidas conservan sus folios y accesos; no se borran ni se mezclan automáticamente.

«Inscribirme al taller» registra al participante con folio `INS`. Requiere que el taller tenga cupo y periodo configurados, esté publicado y abierto, haya plaza y exista un aviso vigente aceptado. Los talleres informativos indican que todavía no tienen inscripción en línea. El registro por correo y taller es único, también después de cancelar: se reactiva el mismo registro.

## Acceso del participante

La confirmación de inscripción muestra un enlace privado y guarda su acceso en «Mis inscripciones a talleres» de ese navegador. La copia por correo incluye un botón «Consulta tu estado», cuando SMTP está habilitado. Consultas e inscripciones se guardan en listas separadas, hasta veinte accesos por tipo, sin nombre del visitante, correo, preguntas ni respuestas. El seguimiento presenta exclusivamente los datos de la inscripción autenticada por su clave aleatoria; el folio sin clave no permite consultar ni modificar datos.

El participante puede consultar sus datos, taller, estado e historial con fechas, motivos y origen del cambio. Puede cancelar una inscripción confirmada de un taller programado: debe indicar motivo y se libera la plaza. Puede reactivarla con el mismo folio mientras la convocatoria esté abierta y tenga cupo, indicando motivo y aceptando el aviso vigente. La transacción vuelve a comprobar el estado, versión y disponibilidad; una pantalla antigua no reserva plaza.

La asistencia la registra la responsable o el administrador. El participante puede verla y consultar su motivo en el historial; no puede registrarse asistencia por sí mismo. El seguimiento público omite identificadores internos del personal, hashes y datos de otras personas. Las acciones de cancelación y reactivación quedan auditadas como realizadas por el participante en su registro.

## Panel de responsable y administrador

Al entrar al gestor aparece «Solicitudes y participantes», antes del editor de contenido, con tres categorías y sus cantidades: consultas de talleres, inscripciones y servicio social. Pulsar una categoría carga los registros actuales. Se puede buscar por nombre, correo o folio y filtrar por taller. «Actualizar solicitudes» renueva los datos y «Cerrar solicitudes» recoge la lista para continuar editando.

Desde consultas se leen preguntas y seguimientos y se publican respuestas. Desde inscripciones se consultan datos e historial, se cancelan, se reactivan con consentimiento y se registra asistencia; todas las acciones requieren motivo. La categoría de servicio social reúne los intereses con programa, mensaje, correo y fecha. Los controles de edición y exportación de cada taller siguen disponibles. Editor y operador no tienen acceso a estas listas ni a su API.

## API

| Ruta bajo `/api/v1`                         | Función                                                                                        |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `GET /cms/solicitudes`                      | Bandeja de consultas, inscritos y servicio social; responsable y administrador, con auditoría. |
| `POST /publico/consultas-talleres/mensajes` | Mensaje adicional en el mismo folio CT, con clave y versión.                                   |
| `POST /publico/inscripciones/consultar`     | Consulta privada de inscripción INS, con clave.                                                |
| `POST /publico/inscripciones/acciones`      | Cancelación o reactivación propia con clave, motivo y versión.                                 |

Las respuestas usan `Cache-Control: no-store`; las mutaciones exigen origen autorizado. La lectura privada tiene límite de sesenta intentos por IP y hora compartido entre inscripciones y consultas. Los mensajes y acciones del visitante comparten quince intentos por IP y hora. La clave se guarda únicamente como huella SHA-256 en el estado; la copia del correo y el navegador guardan el acceso necesario. El modo de buzón de archivos continúa limitado a desarrollo.

El aviso v4 describe este seguimiento, el respaldo por correo y el almacenamiento de accesos de inscripción. Los HTML v1, v2 y v3 se conservan intactos. Las inscripciones antiguas que no tuvieran clave no obtienen acceso público solamente por conocer su folio. No se envían correos retroactivos ni se regeneran las claves de consultas existentes.
