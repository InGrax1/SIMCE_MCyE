# Reglas permanentes del repositorio

Estas reglas se aplican a toda modificación de este repositorio.

## Flujo de Git

- Nunca trabajar ni crear commits directamente en `main` o `master`.
- Crear una rama breve y descriptiva desde el inicio de cada fase, funcionalidad importante o tarea, con prefijos como `feature/`, `bugfix/`, `refactor/` o `docs/`.
- Durante una fase, abrir las ramas de funcionalidad y de tarea a partir de la rama de la fase e integrar en ella los cambios probados.
- Sincronizar la rama principal con `git pull --ff-only` antes de iniciar trabajo y antes de integrar o subir cambios.
- Integrar en la rama principal cuando el alcance completo esté terminado, probado y estable y el usuario indique la integración.
- No usar `git push --force` ni reescribir el historial de ramas compartidas.

## Commits

- Cada commit debe contener un solo cambio lógico y poder revertirse de forma aislada.
- Usar títulos en español y en imperativo con Conventional Commits:
  - `feat:` para funcionalidad.
  - `fix:` para corregir errores.
  - `refactor:` para mejoras internas sin cambiar el comportamiento.
  - `docs:` para cambios exclusivos de documentación.
- Separar correcciones o mejoras no relacionadas en commits distintos.

## Archivos y secretos

- Mantener `.gitignore` actualizado para excluir dependencias, compilados, cobertura, temporales del sistema y configuraciones locales.
- No versionar `.env`, contraseñas, tokens, claves privadas ni credenciales de ningún tipo.
- Proporcionar solo ejemplos como `.env.example`, con valores ficticios o marcadores explícitos.
- Revisar los archivos preparados antes de cada commit para evitar datos sensibles y artefactos generados.

## Validación

- Ejecutar las pruebas, el análisis estático y la compilación aplicables antes de integrar una rama.
- Mantener `main` o `master` en condiciones de despliegue.

