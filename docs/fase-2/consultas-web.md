# Consultas y respuestas de talleres dentro de la web

El botón «Solicitar información» de cada taller abre un formulario en la propia tarjeta. El visitante escribe nombre, correo de contacto y pregunta, acepta el aviso y recibe un folio CT. El acceso queda guardado en el navegador y se prepara una copia por correo con botón privado de seguimiento. Se admite una consulta por taller y correo normalizado; las preguntas adicionales se envían desde «Continuar esta consulta», sin otro folio. La consulta no ocupa una plaza; «Inscribirme al taller» usa su formulario, folio INS y control de cupo. El [seguimiento de participantes](seguimiento-participantes.md) describe los datos, cancelación, reactivación e historial privados de la inscripción.

## Recorrido del visitante

1. Abrir un taller publicado y pulsar «Solicitar información».
2. Completar el formulario y aceptar el aviso vigente. La pregunta admite hasta 1000 caracteres.
3. Enviar. La confirmación informa si se guardó el acceso en este navegador y el resultado de la copia por correo. No se abre una aplicación externa.
4. Al regresar al sitio, ir a Talleres → «Mis consultas de talleres» y pulsar «Consultar estado» junto al folio. También se puede abrir «Consultar mi solicitud» inmediatamente después de enviar.
5. Si se borran los datos del sitio o se cambia de navegador o equipo, abrir «Consulta tu estado» desde el correo. Una consulta válida vuelve a guardarse automáticamente en ese navegador.
6. Para dejar de mostrarla en un equipo compartido, pulsar «Quitar de este navegador». Esto no borra la consulta del servidor ni su copia en el correo.

El almacenamiento es `localStorage`, separado de la caché HTTP. Conserva hasta veinte accesos recientes, sin duplicados: solo folio, clave privada y nombre del taller. No guarda nombres de visitantes, correos, preguntas ni respuestas. El origen y el navegador delimitan dónde aparece la lista. Datos dañados o almacenamiento bloqueado no impiden enviar: si no se pudo guardar, la confirmación ofrece el enlace privado para conservarlo por otro medio. Quitar un acceso en una pestaña actualiza la lista en otras pestañas del mismo origen.

## Copia por correo

El adaptador compartido con la recuperación de cuentas genera versiones de texto y HTML, con nombre, taller, folio, pregunta y botón «Consulta tu estado». Los valores se escapan en HTML y el enlace usa el origen configurado mediante `PORTAL_ORIGEN_PUBLICO`, sin confiar en la cabecera Host de la solicitud. Se acepta HTTPS o loopback en desarrollo. La respuesta de alta añade `correo`: `enviado` (aceptado por SMTP), `archivo` (buzón local), `no_disponible` o `fallido`. La interfaz nunca presenta el modo archivo como correo enviado.

Con `CORREO_MODO=smtp`, configure `SMTP_HOST`, `SMTP_PORT` 465/587, `SMTP_FROM` y las credenciales aplicables. El envío usa TLS. `npm run dev:fase1` carga automáticamente el `.env` de la raíz; las variables ya presentes en el proceso tienen prioridad. El puerto es `PORT` o, si se omite, 3080. Se debe detener la instancia anterior y volver a ejecutar el comando después de editar la configuración. El arranque indica SMTP o buzón local sin mostrar credenciales. Si falta `CORREO_MODO`, su valor por defecto sigue siendo `archivo`, sin correo externo, aunque existan datos SMTP. Las copias locales quedan en `.local/cms/correos/`, fuera de Git; contienen un enlace privado y deben tratarse como datos de acceso. Se ha comprobado la conexión y autenticación del SMTP configurado localmente el 6 de noviembre de 2026, sin enviar mensajes de prueba; la entrega real sigue pendiente de comprobar con una consulta.

Si el proveedor rechaza el envío, la consulta conserva su folio y su acceso y devuelve éxito de registro con advertencia de correo. Se guarda solo el estado y momento del intento en `correoConfirmacion` y una acción de auditoría sin datos personales ni clave. No se reintenta automáticamente el correo, no se envían notificaciones de respuesta ni se ofrecen reenvíos públicos por correo. Las consultas anteriores no reciben correos retroactivos: sus claves originales no se pueden reconstruir desde la huella almacenada.

El enlace contiene una clave aleatoria y es personal: quien lo tenga podrá leer esa consulta. El folio solo no permite verla. La clave viaja en el fragmento de la URL, que el navegador no envía al pedir la página; el cliente la presenta a la API mediante el cuerpo de una solicitud POST. El servidor conserva su huella SHA-256. No se ofrece consulta pública por nombre o correo ni se imprime la clave en la bitácora.

## Atención por la responsable

Entrar al panel con rol responsable o administrador. En «Solicitudes y participantes», al inicio del gestor, pulsar «Consultas de talleres», leer la pregunta y los mensajes adicionales, escribir la respuesta y pulsar «Publicar respuesta». La respuesta aparece al visitante en su enlace privado. También están disponibles las consultas dentro de la edición del taller. Se conserva la fecha, la versión del registro y la auditoría de la cuenta que respondió. El apartado central permite buscar por nombre, correo o folio y filtrar por taller, junto con las categorías de inscripciones y servicio social.

La respuesta admite hasta 2000 caracteres y texto sin HTML. Los estados son pendiente y respondida. El control de versiones rechaza respuestas basadas en una versión anterior para que se recargue la consulta. Un taller con consultas no puede eliminarse; puede despublicarse y conservar su historial.

## Servicio social

Los botones «Solicitar Información» de las tarjetas llevan al formulario de servicio social y seleccionan el programa elegido. Las solicitudes se envían desde la web y se consultan en el apartado de servicio social del gestor. El seguimiento privado con respuestas implementado aquí corresponde a consultas de talleres.

## API y persistencia

| Ruta bajo `/api/v1`                          | Uso                                                                                                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `POST /publico/talleres/:id/consultas`       | Alta pública con aviso, consentimiento y origen autorizado. Cinco intentos por IP y hora. Devuelve folio, clave de acceso y resultado de correo. |
| `POST /publico/consultas-talleres/consultar` | Consulta individual mediante folio y clave. Sesenta intentos por IP y hora; respuesta sin caché.                                                 |
| `GET /talleres/:id/consultas`                | Lista privada de solicitudes del taller; solo responsable y administrador. No devuelve la huella de acceso.                                      |
| `POST /consultas-talleres/:id/respuestas`    | Respuesta por responsable o administrador, con versión y control de origen.                                                                      |

Los datos se guardan en el mismo estado transaccional del gestor, en archivos para la revisión de una sola instancia y en `cms_estado` con MySQL. La adaptación de estados anteriores añade la colección sin alterar cuentas, contenido ni inscripciones existentes. La prueba MySQL comprueba la conservación de una respuesta al recrear el repositorio. Los límites de tasa conservan el alcance de un único proceso.

La versión de aviso `simce-2026-11-06-v4` incorpora el acceso privado de inscripción, su copia por correo, el historial y las acciones propias solicitados por el usuario. Los HTML v1, v2 y v3 se mantienen sin cambios para los registros históricos. La depuración de contactos y consultas a los plazos previstos continúa pendiente de implementación, como se documenta en el estado de la fase.

## Comprobaciones

La verificación general incluye pruebas de correo entregado al adaptador, fallo del proveedor, copia en archivos, origen de los enlaces y almacenamiento del navegador (datos mínimos, duplicados, borrado, datos dañados, límite y bloqueo). El ciclo de navegador comprueba regreso al sitio, recuperación desde el botón de la copia local, cambio de navegador, borrado de datos y almacenamiento bloqueado, además de respuesta desde panel, servicio social e inscripciones. Estas pruebas no acreditan entrega SMTP real. Las evidencias sintéticas están en `artifacts/fase-2/`, fuera de Git; no se añaden solicitudes ficticias al contenido local de revisión.
