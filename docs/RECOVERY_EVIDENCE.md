# Evidencia de recuperación y perfiles

Fecha: 2026-10-16. Equipo de prueba: `windows-wip`, Windows 11 Home 10.0.26300.
Chrome **155.0.8059.80** y Edge **155.0.4283.45**, versiones obtenidas mediante
`Browser.getVersion`. Herramientas de desarrollo: Node y Playwright externos
a la distribución. No se modifica ninguna protección de origen del navegador.

Todas las pruebas abren HTML local por `file://`, con el contexto offline
antes de la primera navegación, un perfil sintético exclusivo por ejecución
y bases `animal-rescue-manager-test-*`. Las fuentes de producción se cargan
sin modificar. Ningún perfil personal ni la base de producción se utilizan.

## Perfiles de acogida y voluntariado

Fixture independiente `tests/integration/profiles.html`, ejecutada con el
runner portable `tests/e2e/suite.cjs`. Ambas ejecuciones tienen **9 casos
internos y 6 externos correctos**, incluidos cierre completo y reapertura
con el mismo digest de todos los registros y los bytes de recursos.

| Motor | Evidencia |
|---|---|
| Chrome | [Perfiles y persistencia](../tests/results/profiles-2026-10-16-windows-wip-chrome-second.json) |
| Edge | [Perfiles y persistencia](../tests/results/profiles-2026-10-16-windows-wip-edge-second.json) |

El recorrido usa los servicios reales de contactos, acogidas, animales y
voluntariado contra IndexedDB: crea perfiles y roles del contacto central
atómicamente; comprueba replay sin duplicados y rechazo de referencias rotas;
asigna una acogida real; calcula ocupación; edita disponibilidad y capacidad
sin perder ocupación; rechaza incompatibilidad y revisión antigua. Registra
horas con replay, edita duración, calcula totales y periodo, conserva horas
al desactivar el perfil, excluye papelera y la restaura. Cierra la acogida
conservando historial y restaura un backup con perfiles y horas completos.

Las primeras ejecuciones [Chrome](../tests/results/profiles-2026-10-16-windows-wip-chrome-first.json)
y [Edge](../tests/results/profiles-2026-10-16-windows-wip-edge-first.json) se
conservan como fallos de entorno: Crashpad o conexión local CDP denegados por
el sandbox. Las ejecuciones correctas usan autorización para herramientas
locales de desarrollo; no amplían permisos del producto.

## Fallos explícitamente inyectados en IndexedDB real

Fixture `tests/integration/recovery.html`. Los hooks están exclusivamente en
la página de pruebas: reemplazan temporalmente métodos de `IDBObjectStore`
y los restauran en `finally`. Las transacciones, sus abortos, datos y bytes
persistidos son del motor IndexedDB real.

- **Cuota insuficiente simulada:** se lanza `QuotaExceededError` antes del
  segundo `contacts.add` del lote preparado. La primera petición ya estaba
  encolada. El aborto deja cero contactos de ese lote; lotes anteriores
  permanecen en staging y el activo conserva ID, revisión, digest y bytes.
- **Fallo de escritura de activación simulado:** se lanza `AbortError` al
  encolar el puntero activo, después de encolar retirada del anterior y
  activación del nuevo. El aborto revierte los tres cambios: anterior activo,
  destino staging y puntero anterior intactos.
- **Cancelación real mediante AbortController:** ocurre tras el último lote
  completado y antes de validar/activar. Los datos completos preparados
  siguen en staging sin validación; activo intacto.
- **Revisión cambiada:** editar la organización después de preparar rechaza
  la activación y la vista previa antiguas. Una revisión actual con recibo
  verificado antiguo también se rechaza; exige crear y verificar otra copia.
  Tras ello, la restauración conserva el conjunto modificado como retirado.
- **Confirmación y selección:** una restauración sin confirmar y seleccionar
  el conjunto activo como recuperación se rechazan sin escribir.
- **Recuperación local real:** `backup.recover` copia un conjunto retirado a
  un dataset nuevo, lo valida y activa, conservando tanto la fuente retirada
  como el anterior activo, con recuentos y digest completos comprobados.

No se ha llenado el disco ni agotado físicamente la cuota del perfil. La
inyección verifica la ruta de error y su rollback; el agotamiento real,
sus mensajes de interfaz y los límites de memoria siguen pendientes.

| Motor | Resultado de la suite con recuperación local |
|---|---|
| Edge | [7 internas + 6 externas correctas](../tests/results/recovery-injected-2026-10-16-windows-wip-edge-retired.json); el cierre requirió fallback forzado, registrado en el JSON |
| Chrome | [7 internas + 6 externas correctas con el helper corregido](../tests/results/recovery-injected-2026-10-16-windows-wip-chrome-retired-close-fix.json); ambos cierres requirieron fallback forzado, con salida y cero procesos restantes verificados |

La primera suite inyectada, anterior al caso de recuperación local, pasó
6 internas + 6 externas en [Chrome](../tests/results/recovery-injected-2026-10-16-windows-wip-chrome-first.json)
y [Edge](../tests/results/recovery-injected-2026-10-16-windows-wip-edge-first.json).
El [primer intento Chrome con recuperación local](../tests/results/recovery-injected-2026-10-16-windows-wip-chrome-retired.json)
conserva 7 internas correctas e informe global fallido por dos cierres del
helper anterior. La ronda corregida verifica ambos cierres y persistencia.

## Cierre forzado real

El ejecutor `tests/e2e/recovery.cjs --mode crashes` usa tres perfiles propios,
uno por punto. Comprueba PID, fecha de creación y argumento exacto
`--user-data-dir` antes de terminar el árbol. Registra salida del proceso y
comprueba que no quedan identidades propias antes de reabrir el perfil.
Libera la conexión de automatización después de observar la salida real.

Los puntos de sincronización son hooks de prueba explícitos:

1. **Preparación parcial:** pausa la siguiente cesión de hilo tras confirmar
   el primer lote IndexedDB. Se mata el navegador; al reabrir, el anterior
   sigue activo e intacto y el destino permanece incompleto en staging.
2. **Preparado validado, antes de activar:** se mata después de terminar la
   preparación. Al reabrir, el anterior sigue activo y el preparado completo
   y validado sigue staging. No se activa automáticamente.
3. **Después de activación completa:** se mata solo después de resolverse
   `transaction.complete`. Al reabrir, el nuevo está activo y completo, con
   contenido deliberadamente distinto; el anterior conserva digest y bytes
   como retirado.

Se comparan también metadatos y digest de **todos** los conjuntos antes y
después. El cierre es de procesos reales, no una cancelación cooperativa.
No acredita corte eléctrico ni cierre en mitad de un commit físico.

[Chrome: 11 comprobaciones correctas y tres cierres abruptos verificados](../tests/results/recovery-2026-10-16-windows-wip-chrome-crash-third.json).
El ejecutor se corrigió después para admitir también `signalCode` al
comprobar salida por señal; no hubo cambios de producción entre las rondas.

[Edge: 10 comprobaciones correctas de 11, informe global fallido](../tests/results/recovery-2026-10-16-windows-wip-edge-crash-fourth.json).
Los seis casos de cierre abrupto y estado posterior pasan en las tres fases,
con salida real y cero identidades restantes tras cada cierre forzado. Falla
uno de los tres cierres posteriores de la pestaña ya reabierta, en el helper
compartido anterior. Se conserva el fallo global y no se declara esa ronda
íntegramente aprobada.

Los intentos del runner con sufijo `crash-second` y el intento Edge
`crash-third` se conservan como fallos de herramienta. El primer prototipo
no completó la escritura del informe y no es evidencia de aceptación. El
runner actual guarda progreso tras cada comprobación y marca como fallo
un cierre de su bucle antes de terminar, además de rechazar salidas existentes.

La corrección de `tests/e2e/chromium.cjs.close()` admite salida mediante
`exitCode` o `signalCode`, limita la espera de la orden CDP y libera CDP y el
pipe de diagnóstico solo después de confirmar la salida. Reconsulta las
identidades antes de declarar cerrado el árbol. Las fuentes de producción no
cambian por esta corrección. Las rondas anteriores mantienen los hashes del
helper y de las fixtures que realmente ejecutaron; no se reetiquetan como
si hubieran usado el helper nuevo. Una ampliación posterior de la fixture
añadió `recover(retired)` y conserva la evidencia previa de cierres abruptos.
La comparación al cerrar este trabajo confirma que los hashes de todos los
scripts `js/` y `vendor/` incluidos en estas evidencias coinciden con las
fuentes de producción presentes. Solo fixtures y herramientas de prueba
tienen revisiones posteriores entre las rondas descritas.

## Repetir desde otro PC

Usar nombres nuevos para los JSON. `--executable` o las variables
`RM_CHROME_BINARY`/`RM_EDGE_BINARY` seleccionan el navegador instalado.
`PLAYWRIGHT_PATH` permite elegir la instalación de herramientas. Los perfiles
quedan bajo `.tmp`, ignorados por Git. No hace falta instalar herramientas
para utilizar el producto.

```powershell
node tests/e2e/suite.cjs --browser chrome --page tests/integration/profiles.html --machine NUEVO-PC --output profiles-FECHA-chrome.json
node tests/e2e/suite.cjs --browser chrome --page tests/integration/recovery.html --machine NUEVO-PC --output recovery-injected-FECHA-chrome.json
node tests/e2e/recovery.cjs --browser edge --executable RUTA_EDGE --mode crashes --machine NUEVO-PC --output recovery-crash-FECHA-edge.json
```

El modo por defecto `--mode all` combina fallos inyectados y cierres; el modo
`crashes` permite no repetir la suite inyectada ya verificada. La inspección
y terminación verificadas del runner de cierres son actualmente para Windows;
en otros sistemas se debe implementar una comprobación equivalente antes
de anunciar esa aceptación. `suite.cjs` sigue siendo el runner común de
persistencia normal. No repetir rondas aprobadas sin un riesgo nuevo.

Firefox queda explícitamente aplazado por indicación del usuario. Tampoco se
acreditan aquí dispositivos reales, interfaz completa, cuota física agotada
ni aceptación comercial. Versiones del producto: `appVersion 0.2.0-dev`,
`dbVersion 2`, `schemaVersion 1`, `backupFormatVersion 1`.
