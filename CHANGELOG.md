# Historial de cambios

## Captura repetida y comandos largos — 2026-10-21

- Una captura activa profundamente inmutable, reutilizada solo tras leer anclajes
  reales en IndexedDB; abortos/errores no devuelven memoria ni publican candidatos.
- Aplicación de lotes por posiciones UUID; copias completas y observadores de
  persistencia fuerzan lectura fresca. Toda validación de dominio sigue activa.
- Lease de 120 s durante actividad y preparación de medios, retorno a 15 s;
  error de renovación posterior no oculta un commit confirmado ni el error original.
- 310 Node / 917 estáticas. Volumen Chrome 17/17 con copia física de 69 MB,
  50k + 32 MiB; Edge en cadena documentada 12 + 6, intentos fallidos conservados.
- Escenario mixto reproducible y selección de archivos locales grandes por CDP,
  fuera del producto. Corrección del cierre QA con prueba nativa de salida y
  conservación de observaciones CIM; formatos/versiones sin cambios.

## Plurales de Almacenamiento — 2026-10-21

- Variantes EN/ES con Intl.PluralRules para grupos, archivos, registros y bloqueos;
  selección con recuentos independientes y ayuda de Papelera vigente.
- Interfaz con 0/1/2, un grupo con dos archivos y negocio intacto al revisar.
- 303 Node / 917 estáticas; nuevo ejecutor usado en 3 suites / 57 verificaciones
  por navegador, sin fallos. Versiones sin cambios; fuentes de cada ronda propias.

## Validación sin inspecciones duplicadas — 2026-10-21

- Una inspección estructural por dataset con límites individuales conservados;
  campos de esquemas inmutables compilados. Todas las reglas siguen activas.
- 303 Node / 917 estáticas; 66 rondas de módulos, 918 comprobaciones sin fallos;
  volumen 17/17 por motor a 50k + 32 MiB, copia/reapertura conservadas.
- Escritura medida de 1,32–1,47 s a 50k; no es una garantía para otros equipos.
- Ejecutor reproducible de regresión para otro PC; versiones sin cambios.


## Navegación agrupada y diagnóstico técnico — 2026-10-20

- Barra lateral en los seis grupos del requisito 31, EN/ES, accesible.
- Diagnóstico local de 200 sucesos técnicos sin datos de fichas, en Ayuda, con
  descarga revisable y borrado confirmado; registro desde `ui.message` y errores globales.
- 4 pruebas Node nuevas (298 / 917 estáticas); regresión completa 68 rondas,
  926 comprobaciones, 0 fallos. Cierre del día con relevo en CONTINUE_HERE.md.

## Una instantánea por escritura y prueba integral — 2026-10-20

- El arnés Node congela los datos de cada build (294 pruebas sin mutaciones); el
  contexto congela su captura y commit la reutiliza. Escritura −35 % a 10k registros.
- Regresión de todas las suites: 63 rondas Chrome/Edge, 889 comprobaciones, 0 fallos.
- Prueba integral: todos los módulos, copia por UI y restauración en otro perfil con
  datos, bytes, informes y panel idénticos (9/9 por motor).

## Volumen, accesibilidad y paquete — 2026-10-20

- Medición real de latencias hasta 50 080 registros y 32 MiB con copia y reapertura
  (VOLUME.md); optimización documentada con su precondición, sin aplicar.
- Auditoría automática de accesibilidad EN/ES: rutas, pestañas, 18 diálogos, contraste;
  añade h2 de panel en la ficha del animal. 0 incidencias; 11 regresiones por motor.
- ZIP de desarrollo reproducible (138 archivos) verificado extraído; README aclaran
  que la guía de relevo solo está en el repositorio. No se publica.

## Ficha imprimible del animal — 2026-10-20

- «Imprimir ficha»: vista previa con organización, logo, salud, pesos, estancias,
  acogidas, adopciones y documentos; impresión aislada con márgenes y PDF del navegador.
- Datos personales y notas internas excluidos salvo elección expresa; sin escrituras.
- Corrige casilla de filtros de animales que desbordaba 4 px a 360 px.
- Chrome/Edge 11/11; workspace 13/13, filtros 10/10, pesos 9/9, guía 4/4.

## Papelera: eliminación definitiva revisada — 2026-10-20

- Almacenamiento lista la papelera y revisa una raíz: hechos propios, archivos sin
  otro uso, relaciones conservadas, bloqueos (finanzas, donaciones, inventario...).
- Copia actual verificada, confirmación y transacción revalidada con cancelación,
  replay y actividad única; restaurar exige la copia externa.
- Chrome/Edge 19/19; regresiones 19/19, 18/18 y guía 4/4. 294 Node / 907 estáticas.

## Archivos incorporados sin referencias — 2026-10-20

- Almacenamiento revisa archivos del activo sin referencias (fotos/logos sustituidos)
  con análisis genérico de todos los uuid, grupos foto/miniatura cerrados, motivos
  de conservación, inspección, copia actual verificada y confirmación.
- Borrado en una transacción que revalida lease/revisión/copia/referencias y valida
  el dataset; cancelación con rollback y replay. Archivo/papelera se conservan.
- Chrome/Edge 19/19, regresión de conjuntos inactivos 18/18 y guía 4/4 por motor.
  288 Node / 882 estáticas. ASSET_RETENTION.md. Versiones sin cambios.

## Relevo de desarrollo — 2026-10-19

- Checkpoint tras correcciones fechadas, limpieza de conjuntos inactivos y guía.
- 282 Node / 862 estáticas; siete rondas funcionales finales de 122 verificaciones
  por motor y guía dirigida 4/4 por motor, con alcance propio en cada evidencia.
- Próximo bloque y mapa inicial de referencias en RETENTION.md. Producto parcial;
  requisitos intactos, versiones sin cambios y sin consumir reinicios de cupo.

## Guía sincronizada con las funciones actuales — 2026-10-19

- Guía EN/ES: fechas históricas/documentales y limpieza de conjuntos inactivos
  con sus copias externas. Limitaciones y relevo distinguen trabajo pendiente.
- Revisión dirigida 4/4 en Chrome y Edge, 120 fuentes y negocio intacto.
- 282 pruebas Node y 862 comprobaciones estáticas; versiones sin cambios.

## Limpieza revisada de conjuntos inactivos — 2026-10-19

- Almacenamiento: staging/retired de uno en uno con copia actual y propia del
  retirado verificadas, confirmación, guardias en transacción, cancelación y replay.
- Inventario por índices/cursor, sin snapshots completos de retirados para listar.
- Chrome/Edge 18/18: negocio/bytes activos intactos y dato antiguo recuperable
  por copia externa tras borrado local. 282 Node / 862 estáticas. RETENTION.md.


## Fecha documental coherente con todos sus historiales — 2026-10-19

- Acción de fecha separada de metadatos, revisión paginada global, sustitutos
  de eventos por animal y normalización explícita de diferencias antiguas.
- Bloqueo de cambios sin historial por servicio, repositorio e importación JSON.
- Chrome/Edge 17/17 con 23 animales/archivo compartido; 277 Node / 847 estáticas.
  DOCUMENT_DATE_CORRECTIONS.md.


## Fechas de traslado, salida y fallecimiento — 2026-10-19

- Fuente/actividad original inequívoca, episodio y fallecimiento coordinados,
  cierres elegidos y tarea independiente preservada. Estado actual intacto.
- Fallecimiento posterior a adopción sin crear episodio ni alterar cuota.
  Solicitudes automáticas incluidas también en revisión de formalización.
- Chrome/Edge 18/18; 271 Node / 837 estáticas. HISTORY_DEPARTURE.md.


## Fechas de solicitudes y reservas — 2026-10-19

- Correcciones fechadas con código de transición y estado actual conservados;
  orden original, límites por aprobación/adopción y caducidad inclusiva.
- Cierres automáticos de solicitudes generan ahora su evento con fecha/motivo
  en el commit coordinado; no se inventan fechas de cierres antiguos.
- Chrome/Edge 18/18; 264 Node / 832 estáticas. HISTORY_WORKFLOW.md.


## Corrección de formalización con revisión individual — 2026-10-19

- Adopción/episodio coordinados con conservar/mover explícito de cada cierre
  de acogida, reserva y tarea candidata. Coincidencia de fecha no implica causa.
- Cuota conservada con consentimiento, cadenas hijas y principal atómicas,
  tarea independiente intacta, reintentos y devolución posterior conservados.
- Chrome/Edge 17/17; 256 Node / 827 estáticas. HISTORY_ADOPTION.md.


## Correcciones de acogida y salud — 2026-10-19

- Fechas de inicio/fin de estancia y actos clínicos con evento sustituto.
  Tarea completada y fecha de esterilización se coordinan sin recrear hechos.
- Conservación explícita de factura compartida; límites de plan/resolución/
  próxima revisión, campos retenidos y rollback conjunto.
- Chrome/Edge 17/17; 249 Node / 817 estáticas. HISTORY_LINKED_FACTS.md.


## Correcciones de entrada y devolución — 2026-10-19

- Fecha del episodio y devolución enlazada corregidas conjuntamente; evento
  original conservado con sustituto recíproco, motivo y consentimiento explícitos.
- Protección de eventos persistidos, límites, revisión, replay y control por pestaña.
- Chrome/Edge 17/17, transacción real abortada y backup/reapertura de bytes.
  242 Node / 812 estáticas. Lanzador QA corrige parentescos de PID reutilizados.
  Otras correcciones de hechos siguen pendientes: HISTORY_CORRECTIONS.md.


## Relevo por umbral de cuota — 2026-10-18

- Desarrollo cerrado al quedar 9 % en cinco horas (71 % semanal restante),
  sin utilizar créditos de reinicio. Continuidad consolidada con funciones
  acreditadas, límites y siguiente corrección histórica concreta.
- Guía/demostración e importaciones guardadas; 229 Node / 807 estáticas.


## Guía interna bilingüe e inicio rápido — 2026-10-18

- Ayuda offline con 19 capítulos, índice con foco, datos locales destacados,
  uso por módulo, copias/traslado/actualización y solución de problemas.
- README.en.md y README.es.md; compatibilidad y límites actuales explícitos.
- Revisión dirigida Chrome/Edge 4/4 por motor, sin escrituras de negocio.
  229 Node / 807 estáticas. Impresión paginada y aceptación final pendientes.


## Demostración opcional y retirada segura — 2026-10-18

- Lote EN/ES explícito de 90 registros, fechas relativas, todos los ejemplos
  requeridos y cifras derivadas, conservando organización/configuración/logo.
- Retirada por lote con grafo de dependencias: conserva trabajo real y permite
  convertir componentes conectados antes de retirar otros ejemplos.
- Copia verificada, staging/activación, revisión y cancelación; banner y revisión
  de nombres/fechas/acciones. Chrome/Edge 15/15 por motor. 229 Node / 802 estáticas.
  Ver DEMO.md. Producto completo y aceptación comercial siguen pendientes.

## Importación JSON por módulos — 2026-10-18

- Lector estricto versionado, revisión por registro/tabla, asociaciones UUID,
  comparación, actualizaciones de ficha permitidas y protección de historia.
- Archivos exactos por hash, preparación separada/copia verificada y activación
  atómica sin reproducir ingresos, stock, actos o eventos. Grafo idéntico no escribe.
- Exportaciones amplían cierre de referencias a política v2, con devoluciones
  y libros de inventario coherentes; formato de módulo 1 conservado y lector v1.
- Chrome/Edge 22/22 funcionales, nueve módulos reales; 4/4 dirigidas para tabla
  legible y acciones móviles. 221 Node / 772 estáticas. MODULE_JSON_IMPORT.md.

## CSV de donaciones agrupadas — 2026-10-18

- Económicas con un ingreso único; materiales agrupados con una transacción
  lógica por donación y stock único por línea, cantidades/estimaciones exactas.
- Grupo inválido se excluye entero; identidades, repetición, corrección monetaria
  conservadora e informes con filas de origen y errores globales completos.
- Chrome/Edge 16/16 por motor, una donación de 501 líneas con staging y bytes;
  211 Node / 752 estáticas. DONATION_IMPORT.md. Los seis CSV iniciales tienen
  aceptación en su alcance; sigue pendiente JSON y el resto del producto.

## CSV económico con correcciones enlazadas — 2026-10-18

- Importes exactos con interpretación decimal/moneda y relaciones explícitas.
- Actualizar anula original y crea sustituto coordinado con backlinks existentes,
  motivo/fecha/consentimiento propios e identidad externa conservada.
- Chrome/Edge 16/16 por motor, 501 movimientos por UI con staging y bytes;
  202 Node / 747 estáticas. FINANCE_IMPORT.md; donaciones CSV/JSON pendientes.

## CSV de voluntariado y solicitudes — 2026-10-18

- Perfiles relacionados con contactos y funciones por UUID/código; solicitudes
  con relaciones explícitas, fechas elegidas y estados históricos coordinados.
- Espacio privado por fila, consolidación de revisiones/roles y aplicación
  compartida; referencias con búsqueda/paginación, plantillas e informes.
- Chrome/Edge 16/16 por motor con 334 solicitudes mediante staging, bytes y
  reapertura; 194 Node y 742 estáticas. Ver RELATED_IMPORT.md.

## Importación CSV de animales — 2026-10-18

- Selector de tipo, plantilla, referencias por UUID/código e interpretación
  explícita de fechas; perfiles/entradas con episodios/eventos coordinados.
- Conflictos de UUID/microchip/código, enlace, actualización parcial, identidades,
  subconjuntos, revisión y lotes atómicos; aplicación compartida con contactos.
- Chrome/Edge 15/15 por motor, 251 animales con historia y bytes conservados;
  regresión contactos 13/13 por motor. 184 Node y 727 estáticas. ANIMAL_IMPORT.md.

## Panel operativo y continuidad — 2026-10-18

- 17 indicadores con listas coincidentes: cuidado/ubicación/disponibilidad,
  hechos mensuales, tareas clínicas/vencidas/próximas, dinero válido y mínimos.
- Alertas abren sus registros reales; completar una tarea recalcula el panel.
  Estado de copias diferenciado y tres gráficos locales con tablas exactas.
- Chrome/Edge 10/10 por motor; 175 Node y 712 estáticas correctas. Se actualiza
  el relevo con lo ya acreditado y el alcance pendiente; ver DASHBOARD.md.

## Papelera y restauración de mediciones — 2026-10-18

- Historial paginado de pesos, edición y vista de papelera con confirmación
  concreta, restauración del mismo UUID y último peso derivado.
- Archivo del animal conserva lectura y deshabilita escrituras.
- Chrome/Edge 9/9 por motor y reapertura; 171 Node y 702 estáticas correctas.
  Ver WEIGHT_HISTORY.md. Servicios y formatos persistidos sin cambios.
## Filtros combinados de animales — 2026-10-18

- Selección múltiple OR/AND de los criterios requeridos, periodos de última
  entrada y adopción, familia actual/histórica y valores activos retirables.
- Consultas y lista separadas de la ficha, búsqueda normalizada, estados sin
  coincidencias/error y paginación/preferencias conservadas.
- Chrome/Edge 10/10 por motor, fotografía y datos intactos tras filtros/reapertura;
  171 pruebas Node y 697 estáticas. Detalle en ANIMAL_FILTERS.md.
## Importación CSV de contactos — 2026-10-18

- Plantilla, separador/codificación, mapeo, validación por fila/campo, duplicados
  con decisiones explícitas y correspondencias externas reutilizables.
- Actualización solo de campos mapeados, subconjuntos/omisiones confirmados,
  informe descargable, revisión/idempotencia y hash de archivo repetido.
- Lotes pequeños atómicos y grandes en dataset separado con copia verificada,
  cancelación antes de activar y conservación del conjunto anterior y sus bytes.
- Chrome/Edge 13/13 por motor, 1.001 contactos importados por UI; 166 Node y
  687 estáticas. Otros CSV/JSON pendientes; alcance en CONTACT_IMPORT.md.
## Exportación por módulos — 2026-10-18

- Centro de exportación para animales, contactos, solicitudes/adopciones,
  gastos/ingresos, voluntarios/horas y donaciones, con alcance y filtros propios.
- CSV con precisión, agrupación material y protección de fórmulas; JSON v1 con
  registros/referencias y metadatos de recursos sin bytes, separado del backup.
- Chrome/Edge 10/10 por motor, descargas reales de los nueve tipos en ambos
  formatos, subconjuntos/vacíos y reapertura. 157 Node y 667 estáticas correctas.
- No se modifica negocio ni formatos de almacenamiento; ver MODULE_EXPORTS.md.
## Configuración, catálogos y logotipo — 2026-10-18

- Preferencias aplicadas a lista de animales, textos de impresión y recordatorios
  de copia verificada por días/escrituras mientras la aplicación está abierta.
- Logotipo validado con alta/reemplazo/retirada y conservación de recursos;
  catálogos personalizados y ubicaciones con protección de códigos y ciclos.
- Ajustes con campos permitidos y actividad; referencias animales inactivas
  conservadas en edición; moneda de movimientos existentes sin reinterpretación.
- Chrome/Edge: 13/13 por motor, copia real descargada/verificada, hashes de bytes
  y reapertura. Node 151 y estática 652; detalles en CONFIGURATION.md.
## Registro global de adopciones — 2026-10-18

- Solicitudes/reservas/adopciones con filtros, páginas y enlace al animal y
  contacto. Los detalles enfocados reutilizan los flujos y formularios existentes.
- Alta global con elección de animal; revisión/aprobación/reserva/adopción y
  devolución verificadas de principio a fin, con efectos únicos y detalle renovado.
- Chrome/Edge: 10/10 por motor, 74 fuentes intactas y cierre/reapertura. Node:
  142 pruebas; estática: 632. Alcance en ADOPTION_REGISTER.md; formatos sin cambios.
## Buscador global e historial por origen — 2026-10-18

- Búsqueda agrupada de animales/contactos por nombres normalizados, código,
  microchip, teléfono y email; archivo/papelera explícitos y páginas de 20.
- Historial con fecha del hecho y de registro, estados históricos, filtros,
  páginas y apertura de cada origen, incluidos actos y documentos.
- Chrome/Edge: 10/10 por motor, 72 fuentes intactas, cierre/reapertura sin
  cambios de revisión/datos. 137 pruebas Node y 622 estáticas correctas.
- No cambian formatos persistidos. Las correcciones de hechos siguen pendientes;
  alcance y evidencia en SEARCH_HISTORY.md.
## Revisión de cambios locales e informes — 2026-10-18

- Conservado el avance local de donaciones/inventario y completado el bloque
  de informes que quedó sin commit: gráficos, periodos, edades de referencia,
  promedios por episodio y sumas monetarias seguras.
- Informes con tablas paginadas, evolución anual, CSV protegido mediante Papa
  Parse, JSON identificado como informe sin archivos y opciones de impresión.
- Corregidas notas materiales, búsqueda, cantidades y estimaciones seguras.
- Donaciones/Inventario/Informes: 12/12 por motor Chrome/Edge, persistencia y
  descargas reales; 133 subpruebas Node y 607 estáticas. Detalle y límites en
  REVIEW_RESOURCES_REPORTS.md. Formatos persistidos sin cambios.

## Donaciones e inventario — 2026-10-18 (0.2.0-dev)

- Pantallas `#donations` y `#inventory` conectadas a los servicios existentes
  `donations.js` e `inventory.js`, sin duplicar efectos de negocio. Menú lateral
  y rutas añadidas; `index.html` carga los dos módulos nuevos.
- Donaciones: alta económica (donación + un único ingreso), alta material con
  1–1000 líneas y valor estimado separado, anulación coordinada y ficha con
  ingreso/líneas vinculadas.
- Inventario: artículos con existencias derivadas, mínimo y niveles bajo/en el
  mínimo; alta, movimientos con signo explícito y gasto opcional solo en compra,
  compensación y archivo.
- Traducciones `dn.*`/`iv.*` EN/ES con paridad verificada (core.cjs). Estática
  **592 comprobaciones** y 117 subpruebas Node correctas. Aceptación real por
  navegador de estas pantallas pendiente; ver DONATIONS_INVENTORY_UI.md.

## Registro de finanzas — 2026-10-17 (0.2.0-dev)

- Pantalla de ingresos/gastos con moneda de organización, importes exactos y
  separador explícito, filtros, paginación y totales derivados sin anulados.
- Anulación y corrección mediante sustituto enlazado, con motivos/confirmación,
  referencias históricas y origen de movimientos conservados.
- Importe inválido conserva campos y señala su control. Menú lateral con
  desplazamiento vertical y métricas adaptadas a pantallas estrechas.
- Aceptación específica y cualquier límite en FINANCE_UI_ACCEPTANCE.md;
  versiones de datos y backup conservadas. Estática: 582 comprobaciones.

## Acogidas, adopciones, salud y calendario — 2026-10-17 (0.2.0-dev)

- Acciones reales de acogida y adopción en ficha animal, excepciones revisadas,
  reservas explícitas y formalización con cierres/tareas/motivos y cuota opcional.
- Actos sanitarios y planes con instrucciones del usuario, programación finita,
  tarea clínica completada junto al acto y gasto nuevo/existente sin duplicación.
- Lista/agenda/calendario central de tareas; cálculo gregoriano sin UTC, dos
  pruebas nuevas y regresión de etiquetas dinámicas. Referencias inactivas se
  conservan al editar y quitar hora limpia también su zona.
- Aceptación por navegador y límites en WORKFLOWS_UI_ACCEPTANCE y HEALTH_UI_ACCEPTANCE;
  rondas anteriores e intentos fallidos permanecen diferenciados. Sin cambios
  de dbVersion, schemaVersion ni backupFormatVersion; appVersion 0.2.0-dev.

## Aceptación de formularios y ajustes de pantallas — 2026-10-17

- Contactos, perfiles, animales y documentos: 13/13 comprobaciones funcionales
  reales en Chrome y Edge, con copia/restauración y persistencia tras reapertura.
- Corregido el selector ambiguo Documents del ejecutor y preservados intentos
  anteriores. Filtros adaptados a pantallas estrechas y tablas con desplazamiento
  delimitado: 5/5 comprobaciones dirigidas por navegador, sin escribir negocio.
- Ejecutor visual permite retomar solo perfiles sintéticos verificados bajo
  `.tmp`, rechaza sobrescribir evidencias y comprueba controles recortados.

## Interfaz de gestión, documentos y recuperación — 2026-10-16 (0.2.0-dev)

- Documentos incorporados/externos, vínculos, descargas verificadas y comparación
  SHA-256; fotografías/miniaturas/logotipo y pesos, con presupuesto de 64 MiB.
- Agenda y ficha de contactos, duplicados/fusión, perfiles de acogida y
  voluntariado/horas; ficha animal, alta/reentrada, edición, pesos/fotos,
  traslados/disponibilidad y salidas con tareas decididas explícitamente.
- Archivo/papelera/restauración animal protegen el cuidado y las tareas actuales.
- Recuperación visible de conjuntos anteriores, staging interrumpido informativo,
  cancelación y revisión capturada al revisar una copia de restauración.
- Pruebas IndexedDB de perfiles, medios, rollback inyectado y cierres reales;
  nuevo ejecutor de formularios/archivos/descargas por file://. Fallos de entorno
  y herramienta conservados y separados de la aceptación. Detalles en estado.
- 115 subpruebas Node y 541 estáticas correctas. Relevo actualizado para otro
  equipo; umbral vigente: menos del 10 % restante de la ventana de cinco horas.

## Perfiles de acogida, voluntariado y horas — 2026-10-16 (0.2.0-dev)

- `fosters.createProfile/updateProfile/occupancy`: un perfil por contacto, rol
  concedido en la misma transacción, opciones de catálogo activas y ocupación
  derivada de estancias abiertas.
- Validador: la disponibilidad del perfil solo rige nuevas asignaciones, y la
  capacidad se exige a las estancias sin excepción (antes, un exceso
  documentado invalidaba también la estancia regular previa).
- `js/services/volunteers.js`: perfiles, horas con corrección y papelera, y
  totales calculados por periodo y voluntario. Contrato en `VOLUNTEERS_API.md`.
- Arnés de pruebas compartido en `tests/unit/support/`; 102 pruebas Node y
  339 estáticas correctas; lifecycle real 12+6 en Chrome y Edge.

## Servicio central de contactos — 2026-10-16 (0.2.0-dev)

- `js/services/contacts.js`: alta/edición con normalización, bloqueo de
  duplicados por email/teléfono con confirmación explícita, archivo, papelera
  solo sin relaciones, búsqueda sin acentos y fusión atómica con resolución de
  campos, unión de roles/teléfonos, reasignación de relaciones operativas e
  historia económica conservada. Contrato en `docs/CONTACTS_API.md`.
- 4 pruebas Node nuevas (99 en total) y paso de fusión en el recorrido real
  lifecycle, correcto en Chrome y Edge. Interfaz de agenda aún pendiente.

## Correcciones de revisión R1–R4 — 2026-10-16 (0.2.0-dev)

- R1: las tareas con origen conservan el animal del origen y no preceden al
  inicio de su plan, en servicios y en el validador de restauración/importación.
- R2: crear organización sobre un conjunto activo vacío (copia vacía restaurada)
  mediante escritura protegida por lease, revisión e idempotencia.
- R3: la forma `A-<número>` queda reservada a la secuencia automática; se
  rechazan secuencias de 16 o más dígitos en datos restaurados o importados.
- R4: lease de 15 s renovado cada 5 s; tras recargar, el control vuelve solo al
  caducar el anterior, con aviso EN/ES. Medido que `pagehide` no confirma
  escrituras IndexedDB en Chrome, por lo que no se depende de él.
- Ejecutor UI con `--browser chrome|edge`. Evidencia nueva en Chrome
  155.0.8059.81 y Edge 155.0.4283.45; 330 estáticas y 95 subpruebas Node.
- Nueva regla de continuidad: detener y publicar también con 3 % o menos del
  cupo semanal.

## Checkpoint de continuidad — 2026-10-16

- Revisión del estado parcial de 0.2.0-dev conservado en el commit 4c5554c.
- Reejecutadas 330 comprobaciones estáticas y 93 subpruebas unitarias, correctas.
- Recorrido integrado pendiente ejecutado por file:// en Chrome 155.0.8059.80:
  11 casos internos y 6 externos correctos, con persistencia tras cierre completo.
- Auditadas las huellas de las evidencias: la ronda `validator-fix` sustituye
  las primeras rondas `business-final` tras el endurecimiento del dominio.
- Documentación de relevo, límites, defectos conocidos, herramientas portables
  y primera acción concreta para otra IA. Sin ampliar funcionalidad del producto.

## 0.2.0-dev — 2026-10-15 (avance funcional parcial)

- 28 esquemas de negocio, enumeraciones, fábrica y validación estructural y
  relacional; entradas hostiles, fechas, estados, importes, intervalos y stock.
- Almacenes e índices, migración física aditiva 1→2, repositorios con revisión
  y lease/token, idempotencia y asignación transaccional de códigos de animales.
- Backup JSON completo con SHA-256 nativo/alternativo, recursos Blob/Base64,
  manifiesto, archivos validados y rechazo de corrupción/versiones futuras.
- Preparación de restauración separada, validación de lo escrito y activación
  atómica; datos previos conservados; recibos generado/solicitado/verificado.
- Servicios de animales/acogidas/adopciones, salud/tareas, finanzas/donaciones
  e inventario, con pruebas de lógica y cambios coordinados. Todavía sin interfaz.
- Primera interfaz EN/ES para configuración, copias, ayuda y resumen real básico.
- Evidencia real de núcleo y recuperación en Chrome, Edge y Firefox estables
  de este equipo, incluido cierre y reapertura con comparación de datos/binarios.
- El umbral de continuidad vigente pasa a **5 % o menos**, según el usuario.

No es aún un producto comercial terminado. Ver pendientes y evidencia exacta
en `docs/PROJECT_STATUS.md` y `docs/ENVIRONMENT_TESTS.md`.

## 0.1.0-dev — 2026-10-15 (avance parcial; pausa por cupo)

- Inicio de fase 1 después de superar viabilidad de escritorio en tres motores.
- Utilidades de UUID v4, fechas, edad, cantidades y dinero exacto, incluidas JPY y KWD.
- Normalización de búsqueda, email, teléfonos y microchips sin perder ceros.
- Traducciones base EN/ES, plurales, cambio de idioma y clasificación de errores.
- Serialización JSON canónica con rechazo de datos corruptos y accesores.
- Pruebas unitarias significativas y contratos del núcleo documentados.
- Núcleo persistente coordinado: transacciones atómicas, leases, revisiones,
  UUID, idempotencia, cambio de conjunto y rechazo de versiones futuras sin pérdida.
- Prueba real del núcleo por file:// en Chrome: 9+6 casos correctos.
- Desarrollo pausado al quedar 19 % del cupo de 5 horas; continuidad documentada.
- Entidades/repositorios de negocio, backup y restauración siguen pendientes.

## 0.0.1-dev — 2026-10-15

- Repositorio inicial y requisitos completos preservados.
- Diseño inicial de arquitectura, entidades e invariantes.
- Diagnóstico independiente ejecutable por `file://`, sin recursos externos.
- Prueba de IndexedDB, Blob, confirmación de transacción y reversión atómica.
- Marcador sintético para probar cierre y reapertura.
- Control de escritura de diagnóstico por arrendamiento transaccional.
- Descarga y lectura de informes JSON; no constituye backup comercial.
- Pruebas de navegador y resultados reales en `tests/results/`.

La viabilidad y los límites de verificación figuran en `docs/COMPATIBILITY.md`.
No hay módulos de gestión terminados ni versión comercial publicada.
