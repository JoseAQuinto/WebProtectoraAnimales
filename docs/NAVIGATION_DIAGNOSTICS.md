# Navegación agrupada y diagnóstico técnico local — 2026-10-20

Versiones sin cambios: app 0.2.0-dev / DB 2 / schema 1 / backup 1.

## Navegación (requisito 31)

La barra lateral agrupa las 21 rutas en los seis grupos exigidos: Resumen (panel,
buscador), Animales y cuidados (animales, adopciones, tareas), Personas
(contactos, acogidas, voluntariado), Organización y recursos (finanzas,
donaciones, inventario, documentos), Informes (informes, exportaciones) y
Configuración y ayuda (importaciones CSV/JSON, demo, copias, almacenamiento,
configuración, ayuda). Cada grupo es una lista con `aria-labelledby` hacia su
título; sin organización solo se muestran Copias y Ayuda. Los enlaces conservan
`.nav a[href]` y `aria-current`.

## Diagnóstico técnico (requisito 36)

`js/services/diagnostics.js` guarda los últimos **200** sucesos técnicos en la clave
`diagnostics` del almacén de infraestructura `meta` (sin cambiar el esquema ni las
copias). Cada suceso: hora, área (`ui`, `uncaught`, `unhandled`), nombre/código de
error, mensaje truncado a 300 caracteres con UUID sustituidos por `<id>`, ruta sin
identificadores y versión. Nunca se guarda el contenido de fichas ni documentos.
Fuentes: `components/ui.message` (todo error mostrado al usuario) y los eventos
`error`/`unhandledrejection`. Si IndexedDB falla, la sesión actual sigue listando
sus sucesos en memoria.

Ayuda → «Diagnóstico técnico» muestra recuento y los 20 últimos, permite descargar
un JSON revisable (versiones, idioma y sucesos) y borrar con confirmación. Nada se
envía; no altera datos de negocio. La guía de solución de problemas lo explica.

## Evidencia

- Node: `tests/unit/diagnostics.cjs`, 4 pruebas (campos/UUID/recarga, límite y
  truncado, exportación y borrado, fallo de almacenamiento). **298 Node / 917 estáticas**.
- `nav-diagnostics-ui-2026-10-20-{chrome,edge}-nav-diagnostics.json`: grupos y
  pertenencia exactos en EN/ES, inicio sin organización, ajuste a 360/768/1440 y
  menú móvil con los 21 enlaces; conflicto de revisión provocado en el formulario
  visible de contactos y registrado sin el nombre escrito ni identificadores;
  descarga sin datos de fichas; persistencia tras reabrir; borrado solo al confirmar
  y sin cambiar el negocio.
- Intentos conservados `nav-diagnostics-ui-2026-10-20-chrome-first` a `fourth`:
  espera de encabezado, lectura con el modal abierto y el gancho inicial en
  `ui.form`, que no cubría módulos con formularios propios; se movió a `ui.message`.
- Accesibilidad, guía y regresión completa con estas fuentes:
  `*-2026-10-20-{chrome,edge}-nav-diagnostics.json` (**68 rondas, 926 comprobaciones,
  0 fallos**, incluidas accesibilidad 11/11 e integral 9/9 por motor) y
  `help-ui-2026-10-20-nav-diagnostics-*` 4/4.

## Límites

El registro es local por perfil y no se incluye en copias ni restauraciones. No
recoge errores silenciados intencionadamente por servicios auxiliares (por ejemplo,
renovación de lease en segundo plano).
