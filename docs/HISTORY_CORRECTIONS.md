# Correcciones históricas coordinadas — 2026-10-19

Primer bloque publicado: **fecha de entrada y de devolución** desde Historial
del animal. No es todavía un editor general de hechos. Versiones sin cambios:
app `0.2.0-dev`, DB `2`, schema `1`, backup `1`.

## Comportamiento

La acción aparece en eventos actuales `entry`/`return` con origen inequívoco
`stay_episode`. Requiere animal y episodio restaurados, un solo evento vigente
para esa entrada, y coincidencia entre hecho y origen. El formulario muestra
animal, tipo, fecha anterior, efectos coordinados y límites de calendario.
Exige fecha distinta, motivo de 1–200 caracteres y consentimiento explícito.

- Entrada: actualiza únicamente `stayEpisodes.entryDate` del mismo UUID.
- Devolución: actualiza además `adoptions.returnDate` de la adopción enlazada.
  Conserva el motivo original de devolución/entrada, episodio anterior, estado
  actual, ubicación, disponibilidad, acogidas y demás hechos.
- Se conserva el evento anterior, incluidos fecha, instante de registro, fuente,
  parámetros y origen. Incrementa su revisión y apunta al sustituto mediante
  `supersededByEventId`. El nuevo tiene `correctsEventId`, fecha corregida,
  instante actual y motivo de corrección. Las correcciones sucesivas forman cadena.
- Un único `activityLog` de operación `correct` enlaza anterior/sustituto.
  No crea otra entrada, adopción, ingreso, tarea, movimiento de stock ni archivo.
- La consulta oculta versiones sustituidas inicialmente; su opción de inclusión
  permite ver fecha original, marca y motivo. El sustituto se identifica como
  corrección y permite una corrección posterior con revisión nueva.

La nueva fecha no puede cruzar nacimiento, episodio vecino, salida, fecha de la
adopción devuelta, inicio de acogida ni hechos vigentes del episodio. Una fuente
con episodio explícito prevalece sobre inferir por fecha: una adopción anterior
el mismo día no fija falsamente el límite de la nueva entrada devuelta. Los
pesos no enviados a papelera dentro del episodio también limitan la fecha,
aunque no generen evento. No se desplazan hechos relacionados silenciosamente.

## API y persistencia

`services/history-corrections.js` ofrece:

- `inspect(tables, eventId, today)`: revisión pura con origen/filas afectadas,
  fecha anterior y límites; no escribe.
- `canCorrect(tables, event)`: elegibilidad de presentación.
- `correct({eventId,date,reason,confirmed:true}, command)`: reconstruye la
  revisión sobre el snapshot actual y prepara todos los cambios en un commit.

`command` mantiene operationId y expectedRevision del formulario. Contexto y
repositorio protegen dataset/lease/revisión/fingerprint, revisiones por registro,
validación completa e idempotencia. Guardado solo tras transaction.complete.
El mismo intento confirmado no repite efectos. Formulario antiguo conserva
campos y se rechaza; la UI de una pestaña sin control desactiva la corrección.

El repositorio también impide sobrescribir fecha/tipo/instante/fuente/parámetros
de un evento ya guardado o retirar/redirigir su corrección. Restaurar reconstruye
la cadena sin ejecutar otra vez comandos de negocio. La copia completa incluye
todos los eventos sustituidos; una exportación parcial no la sustituye.

## Evidencia real

`history-corrections-ui-2026-10-19-{chrome,edge}-owned-identities.json`:
**17/17 por motor**, 110 fuentes intactas, file:// offline en perfiles propios.
Preparación sintética por servicios reales: entrada, adopción/cuota única,
devolución, acogida, tarea, saldo de stock y TXT incorporado.

Incluye UI de corrección/doble envío, fecha igual/cancelación sin escritura,
repetición por operationId, versiones actuales/anteriores, formulario antiguo y
trabajo concurrente conservados, límites/consentimiento, traspaso de control,
EN/ES y 360/768/1440, copia descargada/reseleccionada/verificada y restaurada,
dos cierres propios/reapertura con digest/revisiones/hashes reales de bytes iguales.
Captura estrecha ES inspeccionada. Sin errores de página/consola ni HTTP de página.

Una prueba inyecta explícitamente AbortError antes de añadir el sustituto en una
transacción IndexedDB real, después de encolar actualizaciones de origen. El
snapshot queda exactamente igual. Es una prueba de rollback, no un fallo físico
de disco ni una cancelación del usuario. Otra intenta sobrescribir directamente
la fecha anterior y recibe `ImmutableHistoryError` del repositorio real.

Los primeros intentos conservados fallaron en preparación del ejecutor: UUID del
perfil (`id`, no fosterProfileId) y nombre de mínimo (`minimumStockScaled`).
La ronda Edge `fixture-fields` pasó 17/17; Chrome pasó negocio y reapertura pero
falló al clasificar como descendiente un proceso anterior a su supuesto padre
por reutilización de PID. Su intento de terminar ese proceso recibió EPERM.
Se corrigió el lanzador: raíz verificada por perfil/instante/identidad, hijos
posteriores al padre y terminación solo de identidades verificadas. Cuatro
pruebas Node reproducen los casos; las rondas finales cierran sin remanentes.
No se transforma esa ronda fallida en aceptación completa.

Verificación conjunta: **242 Node / 812 estáticas**. Nueve pruebas del comando
cubren pureza, cadena/replay, relaciones, límites, pesos, consentimiento y
ambigüedad. El contexto simulado Node no sustituye la persistencia del navegador.

## Continuación

Acogida y actos clínicos se ampliaron después: HISTORY_LINKED_FACTS.md.
Faltan formalización, salidas/fallecimiento y demás correcciones de hechos. Cada uno debe coordinar su fuente,
fechas relacionadas y sustitución, sin inferir cierres por coincidencia de fechas
ni recrear dinero/stock/tareas. No habilitar edición libre de cualquier evento.
Limpieza/retención, volumen/cuota real, impresión final, accesibilidad y aceptación
de plataformas/distribución comercial siguen pendientes.
