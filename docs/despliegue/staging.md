# Entorno de staging

MySQL 8.4, la API y Nginx comparten un origen público. La API sirve el HTML prerenderizado actualizado, recursos, imágenes publicadas y panel. Nginx envía las peticiones a la API; no conserva una copia estática independiente del portal. La imagen de API compila el portal, su renderizador y el panel, y ejecuta con usuario sin privilegios.

## Preparación

1. Instale Docker con Compose y confirme que el motor está disponible.
2. Copie `.env.example` a `.env` y sustituya los marcadores de contraseñas y `JWT_SECRET` por secretos aleatorios propios del entorno, de al menos 32 caracteres para JWT. Mantenga `.env` fuera de Git.
3. Configure `CMS_ORIGENES` con los orígenes exactos autorizados, separados por coma, sin rutas. Use el origen real del navegador, por ejemplo `https://staging.ejemplo.edu`.
4. Configure la terminación TLS en el alojamiento o proxy externo. `NODE_ENV=production` activa cookies Secure: el acceso editorial debe probarse por HTTPS. El servidor local de revisión (`npm run dev:fase1`) es la alternativa de desarrollo sin TLS.
5. El aviso vigente `simce-2026-11-06-v3` incluye el guardado del acceso a consultas y su copia por correo, solicitados por el usuario. Está en `/privacidad/simce-2026-11-06-v3.html`; las páginas v1 y v2 se conservan. Para habilitar interés, consultas e inscripciones, configure `AVISO_INTERES_URL` y `AVISO_TALLERES_URL` con esa ruta, y ambas variables `*_VERSION` con `simce-2026-11-06-v3`. La ruta hereda el origen HTTPS del alojamiento. Mantenga cada pareja vacía si desea deshabilitar ese formulario. No utilice un aviso de ejemplo.
6. Configure `PANEL_ORIGEN_PUBLICO` y `PORTAL_ORIGEN_PUBLICO` con sus orígenes HTTPS definitivos, sin rutas ni barra final. El segundo se utiliza en los botones de los correos de consultas; si se omite, se usa el del panel. Compose usa `CORREO_MODO=smtp`; complete `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM` y las credenciales del proveedor para habilitar la recuperación de contraseña y las copias de consultas de talleres. La entrega SMTP real queda pendiente de prueba. El buzón de archivo se limita a desarrollo y se rechaza en producción.

Para crear únicamente MySQL local y aplicar migraciones/semillas existe `npm run db:local`. La API no requiere semillas operativas para cargar el contenido inicial del portal; sí requiere sus migraciones.

## Inicio y cuentas

```bash
docker compose -f compose.staging.yml config --quiet
docker compose -f compose.staging.yml up --build -d
docker compose -f compose.staging.yml ps
```

El proxy escucha por defecto solo en `127.0.0.1:8080`, con `HTTP_BIND_ADDRESS` y `HTTP_PORT` configurables. El alojamiento puede colocar el proxy TLS delante de ese puerto. El portal, panel y API están en `/`, `/panel/` y `/api/v1/` del mismo origen. No exponga HTTP sin TLS como acceso institucional.

La API espera MySQL, aplica las migraciones y regenera el HTML desde la base antes de iniciar. No se crea automáticamente una cuenta institucional.

Compose configura `TRUST_PROXY_HOPS=1` porque la API solo recibe tráfico por Nginx dentro de la red privada de contenedores. Fuera de Compose, la API no confía en cabeceras de dirección reenviada. Mantenga el puerto de API privado para que los límites de intentos usen la dirección proporcionada por ese proxy controlado. Si se agrega otro proxy frontal, revise la cadena de confianza y los límites antes de exponer el entorno.

Para crear la cuenta en PowerShell, introduzca la contraseña de forma oculta y envíela por entrada estándar:

```powershell
$claveInicial = Read-Host 'Contraseña temporal de al menos 10 caracteres' -AsSecureString
$credencialTemporal = [System.Net.NetworkCredential]::new('', $claveInicial)
$credencialTemporal.Password | docker compose -f compose.staging.yml exec -T api node packages/api/scripts/crear-usuario.js responsable@ejemplo.edu responsable
Remove-Variable credencialTemporal, claveInicial
```

Sustituya el correo por el de la persona autorizada. Los roles disponibles son `editor`, `responsable`, `admin` y `operador`. El comando no modifica cuentas existentes. La contraseña debe cambiarse en el primer acceso y comunicarse mediante el canal institucional autorizado, fuera del repositorio y de los registros. La aplicación no envía mensajes de alta automáticamente.

## Persistencia, publicación y recuperación

- `simce_mysql` conserva la base operativa y `cms_estado`, con usuarios, contenido, sesiones, auditoría e intereses.
- `simce_cms` conserva las imágenes privadas subidas. Solo se sirven públicamente al asociarlas a una entrada publicada.
- El HTML generado reside en la instancia de API; se reconstruye desde MySQL y el renderizador compilado al recrear el contenedor.

Respalde y restaure base y medios como un conjunto; documente frecuencia, cifrado, acceso, retención y una prueba de restauración antes de operar oficialmente. No use `down -v` para un reinicio habitual: elimina los volúmenes. Se despliega una sola instancia publicadora; el detalle de esta limitación está en [gestor-contenido.md](../fase-1/gestor-contenido.md).

El cambio de contenido se guarda antes de generar el HTML. Un error deja un estado de publicación pendiente; «Regenerar portal» vuelve a intentarlo sin perder el borrador. Verifique que la revisión del HTML coincide y que las imágenes se ven desde una sesión pública. Para una actualización de código, despliegue juntos HTML base, renderizador y recursos; no mezcle versiones.

## Comprobación y situación actual

Compruebe `/api/v1/salud` y `/api/v1/salud/listo`, el inicio de sesión por HTTPS, el reinicio sin pérdida de datos y el recorrido de [aceptacion-institucional.md](../fase-1/aceptacion-institucional.md). Ejecute también las pruebas MySQL del pipeline y conserve su evidencia.

Por indicación del usuario, al 2026-10-28 las pruebas del alojamiento quedan diferidas porque todavía no existe servidor. Docker continúa sin motor disponible en esta máquina; no se declara comprobado el arranque de sus contenedores. Sí se verifican MySQL nativo 8.0.44, persistencia/reinicio y respaldo/restauración en instancias locales aisladas mediante [la guía local](../fase-1/validacion-local.md). El recorrido de navegador también se prueba con almacenamiento de archivo aislado. No se ha publicado una dirección de staging institucional.

La selección de proveedor, subdominio, certificados, respaldos, monitoreo y responsables de operación sigue pendiente de la institución. Para producción también debe acordarse la separación de permisos de migración y operación de base, la gestión de cuentas y la conservación/eliminación de datos personales.
