# Fechas de acogida y salud — 2026-10-19

Amplía HISTORY_CORRECTIONS.md sin cambiar app `0.2.0-dev` / DB `2` / schema `1`
/ backup `1`. La misma pestaña Historial permite corregir fechas de hechos con
fuente compatible. No modifica tipo de acto, decisiones de estado ni dosis.

## Alcance

- Inicio de acogida: fecha de la estancia existente, dentro de episodio, fin
  y estancias vecinas. Mantiene perfil/familia, excepción, ocupación y ubicación.
- Fin de acogida: fecha del cierre existente, sin cruzar inicio, salida del
  episodio o estancia siguiente. Conserva motivo original y ubicación actual.
  No infiere que haya que desplazar una adopción por coincidir sus fechas.
- Acto sanitario realizado: fecha del mismo registro clínico. Coordina
  `tasks.completedOn` cuando existe sourceTaskId; conserva tarea, estado y
  fecha prevista. Esterilización coordina además animals.sterilizationDate.
- Nacimiento/fallecimiento, comienzo del plan, resolución de condición y próxima
  revisión limitan la fecha clínica. Las tareas originadas por el acto mantienen
  sus fechas y limitan adelantar su origen más allá de ellas. No cambia estado
  del plan, resolución, instrucciones ni otras actuaciones.
- Si hay gasto enlazado, exige una confirmación adicional para **conservar la
  fecha y el importe de la factura**. Muestra la fecha económica. No refecha,
  corrige, anula ni crea un movimiento, tampoco si la factura cubre varios actos.
  Una corrección económica sigue usando el flujo propio de Finanzas.

Todas las variantes conservan evento original y añaden sustituto recíproco,
motivo, instante y actividad, como las entradas. Los eventos sustituidos o
anulados, fuentes ambiguas/desajustadas o archivadas/en papelera no se editan.
Varias esterilizaciones vigentes del mismo animal necesitan una revisión más
amplia: no se ofrece corregir aisladamente una que invalidaría las otras.

## Implementación

`history-linked-facts.js` revisa dependencias y límites por fuente. El servicio
común expone `correctLinked(input,command)` con el mismo input de fecha/motivo/
confirmación y `preserveExpenseDate:true` obligatorio cuando hay factura.
`inspect` devuelve las filas/fechas afectadas y el comando/título/efecto de UI.
`correct` conserva el tipo de operación y fingerprint de entradas/devoluciones
para que sus reintentos antiguos sigan siendo reconocidos. Ambos preparan los
cambios contra el snapshot actual y confirman tras la única transacción.

## Evidencia

`history-linked-facts-ui-2026-10-19-{chrome,edge}-first.json`: **17/17 por motor**,
111 fuentes intactas, file:// offline, dos cierres propios sin procesos restantes
ni terminación forzada. Preparación sintética por servicios reales, sin mocks.

- Dos acogidas: corregir inicio/fin de la cerrada preserva familia, motivo y
  la acogida actual; una fecha que solapa la siguiente se rechaza.
- Regresión real del comando de entrada después de introducir el proveedor.
- Esterilización con tarea completada, plan, próxima revisión y gasto compartido
  con otro acto. Decisión de factura y comienzo de plan se exigen en UI/servicio.
- Formulario antiguo conserva campos y casillas, sin sobrescribir contacto
  concurrente. Doble envío da un único sustituto/commit.
- AbortError inyectado al añadir sustituto en una transacción real, después de
  encolar acto/tarea/animal: digest y revisiones íntegros. No es fallo físico.
- Corrección clínica coordina acto/tarea/animal, deja el gasto y el otro acto
  exactamente iguales. Condición resuelta mantiene resolución/estado.
- Segunda corrección mantiene la cadena original sin duplicar actos/tareas.
- Etiquetas EN/ES y diálogo clínico a 360/768/1440 sin desbordar, sin escribir.
  Captura clínica ES de 360 inspeccionada; las acciones de acogida se ejercitan
  en español. No se atribuye hardware físico ni accesibilidad integral.
- Copia descargada/reseleccionada/verificada/restaurada y reapertura: digest,
  fuentes, revisiones e incorporado TXT conservados. Sin errores ni HTTP de página.

Los informes nuevos conservan digest/recuentos de cada snapshot y comparan todas
las tablas en memoria, sin repetir cada tabla completa dentro del JSON por paso.
Los informes anteriores se conservan sin reescribir sus huellas.

Siete pruebas Node adicionales cubren once tipos clínicos, factura compartida,
tarea/esterilización, plan/resolución/revisión, solapamientos, replay y comando.
Conjunto: **249 Node / 817 estáticas**. El contexto Node no acredita IndexedDB.

## Pendiente

Formalización de adopción, solicitudes/reservas, salidas/fallecimiento y
traslados todavía no admiten corrección coordinada de fecha. Para cierres con
varias dependencias, exigir decisiones individuales en lugar de adivinarlas por
fecha. Documento añadido no se refacha como si cambiara el instante en que se
añadió. Edición de contenido clínico y reversión de estados no forman parte de
esta corrección de calendario. El resto del alcance original sigue vigente.
