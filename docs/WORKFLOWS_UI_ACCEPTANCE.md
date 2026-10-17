# Aceptación de los recorridos de acogida y adopción

Fecha: 2026-10-17. Ejecutor: `tests/e2e/workflows-ui.cjs`.
Equipo `windows-wip`, Windows 11 Home 10.0.26300. Versiones del producto:
`appVersion 0.2.0-dev`, `dbVersion 2`, `schemaVersion 1`, `backupFormatVersion 1`.

## Alcance del ejecutor

Abre el `index.html` real por `file://`, con el contexto offline desde antes
de navegar y un perfil sintético exclusivo bajo `.tmp/workflows-ui-*`.
Usa los formularios visibles y los servicios de producción sin mocks.
El helper `chromium.cjs` inspecciona y cierra únicamente los procesos propios.
No utiliza servidor ni opciones para relajar protecciones de origen.

El recorrido prepara tres contactos, un perfil de acogida de capacidad uno
y dos animales. Comprueba asignación compatible; advertencias por capacidad
y especie; bloqueo sin consentimiento o motivo y conservación de campos;
excepción expresa; finalización en destino externo conservando historia y
disponibilidad. Crea dos tareas generales por la UI y verifica que calendario
y lista comparten sus registros.

Crea solicitudes sobre contactos existentes, registra entrevista, aprueba
sin reservar ni adoptar, reserva con vigencia inclusiva, completa la adopción
con motivos de cierre de acogida/reserva/otras solicitudes y decisiones
individuales para conservar o cancelar tareas. Añade una aportación económica
y un documento vinculado a la adopción; registra devolución conservando la
adopción, el documento y el episodio anterior, con un nuevo episodio enlazado.
Finalmente compara registros, dinero y bytes después de backup/restauración
y cierre completo/reapertura.

La prueba de revisión antigua contiene una intervención explícita del ejecutor:
actualiza el nombre de organización mediante el servicio real mientras el
formulario está abierto. El envío posterior de ese formulario debe fallar sin
cambios parciales y conservando sus campos. No se presenta esa intervención
como una acción realizada por el usuario en la UI. Las dobles activaciones
son dos llamadas inmediatas al botón del formulario; ejercitan su handler y
bloqueo mientras guarda, sin sustituir los servicios.

## Resultados reales y continuidad de las rondas

Chrome **155.0.8059.80** y Edge **155.0.4283.45**, versiones obtenidas mediante
CDP. Cada motor acredita las dieciséis comprobaciones mediante la siguiente
cadena de rondas sobre un mismo perfil sintético; no se presenta la última
ronda como dieciséis comprobaciones ejecutadas de nuevo.

| Ronda | Comprobaciones nuevas correctas | Evidencia Chrome | Evidencia Edge |
|---|---:|---|---|
| `close-fix` | 8; informe global fallido en el siguiente paso | [Chrome](../tests/results/workflows-ui-2026-10-17-windows-wip-chrome-close-fix.json) | [Edge](../tests/results/workflows-ui-2026-10-17-windows-wip-edge-close-fix.json) |
| `adoption-tail` | 2, más 8 heredadas; informe global fallido en devolución | [Chrome](../tests/results/workflows-ui-2026-10-17-windows-wip-chrome-adoption-tail.json) | [Edge](../tests/results/workflows-ui-2026-10-17-windows-wip-edge-adoption-tail.json) |
| `return-tail` | 6, más 10 heredadas; informe global correcto | [Chrome](../tests/results/workflows-ui-2026-10-17-windows-wip-chrome-return-tail.json) | [Edge](../tests/results/workflows-ui-2026-10-17-windows-wip-edge-return-tail.json) |

Los informes marcan cada resultado heredado con `reusedFromReport` y
`reexecuted: false`. Antes de reutilizarlo se exige el informe del mismo motor,
un checkpoint conocido, cierre previo verificado, ruta del perfil resuelta
bajo `.tmp/workflows-ui-MOTOR-TIMESTAMP/profile`, el mismo estado esperado de
registros y la misma fecha civil. Las huellas de los **63 archivos de runtime**
coinciden entre las rondas; se rechaza continuar si cambian. La ronda final
también verifica que sus fuentes permanecen intactas hasta terminar.

Se completaron adopción, documento, devolución y restauración sin duplicar
estancias, episodios, adopciones, tareas ni ingresos. La aportación es de
2.550 unidades menores EUR, con un único movimiento enlazado. La tarea elegida
para seguimiento sigue pendiente y la otra conserva el motivo de cancelación.
El documento mantiene el vínculo con la adopción tras devolver el animal.
Backup y restauración conservan el digest de todos los registros y de los
bytes reales del TXT. Tras cerrar completamente y reabrir el perfil se
conservan dataset, revisión y digest.

Todos los cierres registrados de estas rondas observaron salida 0, sin forzar,
sin error de inspección y sin identidades propias restantes. No se registraron
errores de página, errores de consola ni peticiones HTTP originadas por la
aplicación. Las capturas de calendario, acogida, adopción e historial fueron
revisadas visualmente; sus rutas y hashes se conservan en los informes y los
archivos locales permanecen bajo `.tmp`, ignorada por Git.

### Intentos y defectos del ejecutor conservados

Los primeros intentos [Chrome](../tests/results/workflows-ui-2026-10-17-windows-wip-chrome-first.json)
y [Edge](../tests/results/workflows-ui-2026-10-17-windows-wip-edge-first.json)
pasaron tres comprobaciones y fallaron al buscar Cerrar para un formulario
que usa Cancelar. Se corrigió el helper del ejecutor para distinguirlos.

La ronda `close-fix` dejó la categoría de ingreso sin seleccionar al activar
la cuota. La UI exigió ese campo y no escribió una adopción parcial. Se
corrigió el ejecutor para seleccionar la categoría Adopción. `adoption-tail`
completó entonces la adopción y documento; falló al seleccionar el índice cero
de ubicación, que corresponde a Sin especificar. La UI bloqueó la devolución
sin destino. El ejecutor ahora selecciona el UUID de la ubicación real.

Estos informes fallidos se conservan con su estado original. Los cambios
afectaron al ejecutor; no se modificó producción para conseguir el resultado.
Se continuó desde el estado verificado para evitar repetir los pasos aprobados.

## Ejecución

Elegir un nombre nuevo: el ejecutor rechaza sobrescribir evidencia existente.
Los resultados se guardan tras cada comprobación; una ejecución incompleta
no se considera aprobada. Las fuentes y sus huellas se comparan al finalizar.

```powershell
node tests/e2e/workflows-ui.cjs --browser chrome --machine EQUIPO --output workflows-ui-FECHA-chrome.json
node tests/e2e/workflows-ui.cjs --browser edge --executable RUTA_EDGE --machine EQUIPO --output workflows-ui-FECHA-edge.json
```

`--resume-report NOMBRE_JSON` está limitado a los checkpoints fallidos previos
a adopción o devolución descritos arriba; no acepta perfiles arbitrarios ni
informes correctos. Solo se utiliza cuando las fuentes y el estado siguen
coincidiendo. Para comprobar código posterior se empieza una ejecución nueva.

## Límites

Los datos son ficticios. Estas pruebas no acreditan dispositivos físicos,
Firefox actual, cuota física agotada, accesibilidad integral, rendimiento ni
aceptación comercial. El tráfico interno del navegador no forma parte de la
traza de peticiones de página. La prueba específica de vigencia inclusiva
comprueba que la UI no ofrece caducar una reserva en su último día; no cambia
el reloj del equipo ni espera hasta el día siguiente. Las pruebas anteriores
de servicios cubren por separado esa transición de fecha.

La tabla de historial animal conserva y muestra tipos, fechas y motivos; aún
no enlaza cada fila a su entidad de origen ni distingue allí todos los
parámetros de estado de solicitudes. La evidencia de persistencia no convierte
ese recorrido de navegación pendiente en una función terminada. Salud/planes
y actos clínicos requieren su aceptación específica posterior; esta ronda
solo crea tareas generales desde la UI y comparte sus registros con calendario.
