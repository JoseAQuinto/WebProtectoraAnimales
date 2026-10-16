# Interfaz de contactos, acogidas y voluntariado

`js/modules/people.js` es un script clásico IIFE de presentación. Consume una
instantánea y llama a los servicios existentes; no consulta IndexedDB ni
mantiene una copia persistente paralela. Cargar después de servicios,
componentes e idiomas y antes de bootstrap. `css/people.css` usa las variables
de `app.css`.

## Integración

```js
const nodes = RescueManager.modules.people.render(page, {
  snapshot, // { tables, globalRevision, ... }
  refresh: async () => { /* volver a capturar y renderizar la aplicación */ },
  notify: (message, error) => { /* aviso de la aplicación */ },
  documents: ({entityType, entityId}) => documentNodes // opcional
});
```

`page` admite `contacts`, `fosters` o `volunteers`. Devuelve un array de nodos
para el contenido principal. `openContact(id, {context: ctx})` abre una ficha
utilizando el contexto indicado; los enlaces desde animales deben pasarlo
porque la agenda puede no haberse visitado todavía. `openContact(id)` reutiliza
el último contexto para acciones internas. La función opcional `documents` aporta un nodo o array para la
ficha del contacto, usando `entityType: 'contact'`.

Los textos `p.*` y navegación están incorporados en los dos diccionarios
centrales `locales/en.js` y `locales/es.js`; los suplementos de trabajo se han
retirado durante la integración.

## Recorridos implementados

- Agenda con búsqueda de nombre/email/teléfono a través del servicio,
  retraso de 180 ms, roles, tipo, activo/archivado/ambos/papelera, orden por
  nombre y paginación de 20 registros. Solo se reconstruye el área de
  resultados al buscar o cambiar filtros.
- Alta y edición con hasta diez teléfonos estructurados, etiquetas, roles,
  email, dirección y notas. Los roles de acogida/voluntario ya usados por un
  perfil se conservan. Nombre/email/teléfono muestran coincidencias con
  evidencia y acceso a la ficha existente. Email/teléfono coincidentes
  requieren la confirmación explícita de contacto independiente, conservada
  como opción de la escritura. El servicio vuelve a comprobar duplicados.
- Ficha con datos centrales, perfiles, recuentos de relaciones por entidad y
  extensión opcional de documentos. Archivo/restauración del archivo y
  papelera/restauración tienen confirmación. La papelera solo se ofrece sin
  relaciones; el servicio vuelve a comprobarlo.
- Fusión con elección del contacto conservado, comparación de todos los
  campos resolubles, decisión obligatoria por diferencia, unión visible de
  roles y teléfonos y confirmación explícita. Se explica la reasignación y
  la conservación del historial económico. Dos perfiles del mismo tipo
  bloquean el botón; el servicio valida nuevamente el conflicto.
- Antes de crear un perfil se busca/elige contacto existente; se puede crear
  uno desde ese diálogo conservando la decisión de reutilizar una coincidencia.
- Acogidas: lista por disponibilidad/especie/tamaño, capacidad/ocupación/libres
  derivados por `fosters.occupancy`, perfil editable, animales actuales e
  historial con motivos y excepciones. Se explica el intervalo `[inicio, fin)`.
- Voluntariado: perfil editable, estado/funciones/disponibilidad/especialidades,
  búsqueda, filtros y totales por periodo de los voluntarios filtrados.
  Actividades en minutos, fecha y notas con alta/edición, papelera/restauración,
  listas por periodo y paginación. Las horas en papelera no se suman. Se muestran
  horas/minutos calculados a partir del entero persistido.

Los formularios de perfiles y horas utilizan `ui.form` ampliado con
`labelKey` y `multiselect`. Contactos y comparación usan `ui.dialog` porque
necesitan composición dinámica. Todos preservan errores y cambios, bloquean
doble envío, capturan revisión al abrir y conservan `operationId` en reintentos
sin cambio de intención. Las acciones de escritura se deshabilitan en lectura,
y las comprobaciones definitivas corresponden a los servicios.

## Pruebas y límites

`node --check` correcto para módulo y ambos suplementos de idioma. La
aceptación real de los recorridos se registra en las pruebas de navegador
de esta sesión tras integrar rutas, orden de scripts y traducciones; este
documento no la da por ejecutada.

La lista todavía recibe la instantánea completa: la paginación limita el DOM,
no la lectura O(N) del contexto. El historial desplegable de acogida muestra
las estancias existentes del perfil y todavía no pagina ese historial.
Asignar/finalizar acogidas y adopciones corresponden a la ficha del animal y
su módulo, no se añaden acciones simuladas a estas pantallas. La eliminación
permanente y la retirada/fusión de perfiles duplicados siguen pendientes en
servicios; por eso la UI no ofrece esos botones. Exportación CSV/JSON de
personas/horas y relación con tareas corresponden a fases posteriores.

No se expone UUID en textos visibles. Los datos del usuario pasan por la
construcción segura del DOM de `ui.el`. Las fechas se presentan según la
preferencia de organización sin conversiones de huso; números y duración
usan `Intl.NumberFormat` y mensajes EN/ES.
