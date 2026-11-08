# SIMCE MCyE

Sistema Integral de Manejo, Control y Entrega. Incluye el prototipo de Fase 0, el portal y gestor de Fase 1, los talleres e inscripciones de Fase 2 y el núcleo operativo de Fase 3, según `Especificacion_SIMCE_MCyE_v0.2.docx`.

## Requisitos e instalación

- Node.js 24 LTS y npm 10 o posterior.
- Docker con Compose para MySQL y staging.

```bash
npm ci
npm run check
npm run build
npm run dev:fase1
```

El último comando abre un servidor local en `http://127.0.0.1:3080/`; el gestor se encuentra en `http://127.0.0.1:3080/panel/`. La cuenta sintética inicial se guarda en `.local/cms/acceso-inicial.json` y exige cambiar su contraseña al entrar. No se imprime la contraseña en consola. El estado, las imágenes subidas y la configuración privada permanecen en `.local/cms/`, fuera de Git. Reiniciar conserva el contenido; compilar requiere reiniciar el servidor para usar el nuevo módulo de renderizado.

Este modo de revisión utiliza archivos y una sola instancia. La configuración de producción exige MySQL. La guía del gestor explica roles, imágenes, publicación y creación de cuentas: [docs/fase-1/gestor-contenido.md](docs/fase-1/gestor-contenido.md).

## Comprobaciones

```bash
npm run check
npm run build
npx playwright install chromium
npm run check:fase1
npm run check:fase2
npm run check:fase3
npm run check:mysql-local
npm run prototype
```

`check:fase1` usa datos sintéticos aislados: verifica el acceso, cambio inicial de contraseña, borradores privados, vista previa, publicación en HTML sin JavaScript, despublicación y talleres. Ejecuta axe en portal y gestor, en escritorio y móvil, y Lighthouse móvil/4G con emulación directa de red y CPU. Exige LCP inferior a 2500 ms y cero infracciones graves o críticas de axe. Los informes y capturas se guardan en `artifacts/fase-1/`, excluido de Git. Requiere compilar antes de ejecutarlo; no altera el contenido de desarrollo.

`prototype` verifica el caso sintético de Fase 0: etiqueta `2010101086955`, precio de `$185.00/kg`, importe de `$86.95`, peso reconstruido de `0.470 kg` y reenvío idempotente del cierre después de una respuesta perdida. Las evidencias permanecen en `artifacts/`.

`check:fase3` prepara el panel PWA en Chromium, corta la red, registra un lote y una remisión por teclado, cámara sintética y captura manual. Verifica respaldo y recarga sin conexión, sincronización al reconectar, folio, reimpresión, reportes y accesibilidad.

`check:mysql-local` inicia una instancia MySQL temporal e independiente del servicio del equipo, ejecuta la integración y comprueba un respaldo cifrado con restauración en otra base vacía. Requiere los binarios MySQL; puede configurarse `MYSQLD_BIN` y `MYSQL_BIN_DIR`. La [guía de validación local](docs/fase-1/validacion-local.md) incluye el buzón privado para recuperar contraseñas, galerías por área y el procedimiento de respaldo.

## Desarrollo y MySQL

```powershell
npm run db:local
```

Crea la base MySQL local, aplica migraciones y carga las semillas sin duplicarlas. Conserva el volumen `simce_mysql`. Si falta `.env`, lo crea desde `.env.example` con secretos locales aleatorios. Para aplicar solo migraciones puede usarse `scripts/crear-base-datos-local.ps1 -OmitirSemillas`.

Para el desarrollo independiente de las vistas existen `dev:portal` y `dev:panel`; el panel redirige `/api` a la API local. Antes de iniciar `dev:api`, compile el portal y configure `JWT_SECRET`, `CMS_ORIGENES`, `STORAGE` y, si corresponde, `DATABASE_*`. Las variables se cargan en el entorno del proceso; para un archivo local puede usarse la opción `node --env-file=.env`. El comando `dev:fase1` lee automáticamente el `.env` de la raíz y configura el entorno local integrado. Las variables del proceso tienen prioridad; el puerto predeterminado es 3080 si no se define `PORT`. Para enviar copias de consultas, configure `CORREO_MODO=smtp` y los datos `SMTP_*`, y reinicie la instancia activa. El arranque indica si utiliza SMTP o el buzón de archivos, sin imprimir credenciales.

## Paquetes y configuración

- `packages/dominio`: EAN-13, dinero, peso, remisiones e inventario.
- `packages/api`: API Express, autenticación, gestor, publicación, sincronización y persistencia MySQL.
- `packages/panel`: gestor React y operación PWA con IndexedDB.
- `packages/portal`: portal React prerenderizado, con Anime.js y recursos del diseño original.
- `deploy`: imágenes y proxy del entorno de staging.
- `docs`: decisiones, instrucciones y evidencias de las fases.

`.env.example` contiene marcadores; `.env` y `.local/` están excluidos de Git. No utilice las cuentas sintéticas ni los secretos locales en un alojamiento institucional. El despliegue, los volúmenes y TLS se explican en [docs/despliegue/staging.md](docs/despliegue/staging.md).

## Estado

Los talleres permiten [consultar y recibir respuestas dentro de la web](docs/fase-2/consultas-web.md). «Inscribirme al taller» reserva plaza y permite [consultar la inscripción, cancelarla o reactivarla y ver su historial](docs/fase-2/seguimiento-participantes.md). Las solicitudes de servicio social también tienen folio y conversación privada. Los accesos se guardan en el navegador y se respaldan por correo cuando SMTP está habilitado. El [panel](docs/fase-2/atencion-solicitudes.md) separa Solicitudes, Participantes, Talleres, Contenido y Bitácora; permite cancelar y reabrir solicitudes con historial desde su detalle.

La Fase 2 incorpora inscripciones con consentimiento y folio, cupo concurrente, lista privada, exportación CSV/PDF y acciones con historial. El aviso y los roles fueron autorizados por el usuario. El entorno integrado, iniciado con `dev:fase1`, configura el aviso local y muestra el formulario para los talleres publicados dentro de periodo y con cupo. Consulte el [estado de Fase 2](docs/fase-2/estado.md) y la [guía de talleres](docs/fase-2/talleres-inscripciones.md).

La Fase 1 tiene gestor, publicación conectada al HTML público, galerías por área, recuperación de contraseña, talleres y controles locales. Conserva el diseño de Figma. El 6 de noviembre de 2026, el usuario confirma la aceptación del contenido y autoriza el [aviso de privacidad](docs/privacidad/aviso-privacidad-simce.md) y los [roles](docs/operacion/cuentas-institucionales.md). Se crea por su instrucción un administrador de pruebas local con entrega privada en `.local/cms/acceso-admin-pruebas.json`; exige cambiar la contraseña inicial. El aviso se consulta desde el pie del portal y los formularios. El 7 de noviembre, el usuario reporta la [prueba local de publicación](docs/fase-1/registro-publicacion-responsable.md) y confirma el funcionamiento en teléfono y de los correos. El despliegue queda para cuando se complete el proyecto. Consulte [docs/fase-1/estado.md](docs/fase-1/estado.md).

La sección **Operación** del panel reúne el catálogo, la producción, el kardex, las remisiones, el escaneo y los reportes. La [guía de Fase 3](docs/fase-3/estado.md) explica la preparación del dispositivo, el trabajo sin conexión y los pendientes de aceptación institucional.

El alojamiento, subdominio y TLS y la comprobación física de la báscula continúan pendientes institucionales de [Fase 0](docs/fase-0/estado.md).
