# Estado del proyecto

Actualizado: 2026-10-16. Versión de trabajo: `0.2.0-dev`.
Entrada de relevo: [CONTINUE_HERE.md](CONTINUE_HERE.md).

## Fase actual

**Desarrollo reanudado el 2026-10-16 en un segundo PC; defectos R1–R4 de la
revisión corregidos con regresiones y evidencia real en Chrome y Edge.**
Núcleo de fase 1 implementado; protección de datos de fase 2 operativa con
aceptación parcial; fase 3 de interfaz en verificación. Hay servicios
posteriores implementados y probados como lógica, todavía sin pantallas de
gestión. **No es un producto comercial terminado. Utilizar únicamente datos de
prueba.**

Instrucciones vigentes de cupo: detener desarrollo y trabajo delegado,
actualizar documentación, hacer commit y push cuando quede **un 5 % o menos**
de la ventana de 5 horas **o un 3 % o menos del cupo semanal total** (97 %
consumido; instrucción del 2026-10-16). No consumir un reinicio de cuota sin
petición expresa. El 2026-10-15 se detuvo al observar 4 % restante.

## Funcionalidades conservadas

- Requisitos originales completos en REQUIREMENTS.es.md; alcance sin recortes.
- Viabilidad inicial de escritorio conservada, con evidencia del primer PC.
- 28 esquemas ejecutables, enumeraciones, fábrica y validadores estructurales
  y relacionales: UUID, desconocidos, fechas, intervalos, estados, roles,
  referencias, unicidad, dinero exacto, donaciones y stock histórico.
- Validación de entradas hostiles con límite de errores; escenario de dominio
  de 2000 animales, 5000 contactos y 50000 registros relacionados.
- Almacenes e índices, migración física aditiva 1 a 2, repositorios, revisión
  global/por registro, lease con token, toma de control e idempotencia.
- Códigos de animal asignados con contador en la misma transacción; mínimo
  reconstruible desde animales e historial de actividad al restaurar.
- SHA-256 nativo y alternativo, Base64 estricto, límites, inspección de archivos,
  preparación de imágenes y dependencias locales fijas con licencias MIT.
- Backup completo de todas las tablas y Blob, manifiesto, validación propia,
  rechazo de daños, tablas/campos/claves inválidos y versiones futuras.
- Restauración con staging separado, lectura/validación de lo escrito,
  comprobación de bytes/hashes y activación atómica. El conjunto anterior
  permanece retirado para recuperación. No se vacía primero el activo.
- Recibos de copia generada, descarga solicitada y verificación por reselección;
  reemplazar datos existentes exige copia verificada de su revisión actual.
- Servicios de entradas/salidas/fallecimiento, acogidas, solicitudes, reservas,
  adopciones y devoluciones; cierres coordinados de relaciones, historial y tareas.
- Servicios de finanzas, donaciones monetarias/materiales, inventario,
  correcciones/anulaciones/compensaciones; salud, planes y tareas clínicas.
- Primera interfaz EN/ES: creación de organización de prueba, configuración,
  resumen básico calculado, generar/verificar/restaurar copia y ayuda local.
  Las pantallas de gestión de animales/personas/recursos aún no están conectadas.

## Versiones y vocabulario

- appVersion: 0.2.0-dev.
- dbVersion: 2.
- schemaVersion: 1.
- backupFormatVersion: 1.

Vocabulario implementado: meta (active/writer/esquema/contador), datasets,
operations, backupReceipts; estados staging/active/retired. No duplicar los
nombres propuestos appMeta/writeLease/preparing/recovery. Ver PERSISTENCE_API.md.
La base estable de producción sigue siendo animal-rescue-manager; las pruebas
usan bases/perfiles separados. No hay datos personales necesarios en Git.

## Pruebas y evidencia

- Node: 93 subpruebas correctas en la ronda conjunta de tests/unit/*.cjs.
  La prueba de backup incluye además 144 comprobaciones internas de vectores,
  binarios, corrupción y límites. Dominio 48, ciclo animal 10, recursos 10 y
  salud/tareas 9; sus pruebas de servicios usan contexto simulado y validador real.
- Núcleo real file:// en Chrome 155.0.8059.79, Edge 155.0.4283.45 y Firefox
  estable 158.0: 9 comprobaciones internas y 7 externas por motor.
- Repositorios/backup/recuperación: 11 internas más 6 externas en Chrome/Edge,
  11 más 7 en Firefox. Incluyen Blob, copia/reselección, revisión vieja,
  relación rota, cancelación, activación, datos previos conservados y migración.
- Las ejecuciones comparan digest de registros y bytes tras cerrar completamente
  y reabrir el navegador con el mismo perfil. Registran cierres/procesos y fuentes.
- La ronda `business-*-validator-fix.json` pasó en los tres navegadores y sus
  huellas coinciden con el código revisado. Las primeras rondas `business-final`
  conservan un dominio anterior; se mantienen solo como evidencia histórica.
- UI inicial en Chrome: 11 casos correctos, descarga y reselección reales,
  restauración, segunda pestaña, teclado y anchos 360/768/1024/1440 sin overflow.
  Reejecutada el 2026-10-16 en Chrome 155.0.8059.80, con resultado correcto en
  `ui-2026-10-16-windows-wip-chrome-review.json` y huellas vigentes.
- Recorrido real de servicios que había quedado pendiente: ejecutado el
  2026-10-16 en Chrome 155.0.8059.80, 11 casos internos y 6 externos correctos,
  incluyendo cierre completo, reapertura y digest de datos/binarios idéntico.
  Evidencia `lifecycle-2026-10-16-windows-wip-chrome-review.json`; Edge/Firefox
  siguen pendientes para este recorrido concreto.
- Revisión de relevo: 330 comprobaciones estáticas y 93 subpruebas Node correctas;
  `git diff --check` sin errores. Sin cambios de producción en esta revisión.
- Correcciones R1–R4 (2026-10-16, Windows 11 Pro 10.0.26200, Node 22.19.0):
  330 estáticas y **95 subpruebas** Node correctas. En Chrome 155.0.8059.81 y
  Edge 155.0.4283.45 por file://: negocio 12+6, lifecycle 11+6 y UI 11, con
  huellas de fuentes vigentes. Lifecycle y UI en Edge dejan de estar pendientes.
  Detalle y enlaces en ENVIRONMENT_TESTS.md; política en REVIEW_HANDOFF.md.

## Límites, defectos y aceptación pendiente

- R1–R4 de `REVIEW_HANDOFF.md` resueltos. Límite conocido de R4: tras recargar,
  la página está en lectura hasta 15 s (caducidad del lease) y lo recupera sola;
  ningún navegador probado confirma escrituras IndexedDB durante `pagehide`.
- Firefox: los recorridos negocio/lifecycle/UI con el código actual no se han
  ejecutado en el segundo PC (Firefox no instalado). La evidencia Firefox del
  2026-10-15 corresponde a fuentes anteriores.

- Persistencia y validación de escritura capturan el dataset completo: O(N).
  La prueba de volumen en Node no acredita rendimiento/memoria del producto
  en navegador. Migrar listas/resumen a índices y carga diferida de binarios.
- Falta completar la aceptación de cuota agotada, cierre forzado durante
  preparación/activación y fallos inyectados en puntos adicionales. La
  cancelación cooperativa no equivale a matar el proceso en cada etapa.
- La recuperación local existe como servicio; falta selección visible y
  retención/limpieza explícita de conjuntos retirados. No borrar automáticamente.
- Faltan UI y aceptación integral de todos los módulos: contactos/fusión,
  voluntariado/horas, animales/fotografías/documentos, salud/calendario,
  acogidas/adopciones, finanzas/donaciones/inventario, informes, buscador,
  importación/exportación, demo y retirada segura.
- Faltan guías completas EN/ES del producto, impresión final, accesibilidad
  integral, pruebas reales de dispositivos, mediciones de límites y ZIP comercial.
- Android/iOS/iPadOS/macOS/Linux sin aceptación real. Emular viewport no demuestra
  compatibilidad de dispositivos. Licencia comercial pendiente de revisión;
  no publicar en Etsy ni inventar condiciones definitivas.

## Siguiente acción concreta

1. Leer AGENTS.md, este estado y REQUIREMENTS.es.md completos; comprobar cupo
   de 5 horas y semanal.
2. Si hay Firefox estable disponible, repetir negocio/lifecycle/UI con el código
   actual (comandos en ENVIRONMENT_TESTS.md). No repetir Chrome/Edge sin cambios.
3. Completar fase 3 y la protección/recuperación antes de habilitar información
   real: recuperación visible de conjuntos retirados, cuota agotada y cierre
   forzado durante preparación.
4. Implementar el servicio central de contactos (`js/services/contacts.js`:
   alta/edición con normalización, roles, detección de duplicados por email,
   teléfono y nombre, fusión atómica con reasignación de todas las referencias
   y `mergedIntoContactId`), después voluntariado/horas y documentos/imágenes;
   conectar pantallas de fase 4 reutilizando context.execute.
5. Conectar y verificar en navegador los servicios de ciclo animal, salud/tareas
   y recursos ya implementados. APIs en DOMAIN/LIFECYCLE/RESOURCES/HEALTH_API.md.
6. Continuar fases 5 a 12 sin omitir módulos ni reducir criterios de aceptación.

## Continuidad entre equipos

Repositorio: https://github.com/JoseAQuinto/WebProtectoraAnimales.git

Clonar o hacer pull, leer este archivo y AGENTS.md. Abrir index.html directamente
para la interfaz parcial; tests/viability/index.html conserva la sonda técnica.
Node/Python/Playwright/Firefox extraído son herramientas del desarrollador;
.tools, .tmp, node_modules y perfiles están ignorados y no son necesarios para
usar la distribución. Los ejecutores aceptan rutas locales de binarios:
consultar ENVIRONMENT_TESTS.md. No conservar rutas privadas como dependencia.

Los datos del navegador no viajan con Git ni al copiar esta carpeta. Para
trasladar una organización se necesita una copia externa verificada y restaurada.
El último commit y su publicación se comprueban con git log y git status;
la documentación no fija el hash de su propio commit.
