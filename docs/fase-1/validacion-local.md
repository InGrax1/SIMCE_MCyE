# Validación local de Fase 1

Al 2026-10-28 no existe servidor institucional. Los recorridos descritos aquí se ejecutan localmente y no representan aprobación de contenidos ni comprobación del alojamiento.

## Portal, gestor y correo

Con Node.js 24 y las dependencias instaladas:

```bash
npm run check
npm run build
npx playwright install chromium
npm run check:fase1
npm run dev:fase1
```

El portal está en `http://127.0.0.1:3080/` y el gestor en `/panel/`. Se conservan las cuentas y contraseñas que ya se hubieran modificado. No es necesario restablecer la cuenta para actualizar el código. Después de compilar, reinicie el servidor y recargue el panel para usar los nuevos recursos.

En el login, «Olvidé mi contraseña» solicita un enlace. En desarrollo el mensaje se guarda en `.local/cms/correos/` como JSON privado, con destinatario, asunto y texto; no se envía a un proveedor externo. Abra el archivo más reciente y utilice el enlace de su texto. No copie mensajes con enlaces vigentes a incidencias, capturas públicas ni al repositorio. El enlace expira a los 30 minutos y solo se acepta una vez. Restablecer exige una nueva contraseña, revoca las sesiones anteriores y devuelve al login.

La API devuelve el mismo mensaje para cuentas conocidas y desconocidas, limita las solicitudes y guarda únicamente la huella del enlace. Un fallo de entrega invalida el enlace de esa solicitud. En producción deben configurarse `CORREO_MODO=smtp`, `PANEL_ORIGEN_PUBLICO` HTTPS, `SMTP_HOST`, `SMTP_PORT` (465 o 587), `SMTP_FROM` y las credenciales del proveedor; no se permite el modo archivo. La configuración utiliza el [transporte SMTP de Nodemailer](https://nodemailer.com/smtp/) con TLS y verificación de certificados. La entrega real queda pendiente hasta contar con ese servicio.

## Galerías

En «Galería», edite o cree una imagen, elija «Área de la galería», escriba su texto alternativo y guarde. El borrador es privado; al publicarlo aparece tanto en la galería general como en el desplegable del área correspondiente. Seleccionar «Galería general (sin área)» conserva la imagen únicamente en la galería general.

La asociación requiere un área existente y publicada para publicar su fotografía. Una galería publicada impide despublicar su área hasta retirarla o reasignarla. El material inicial sigue siendo de referencia; no se añadieron fotografías institucionales inventadas. El modelo permite incorporar todas las imágenes autorizadas que se entreguen.

## MySQL sin Docker

En esta máquina se utiliza el ejecutable instalado de MySQL 8.0.44. El comando levanta otra instancia temporal con sus propios datos, un puerto libre, credenciales aleatorias y acceso solo por loopback:

```bash
npm run check:mysql-local
```

Si el binario está en otra ubicación, configure `MYSQLD_BIN` y, si hace falta, `MYSQL_BIN_DIR` con el directorio de `mysql` y `mysqldump`. No se conecta a las bases del servicio MySQL del equipo ni modifica `.env`. Los archivos temporales se crean fuera de OneDrive, se apaga el motor de prueba y se eliminan al finalizar. La instancia aislada otorga permiso de apagado a su usuario sintético solo para poder cerrarla; esto no es la configuración de permisos de producción.

El comando ejecuta las dos pruebas de integración de MySQL y el ensayo de respaldo. Comprueba bloqueo de escritores, persistencia al recrear el repositorio y reiniciar la API, y el folio único después del reenvío de una operación. Los informes están en `artifacts/fase-1/mysql-local.json` y `respaldo-local.json`.

## Respaldo cifrado y restauración de ensayo

El ensayo automático agrega una imagen y contenido sintéticos, genera un volcado transaccional de la base completa, incorpora todos los medios registrados con SHA-256 y cifra el conjunto con AES-256-GCM y una clave independiente de 32 bytes. Restaura en otra base `_test` vacía y carpeta vacía, compara contenido/folios/medios y vuelve a generar y servir el HTML. Las sesiones y enlaces anteriores se invalidan; los correos locales no se incluyen en el respaldo.

La herramienta también puede usarse manualmente con `DATABASE_*` configuradas para la base elegida. En PowerShell, una clave temporal se genera sin escribirla en el historial de argumentos:

```powershell
$env:RESPALDO_CLAVE = node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
npm run backup:local -- crear .local/respaldos/ensayo.simcebk .local/cms-mysql/medios
```

Conserve la clave en un gestor seguro, por separado del archivo, si necesita volver a abrir la copia. El ensayo automático usa datos y claves efímeros y elimina su copia temporal después de comprobarla.

Para restaurar, cree otra base vacía, cambie `DATABASE_NAME` al nombre de destino terminado en `_test`, use la misma clave y una carpeta nueva:

```bash
npm run backup:local -- restaurar-prueba .local/respaldos/ensayo.simcebk .local/restauracion/medios
```

La herramienta rechaza una base igual a la de origen, una base con tablas y una carpeta con archivos. Verifica autenticidad, límites, nombres de archivos y hashes antes de ejecutar el volcado o escribir las imágenes. No sustituye datos de la base original. Si el ensayo falla, no use el destino como entorno de trabajo: vuelva a preparar un destino vacío y revise el informe. La herramienta limita el volcado a 128 MB y el paquete descomprimido a 512 MB; conjuntos mayores requieren adaptar y verificar el procedimiento.

El servidor de revisión visual usa almacenamiento de archivo en `.local/cms`; el ensayo MySQL usa otras bases y carpetas sintéticas. No deben confundirse ni copiarse sus cuentas de prueba al futuro servidor. El protocolo de restauración sobre una base de producción, su retención y custodia de claves se acordará con el alojamiento; el comando actual solo restaura destinos de ensayo.

## Evidencias y repetición futura

- `resultado.json`: recorrido de publicación, galerías, teclado, tamaños de pantalla, cambio/recuperación de contraseña y errores de página.
- `lighthouse.json`: perfil móvil/4G con emulación directa de red y CPU, límite LCP inferior a 2500 ms.
- Capturas del portal, gestor, galerías y cambio de contraseña.
- `mysql-local.json` y `respaldo-local.json`: integración y ensayo de recuperación.

El directorio `artifacts/` está excluido de Git; los scripts que generan las evidencias sí se versionan. La aceptación por la responsable puede practicarse localmente con [el guion](aceptacion-institucional.md). Al existir servidor, repetir las comprobaciones sobre el origen HTTPS real, configurar correo/respaldos y registrar los resultados del alojamiento.
