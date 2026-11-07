# Atención de solicitudes en SIMCE

Responsable y administrador entran a **Solicitudes**, una bandeja separada de los demás trabajos del panel. Se elige **Consultas de talleres** o **Servicio social**, se filtra por estado o actividad y se busca por nombre, correo o folio. Seleccionar un registro muestra solo esa conversación, sus datos, historial y acciones. En móvil se abre su detalle y se vuelve al listado mediante «Volver a la lista».

Las inscripciones se gestionan en **Participantes**, con acciones y motivo por registro. **Talleres** contiene la edición de convocatorias, fechas, cupo, sede y exportación de asistentes. **Contenido** agrupa las demás entradas del portal; **Bitácora** muestra la actividad reciente. Las listas privadas no están disponibles para editor ni operador.

## Cancelar o reabrir una solicitud

En el detalle, el personal autorizado pulsa «Cancelar solicitud», escribe el motivo y confirma. Se conserva su folio, la conversación y el historial. El visitante ve el estado y motivo al abrir su enlace privado. Mientras esté cancelada, la solicitud permite lectura, pero no mensajes nuevos ni respuestas. «Reabrir solicitud» requiere motivo y devuelve la atención a pendiente, con el mismo folio y enlace. Cancelar una consulta de taller no cambia las plazas de inscripción.

## Servicio social

El formulario genera un folio `SS` y un enlace privado. Existe una solicitud por programa y correo normalizado. Los mensajes posteriores se agregan en el mismo folio. El navegador guarda el acceso en «Mis solicitudes de servicio social» y, con SMTP activo, el solicitante recibe una copia con el botón «Consulta tu estado». La persona puede leer respuestas, enviar mensajes y revisar el historial desde la web. La solicitud de información no constituye admisión al programa.

Las solicitudes anteriores conservan sus datos y reciben un folio al adaptar el estado. En su detalle, «Enviar acceso de seguimiento» prepara y envía el primer enlace al correo registrado. No se envían mensajes automáticamente al actualizar el sistema. Si ese envío falla, la acción puede reintentarse. Con el buzón de pruebas se conserva una copia local; ello no acredita entrega real. El servidor guarda solo la huella de la clave, y el panel no recibe el enlace ni su clave al habilitarlo.

## Rutas y privacidad

| Ruta bajo `/api/v1`                       | Función                                                                 |
| ----------------------------------------- | ----------------------------------------------------------------------- |
| `POST /consultas-talleres/:id/acciones`   | Cancelación y reapertura de consultas de talleres con motivo y versión. |
| `POST /publico/servicio-social/consultar` | Lectura privada de la conversación con folio y clave.                   |
| `POST /publico/servicio-social/mensajes`  | Mensaje del solicitante con clave y versión.                            |
| `POST /cms/intereses/:id/respuestas`      | Publicación de respuesta por responsable/admin.                         |
| `POST /cms/intereses/:id/acciones`        | Cancelación o reapertura por responsable/admin, con motivo y versión.   |
| `POST /cms/intereses/:id/seguimiento`     | Envío del primer acceso a una solicitud previa.                         |

Las operaciones respetan el control de origen, los límites de intentos públicos y la auditoría. Las respuestas privadas omiten datos de contacto, claves y los identificadores internos de cuentas. El aviso v5 describe estas finalidades y conserva los HTML v1 a v4. El almacenamiento local contiene solo folio, clave y nombre de la actividad, hasta veinte accesos por categoría; se puede retirar cada acceso del navegador.
