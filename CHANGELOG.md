# Historial de cambios

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
