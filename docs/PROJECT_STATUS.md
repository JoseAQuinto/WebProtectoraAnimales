# Estado del proyecto

Actualizado: 2026-10-15. Versión de trabajo: `0.1.0-dev`.

## Fase actual

**Fase 0 de escritorio superada; fase 1 en desarrollo.** No hay aplicación comercial terminada ni
módulos de gestión habilitados. El punto de entrada conduce al diagnóstico.

## Trabajo conservado

- Repositorio remoto del usuario clonado; inicialmente vacío.
- Requisitos originales completos conservados sin recortar alcance.
- Diseño de arquitectura, entidades, relaciones e invariantes en documentación.
- Diagnóstico independiente con datos sintéticos, CSS y scripts clásicos locales.
- IndexedDB, Blob, commit, rollback, marcador persistente, control de pestañas,
  descarga y selección de JSON implementados en la prueba.
- Política CSP sin conexiones, objetos ni formularios externos.
- Ejecutores de pruebas reales en perfiles aislados; Chrome y Edge 12/12,
  Firefox estable 15/15, con resultados originales conservados.
- 23 comprobaciones estáticas superadas el 2026-10-15.
- Utilidades de UUID criptográfico, calendario/edad/zonas, dinero exacto para
  ocho monedas, cantidades escaladas y normalización; 14/14 pruebas unitarias.
- Base de traducciones EN/ES con paridad/plurales y mapa de errores.
- JSON canónico determinista con rechazo de valores corruptos/ejecutables;
  pruebas del núcleo superadas. No implementa aún hash ni backup.
- Núcleo de almacenamiento coordinado en desarrollo y revisión, sin habilitar
  formularios ni uso real.

## Decisiones

No servidor ni hosting; sin módulos ES ni peticiones a JSON local. IndexedDB
será la única persistencia de negocio. No se aceptan datos reales antes de
completar núcleo, protección de datos e interfaz funcional. Los diagnósticos
y perfiles de desarrollo nunca se confunden con una copia comercial.

El desarrollo sigue las fases 0–12 del documento fuente. La licencia comercial
y las verificaciones de dependencias quedan pendientes antes de distribución.

## Pruebas y límites actuales

Consultar `COMPATIBILITY.md` y los JSON originales. La emulación de tamaño no
acredita móviles/tablets reales. Las pruebas posteriores de negocio, backup,
restauración e importación siguen pendientes.

## Siguiente acción concreta

Completar fase 1: utilidades y núcleo persistente con pruebas de integridad,
esquemas y validadores de las entidades de negocio. Fase 2 de backup/restauración
antes de formularios. La puerta inicial de escritorio está superada; no se
anuncia compatibilidad comercial ni de dispositivos todavía no comprobados.

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
