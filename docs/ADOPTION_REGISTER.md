# Registro global de adopciones — 2026-10-18

`#adoptions` reúne solicitudes, reservas y adopciones realizadas. Cada vista
filtra por estado, animal, contacto, texto (nombres/código/email), periodo
inclusivo y visibilidad del registro (activo, incluir archivo o papelera).
Filtros distintos se combinan con AND. La fecha del periodo es, respectivamente,
solicitud, reserva o adopción; una devolución no mueve la adopción de fecha.
Páginas de 20, orden fecha/registro descendente y UUID de desempate.

`services/adoption-queries.js` consulta la captura sin mutarla. Resuelve
contactos fusionados para mostrar la ficha sobreviviente y conserva las
referencias históricas de origen. No accede a IndexedDB ni escribe.

El detalle usa `adoptionWorkflow.render(ctx,animal,{type,id})` para mostrar
exactamente un registro y reutilizar formularios y comandos ya existentes:
revisión, aprobación, reserva, cierre, adopción y devolución. Un guardado
cierra el detalle antiguo y refresca la captura. La ficha del animal se
abre desde enlaces explícitos y se cierra el modal al navegar. Nueva solicitud
permite elegir un animal activo bajo cuidado antes de abrir el formulario.
La disponibilidad de acciones respeta la situación, contacto y lease.
Sin cambios de esquema, backup ni semántica de los comandos.

## Aceptación

Ejecutor `tests/e2e/adoption-register-ui.cjs`, datos sintéticos aislados y
servicios reales. Chrome y Edge: **10/10 por motor**, `file://` offline:

- `adoption-register-ui-2026-10-18-chrome-first.json`.
- `adoption-register-ui-2026-10-18-edge-first.json`.

Fixture explícita: 22 solicitudes antecedentes (una adoptada/devuelta) y un
animal objetivo. Por UI global se crea/revisa/aprueba/reserva/adopta/devuelve
el objetivo. Doble guardado conserva un único efecto. La reserva es vigente
durante todo el día de caducidad y se cumple coordinadamente al adoptar.
La devolución conserva ambas adopciones e inicia un único episodio nuevo.
Filtros/periodo inválido/páginas/contacto y animal exactos, detalle enfocado,
EN/ES y anchos 360/768/1440. Revisión/recuentos/digest de tablas no cambian
al consultar; se conservan después de cerrar y reabrir.
74 fuentes cargadas con hashes intactos, dos cierres propios por motor y
cero errores de página/consola o solicitudes HTTP de la página.

142 subpruebas Node y 632 estáticas correctas. Cinco pruebas nuevas cubren
uniones/resolución, fechas inclusivas por vista, estado devuelto, filtros AND,
archivo/papelera, estabilidad/paginación y rechazo de periodos/límites inválidos.

## Límites

Se reutiliza la aceptación de reglas de negocio previa en WORKFLOWS_UI_ACCEPTANCE;
esta ronda acredita sus entradas globales. No introduce editar/adoptar en masa,
corrección de hechos ni importación. Faltan exportaciones por módulo. El
rendimiento sigue ligado a capturas O(N); las listas paginan en memoria.
Emulación estrecha no acredita un dispositivo real. Producto aún incompleto.
