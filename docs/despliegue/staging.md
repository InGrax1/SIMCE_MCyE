# Entorno de staging

El entorno es neutral al proveedor y reúne MySQL 8, la API y Nginx para servir el portal y el panel bajo un solo origen.

## Preparación

1. Instale Docker con Compose.
2. Copie `.env.example` a `.env`.
3. Sustituya todos los marcadores de contraseñas por secretos locales.
4. Mantenga `.env` fuera de Git.

## Inicio

```bash
docker compose -f compose.staging.yml up --build -d
docker compose -f compose.staging.yml ps
```

El portal se publica en `http://localhost:8080/`, el panel en `http://localhost:8080/panel/` y la API bajo `http://localhost:8080/api/v1/`. `HTTP_PORT` permite cambiar el puerto expuesto.

La API espera a que MySQL esté disponible, ejecuta las migraciones pendientes y después inicia el servicio. Los datos se conservan en el volumen `simce_mysql`.

## Comprobación

```bash
curl http://localhost:8080/api/v1/salud
curl http://localhost:8080/api/v1/salud/listo
```

## Pendiente institucional

La selección de proveedor, subdominio, certificados, respaldos, monitoreo y responsables de operación se define durante el trámite de alojamiento. El Compose permite validar el sistema antes de esa decisión y trasladar las mismas variables a la plataforma elegida.
