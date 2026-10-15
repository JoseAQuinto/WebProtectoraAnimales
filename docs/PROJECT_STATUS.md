# Estado del proyecto

Actualizado: 2026-10-15. Versión de trabajo: `0.1.0-dev`.

## Fase actual

**EN PAUSA POR CUPO: 19 % restante en la ventana de 5 horas (81 % consumido).**
Comprobado el 2026-10-15. No se ha usado ningún reinicio de cuota.

Fase 0 de escritorio superada; fase 1 parcialmente implementada. No hay aplicación comercial terminada ni
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
- Núcleo de almacenamiento coordinado implementado y probado en Chrome real
  por `file://`: 9 comprobaciones internas y 6 de navegador, todas correctas.
  Incluye commit/rollback multi-almacén, Blob, revisión obsoleta, operación
  idempotente con conflicto de intención, rechazo de callbacks asíncronos,
  escritura en conjunto ajeno, dos pestañas, lease caducado, activación atómica
  y rechazo de versión futura conservando registros. Sin formularios ni uso real.
- Comprobación estática ampliada durante integración: 104 verificaciones correctas.

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

1. Revisar este punto de pausa y comprobar el cupo antes de reanudar.
2. Completar fase 1 convirtiendo `DATA_MODEL.md` en esquemas y validadores
   ejecutables de todas las entidades, con enumeraciones e índices de negocio.
3. Añadir repositorios que usen el coordinador, revisión por registro y
   validación relacional; ampliar las pruebas reales a Edge y Firefox para
   este núcleo concreto (la sonda inicial sí pasó en ambos).
4. Armonizar nombres de almacenes/estados con el contrato definitivo. El núcleo
   actual usa `meta`, `staging` y `retired`; el diseño habla de appMeta,
   preparing y recovery. Fijar un vocabulario antes del esquema definitivo.
5. Después fase 2 de backup/restauración: incorporar dependencias locales
   verificadas, hashes, snapshot consistente, validador completo y staging
   validado antes de activar. No abrir formularios de negocio hasta proteger datos.

No hay fallo crítico conocido en los casos ejecutados. La fase 1 sigue
incompleta: no hay almacenes/servicios de negocio, esquema completo, backup,
restauración o migraciones operativas. `activateDataset` es una primitiva de
infraestructura probada con fixtures, no un restaurador validado. Antes de
usarla con datos de negocio debe exigir validación completa y comprobación
de la revisión del conjunto preparado. Las pruebas usan una base con prefijo
`animal-rescue-manager-test-`; la entrada no abre la base de producción.

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

Avances guardados: `9317dd9` (diagnóstico/documento), `8ce0e70` (viabilidad
comprobada), `384e65f` (utilidades y base), y el commit de pausa que contiene
este estado junto al núcleo transaccional y su evidencia. Consultar `git log`
para el identificador del último commit. No hay configuración personal necesaria
para continuar; las rutas de ejecutables de pruebas se ajustan en el nuevo PC.
