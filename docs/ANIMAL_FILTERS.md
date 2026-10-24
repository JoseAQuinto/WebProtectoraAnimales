# Filtros combinados de animales — 2026-10-18

Sin cambios de versiones persistidas. La lista usa ahora una consulta pura
`services/animal-queries.js` y una UI separada `modules/animal-list.js`;
la ficha y sus formularios permanecen en sus módulos de negocio.

Filtros con selección múltiple: especie, sexo, raza (incluye desconocida),
situación, disponibilidad, tipo de ubicación, refugio/sala/zona, familia de
acogida y contacto adoptante. Opciones del mismo filtro se combinan mediante
OR; filtros diferentes mediante AND. Selección vacía significa todos.
Desde 2026-10-24 cada filtro múltiple es un desplegable con casillas
(`ui.choices`, `<details>` + checkboxes): no requiere teclas modificadoras y
funciona igual con ratón, teclado y pantalla táctil. La interfaz no menciona
OR/AND; explica en lenguaje cotidiano que se pueden marcar varias opciones.
Los valores activos aparecen como chips retirables («Filtros activos (n)») con
«Limpiar filtros», que solo se muestra si hay alguno. Búsqueda normalizada de
nombre/código/raza/notas y microchip como texto.

Filtros adicionales se agrupan en una sección desplegable: entrada desde/hasta,
adopción desde/hasta, archivo/papelera y orden. Todos los periodos son inclusivos
y rechazan fechas inválidas u orden invertido, mostrando error sin filas antiguas.

- Entrada: fecha del episodio **más reciente**, incluida una devolución.
- Familia: estancias abiertas; se pueden incluir expresamente las finalizadas.
- Adoptante y periodo: deben coincidir **en la misma adopción**. No basta que
  un animal tenga una adopción con esa persona y otra distinta dentro del periodo.
- Contactos fusionados se resuelven al sobreviviente. Una devolución no borra
  la adopción original; animales archivados siguen disponibles con visibilidad.
- Archivo incluye archivados y excluye papelera; papelera es una vista explícita.
- Orden por nombre/código/creación y UUID para desempatar. Página y tabla/tarjetas
  respetan preferencias de organización. Las imágenes usan validación existente
  y revocan URLs al cambiar resultados, sin prepararlas dos veces por fila.

## Aceptación

Chrome/Edge **10/10 por motor** en
`animal-filters-ui-2026-10-18-{chrome,edge}-first.json`.
Fixture real sintética: animales de tres especies, dos estancias de la misma
familia (abierta/cerrada), un animal adoptado por dos personas en fechas distintas
con devolución intermedia y archivo, otro en papelera y fotografía incorporada.
UI: OR/AND, valores retirables, raza normalizada/desconocida, microchip con ceros,
ubicación/disponibilidad, familia actual/histórica, entrada tras devolución,
adoptante/fecha del mismo hecho, archivo/papelera, periodo inválido, EN/ES y
360/768/1440. Revisión/digest de tablas y hashes reales de fotos no cambian
al filtrar ni después de los dos cierres y reapertura por motor.
87 fuentes cargadas intactas, sin errores de página/consola ni HTTP de la página.

171 subpruebas Node y 697 estáticas correctas. Cinco nuevas consultas prueban
combinación/periodos/familias/adopciones/fusión/visibilidad/normalización y pureza.
No acredita dispositivos físicos ni resuelve las capturas O(N). Esta es una
lista actual filtrada por hechos; no reconstruye un censo de una fecha pasada.
