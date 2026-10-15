# Invariantes y casos de uso propuestos

Estado: contrato de diseño previo; fase 0 en curso. Ninguna regla se considera implementada ni probada por aparecer en este documento. Véanse [DATA_MODEL.md](DATA_MODEL.md) y [REQUIREMENTS.es.md](REQUIREMENTS.es.md).

## Invariantes de máxima prioridad

| ID | Regla verificable |
|---|---|
| INV-01 | Todo cambio relacionado que deba suceder conjuntamente se confirma o aborta como unidad. Solo `transaction.complete` permite comunicar guardado. |
| INV-02 | Ninguna referencia cruza `datasetId`; todos los destinos existen y tienen un tipo permitido. No se relaciona por nombre. |
| INV-03 | Animal bajo cuidado equivale a un único episodio abierto. Sin episodio abierto no puede conservar acogida o reserva activa. |
| INV-04 | Máximo una acogida abierta y una reserva activa por animal; no solapamientos históricos incompatibles de episodios o acogidas. |
| INV-05 | Ubicación, disponibilidad, situación e historial son conceptos diferentes. Un animal en acogida puede estar disponible. Devuelto es un hecho histórico ligado a una nueva entrada. |
| INV-06 | Completar adopción cierra episodio/acogida/reserva, actualiza solicitud y animal y resuelve otras solicitudes en una sola operación. Devolver conserva esa adopción y crea un episodio nuevo. |
| INV-07 | Cada donación monetaria tiene exactamente un ingreso; su importe procede de este. Un coste veterinario y un movimiento de stock por línea material se generan como máximo una vez. |
| INV-08 | Dinero y cantidades son enteros seguros. Una organización usa una moneda. El balance excluye anulados y materiales; stock nunca negativo. |
| INV-09 | Peso, edad calculada, ocupación, existencias y balances se obtienen de fuentes. No hay totales independientes editables. |
| INV-10 | Una pestaña solo escribe con arrendamiento vigente, propietario/token correctos, conjunto activo y revisiones esperadas. No sobrescritura silenciosa. |
| INV-11 | Restaurar, migrar o importar un conjunto grande no comienza borrando el activo. La activación solo sucede tras validar un conjunto separado completo. |
| INV-12 | Restaurar datos no ejecuta efectos de negocio: no crea ingresos, tareas, stock ni eventos nuevos de los registros reconstruidos. |
| INV-13 | Datos desconocidos siguen desconocidos; fecha de calendario no se transforma en instante UTC. No se inventan fechas, edades, importes ni microchips. |
| INV-14 | Ningún archivo o dato no confiable se ejecuta. La aplicación no inicia conexiones externas. |
| INV-15 | Archivo/papelera no destruyen historia ni alteran saldo. Finanzas se anulan con motivo; stock se corrige con compensación. |

## Protocolo común de escritura

1. Comprobar que el almacenamiento funciona y que la pestaña tiene control. El formulario mantiene su contenido hasta un éxito confirmado.
2. Validar estructura y campos reutilizando dominio. Preparar imágenes, archivos, hashes y decisiones de usuario antes de abrir transacción.
3. Asignar `operationId` único por intento lógico. Una doble pulsación conserva el mismo identificador; desactivar Guardar mientras se ejecuta. Claves de origen persistidas protegen efectos derivados.
4. Dentro de una transacción de lectura/escritura, comprobar conjunto activo, revisión global cuando el caso lo requiera, arrendamiento y token; leer entidades afectadas y comparar `revision` con la edición esperada.
5. Revalidar referencias, unicidad y reglas dependientes de datos actuales. Escribir entidades, historial, actividad, secuencia y nueva revisión global sin esperas ajenas a IndexedDB.
6. Confirmar con evento completo. Ante error, abortar la unidad, conservar formulario y mostrar que no se guardó. Un resultado de petición individual no es éxito final.
7. Invalidar cachés reconstruibles y actualizar vistas con datos confirmados. Una operación ya confirmada devuelve su resultado al repetirse; no vuelve a ejecutar efectos.

El reloj de interfaz, BroadcastChannel y los botones desactivados mejoran UX, pero no reemplazan comprobaciones transaccionales. Si se pierde control o cambia conjunto activo se pasa a lectura; un formulario abierto debe recargar/revisar antes de guardar.

## Fechas, intervalos y edad

- Fecha de negocio válida de calendario; usar la fecha de hoy en la zona de organización. No comparar únicamente cadenas de entrada sin validar primero el calendario.
- Intervalos de episodio/acogida `[inicio, fin)`: inicio incluido, salida excluida. La salida es el día del cambio. Traslado o adopción y nuevo evento en el mismo día pueden tocar límites sin solaparse; una estancia de igual inicio/fin dura cero días y no es negativa.
- Solo se permite un episodio abierto y no se permite registrar episodios históricos que se solapen. Una acogida queda dentro de un episodio del mismo animal y no puede continuar tras su cierre.
- Nacimiento y hechos realizados no son futuros; tareas y fechas previstas pueden serlo. Adopción ≥ entrada y aprobación; devolución ≥ adopción; cierre ≥ inicio. Un dato histórico corregido obliga a revisar intervalos y dependencias.
- Con nacimiento exacto o estimado se calcula edad a la fecha de consulta. En aniversarios de un 29 de febrero se usa el último día de febrero en años no bisiestos para el cálculo administrativo; explicitar y probar esta decisión.
- Sin fecha fiable, mostrar la estimación y su fecha de referencia. No convertirla silenciosamente en nacimiento exacto. Los tramos de informe incluyen desconocido y se describen como administrativos.
- Los promedios de tiempo hasta adopción cuentan días entre entrada y salida del episodio adoptado, excluyen no adoptados y muestran número de casos.

## Animales y transiciones

| Operación | Precondiciones | Cambios atómicos y efectos |
|---|---|---|
| Registrar entrada | Nombre/especie válidos, animal existente sin episodio abierto o nuevo; fechas sin solapamientos | Crear animal si procede, asignar código seguro, crear episodio, marcar bajo cuidado, solicitar ubicación/disponibilidad y crear evento/actividad |
| Cambiar ubicación en refugio/externa | Bajo cuidado; si hay acogida debe cerrarse en el mismo caso de uso | Validar destino activo, actualizar ubicación y registrar traslado; no modificar disponibilidad por deducción |
| Asignar acogida | Episodio abierto; ninguna acogida abierta; perfil/contacto válidos | Revisar disponibilidad, capacidad, especie/tamaño; solicitar confirmación y motivo para excepción permitida; crear estancia, actualizar ubicación y evento |
| Finalizar acogida | Estancia abierta; fecha dentro del episodio y ≥ inicio | Registrar fin/motivo, solicitar nueva ubicación, conservar estancia y evento; si se cierra por adopción/fallecimiento el servicio de esa transición decide destino |
| Cambiar disponibilidad | Bajo cuidado; coherencia con reserva | Disponible/no disponible se elige explícitamente; cancelar una reserva activa antes de abandonar reservado |
| Aprobar solicitud | Pendiente o en revisión; interesado y animal válidos | Guardar aprobación y fecha; no reservar ni adoptar automáticamente |
| Reservar | Animal bajo cuidado, solicitud aprobada, ninguna reserva activa | Crear reserva y vínculo, cambiar disponibilidad a reservado y evento; no completar solicitud |
| Cancelar/caducar reserva | Reserva activa; cierre documentado | Cerrar reserva, solicitar disponibilidad posterior, conservar historia; nunca adoptar al vencer |
| Completar adopción | Animal bajo cuidado, solicitud aprobada y coherente con contacto/animal, fecha válida | Crear adopción, cerrar episodio y acogida, cerrar reserva como cumplida, marcar solicitud completada y animal adoptado/sin ubicación operativa/no disponible; resolver otras solicitudes abiertas con motivo visible; aplicar decisiones de tareas; crear evento y movimiento opcional idempotente |
| Registrar devolución | Adopción existente no devuelta, sin episodio abierto posterior incompatible | Registrar fecha/motivo en adopción, crear episodio tipo devolución vinculado, marcar bajo cuidado y solicitar ubicación/disponibilidad; conservar adopción, acogidas y episodio anterior |
| Registrar fallecimiento | Animal no fallecido, fecha válida y coherente con transiciones previas; episodio opcional | Cerrar episodio/acogida/reserva si existen, marcar fallecido/sin ubicación/no disponible, resolver solicitudes y tareas con política visible, registrar hecho/historial; conservar adopciones anteriores y no eliminar animal |
| Otra salida/traslado definitivo | Animal bajo cuidado, fecha y motivo | Cerrar episodio y relaciones operativas, actualizar situación a otra salida documentada, resolver tareas/solicitudes, conservar historia |

Los casos históricos que no encajen en una transición operativa normal deben pasar por una corrección explícita con vista previa de dependencias. No se fuerza un estado actual falso para registrar un fallecimiento histórico de un animal previamente adoptado.

Las reservas no caducan mediante un proceso inexistente cuando la app está cerrada. Al abrir/usar la aplicación se detectan vencimientos y se aplica o solicita el cierre según política visible, con transacción e historial. Mostrar una fecha vencida no basta para anunciar una escritura confirmada. `expiresOn` es inclusivo: el vencimiento se detecta a partir del día siguiente; comunicar “válida hasta” en interfaz.

En completar adopción y registrar fallecimiento, presentar las tareas pendientes: conservar seguimientos elegidos y cancelar expresamente las que no proceden con motivo. Las demás solicitudes pendientes/en revisión/aprobadas se cierran con motivo visible que remite al hecho. Nada se borra ni cancela sin que la política se muestre al usuario.

## Salud y tareas

- Registrar una vacuna realizada y programar una vacuna son operaciones distintas. Llegar a fecha prevista no administra ni completa nada.
- Próxima revisión, calendario, agenda y alertas consultan el mismo registro de tarea. `nextReviewTaskId` permite mostrar su fecha sin mantener otra fecha editable independiente.
- Para completar un acto que genera historial clínico: confirmar realización/fecha, crear registro sanitario con vínculo a tarea, completar tarea, actualizar plan si corresponde y añadir evento en una unidad. Una segunda ejecución devuelve el resultado existente.
- Planes guardan instrucciones humanas de dosis/vía/frecuencia. No calculan dosis ni proponen tratamientos o calendarios. Varias administraciones pueden generar un conjunto finito y revisable de tareas.
- Esterilización clínica y estado/fecha del animal deben quedar coherentes. Corregir o anular el acto exige revisar el estado derivado o mantenido del animal mediante el mismo servicio, conservando rastro.
- Enfermedades y alergias muestran actividad/resolución explícita; no se resuelven por tiempo transcurrido.
- Alertas según fechas aportadas: vencido, hoy, próximos siete días y más adelante. Se calculan al usar la app, no prometen avisos con navegador cerrado.

## Contactos, acogidas y voluntariado

- Contactos son la única fuente de teléfono, email y dirección. Antes de crear desde un módulo, permitir seleccionar uno existente.
- Email/teléfono normalizados y nombre con otros datos detectan posibles duplicados. Nombre solo nunca autoriza fusión. No fusionar automáticamente ni imponer unicidad de email compartido.
- Fusión: comparar, elegir conservado, resolver campos, unir roles, decidir perfiles incompatibles, reasignar todas las referencias (incluidos documentos, tareas, salud, donaciones y adopciones), conservar referencia histórica de fusión, validar y confirmar atómicamente.
- Un contacto tiene máximo un perfil de acogida y uno voluntario. Si al fusionar existen dos perfiles del mismo tipo, resolver capacidades/condiciones y relaciones antes de aplicar.
- Ocupación de familia = número de acogidas abiertas, no un campo editable. Sobrepasar capacidad o incompatibilidad puede reflejar realidad: advertencia, confirmación y motivo persistido. La excepción nunca permite dos acogidas abiertas para un mismo animal.
- Horas = minutos positivos de actividades realizadas; total por periodo suma filas. No nóminas ni duplicación de personas.

## Finanzas, donaciones e inventario

- Importe positivo entero seguro; dirección define signo. Sumas intermedias también deben permanecer en rango seguro. No usar coma flotante para parsear/guardar importes.
- Una moneda por conjunto. Tras existir movimientos, no permitir cambiar código por simple preferencia. Versión inicial no mezcla ni convierte monedas. EUR/USD/GBP/CAD/AUD/MXN usan 2 decimales, JPY 0 y KWD 3.
- Un ingreso/gasto manual se contabiliza una vez. Anulación conserva importe e historia y añade motivo; corrección crea sustituto enlazado y anula original en transacción. No destruir el movimiento original.
- Donación monetaria: crear donación e ingreso relacionados juntos con `originKey` único. Importe se consulta del ingreso. Anular/corregir desde un módulo coordina ambos, sin dejar donación registrada que parezca ingreso válido cuando no lo hay.
- Gasto sanitario: crear o seleccionar un único gasto. Se muestra en Salud, Finanzas y ficha con el mismo UUID. Varias referencias al mismo gasto nunca multiplican su total. Al calcular coste de animal, sumar movimientos únicos, no filas de un join sanitario.
- Donación material: conservar líneas; incorporar a stock es explícito. Una clave por línea evita duplicar su movimiento. Valor estimado se informa separado, sin ingreso monetario.
- Stock = suma de variaciones válidas del artículo; escala/unidad coherentes. Comparar `< mínimo` y `= mínimo` con etiquetas distintas. No permitir salida ni corrección que produzca stock negativo, incluidos periodos históricos afectados por una fecha anterior.
- Saldo inicial y ajustes son movimientos con motivo. Una corrección genera compensación enlazada y movimiento sustituto si procede; no editar total ni eliminar historia. Si no cabe compensar porque el material ya se consumió, explicar el conflicto y exigir una regularización real justificada; no crear stock ficticio.
- Anular una donación material incorporada requiere revisar movimientos y disponibilidad. La operación falla entera si su efecto compensatorio no conserva stock válido. No omitir ese fallo dejando solo la donación anulada.

## Documentos, fotografías y recursos

- Fotografía: formatos JPEG/PNG/WebP, entrada ≤ 15 MiB/40 MP, decodificación real, orientación, recodificación optimizada de aproximadamente 1600 px y miniatura 320 px; objetivo < 1 MiB por imagen optimizada. Informar que se conserva una versión optimizada.
- Documento incorporado: PDF/JPEG/PNG/WebP/TXT UTF-8 ≤ 8 MiB; validar extensión, MIME, tamaño y contenido identificable. No ejecutar ni incrustar contenido activo. PDF se ofrece como descarga.
- HTML, SVG aportado, ejecutables y macros no se aceptan como contenido visual ejecutable. Otros formatos pueden registrarse como referencia externa descriptiva.
- Cada Blob tiene tamaño real y SHA-256 comprobados. Presupuesto de binarios por conjunto ≤ 64 MiB; backup ≤ 128 MiB contando Base64/estructura. Límites finales dependen de pruebas de memoria y dispositivos; nunca garantizan cuota.
- Una referencia externa no incorpora bytes ni asegura reabrir una ruta. Mostrar: “Este archivo está fuera de la aplicación. Su contenido no se incluye en la copia de seguridad; conserva también el archivo original”. Reseleccionar permite verificar hash opcional.
- Eliminar un recurso solo tras comprobar referencias de animales, logo, documentos y miniaturas; no borrar automáticamente para liberar espacio. Las URL temporales se revocan al dejar de utilizarse.

## Historial, archivo y papelera

- Evento guarda fecha del hecho, registro, código, parámetros mínimos y origen enlazable. La clave de origen única evita doble evento al repetir acción.
- Correcciones conservan referencias y no presentan versiones sustituidas como hechos válidos simultáneos. No reconstruir historia exclusivamente desde el estado actual.
- Archivar retira de listas operativas; papelera permite restaurar; eliminación definitiva es excepcional y exige vista de dependencias, consecuencias, confirmación y copia previa. No se rompe ninguna referencia.
- Animales adoptados no se eliminan automáticamente. Hechos válidos de animales/contactos archivados siguen en informes históricos.
- Papelera no modifica finanzas/stock por vías indirectas. No vaciado automático por tiempo. Restaurar desde papelera revalida restricciones y no crea efectos de negocio nuevos.
- Actividad registra operaciones con datos mínimos, sin documentos completos ni grandes textos personales. Diagnóstico técnico local separado, limitado a 200 sucesos, exportación voluntaria y sin envío automático.

## Backup, restauración y migración

- Prioridad funcional: backup tras núcleo, ampliado en cada fase. Exportación de módulo no se etiqueta como backup completo.
- Capturar una instantánea coherente y revisión en lectura coordinada; procesar Base64/hash fuera de transacción; validar archivo generado antes de ofrecer descarga.
- Distinguir generado, descarga solicitada y verificado mediante reselección. Descargar no prueba que el archivo se guardó en disco. Recordatorio inicial cada siete días o cien operaciones, solo al usar la app.
- Verificar contenedor, versiones, límites, esquema, SHA-256 canónico, cada binario, recuentos, referencias y unicidades antes de restaurar. Hash no es firma ni contraseña.
- Restaurar reemplaza, no mezcla. Resumen completo y copia actual facilitada/verificada si existen datos; confirmación explícita. Preparar nuevo dataset conservando UUID, datos históricos y metadatos de negocio; validar; activar con puntero atómico; comprobar recuentos, importes, relaciones y hashes después.
- El conjunto anterior permanece para recuperación temporal. Sin espacio se cancela conservando activo; no borrarlo para continuar. Un cierre durante preparación conserva el anterior; tras activar el nuevo ya está completo.
- Las pestañas antiguas detectan nuevo activo y dejan de escribir. La reconstrucción jamás llama a `createDonation`, `completeTreatment` u otros servicios con efectos para recrear registros.
- Migraciones numeradas y secuenciales; origen identificado, explicación, copia externa, conjunto preparado, validación y activación. Futuro incompatible bloquea sin interpretar parcialmente ni alterar base.

## Importación y exportación

- CSV ≤ 10 MiB y 10.000 filas; JSON con límites de formato, profundidad, cantidad, texto y binarios. Listas de campos permitidos; rechazo explícito de `__proto__`, `constructor`, `prototype` y contenido ejecutable.
- Asistente con mapeo, formato de fecha/importe, validación, vista previa, conflictos y confirmación de alcance. Mostrar fila/campo/motivo; permitir informe descargable. Fechas ambiguas requieren elección, no suposición.
- UUID propio coincide → posible actualización; chip coincide → conflicto; código coincide → revisión; teléfono/email → posible duplicado; nombre solo → aviso. Decisiones crear/actualizar/vincular/omitir/cancelar explícitas. Sin sobrescritura silenciosa.
- Relaciones CSV se asocian por identificadores/códigos con revisión, no únicamente por nombre. Importaciones repetidas pueden conservar mapa por fuente. Líneas de donación material comparten una agrupación explícita.
- Hasta 1000 registros sin binarios: aplicar lote confirmado en una transacción. Lotes mayores/complejos: copia del activo, aplicación, validación, conmutación. Confirmar expresamente si se elige subconjunto válido. Revalidar revisión desde vista previa; si cambió, recalcular.
- CSV de salida UTF-8, opción para Excel, coma/punto y coma, comillas/saltos escapados, fechas claras y dinero documentado. Papa Parse local y protección de fórmulas incluidos prefijos peligrosos/controles. Probar teléfonos `+`, identificadores, comillas y saltos. No prometer restauración exacta desde hojas de cálculo; JSON conserva tipos y referencias.
- Elegir exportar todo o filtrado antes de descargar; encabezados legibles traducidos, plantilla de campos estables, nombres de archivo sin datos personales innecesarios.

## Indicadores e informes

| Indicador | Fuente y criterio |
|---|---|
| Bajo cuidado | Animales con episodio abierto |
| En protectora / acogida | Subconjuntos de bajo cuidado según ubicación coherente |
| Disponible / reservado | Disponibilidad entre animales bajo cuidado; se solapa con ubicación |
| Entradas de periodo | Episodios cuya entrada está en periodo, incluidas devoluciones |
| Adopciones de periodo | Adopciones realizadas por fecha; devolver después no borra el hecho |
| Tiempo medio hasta adopción | Duración de episodios cerrados por adopción; muestra número de casos |
| Ingresos / gastos / balance | Movimientos contabilizados por fecha y dirección; excluye anulados/materiales |
| Coste por animal | Movimientos de gasto únicos relacionados con animal; generales separados |
| Gastos veterinarios | Movimientos válidos según categoría definida, sin duplicar enlaces sanitarios |
| Ocupación de acogida | Estancias abiertas por perfil |
| Stock bajo mínimo | Suma de cantidades escaladas `<` mínimo; igualdad se distingue |
| Vacunas/cuidados/revisiones pendientes | Tareas de esos tipos no completadas ni canceladas |
| Último backup | Estado local real: generado, solicitado o verificado; fecha y revisión |

Los gráficos SVG locales tienen tabla accesible, unidades, títulos y estado sin datos. Dashboard e informes utilizan estos mismos criterios. No sumar tarjetas que se solapan. No distribuir gastos generales mediante fórmulas ocultas. Estado actual y hechos por periodo se identifican como tales; no afirmar una reconstrucción histórica no soportada por el modelo.

## UX, idioma y demostración

- Campos esenciales primero; desconocidos permitidos cuando el modelo lo admite. Etiquetas visibles, errores junto a campo, resumen si hace falta, Guardar/Cancelar, estado real y protección de cambios pendientes.
- Navegación por teclado, foco visible y gestionado en diálogos, nombres accesibles, estados de lectura/error/espacio/cancelación y alternativa de tablas amplias en móvil. Sin botones de éxito simulado ni módulos vacíos presentados como funcionales.
- Todos los textos visibles, accesibles, impresión y encabezados de exportación pertenecen a diccionarios con paridad. Cambio de idioma no altera fechas/importes/estados. Datos personales no se traducen.
- Demostración solo se carga explícitamente y sin datos reales. Lote marcado, datos ficticios y fechas relativas. Limpiar demo detecta dependencias reales, permite convertirlas en reales y nunca borra información real relacionada.
- Ayuda explica perfil/navegador/ruta y copias externas. Cambiar ordenador requiere backup y restauración. No prometer sincronización, conservación indefinida ni alertas con app cerrada.

## Evidencia mínima antes de aceptar el núcleo

1. Escritura de varias entidades y fallo intermedio: cero cambios parciales.
2. Doble acción: un movimiento/evento/efecto por clave de origen.
3. Edición antigua y pérdida de arrendamiento: rechazo sin sobrescritura.
4. Dos pestañas y cambio de dataset: antiguo propietario no escribe.
5. Adopción/devolución: episodio y acogida cerrados, nueva entrada, adopción histórica conservada.
6. Salud/donaciones: un único coste/ingreso/movimiento de stock contado.
7. Backup/restauración con binarios, papelera y archivados: igualdad de datos de negocio, relaciones, importes y hashes.
8. Archivo corrupto, versión futura, cuota insuficiente y cierre en preparación: conjunto activo intacto.

Estas son pruebas requeridas, no resultados ejecutados. El estado y la matriz de compatibilidad deben identificar cuáles se han realizado y cuáles siguen pendientes. No se avanza sobre un defecto que comprometa integridad o recuperación.
