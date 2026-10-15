# Compatibilidad

Fecha: 2026-10-15. Estado: **comprobación de fase 0 en curso**.

No se anuncia aún compatibilidad comercial. Los resultados originales se
conservan en `tests/results/`; se actualizará esta matriz al terminar la ejecución.

| Combinación | Estado actual | Límite |
|---|---|---|
| Windows, Chrome estable | En ejecución | Perfil de prueba aislado |
| Windows, Edge estable | En ejecución | Perfil de prueba aislado |
| Windows, Firefox estable | En ejecución | Binario oficial extraído en herramientas locales, sin instalación del comprador |
| Android, Chrome/Firefox/Edge | Pendiente | No hay dispositivo real comprobado |
| iOS/iPadOS | Pendiente | No hay dispositivo real comprobado |
| macOS/Linux de escritorio | Pendiente | No anunciar hasta ejecución real |

El cambio de carpeta, navegador o perfil puede afectar al almacenamiento.
La selección y descarga estándar de archivos son el camino común previsto.
No se utilizarán APIs opcionales como requisito sin comprobarlas bajo `file://`.

Referencias oficiales consultadas para preparar la prueba:

- [MDN: módulos JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [MDN: política de mismo origen y file](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy)
- [MDN: transacciones IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction)
- [MDN: confirmación complete](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction/complete_event)
- [MDN: cuotas y eliminación](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- [MDN: LocalStorage y file](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [MDN: selección avanzada de archivos](https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker)

Estas referencias explican riesgos; no sustituyen la prueba del producto.
