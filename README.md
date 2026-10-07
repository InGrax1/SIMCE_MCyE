# SIMCE MCyE

Repositorio del Sistema Integral de Manejo, Control y Entrega. La base técnica implementa la Fase 0 descrita en `Especificacion_SIMCE_MCyE_v0.2.docx`: dominio compartido, API por capas, portal estático, panel PWA con persistencia local, sincronización idempotente y entorno de staging.

## Requisitos

- Node.js 24 LTS
- npm 10 o posterior
- Docker con Compose para el entorno MySQL de staging

## Instalación

```bash
npm ci
npm run check
npm run build
npm run prototype
```

`npm run prototype` ejecuta el caso sintético completo con la etiqueta `2010101086955`, precio verificado de `$185.00/kg`, importe de `$86.95` y peso reconstruido de `0.470 kg`. La ejecución simula una respuesta perdida después de que el servidor aplica el cierre y verifica que el reenvío conserva un solo folio. Los archivos de evidencia se escriben en `artifacts/`, fuera del control de versiones.

## Desarrollo local

Antes del primer inicio, cree MySQL 8, aplique las migraciones y cargue los datos semilla:

```powershell
npm run db:local
```

El comando usa Docker Compose, conserva los datos en el volumen `simce_mysql` y puede ejecutarse nuevamente sin duplicar el esquema. Si `.env` no existe, lo crea desde `.env.example`; los marcadores de secretos se sustituyen por valores locales aleatorios y el archivo permanece fuera de Git. Para aplicar únicamente las migraciones use `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/crear-base-datos-local.ps1 -OmitirSemillas`.

En terminales separadas:

```bash
npm run dev:api
npm run dev:panel
npm run dev:portal
```

La API queda en `http://127.0.0.1:3000`, el panel en la dirección indicada por Vite bajo `/panel/` y el portal en la dirección indicada por Vite. El panel redirige `/api` a la API local durante el desarrollo.

## Paquetes

- `packages/dominio`: reglas puras de EAN-13, dinero, peso, remisiones e inventario.
- `packages/api`: API Express, sincronización, repositorios y migraciones Knex/MySQL.
- `packages/panel`: PWA React, IndexedDB con Dexie, cola local y PDF provisional.
- `packages/portal`: portal React prerenderizado durante la compilación.
- `deploy`: imágenes y proxy para el entorno de staging.
- `docs`: decisiones técnicas, validación del prototipo y estado de la fase.

## Configuración

`.env.example` contiene únicamente marcadores. Debe copiarse a un archivo `.env` local y sustituirse con valores propios del entorno. `.env` está excluido de Git.

Para usar MySQL, configure `STORAGE=mysql` y las variables `DATABASE_*`. El despliegue con Compose se documenta en [docs/despliegue/staging.md](docs/despliegue/staging.md).

## Estado

El alcance técnico de Fase 0 está construido y probado. El cierre institucional permanece condicionado a la confirmación del alojamiento y a la validación física de la báscula. El detalle y los responsables funcionales están en [docs/fase-0/estado.md](docs/fase-0/estado.md).

La Fase 1 está iniciada con la vista principal del portal público basada en el diseño de Figma proporcionado. Para verla ejecute `npm run dev:portal`; incluye navegación adaptable, actividades y catálogo interactivos, contacto y salida prerenderizada. La gestión de contenido y la validación institucional de la fase siguen pendientes. Consulte [docs/fase-1/estado.md](docs/fase-1/estado.md).
