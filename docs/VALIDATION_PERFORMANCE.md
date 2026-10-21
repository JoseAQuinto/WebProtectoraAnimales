# Recorrido de validación — 2026-10-21

App 0.2.0-dev / DB 2 / schema 1 / backup 1, sin cambios de formato.

## Optimización conservadora

El validador completo inspeccionaba los descriptores de todo el dataset y repetía
ese recorrido para cada registro antes de comprobar sus campos y relaciones.
Ahora la primera inspección entrega una prueba privada de estructura al recorrido
de registros de esa misma llamada. No se almacena un resultado válido entre
operaciones, revisiones, importaciones/restauraciones o fechas de calendario.
La validación pública de un registro aislado sigue inspeccionándolo completamente.

La prueba solo incluye registros que también satisfacen los límites estructurales
de la inspección individual: 500.000 nodos y arrays de 100.000 elementos. El dataset
conserva sus límites de 16 millones de nodos/200.000 elementos y profundidad 20;
esa profundidad ya es más estricta para un registro anidado. No se ejecutan
getters ni contenido importado. Los registros que no obtienen prueba pasan por
la inspección individual ordinaria. Los errores permanecen acotados a 1.000.

Se conservan todas las validaciones de campos, fecha/contexto, UUID/dataset,
índices únicos, relaciones entrantes, ciclos, intervalos, estados, finanzas,
existencias, binarios e historia. La revisión y el lease se siguen comprobando
en la transacción de escritura; el guardado espera a su confirmación completa.

Las listas de campos de los esquemas inmutables se compilan una vez en un WeakMap.
Solo contienen referencias al esquema, nunca datos del usuario. Los esquemas
mutables no se almacenan en esa caché. No hay caché persistente ni nueva fuente
de verdad para el negocio.

## Alcance

Esta mejora elimina trabajo duplicado. **No es todavía validación incremental
por tablas afectadas**, ni sustituye snapshots completos por consultas acotadas.
Antes de omitir una regla deben modelarse sus dependencias entrantes y globales;
cambiar un contacto, catálogo o estado puede invalidar registros que no se editan.
No confiar en que un número de revisión identifique por sí solo contenido leído
de otra captura o un dato importado.

Cinco casos Node adicionales comprueban modificaciones tras validar, contexto de
fecha/dataset distinto, getter posterior sin ejecución, límites por registro
dentro del presupuesto mayor del dataset y relaciones/duplicados/esquemas.
Las mediciones y la regresión real se documentan en VOLUME.md.

## Evidencia

303 pruebas Node y 917 estáticas. Regresión de las 33 suites por motor:
`regression-2026-10-21-single-inspection.json`, 66 rondas / 918 comprobaciones,
0 fallos; cada JSON mantiene sus propias huellas. Volumen 17/17 por motor
por separado, hasta 50k y 32 MiB, según VOLUME.md. No se atribuye a esta ronda
una revisión manual de accesibilidad o nueva compatibilidad de plataformas.
