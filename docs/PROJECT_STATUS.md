# Estado del proyecto

Actualizado: 2026-10-15. Versión de trabajo: `0.0.1-dev`.

## Fase actual

**Fase 0: viabilidad en ejecución.** No hay aplicación comercial terminada ni
módulos de gestión habilitados. El punto de entrada conduce al diagnóstico.

## Trabajo conservado

- Repositorio remoto del usuario clonado; inicialmente vacío.
- Requisitos originales completos conservados sin recortar alcance.
- Diseño de arquitectura, entidades, relaciones e invariantes en documentación.
- Diagnóstico independiente con datos sintéticos, CSS y scripts clásicos locales.
- IndexedDB, Blob, commit, rollback, marcador persistente, control de pestañas,
  descarga y selección de JSON implementados en la prueba.
- Política CSP sin conexiones, objetos ni formularios externos.
- Ejecutores de pruebas reales en perfiles aislados; resultados en preparación.
- 23 comprobaciones estáticas superadas el 2026-10-15.

## Decisiones

No servidor ni hosting; sin módulos ES ni peticiones a JSON local. IndexedDB
será la única persistencia de negocio. No se aceptan datos reales antes de
completar núcleo, protección de datos e interfaz funcional. Los diagnósticos
y perfiles de desarrollo nunca se confunden con una copia comercial.

El desarrollo sigue las fases 0–12 del documento fuente. La licencia comercial
y las verificaciones de dependencias quedan pendientes antes de distribución.

## Pruebas y límites actuales

Resultados de navegador aún en ejecución. Consultar `COMPATIBILITY.md` y
los JSON originales cuando se cierre la fase. La emulación de tamaño no
acredita móviles/tablets reales. Las pruebas posteriores de negocio, backup,
restauración e importación siguen pendientes.

## Siguiente acción concreta

Cerrar los resultados de Chrome/Edge/Firefox estables bajo `file://`, incluido
cierre completo y reapertura con bytes del Blob, denegación de almacenamiento,
segunda pestaña y cambio de carpeta. Si la matriz obligatoria pasa, comenzar
fase 1 con el núcleo persistente y pruebas de integridad; después fase 2 antes
de formularios de negocio. Si falla, documentar evidencia y resolver el bloqueo.

## Continuidad entre equipos y cupo

Repositorio: https://github.com/JoseAQuinto/WebProtectoraAnimales.git

Hacer commits y push de avances coherentes. Comprobar periódicamente el cupo
de la ventana de **300 minutos**. `usedPercent` es lo consumido: detener el
desarrollo cuando `100 - usedPercent < 20`. Guardar estado, pruebas, defectos
y siguiente paso, hacer commit y push antes de terminar. No usar un reinicio
de cuota sin indicación del usuario. Este umbral se aplica también al trabajo
delegado. No es necesario esperar al umbral si existe un bloqueo real.

Para continuar desde otro PC: clonar/pull del repositorio y leer este archivo,
`COMPATIBILITY.md` y los requisitos. `.tmp` y `.tools` son herramientas y perfiles
locales ignorados; no contienen avances de código necesarios. Los datos de una
futura organización no viajarán con Git: será necesario backup y restauración.
