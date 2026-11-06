# Gestor de contenido

## Revisión local

Con Node.js 24, instale dependencias, ejecute `npm run build` y después `npm run dev:fase1`. Abra `http://127.0.0.1:3080/panel/`. El archivo privado `.local/cms/acceso-inicial.json` contiene la cuenta sintética inicial; cambie su contraseña en el primer acceso. El portal está en la misma dirección, sin `/panel/`.

Los reinicios conservan `.local/cms/estado.json` y `.local/cms/medios/`. El comando no borra usuarios ni reemplaza contraseñas. El archivo de acceso inicial deja de representar la contraseña vigente cuando se cambia; puede eliminarse después de guardar la nueva contraseña en un gestor seguro. Ninguno de estos archivos se versiona.

## Permisos

| Rol           | Alcance                                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Editor        | Leer contenido, crear y modificar borradores, subir/recortar imágenes, vista previa y restaurar versiones como borrador. |
| Responsable   | Lo anterior, publicar, despublicar, eliminar, regenerar HTML y consultar auditoría e intereses.                          |
| Administrador | Mismos permisos de contenido que responsable. El alta de cuentas requiere el comando administrativo.                     |
| Operador      | Acceso al prototipo operativo; sin acceso al gestor de contenido.                                                        |

Las contraseñas requieren al menos diez caracteres y se rechazan prefijos comunes. El servidor guarda Argon2id con 64 MB, tres iteraciones y paralelismo uno. El acceso dura 30 minutos; el refresco opaco dura hasta 30 días, rota en cada uso y se guarda como hash. Una reutilización revoca la familia. El token de acceso permanece en memoria; la cookie de refresco es HttpOnly, SameSite Strict y Secure en producción. Después de ocho horas sin actividad se exige iniciar sesión. Las escrituras verifican el origen autorizado y los permisos del usuario actual.

## Preparar y publicar

1. Seleccione el tipo de contenido y una entrada, o pulse «Crear entrada».
2. Complete nombre, descripción y campos propios del tipo. En listas, escriba un elemento por línea. Use el orden numérico para determinar la posición.
3. En imágenes, escriba un texto alternativo; seleccione un archivo y, si hace falta, ajuste el rectángulo del recorte. Suba la imagen y asóciela al borrador.
4. Pulse «Guardar borrador». Una edición no reemplaza la versión que el visitante ve hasta que se publica nuevamente.
5. Use «Vista previa» y revise el texto, recorte, contraste y contexto. La vista previa no publica ni habilita una URL pública de borrador.
6. Con una cuenta responsable o administradora, marque la revisión y pulse «Publicar». Abra «Ver portal» para comprobar el resultado.

«Despublicar» retira la entrada y conserva su borrador. «Eliminar entrada» la elimina del gestor; la información institucional es única y no puede eliminarse. Una sección de área referenciada por actividades no se puede borrar. Eliminar no elimina automáticamente imágenes ni la bitácora; la política de conservación y purga debe acordarse antes del alojamiento institucional.

La edición es de texto plano; HTML, scripts y SVG subidos se rechazan. Los borradores pueden estar incompletos. Al publicar se exigen datos mínimos por tipo: imágenes y texto alternativo en productos y prácticas, asignatura/ámbito en prácticas, clave y licenciaturas en programas, fechas en convocatorias abiertas y contacto/objetivo en información institucional. Esta validación comprueba presencia y formato, no la veracidad institucional.

El gestor conserva las tres versiones anteriores. «Restaurar» copia una versión al borrador; requiere revisión y nueva publicación para cambiar el portal. Si otra persona guardó mientras se editaba, el servidor rechaza la versión antigua para evitar sobrescribirla: vuelva a seleccionar la entrada y revise los cambios.

## Talleres y servicio social

Los talleres se muestran en «Talleres y avisos», con estado informativo, convocatoria abierta, cerrado o concluido. La convocatoria abierta exige fechas de inicio y conclusión válidas. La información de costo y requisitos es texto revisable. No hay registro de asistentes ni pagos en Fase 1.

El formulario de interés de servicio social exige un aviso configurado con `AVISO_INTERES_URL` y `AVISO_INTERES_VERSION`. El usuario autoriza el aviso `simce-2026-11-06-v1`, incluido en `/privacidad/simce-2026-11-06-v1.html`; el lanzador local lo configura por defecto. El alojamiento institucional debe configurar ambos valores y servir el portal por HTTPS. También se admiten avisos externos HTTPS. Vaciar explícitamente ambos valores deshabilita el formulario. Se exige consentimiento y se guarda la versión aceptada. Responsable/administrador consultan las solicitudes sin exponerlas en el HTML ni en la respuesta pública. No se envían correos de interés automáticamente; la depuración y los respaldos se operarán conforme al aviso autorizado y los instrumentos aplicables.

## Estado de publicación

«Portal actualizado» indica que la revisión del HTML coincide con el contenido publicado. Si la generación falla, la publicación queda guardada y se informa el error; el HTML previo puede seguir visible. Pulse «Regenerar portal» cuando el servicio esté disponible y compruebe nuevamente el portal. El arranque también regenera desde la base persistida.

La generación usa los archivos compilados `dist/plantilla.html` y `dist-ssr/entry-server.js`; deben desplegarse juntos con los recursos del cliente. Para una modificación de código, compile y reinicie la API. Cambiar contenido desde el gestor no necesita recompilar ni reiniciar.

## Persistencia y operación

En producción se exige MySQL. La migración `202610270001_gestion_contenido.js` crea `cms_estado`: un agregado JSON transaccional para el equipo editorial inicial. Las escrituras toman bloqueo de fila y validan la versión de cada entrada. Usuarios, sesiones, auditoría e intereses se mantienen fuera de la proyección pública. Las imágenes viven en el volumen privado del gestor.

Esta implementación admite una sola instancia de API publicadora y almacenamiento local persistente de medios. El bloqueo de base evita perder escrituras, pero la cola de generación y los límites de intentos son de proceso. Antes de escalar a varias réplicas se necesita cola compartida, límites distribuidos y almacenamiento común de imágenes. El modo de archivo no coordina procesos: detenga el servidor antes de ejecutar comandos que modifiquen ese archivo. La política de respaldo debe incluir MySQL y medios juntos.

## Cuentas institucionales y endpoints

El alta usa `packages/api/scripts/crear-usuario.js correo rol`, con las mismas variables de base, secreto JWT y orígenes que la API. Recibe la contraseña inicial por entrada estándar, nunca como argumento. Rechaza cuentas existentes y exige cambiar la contraseña al entrar. La guía de [staging](../despliegue/staging.md) contiene el procedimiento sin incluir secretos. No hay registro público de cuentas.

«Olvidé mi contraseña» permite solicitar un enlace de un solo uso de 30 minutos. En desarrollo, los mensajes se guardan en el buzón privado `.local/cms/correos/`, sin envío externo. El restablecimiento revoca las sesiones y enlaces anteriores y devuelve al login; el cambio inicial también permite volver al acceso. Para producción se debe configurar SMTP con TLS y el origen público HTTPS. El detalle y los ensayos están en [validacion-local.md](validacion-local.md).

Las imágenes de «Galería» incorporan el selector «Área de la galería». Una fotografía publicada aparece en el desplegable de su área y en la galería general; sin área seleccionada solo aparece en la galería general. La galería de un área también incluye su imagen de portada sin repetirla. Las referencias antiguas se asocian sin reemplazar contraseñas ni ediciones del contenido institucional.

Los endpoints usan `/api/v1`: `auth/login`, `auth/refrescar`, `auth/salir`, `auth/clave`, `auth/yo`; `cms/entradas` para CRUD; `cms/entradas/:id/publicar`, `cms/entradas/:id/despublicar` y `cms/entradas/:id/restaurar/:version`; `cms/vista-previa`, `cms/medios`, `cms/regenerar`, `cms/auditoria` y `cms/intereses`. La proyección publicada está en `publico/contenido`; las imágenes publicadas se sirven bajo `/medios/:archivo`. Consulte `packages/api/src/cms/rutas.js` para los contratos de cuerpo y versiones. La interfaz debe ser la vía habitual de edición.
