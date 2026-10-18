# Demostración opcional y retirada segura — 2026-10-18

Versiones `0.2.0-dev` / DB `2` / schema `1` / backup `1`, sin cambios.

## Cargar ejemplos

`#demo`, también desde Configuración y el aviso de ejemplos. Nunca carga por
abrir la aplicación. Requiere organización sin registros reales/importados de
negocio, incluidos archivo/papelera, y sin otro lote demo. Conserva configuración,
catálogos, ubicaciones, actividad previa y logos reales. Recursos reales no
asociados a configuración bloquean la carga conservadoramente.

Elegir EN/ES, previsualizar y revisar lista paginada, verificar una copia actual
y confirmar. Fechas relativas a hoy en la zona de la organización; no se van
moviendo después de la carga. Nombres/direcciones son ficticios (`example.test`)
y las instrucciones clínicas dicen expresamente que no son receta ni dosis.
Datos de ejemplo en scripts clásicos `data/demo.en.js` y `data/demo.es.js`.

Con catálogos estándar crea **90 registros** de un único lote `origin: demo`,
`originBatchId` estable. Si falta una opción activa/ubicación necesaria, crea
opciones propias marcadas, sin modificar las opciones desactivadas del usuario.

Ejemplos: ocho animales (perro/gato disponibles, cachorro, dos animales en una
familia de capacidad dos, reservado, adoptado, devuelto con episodio nuevo,
datos desconocidos y plan de tratamiento), perfiles/contactos multirrol,
solicitudes/adopciones/reserva/historia, pesos, alergia activa, tareas vencidas,
hoy y futuras, seguimiento completado, voluntario con 150 minutos, donación
económica/material, stock bajo mínimo, TXT incorporado y referencia externa.

Los indicadores se calculan de esas filas. Bajo cuidado 7, acogida 2, reservado 1;
dos adopciones históricas (una devuelta), nueve episodios. Ingresos 75 unidades
de la moneda, gasto clínico 14 contado una vez y stock escalado 100 con mínimo
200. Las monedas JPY/KWD conservan su precisión. Materiales no generan ingreso.
No se suman las tarjetas solapadas como si fueran grupos excluyentes.

## Retirada y trabajo real

Cada lote tiene su propia revisión de retirada. No existe un borrado genérico
de la organización. Una revisión sin uso real retira exclusivamente sus filas
marcadas, incluidos archivos/finanzas/stock de demostración, manteniendo todo
lo demás. La vista lista nombres, animal/fecha del episodio y acción, paginada.

**El trabajo que cree el usuario mientras explora se considera real.** La revisión
recorre todas las referencias declaradas en los esquemas (incluidas fuentes,
vínculos documentales, mapas y actividad) desde filas externas al lote.
Si una apunta a un ejemplo, protege todo su componente conectado de ejemplos.
Se mantienen juntos la ficha, historia, archivos y movimientos necesarios.

El usuario puede confirmar **conservar como reales esos ejemplos conectados**
y retirar los componentes sin uso. Conversión preserva UUID, valores, dinero,
stock, creación y bytes; cambia únicamente origen/lote/revisión/metadatos de
actualización. Un registro real externo queda exactamente igual. La UI exige
consentimiento adicional y explica que hay que revisar nombres/importes ficticios
antes del uso operativo. Un ejemplo no se convierte ni borra durante la vista
previa. Editar uno con actividad real también protege su identidad e historia.

Se usa componente conectado completo por prudencia, no una supuesta dependencia
mínima que pudiera mutilar historia válida. El informe muestra la referencia
directa que motiva conservarlo. Otros lotes se consideran externos al seleccionado.
Después de convertir/retirar el último lote desaparece el aviso demo; si queda
trabajo real, no se permite cargar otra demostración sobre él.

## Integridad y recuperación

Vista previa pura con plan privado, revisión y lote exactos. Carga y retirada
son cambios complejos: copia completa actual verificada, dataset separado,
validación/hash y activación atómica. Nunca vacía primero el conjunto activo.
El anterior queda retirado, las preparaciones canceladas se conservan. Cambios
concurrentes, pérdida de lease o cancelación antes de activar no descartan trabajo.
Repetir el mismo plan aplicado no duplica registros ni activaciones.

El generador construye un grafo ficticio coherente y lo valida; no ejecuta
de nuevo ingresos/stock al copiarlo al dataset. Todo lo creado queda marcado,
incluidos eventos y log de carga. La retirada registra `demo_clear`, con lote
y cantidades, sin repetir contenido personal ni afirmar auditoría certificada.
`record-graph.js` obtiene dependencias del esquema, no de nombres. Generación,
decisión de conservación y UI están separadas por responsabilidad.

## Evidencia

Chrome/Edge **15/15 por motor**:
`demo-ui-2026-10-18-{chrome,edge}-review-labels.json`.
108 fuentes intactas, file:// offline, servicios reales y perfiles sintéticos.
Fixture explícita de organización/preferencias/logo y posteriores registros
reales; carga y retirada de demostración se realizan por UI.

- Sin carga automática; vista previa ES de 90 filas, paginación, consentimiento
  y bloqueo sin copia actual. Descarga/reselección/verificación reales.
- Cancelación inyectada mediante callback del servicio durante preparación real
  (no se atribuye al botón); activo y logo intactos. UI carga una vez con doble
  envío, verifica escenarios, derivaciones, fechas, TXT y etiquetas de lote.
- Retirada intacta elimina exactamente sus 90 registros, con otra copia actual,
  y deja configuración/logo iguales. Recarga EN con lote nuevo, sin reemplazo.
- Formulario antiguo de retirada se rechaza después de crear gasto real referido
  a Milo y contacto independiente. Mantiene campos y trabajo concurrente.
- Nueva revisión propone retirar 71 y convertir 19 ejemplos conectados; falta de
  consentimiento específico no escribe. Al confirmar mantiene Milo, episodio,
  cuidados/historia/TXT y gasto/identidad reales, y elimina otros ejemplos.
  Quedan 2 movimientos de gasto, sin generar otro movimiento por convertir.
- Idiomas, anchos 360/768/1440, banner/controles, dos cierres propios y reapertura
  con idénticas revisiones/recuentos/digest y hashes reales de logo/TXT. Sin
  errores de página/consola ni HTTP de página. Captura estrecha inspeccionada.

Las primeras rondas `...first.json` también tienen 15/15. La revisión visual
motivó nombrar episodios por animal/fecha y usar paginación de registros, sin
cambiar el negocio; las rondas `...review-labels.json` acreditan las fuentes nuevas.
Verificación conjunta: **229 Node / 802 estáticas**, ocho pruebas nuevas de demo.
Incluyen idiomas/fechas/JPY/KWD, carga bloqueada, retirada pura, referencias reales,
actividad, catálogos ausentes/inactivos, revisión y backup obligatorio.

No acredita cuota física, dispositivos reales, accesibilidad integral, Firefox
actual o publicación comercial. Los datos ficticios no completan guías/licencia,
historia corregible, limpieza controlada ni aceptación final pendiente.
