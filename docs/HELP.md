# Guía interna EN/ES — 2026-10-18

`#help` está disponible sin organización. Destaca dónde se guardan los datos y
ofrece índice navegable con 19 capítulos: inicio, configuración, animales,
contactos/voluntarios, salud, acogida, adopciones/devoluciones, tareas, finanzas,
donaciones, inventario, documentos, intercambios, copias, traslado, actualización,
archivo/papelera, problemas y demo. Añade privacidad y limitaciones explícitas.

Contenido local en ambos diccionarios; sin red, HTML importado ni cambios de
negocio. Los enlaces del índice conservan la ruta de Ayuda y llevan el foco al
encabezado. La impresión usa el diálogo del navegador. Los README de inicio
están en README.en.md y README.es.md; no son una licencia comercial.

Verificación dirigida real en file://, offline, perfiles propios vacíos de
Chrome y Edge: `help-ui-2026-10-18-{chrome,edge}.json`, **4/4 por motor**.
En ambos idiomas se recorren los 19 enlaces, se comprueba foco/ruta, ausencia de
claves sin traducir y desbordamiento en 360/768/1440. Se verifica que los apartados
de traslado y copias siguen visibles con media print, snapshot de negocio intacto,
109 fuentes intactas y ausencia de errores/peticiones HTTP de página. Cierre de
los procesos propios registrado. No se atribuye paginación en papel/PDF ni
aceptación física/accesibilidad integral a este recorrido dirigido.

Se utilizó una comprobación puntual de presentación en `.tmp/help-review.cjs`,
con el lanzador existente tests/e2e/chromium.cjs. No es una nueva suite funcional
de negocio. Para reproducir: perfil vacío, abrir index.html#help, alternar EN/ES,
activar todos los enlaces del índice y comprobar foco H2/hash #help; recorrer
los tres anchos y media print; comparar snapshot inicial/final y errores/red.
Las huellas exactas de los recursos revisados están en los JSON.

**229 Node / 807 estáticas**. La guía explica las funciones actuales y las
limitaciones: no completa correcciones históricas, limpieza, impresión final,
rendimiento ni aceptación comercial. Versiones sin cambios: app 0.2.0-dev,
DB 2, schema 1, backup 1.

## Actualización dirigida — 2026-10-19

Se mantienen los 19 capítulos. Animales explica la corrección fechada con motivo
y revisión de cada cierre, sin prometer reversiones. Documentos explica su acción
de corrección de fecha para todos los historiales vinculados, con bytes/vínculos
conservados. Archivo/papelera explica Almacenamiento, copia actual y copia propia
del conjunto de recuperación, consentimiento y nueva copia tras cada eliminación.
Las limitaciones distinguen borrado de negocio, archivos sin uso y retención
automática pendientes.

Revisión dirigida en perfiles vacíos propios, file:// offline, Chrome y Edge:
`help-ui-2026-10-19-current-{chrome,edge}.json`, **4/4 por motor**, 120 fuentes.
EN/ES, 19 enlaces/foco/ruta, 360/768/1440 sin desbordar, instrucciones visibles
en print, snapshot de negocio idéntico, sin errores ni HTTP; procesos propios
cerrados. Se reutilizó el verificador puntual anterior cambiando solo el nombre
de evidencia. Las rondas funcionales anteriores no adquieren hashes nuevos.
**282 Node / 862 estáticas** en este checkpoint; versiones sin cambios.

## Actualización dirigida — 2026-10-20

Archivo/papelera explica la nueva revisión de archivos incorporados sin uso en
Almacenamiento: qué se conserva siempre, grupos foto/miniatura, inspección,
copia actual verificada y confirmación. Las limitaciones ya solo mantienen
pendientes el borrado definitivo de negocio y la retención automática.

Revisión dirigida en perfiles vacíos propios, file:// offline, Chrome y Edge:
`help-ui-2026-10-20-asset-files-{chrome,edge}.json`, **4/4 por motor**, 124
fuentes. Mismo verificador puntual ignorado por Git (`.tmp/help-review-*.cjs`),
cambiando solo el nombre de evidencia y la ruta local de Edge. No acredita la
función nueva: su aceptación está en ASSET_RETENTION.md.

Actualización 2026-10-20 (papelera): Archivo/papelera explica la eliminación
definitiva revisada y sus bloqueos. `help-ui-2026-10-20-trash-{chrome,edge}.json`,
4/4 por motor, 129 fuentes; mismo verificador puntual. No acredita la función.

Actualización 2026-10-20 (ficha imprimible): Animales explica «Imprimir ficha» y la
exclusión por defecto de datos personales/notas. `help-ui-2026-10-20-print-{chrome,edge}.json`,
4/4 por motor (antes de la corrección de CSS de filtros); no acredita la función.

Actualización 2026-10-20 (diagnóstico): Ayuda añade la tarjeta «Diagnóstico técnico» y la
guía de problemas la explica. `help-ui-2026-10-20-nav-diagnostics-{chrome,edge}.json`, 4/4.
