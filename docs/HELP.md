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
