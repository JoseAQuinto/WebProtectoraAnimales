# Formularios de animales

`js/modules/animal-forms.js` implementa la composición de formularios sobre
`ui.form` y los servicios `animals` y `weights`, usando únicamente la instantánea
que recibe del módulo de animales. No accede a IndexedDB. Leer
`LIFECYCLE_API.md` para las reglas de transiciones.

## Contrato

```js
const ctx = {
  snapshot,              // tables y globalRevision de la vista
  refresh: async () => {},
  notify: (text, error) => {},
  canWrite: true,         // booleano o función; opcional, usa context.status
  afterSave: animalId => {} // opcional, se difiere hasta cerrar el formulario
};
RescueManager.modules.animalForms.entry(ctx, animalOptional);
RescueManager.modules.animalForms.edit(ctx, animal);
RescueManager.modules.animalForms.weight(ctx, animal);
RescueManager.modules.animalForms.disposition(ctx, animal, 'archive');
RescueManager.modules.animalForms.exit(ctx, animal);
```

Cada función devuelve el diálogo, permitiendo integraciones de foco y QA.
`disposition` acepta `archive`, `trash` y `restore`; esta última restaura archivo
o papelera sin reabrir episodios. Los formularios comprueban el permiso de
escritura antes de abrir, capturan la revisión de la vista y delegan la
idempotencia/estado ocupado/foco/cancelación/errores a `ui.form`.

## Recorridos

- Alta: nombre/especie, fecha y motivo, ubicación de protectora o descripción
  externa temporal y elección expresa de disponibilidad. Los detalles
  opcionales se agrupan en un desplegable. La ubicación no decide la
  disponibilidad. Código manual opcional, con aviso del formato `A-número`
  reservado y comprobación final del servicio.
- Reentrada: solo para un animal activo con `managementStatus: other_exit`.
  Los adoptados necesitan el recorrido de devolución de adopción y los
  fallecidos una corrección histórica; no se intenta abrir otro episodio por
  la vía normal. Cambiar un perfil es una operación separada de reentrar.
- Edición: nombre, especie, sexo, tamaño, raza, color, identificador,
  nacimiento/edad, esterilización y textos. No cambia código, ubicación ni
  situación de gestión.
- Nacimiento: elección explícita entre desconocido, fecha exacta, fecha
  estimada o edad estimada en meses con fecha de referencia. La UI usa esa
  elección para presentar solo los campos pertinentes y construir la
  combinación permitida por el dominio; no inventa edades.
- Peso: fecha civil no futura y gramos enteros positivos. No mantiene otro
  campo de peso actual. Corrección/papelera de mediciones siguen fuera de
  este formulario de alta y pueden conectarse a los servicios existentes.
- Archivo/papelera/restauración: explicación y confirmación explícita.
  Cuidado actual y tareas pendientes se vuelven a comprobar en el servicio.
- Salida/fallecimiento: selección expresa del hecho, fecha, motivo y motivos
  de cierre de acogida/reserva/solicitudes cuando existen. Se enumeran todas
  las tareas pendientes con título y una decisión obligatoria individual de
  conservar o cancelar; cada cancelación exige su motivo. Antes de aplicar se
  confirma el conjunto. El servicio valida relaciones y guarda los cambios
  juntos. No se crean cierres ni se cancelan tareas por defecto.

Fotografías y documentos se conectan desde la ficha; no se duplica su manejo
en estos formularios. Asignar/finalizar acogidas, solicitudes, reservas,
adopciones y devoluciones mantienen sus servicios propios y requieren otros
recorridos de interfaz.

## Integración y verificación

El módulo necesita que los estilos incluyan `[hidden]{display:none!important}`
para los campos condicionales, porque `.field` usa `display:grid`. Los textos
`af.*` ya se han incorporado en los dos diccionarios centrales EN/ES y los
suplementos de trabajo se han retirado. Cargar este módulo antes del módulo de animales
y de bootstrap, después de `ui.js` y los servicios.

Se ha ejecutado `node --check` en módulo y suplementos. La aceptación real en
file:// corresponde al recorrido de UI tras integrar el módulo; no se da por
probada en este documento. Los tres módulos de personas/formularios/animales
no presentan claves literales ausentes en los diccionarios centrales, con 647
claves por idioma en esta integración. Los formularios de tareas dinámicas todavía reciben
la instantánea completa: una instantánea posterior incompatible se rechaza
mediante revisión en vez de sobrescribir.
