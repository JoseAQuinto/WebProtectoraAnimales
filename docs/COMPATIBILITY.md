# Compatibilidad

Fecha: 2026-10-15. Estado: **fase 0 de escritorio superada para el diagnóstico**.

No se anuncia aún compatibilidad comercial de la aplicación final. Resultados
reales en Windows 11 Pro x64, versión 10.0.26200, mediante apertura `file://`
en perfiles aislados, motores de escritorio en modo headless y protecciones
de origen por defecto. No se usó servidor para servir la aplicación.

| Combinación | Estado actual | Límite |
|---|---|---|
| Windows, Chrome 155.0.8059.40 | PASA 12/12 | `tests/results/chrome.json`; fin 14:09:48 UTC |
| Windows, Edge 155.0.4283.45 | PASA 12/12 | `tests/results/edge.json`; fin 14:08:41 UTC |
| Windows, Firefox estable 158.0, build 20261007201254 | PASA 15/15 | `tests/results/firefox-stable.json`; binario oficial extraído en herramientas locales |
| Android, Chrome/Firefox/Edge | Pendiente | No hay dispositivo real comprobado |
| iOS/iPadOS | Pendiente | No hay dispositivo real comprobado |
| macOS/Linux de escritorio | Pendiente | No anunciar hasta ejecución real |

## Alcance comprobado

Los tres motores pasan primera apertura offline, CSS/scripts clásicos locales,
IndexedDB, texto Unicode, Blob, confirmación completa de transacción, rollback
de dos almacenes, marcador y bytes tras cerrar el proceso y reabrir el perfil,
descarga JSON guardada y selección real, exclusión de escritura del marcador
entre pestañas y rechazo de propietario caducado, copia/rename/movimiento de
carpeta, y rechazo real de almacenamiento con configuración de bloqueo.

Chrome/Edge: 0 errores de página y 0 peticiones HTTP/HTTPS originadas por la
página. En las ejecuciones finales sus cierres fueron normales y no quedaron
procesos de prueba. Firefox: cierre normal con código 0 y `navigator.onLine=false`
antes de la primera navegación; no se instrumentó una traza completa de red
del proceso del navegador. No se afirma ausencia de tráfico interno del navegador.

Al bloquear cookies/almacenamiento, Chrome y Edge devolvieron `UnknownError`;
Firefox devolvió `SecurityError`. El diagnóstico informa el fallo y bloquea
Guardar, sin cambiar a memoria ni LocalStorage. Se usaron perfiles separados
con esa configuración; no se modificó el perfil personal.

## Hallazgos de diseño

En **los tres navegadores**, copiar y renombrar el diagnóstico mantuvo acceso
al mismo marcador en el mismo perfil. En Firefox también se ejercitó un movimiento
de directorio. No puede asumirse aislamiento de base por carpeta, ni garantizar
que otra versión/plataforma conserve ese comportamiento. Otro perfil de Chrome
y Edge no vio el marcador. El producto tendrá una organización por almacenamiento
accesible y deberá avisar si varias copias locales abren el mismo conjunto.

La sonda escribe fixtures de diagnóstico sin lease al medir transacciones.
La exclusión comprobada protege el marcador mediante `guardedWrite`, que
revalida propietario y caducidad en la transacción. Esto no sustituye las
pruebas del coordinador de todas las escrituras de negocio de la fase 1.

`crypto.randomUUID`, `getRandomValues`, SubtleCrypto, Storage API y
BroadcastChannel se detectaron en los tres. Disponibilidad no equivale a
permiso concedido ni a durabilidad garantizada. `showSaveFilePicker` se detectó
en Chrome/Edge y falta en Firefox: no será requisito. La solicitud `persist()`
en Firefox quedó pendiente de permiso durante la prueba headless; no se concede
ni se anuncia persistencia protegida. Selección estándar y descarga funcionan.

## Verificación pendiente

- Dispositivos Android, iPhone/iPad y tablets reales: apertura de HTML desde el
  gestor de archivos y navegador real, almacenamiento, reapertura y selección.
- macOS y Linux; navegación visible manual, teclado, ampliación e impresión.
- La sonda fue revisada visualmente en capturas; Chrome/Edge emularon anchos
  390 y 768 px, sin scroll horizontal de página. Faltan 360/1024/1440 y QA de
  la futura interfaz completa. Esto no demuestra soporte móvil real.
- Matriz del producto completo, fallos y carga a escala, backup/restauración,
  revisiones físicas y UX de permisos. El diagnóstico solo autoriza continuar
  el desarrollo de escritorio; no cierra la aceptación comercial.

Los scripts reproducibles son `tests/e2e/chromium.cjs` y
`tests/e2e/firefox_viability.py`. Firefox estable se obtuvo de
[Mozilla](https://download.mozilla.org/?product=firefox-latest-ssl&os=win64&lang=en-US),
se extrajo en `.tools` y no se redistribuye. Developer Edition instalado no
se utilizó como sustituto de la versión estable.

Referencias oficiales consultadas para preparar la prueba:

- [MDN: módulos JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [MDN: política de mismo origen y file](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy)
- [MDN: transacciones IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction)
- [MDN: confirmación complete](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction/complete_event)
- [MDN: cuotas y eliminación](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- [MDN: LocalStorage y file](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [MDN: selección avanzada de archivos](https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker)

Estas referencias explican riesgos; no sustituyen la prueba del producto.
