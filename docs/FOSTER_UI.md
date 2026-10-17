# Interfaz de estancias en acogida

Módulo `js/modules/foster-workflow.js`, API `modules.fosterWorkflow.render(ctx,
animal)`. Devuelve un nodo para la sección Acogidas de la ficha. Se carga tras
`components/ui.js`, contactos/acogidas y el módulo de personas. El contexto
comparte `snapshot`, `canWrite`, `refresh` y `notify` con la ficha animal.

## Recorridos

- Muestra el historial real, fechas civiles según la preferencia de la
  organización, contacto de la agenda central, notas y motivo de excepción.
- Bajo cuidado y con ficha activa: asigna un perfil de acogida existente o
  finaliza la estancia abierta. Con más de una estancia abierta se bloquean
  las acciones y se muestra un aviso de integridad.
- El selector muestra contacto y ocupación/capacidad. Antes de guardar presenta
  disponibilidad, especies/tamaños, restricciones, notas y animales actuales.
  Los perfiles/contactos archivados, en papelera o fusionados no se ofrecen.
  Los perfiles no disponibles siguen siendo seleccionables con excepción.
- Una excepción por disponibilidad, capacidad, especie, tamaño o tamaño
  desconocido exige marcar confirmación y escribir un motivo de hasta 200
  caracteres. Cambiar de perfil limpia esa confirmación y motivo.
- Finalizar exige fecha, motivo y destino explícito: ubicación activa de
  refugio o descripción externa temporal. La fecha final es el día del cambio;
  el intervalo se interpreta `[inicio, fin)`.
- No se crean contactos ni perfiles desde este formulario. Se enlaza a
  `#fosters` para gestionar perfiles sobre contactos existentes.

Los únicos comandos son `services.fosters.assign/end`. El servicio vuelve a
validar relaciones, fechas, compatibilidad y ocupación. La revisión global se
captura al abrir el diálogo; el identificador de operación, bloqueo al guardar,
errores, campos conservados y foco los gestiona `ui.form`. La confirmación se
muestra después de resolver el servicio, que espera `transaction.complete`.
No se accede a IndexedDB desde la vista. No se recalcula ni cambia la
disponibilidad para adopción o la reserva desde esta interfaz.

## Verificación

Comprobación de sintaxis del módulo y paridad de sus traducciones EN/ES.
La aceptación real `file://` debe cubrir, con datos sintéticos:

1. Animal bajo cuidado con perfil compatible: seleccionar, revisar y asignar;
   verificar una estancia, ubicación foster, ocupación e historial.
2. Con estancia abierta solo se ofrece finalizar. Verificar que una doble
   pulsación/reintento no crea dos estancias ni eventos.
3. Capacidad llena, perfil no disponible, especie/tamaño incompatible y tamaño
   desconocido: aviso específico, confirmación y motivo obligatorios. Cambiar
   de perfil debe desmarcar/limpiar el consentimiento anterior.
4. Finalizar en refugio y en destino externo; rechazar fecha futura/anterior al
   inicio, motivo o destino vacíos. Conservar campos ante error de revisión.
5. Verificar que finalización conserva reserva/disponibilidad y estancias
   anteriores; cierre/reapertura y backup/restauración conservan las relaciones.
6. Sin perfiles: mensaje y enlace operativo a perfiles, sin agenda duplicada.
   Modo lectura: comandos desactivados; historial/contactos accesibles.
7. Teclado, Escape y retorno de foco, textos EN/ES, ampliación y anchos de
   360/768/1024/1440 px. No equivalen a pruebas en dispositivos físicos.

La sintaxis y los contratos de servicio no acreditan por sí solos estos
recorridos en navegador. Registrar la evidencia real junto al ejecutor de UI.
