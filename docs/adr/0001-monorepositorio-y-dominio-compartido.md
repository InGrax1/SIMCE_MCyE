# ADR 0001: Monorepositorio y dominio compartido

- Estado: aceptada para Fase 0
- Fecha: 2026-09-06

## Contexto

El panel debe ejecutar las reglas de etiqueta y remisión sin conexión, mientras la API debe verificar las mismas reglas al recibir operaciones. Duplicar cálculos entre cliente y servidor crearía diferencias en importes, peso y estados.

## Decisión

El proyecto usa npm workspaces. `@simce/dominio` contiene JavaScript ESM puro, sin dependencias de React, Express, IndexedDB o MySQL. El panel y la API consumen ese paquete.

Los importes se expresan como centavos enteros y el peso como gramos enteros. La reconstrucción de peso usa `BigInt` para el redondeo a la resolución de la báscula y evita aritmética monetaria de punto flotante.

## Consecuencias

La misma etiqueta produce el mismo resultado en navegador y servidor. Los cambios de reglas requieren pruebas del dominio antes de integrarse. El paquete no puede depender de infraestructura específica.
