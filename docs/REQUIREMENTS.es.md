Actúa como arquitecto de software, analista funcional, diseñador UX/UI y desarrollador senior especializado en aplicaciones web que funcionan completamente sin Internet.

Tu misión es diseñar, desarrollar, probar y documentar una aplicación comercial completa para gestionar protectoras de animales, refugios, asociaciones de rescate y pequeños centros de acogida.

Trabaja siguiendo todas las instrucciones de este documento. Mantén coherencia entre arquitectura, modelos de datos, interfaz, reglas de negocio y pruebas.

No intentes construir toda la aplicación en una única entrega si eso compromete su calidad. Divide el trabajo en fases funcionales, comprueba cada fase y conserva un registro del estado del proyecto para poder continuar sin perder decisiones ni contexto.

La prioridad, en este orden, es:

1. Fiabilidad.
2. Facilidad de uso.
3. Protección de los datos.
4. Funcionamiento completamente offline.
5. Diseño profesional.
6. Mantenimiento.
7. Preparación para su comercialización como producto digital en Etsy.

**1. Producto, público y objetivo comercial**

Desarrolla un producto con el concepto comercial:

**“Animal Rescue & Shelter Manager – Offline, Private, No Subscription”.**

Está dirigido a asociaciones pequeñas y medianas que actualmente utilizan hojas de cálculo, documentos, notas y carpetas independientes.

Debe permitir centralizar animales, salud, acogidas, adopciones, contactos, voluntariado, tareas, finanzas, donaciones, inventario, documentos e informes.

El comprador recibirá una carpeta comprimida y seguirá este recorrido:

1. Descargar el ZIP.
2. Descomprimirlo completamente.
3. Abrir `index.html` en un navegador compatible.
4. Elegir idioma y configurar su protectora.
5. Empezar a trabajar o restaurar una copia existente.

El producto debe resultar comprensible para una persona sin conocimientos técnicos.

La versión comercial debe incluir todos los módulos obligatorios de este documento. Las fases son una forma de organizar el desarrollo; no justifican entregar como terminado un producto con módulos simulados o incompletos.

**2. Condiciones obligatorias de funcionamiento**

La aplicación debe funcionar sin:

- Servidor, incluido servidor local.
- Hosting.
- Base de datos externa.
- Registro.
- Inicio de sesión.
- Conexión a Internet.
- Suscripciones.
- API externa.
- Activación online.
- Instalación de Node.js, Python u otras herramientas por parte del comprador.
- Extensiones de navegador.
- Cambios de seguridad o permisos experimentales del navegador.

Todo lo necesario para ejecutar el producto debe encontrarse dentro de la carpeta entregada.

No incluyas CDN, fuentes remotas, imágenes remotas, publicidad, analítica, seguimiento, comprobaciones de licencia por Internet ni actualizaciones automáticas.

La aplicación será inicialmente para una única organización y una instalación de trabajo. No implementes sincronización, trabajo simultáneo entre ordenadores ni acceso compartido por red.

Explica en la ayuda que copiar la carpeta de la aplicación a otro equipo no traslada automáticamente los datos guardados por el navegador. Para trasladarlos será necesario crear y restaurar una copia de seguridad.

**3. Viabilidad técnica: comprobar antes de construir**

El requisito de abrir directamente `index.html` condiciona la arquitectura.

Los módulos JavaScript del navegador pueden provocar errores CORS al ejecutarse mediante `file://`. Por eso, utiliza scripts clásicos locales y no hagas depender el producto de `type="module"`, importaciones ES en tiempo de ejecución o peticiones a archivos JSON locales. Consulta la [documentación de módulos JavaScript de MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules).

El tratamiento del origen de los archivos `file://` depende de la implementación del navegador. No presupongas que dos archivos o carpetas compartirán almacenamiento ni que mover la aplicación conservará su acceso a los datos. Consulta la [política de mismo origen de MDN](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy).

Antes del desarrollo funcional, realiza una prueba pequeña mediante `file://` que compruebe:

- Carga de CSS y scripts locales.
- Apertura de IndexedDB.
- Escritura y lectura de registros.
- Escritura y lectura de un `Blob`.
- Confirmación de transacciones.
- Persistencia al cerrar completamente el navegador y volver a abrir el mismo archivo.
- Descarga y selección de archivos JSON.
- Funcionamiento sin conexión desde la primera apertura.
- Comportamiento ante almacenamiento denegado.
- Comportamiento al abrir una segunda pestaña.
- Efectos de mover o renombrar la carpeta.
- Disponibilidad real de las API opcionales que pretendas utilizar.

Prueba en las versiones estables de Chrome, Edge y Firefox disponibles durante el desarrollo. Registra sistema operativo, versión exacta del navegador, fecha y resultados.

La compatibilidad objetivo principal es ordenador con Chrome, Edge y Firefox. También debes comprobar la experiencia en tablet y móvil, incluyendo las limitaciones reales de abrir archivos HTML locales en cada plataforma.

No confundas un navegador móvil con una vista previa de archivos del sistema operativo.

Si una combinación no cumple los requisitos, no la anuncies como compatible. Si falla una combinación obligatoria, documenta el bloqueo con evidencia antes de seguir construyendo sobre esa suposición.

No soluciones una incompatibilidad exigiendo al comprador desactivar protecciones, instalar herramientas o iniciar un servidor.

No prometas compatibilidad universal ni conservación indefinida de datos. La compatibilidad comercial debe corresponder a pruebas reales.

**4. Decisiones tecnológicas cerradas**

Utiliza estas decisiones como base del desarrollo:

| Área | Decisión |
|---|---|
| Interfaz | HTML5 semántico, CSS3 y JavaScript vanilla |
| Ejecución | Apertura directa de `index.html` |
| Organización JavaScript | Scripts clásicos con `defer`, encapsulación mediante IIFE y un único espacio de nombres |
| Persistencia | IndexedDB |
| LocalStorage | Fuera del almacenamiento de negocio; no será una alternativa automática |
| Identificadores | UUID v4 |
| Relaciones | Identificadores estables y validación explícita en servicios |
| Fechas de negocio | Cadenas `YYYY-MM-DD` |
| Marcas temporales técnicas | ISO 8601 en UTC |
| Dinero | Enteros en unidades menores de la moneda |
| Fotografías | Imágenes optimizadas y miniaturas guardadas como `Blob` |
| Documentos | Archivos pequeños incorporados y referencias explícitas para archivos externos |
| Backup completo | JSON versionado, con binarios en Base64 y comprobación de integridad |
| Restauración | Preparación en un conjunto de datos separado y activación atómica |
| Internacionalización | Diccionarios locales JavaScript para inglés y español |
| Gráficos | SVG generado localmente, acompañado de tablas accesibles |
| CSV | Papa Parse incluido localmente |
| SHA-256 | Web Crypto cuando esté disponible y alternativa local mediante `js-sha256` |
| Navegación | Rutas mediante fragmentos `#` |
| Impresión | HTML y CSS de impresión, con `window.print()` |

IndexedDB es la fuente de verdad porque permite almacenamiento asíncrono, índices, transacciones y objetos binarios. No guardes la base de datos como un gran JSON en LocalStorage.

El comportamiento de LocalStorage bajo `file://` no está definido uniformemente, por lo que tampoco resuelve la portabilidad entre navegadores. Consulta la [documentación de LocalStorage de MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).

Para CSV utiliza inicialmente Papa Parse 5.7.0, incorporado como archivo local. Para la alternativa SHA-256 utiliza inicialmente `js-sha256` 1.0.0 en su distribución para navegador. Estas versiones sirven como referencia inicial; verifica sus avisos de seguridad antes de incorporarlas y documenta cualquier sustitución justificada. No utilices versiones flotantes. Referencias: [versiones de Papa Parse](https://github.com/mholt/PapaParse/releases) y [versiones de js-sha256](https://github.com/emn178/js-sha256/releases).

No añadas otras dependencias de ejecución salvo que resuelvan una necesidad concreta que no pueda cubrirse razonablemente con estas decisiones. Cualquier dependencia añadida debe estar incluida localmente, tener versión fija y permitir distribución comercial.

Las herramientas de desarrollo y pruebas pueden requerir instalaciones en el entorno del desarrollador. El ZIP del comprador debe funcionar sin ellas.

**5. Arquitectura y separación de responsabilidades**

Organiza la aplicación en estas capas:

- Presentación: vistas, componentes y formularios.
- Aplicación: servicios y casos de uso.
- Dominio: modelos, reglas, validaciones y transiciones.
- Persistencia: repositorios, transacciones, índices y migraciones.
- Servicios transversales: traducciones, archivos, backup, importación, exportación y diagnóstico.
- Utilidades: fechas, importes, identificadores, normalización y operaciones puras.

Respeta estas reglas:

- Las vistas no acceden directamente a IndexedDB.
- Los repositorios no manipulan el DOM.
- Las reglas de negocio no se duplican en formularios e importadores.
- Los servicios coordinan las operaciones que afectan a varias entidades.
- Las validaciones importantes se ejecutan aunque el dato no proceda de un formulario.
- Los informes consultan los mismos datos y reglas que utiliza el resto de la aplicación.
- El estado de interfaz no sustituye a los datos persistidos.
- Un evento de interfaz no implica que una operación ya esté guardada.

Utiliza un único espacio de nombres, por ejemplo `window.RescueManager`, con áreas internas para dominio, almacenamiento, servicios, componentes y módulos.

Encapsula cada archivo. Evita variables globales adicionales y dependencias circulares.

Carga scripts en orden explícito mediante `defer`: bibliotecas, espacio de nombres, configuración, traducciones, utilidades, dominio, almacenamiento, servicios, componentes, módulos e inicio.

No implementes un sistema complejo de plugins ni un cargador dinámico innecesario.

Mantén los archivos centrados en una responsabilidad. Como referencia, revisa cualquier archivo propio que supere aproximadamente 400–500 líneas; divídelo cuando la separación mejore la comprensión. No fragmentes funciones artificialmente para cumplir un número.

**6. Estructura del proyecto**

Utiliza una estructura equivalente a esta:

```text
/
  index.html
  README.txt
  README.es.txt
  LICENSE.txt
  THIRD_PARTY_NOTICES.txt
  CHANGELOG.md

  css/
    tokens.css
    base.css
    layout.css
    components.css
    modules.css
    responsive.css
    print.css

  js/
    namespace.js
    config.js
    bootstrap.js

    core/
      router.js
      events.js
      ui-state.js
      error-handler.js
      capabilities.js

    domain/
      enums.js
      schemas.js
      validators.js
      animal-rules.js
      adoption-rules.js
      foster-rules.js
      finance-rules.js
      inventory-rules.js

    storage/
      database.js
      schema.js
      transactions.js
      repositories.js
      dataset-manager.js
      write-coordinator.js
      migrations/

    services/
      animals.js
      contacts.js
      health.js
      fosters.js
      adoptions.js
      volunteers.js
      tasks.js
      finance.js
      donations.js
      inventory.js
      documents.js
      timeline.js
      search.js
      reports.js
      backup.js
      restore.js
      import.js
      export.js
      settings.js
      demo.js

    components/
      app-shell.js
      data-table.js
      pagination.js
      filters.js
      form-fields.js
      dialog.js
      notifications.js
      status-badge.js
      empty-state.js
      chart.js
      file-picker.js

    modules/
      dashboard/
      animals/
      health/
      fosters/
      adoptions/
      contacts/
      volunteers/
      tasks/
      finance/
      donations/
      inventory/
      documents/
      reports/
      settings/
      help/

    utils/
      ids.js
      dates.js
      money.js
      quantities.js
      strings.js
      files.js
      images.js
      canonical-json.js
      integrity.js
      csv.js

  locales/
    en.js
    es.js

  data/
    demo.en.js
    demo.es.js

  assets/
    icons/
    images/

  vendor/
    papaparse/
    js-sha256/

  docs/
    ARCHITECTURE.md
    DATA_MODEL.md
    BUSINESS_RULES.md
    BACKUP_FORMAT.md
    IMPORT_FORMATS.md
    MIGRATIONS.md
    COMPATIBILITY.md
    TEST_PLAN.md
    RELEASE_CHECKLIST.md
    PROJECT_STATUS.md

  tests/
    index.html
    unit/
    integration/
    fixtures/
    e2e/
```

La estructura indica responsabilidades. Crea los archivos necesarios con contenido real; no generes decenas de archivos vacíos para aparentar avance.

Los datos de demostración y las traducciones deben poder cargarse mediante scripts clásicos locales. No hagas `fetch()` de archivos locales.

**7. Convenciones de datos**

Define y documenta todos los esquemas antes de construir formularios.

Cada entidad persistida de negocio tendrá, cuando corresponda:

- `id`: UUID estable.
- `datasetId`: identificador del conjunto de datos.
- `createdAt`.
- `updatedAt`.
- `revision`: entero para detectar edición sobre una versión antigua.
- `archivedAt`: archivo funcional, si aplica.
- `deletedAt`: borrado lógico, si aplica.
- `origin`: `real`, `demo` o `import`.
- `originBatchId`: lote de demostración o importación, cuando corresponda.

No confundas `revision` de un registro con la versión del esquema.

Las enumeraciones se almacenarán con códigos estables en inglés. Sus etiquetas se traducirán en la interfaz.

Utiliza `null` para valores desconocidos cuando el esquema lo permita. No confundas desconocido con cero, falso o cadena vacía.

No guardes edades calculadas, balances, ocupaciones o existencias como datos independientes si pueden derivarse de registros de origen. Si creas una caché, debe ser reconstruible y nunca constituir la única fuente.

Las fechas de calendario no deben convertirse innecesariamente a UTC. Evita desplazamientos de un día al mostrar fechas de nacimiento, entradas, adopciones o movimientos económicos.

Para horas opcionales de tareas utiliza fecha y hora locales explícitas, con la zona horaria configurada para la organización. No conviertas una fecha sin hora en un instante.

Guarda teléfonos, microchips, códigos e identificadores externos como cadenas para conservar ceros iniciales.

Utiliza UUID v4 mediante `crypto.randomUUID()` cuando esté disponible. Como alternativa, genera UUID v4 mediante `crypto.getRandomValues()`, respetando los bits de versión y variante. No utilices `Math.random()` como generador de identificadores. Consulta la [documentación de getRandomValues](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues).

Puedes mostrar un código humano como `A-000123`. Este código será distinto del UUID y se asignará transaccionalmente.

**8. Modelos de datos obligatorios**

Desarrolla como mínimo las siguientes entidades y documenta para cada campo: tipo, obligatoriedad, valor inicial, límites y validaciones.

**8.1. Configuración de organización**

Incluye:

- Nombre.
- Logo mediante referencia a un recurso.
- Teléfono.
- Email.
- Dirección.
- Idioma.
- Moneda.
- Formato de fechas.
- Zona horaria.
- Preferencias de visualización.
- Datos y pie de página para documentos impresos.
- Preferencias de recordatorio de backup.

No guardes el logo como una URL remota.

**8.2. Catálogos y ubicaciones**

Incluye catálogos para especies, tamaños, categorías económicas, categorías de inventario, tipos de documento y otras opciones que necesiten mantenimiento.

Los catálogos iniciales tendrán claves estables y etiquetas traducidas. Los valores personalizados conservarán el texto introducido por el usuario.

Una ubicación representa, por ejemplo, el refugio principal, una sala o una zona.

Desactivar una opción no debe destruir registros que ya la utilizan.

**8.3. Animales**

Incluye:

- Código interno.
- Nombre.
- Especie.
- Raza.
- Sexo: macho, hembra o desconocido.
- Fecha de nacimiento, cuando se conozca.
- Precisión de nacimiento: exacta, estimada o desconocida.
- Edad estimada y fecha de referencia, cuando no exista una fecha de nacimiento fiable.
- Tamaño.
- Color.
- Microchip original.
- Microchip normalizado para búsqueda y duplicados.
- Estado de esterilización: sí, no o desconocido.
- Fecha de esterilización opcional.
- Referencias a fotografía y miniatura.
- Descripción.
- Carácter.
- Comportamiento.
- Necesidades especiales.
- Observaciones.
- Situación de gestión.
- Disponibilidad para adopción.
- Ubicación actual coherente con los registros de acogida.

El peso se obtendrá de mediciones fechadas.

No mantengas simultáneamente una edad exacta y otra estimada contradictorias.

**8.4. Episodios de estancia**

Un animal puede entrar, ser adoptado y regresar posteriormente.

Crea una entidad de episodios que incluya:

- Animal.
- Fecha de entrada.
- Procedencia.
- Motivo de entrada.
- Tipo de entrada: primera entrada, devolución u otra.
- Fecha de salida.
- Motivo de salida.
- Adopción relacionada, si corresponde.
- Observaciones.

Solo puede existir un episodio abierto por animal.

La fecha de entrada visible en la ficha deberá distinguir la primera entrada y la entrada del episodio actual.

**8.5. Mediciones de peso**

Incluye animal, fecha, peso en gramos y observaciones.

El peso actual será la medición válida más reciente. No dupliques este valor de forma independiente en varios módulos.

**8.6. Contactos**

Incluye:

- Tipo: persona u organización.
- Nombre.
- Teléfonos.
- Email.
- Dirección opcional.
- Roles.
- Observaciones.

Roles iniciales:

- Adoptante.
- Familia de acogida.
- Voluntario.
- Donante.
- Veterinario.
- Proveedor.
- Colaborador.

Un mismo contacto puede tener varios roles.

**8.7. Perfiles de acogida**

Relacionados con un contacto:

- Capacidad total.
- Especies aceptadas.
- Tamaños aceptados.
- Disponibilidad.
- Condiciones o restricciones.
- Observaciones.

**8.8. Estancias en acogida**

Incluye:

- Animal.
- Episodio de estancia.
- Perfil de acogida.
- Fecha de inicio.
- Fecha de finalización.
- Motivo de finalización.
- Observaciones.

No puede haber dos acogidas abiertas para el mismo animal.

**8.9. Solicitudes de adopción**

Incluye:

- Animal.
- Contacto interesado.
- Fecha de solicitud.
- Estado.
- Entrevista y notas.
- Fecha de aprobación.
- Motivo de rechazo o cancelación.
- Observaciones.

Estados:

- `pending`: Pendiente.
- `under_review`: En revisión.
- `approved`: Aprobada.
- `rejected`: Rechazada.
- `completed`: Adoptado.
- `cancelled`: Cancelada.

**8.10. Reservas**

Incluye animal, solicitud, fecha de reserva, vencimiento opcional, estado y motivo de cierre.

Solo puede existir una reserva activa por animal.

La aprobación de una solicitud no equivale automáticamente a una adopción ni a una reserva.

**8.11. Adopciones realizadas**

Crea un registro independiente de la solicitud:

- Animal.
- Solicitud.
- Contacto adoptante.
- Episodio cerrado.
- Fecha de adopción.
- Fecha de devolución, si existe.
- Motivo de devolución.
- Observaciones.
- Movimiento económico relacionado, si existe.

Una devolución conserva esta adopción como hecho histórico.

**8.12. Perfiles de voluntariado**

Relacionados con un contacto:

- Disponibilidad.
- Funciones.
- Especialidades.
- Estado activo o inactivo.
- Observaciones.

**8.13. Horas de voluntariado**

Incluye voluntario, fecha, actividad, duración en minutos y notas.

Calcula totales a partir de estos registros.

**8.14. Registros veterinarios**

Incluye:

- Animal.
- Tipo.
- Fecha.
- Título o motivo.
- Descripción.
- Veterinario relacionado.
- Centro veterinario opcional.
- Resultados.
- Próxima revisión opcional.
- Plan o tarea de origen, cuando exista.
- Gasto relacionado.
- Documentos relacionados.

Tipos mínimos:

- Vacuna.
- Desparasitación.
- Revisión.
- Esterilización.
- Operación.
- Análisis.
- Diagnóstico.
- Enfermedad.
- Alergia.
- Administración de medicamento.
- Otro.

Para enfermedades y alergias permite indicar si siguen activas y cuándo se resolvieron, cuando corresponda.

**8.15. Planes de cuidados o tratamiento**

Incluye:

- Animal.
- Tipo de plan.
- Nombre.
- Fecha de inicio.
- Fecha de finalización prevista.
- Estado.
- Medicamento, si corresponde.
- Dosis, vía y frecuencia como instrucciones introducidas por el usuario.
- Veterinario.
- Observaciones.

Los actos pendientes se representarán mediante tareas relacionadas.

La aplicación registrará instrucciones veterinarias; no calculará dosis ni recomendará tratamientos o calendarios sanitarios por su cuenta.

**8.16. Tareas**

Incluye:

- Título.
- Descripción.
- Fecha prevista.
- Hora opcional.
- Prioridad.
- Estado.
- Animal opcional.
- Contacto opcional.
- Voluntario responsable opcional.
- Tipo de tarea.
- Entidad de origen, si fue generada desde otro módulo.
- Fecha real de finalización.
- Observaciones.

Estados: pendiente, en proceso y completada. Añade cancelada para conservar tareas que ya no proceden.

Prioridades: baja, media, alta y urgente.

**8.17. Movimientos económicos**

Incluye:

- Dirección: ingreso o gasto.
- Fecha.
- Categoría.
- Concepto.
- Importe en unidades menores.
- Código de moneda.
- Animal opcional.
- Contacto opcional.
- Origen relacionado.
- Clave de origen para impedir duplicados.
- Estado: contabilizado o anulado.
- Motivo de anulación.
- Movimiento corregido o sustituto, si corresponde.
- Observaciones.

El importe debe ser positivo; la dirección determina su efecto en el balance.

**8.18. Donaciones**

Incluye:

- Contacto donante opcional.
- Fecha.
- Tipo: económica o material.
- Observaciones.
- Movimiento económico para las económicas.
- Líneas de materiales para las materiales.

El importe de una donación económica se obtiene del movimiento relacionado. No mantengas dos importes editables independientes.

**8.19. Líneas de donación material**

Incluye:

- Donación.
- Tipo de material.
- Descripción.
- Cantidad.
- Unidad.
- Artículo de inventario opcional.
- Movimiento de inventario opcional.
- Valor estimado opcional, separado de los ingresos monetarios.

**8.20. Artículos de inventario**

Incluye:

- Nombre.
- Categoría.
- Unidad.
- Precisión admitida para cantidades.
- Stock mínimo.
- Proveedor opcional.
- Observaciones.
- Estado activo o archivado.

**8.21. Movimientos de inventario**

Incluye:

- Artículo.
- Fecha.
- Tipo: saldo inicial, compra, donación, consumo, devolución o ajuste.
- Variación de cantidad.
- Motivo.
- Contacto opcional.
- Donación o gasto relacionado.
- Clave de origen cuando corresponda.

Las existencias se calculan sumando movimientos válidos.

Utiliza cantidades enteras escaladas según la precisión del artículo. No acumules errores con operaciones de coma flotante.

**8.22. Recursos binarios**

Almacena fotografías, miniaturas, logos y archivos incorporados con:

- Identificador.
- Tipo de recurso.
- Nombre original.
- MIME validado.
- Tamaño real.
- Hash.
- Contenido `Blob`.
- Fecha de creación.

No conviertas permanentemente todos los archivos a Base64 dentro de IndexedDB.

**8.23. Documentos y vínculos**

El documento incluye:

- Título.
- Tipo.
- Fecha.
- Notas.
- Modo: incorporado o referencia externa.
- Recurso binario, si está incorporado.
- Nombre y ubicación descriptiva del archivo externo.
- Hash opcional del archivo original.

Utiliza vínculos para asociar un documento a uno o varios animales o contactos y, cuando corresponda, a adopciones o registros sanitarios.

Valida el tipo y la existencia de cada entidad relacionada.

**8.24. Historial del animal**

Incluye eventos con:

- Animal.
- Tipo de evento.
- Fecha del hecho.
- Fecha de registro.
- Entidad de origen.
- Clave de origen única.
- Datos mínimos para describir el evento.
- Referencia a una corrección o anulación, si existe.

Guarda códigos de evento y parámetros; genera el texto visible mediante traducciones.

**8.25. Registro de actividad**

Registra operaciones relevantes como creación, modificación, archivo, restauración, importación, cambios de estado y anulación.

No dupliques documentos completos ni grandes cantidades de información personal en el registro técnico.

No presentes este historial como un sistema de auditoría certificado o inalterable.

**9. Relaciones e integridad de negocio**

Documenta las relaciones y sus cardinalidades.

Como mínimo:

- Un animal tiene múltiples episodios, registros sanitarios, tareas, mediciones, documentos y eventos.
- Un contacto tiene varios roles.
- Un contacto puede tener un perfil de acogida y otro de voluntariado.
- Un perfil de acogida tiene múltiples estancias.
- Un animal tiene múltiples solicitudes y adopciones históricas.
- Una solicitud puede originar una reserva y una adopción.
- Una donación económica tiene un único movimiento de ingreso.
- Una donación material puede originar varios movimientos de inventario.
- Un registro veterinario puede vincularse a un gasto.
- Un documento puede tener varios vínculos.

IndexedDB no debe tratarse como si aplicara automáticamente claves foráneas. Comprueba la integridad en los servicios y en el validador de importación/restauración.

Todas las relaciones deben resolverse dentro del mismo `datasetId`.

No relaciones entidades mediante nombres. Utiliza identificadores.

No permitas eliminar de forma destructiva un contacto o animal que deje referencias sin resolver.

**10. Estados de animales y transiciones**

No utilices un único campo para mezclar ubicación, disponibilidad y resultado de una adopción.

Separa:

1. Situación de gestión: bajo cuidado, adoptado, fallecido u otra salida documentada.
2. Ubicación: protectora, acogida o ubicación externa temporal.
3. Disponibilidad: no disponible, disponible o reservado.
4. Sucesos históricos: devuelto, traslado, adopción anterior y otros.

La interfaz debe permitir reconocer y filtrar los conceptos solicitados:

- En protectora.
- En acogida.
- Disponible para adopción.
- Reservado.
- Adoptado.
- Devuelto.
- Fallecido.

Un animal puede estar en acogida y disponible para adopción simultáneamente. Muéstralo con etiquetas separadas.

“Devuelto” representa una nueva entrada vinculada a una adopción anterior. No debe impedir registrar dónde se encuentra el animal actualmente.

Implementa estas operaciones mediante servicios:

**Registrar entrada**

- Crear o identificar al animal.
- Crear un episodio.
- Establecer ubicación y disponibilidad.
- Añadir evento de historial.

**Asignar acogida**

- Comprobar que está bajo cuidado.
- Comprobar que no tiene otra acogida abierta.
- Revisar disponibilidad y capacidad de la familia.
- Crear estancia y actualizar ubicación.
- Añadir evento.

**Finalizar acogida**

- Registrar fecha y motivo.
- Establecer la nueva ubicación.
- Conservar la estancia histórica.

**Reservar**

- Comprobar solicitud válida.
- Impedir dos reservas activas.
- Actualizar disponibilidad.
- Conservar la relación con la solicitud.

**Completar adopción**

- Validar solicitud y fecha.
- Crear adopción.
- Cerrar el episodio.
- Cerrar acogida y reserva cuando existan.
- Actualizar situación y solicitud.
- Resolver las demás solicitudes abiertas con motivo visible.
- Revisar tareas pendientes: permitir conservar seguimientos y cancelar expresamente las que ya no procedan.
- Añadir evento.

**Registrar devolución**

- Conservar la adopción anterior.
- Registrar fecha y motivo de devolución.
- Crear un episodio nuevo.
- Solicitar ubicación y disponibilidad actual.
- Añadir evento.

**Registrar fallecimiento**

- Registrar fecha.
- Cerrar episodio y acogida.
- Cerrar reserva.
- Resolver tareas y solicitudes pendientes mediante una política visible.
- Conservar todos los registros históricos.

Las operaciones que deban suceder conjuntamente se guardarán en una misma transacción.

Define cómo se interpretan los intervalos de estancia. Utiliza fechas de entrada incluidas y fechas de salida excluidas para cálculos de duración y traslados; explica en la interfaz que la fecha de salida es el día del cambio.

**11. Persistencia, confirmación de guardado y concurrencia**

Utiliza un nombre de base de datos estable entre versiones.

Organiza los datos de negocio con claves compuestas equivalentes a `[datasetId, id]`. Mantén un registro central que indique qué conjunto de datos está activo.

Incluye metadatos operativos para:

- Conjunto activo.
- Versión del esquema.
- Revisión global de datos.
- Estado de migraciones.
- Conjuntos en preparación o recuperación.
- Coordinación de escritura.
- Información local sobre copias generadas y verificadas.

No incluyas números de versión del producto en el nombre de la base de datos de forma que una actualización abra una base vacía por accidente.

Crea índices según consultas reales:

- Animales por situación, especie y código.
- Microchip normalizado.
- Episodios por animal y fechas.
- Acogidas por animal y familia.
- Solicitudes por animal, contacto y estado.
- Tareas por fecha y estado.
- Salud por animal y fecha.
- Finanzas por fecha, dirección, categoría y animal.
- Inventario por artículo y fecha.
- Eventos por animal y fecha.

Utiliza índices únicos cuando proceda. Los campos opcionales de índices únicos deben modelarse para no crear colisiones entre valores vacíos.

No afirmes que un registro está guardado cuando únicamente ha finalizado una petición individual. Espera a la confirmación completa de la transacción. Consulta el [evento complete de IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction/complete_event).

No realices procesamiento de imágenes, lectura de archivos, diálogos o esperas ajenas a IndexedDB dentro de una transacción activa. Prepara esos datos antes. Las transacciones pueden pasar a estado inactivo y confirmarse automáticamente si no quedan peticiones pendientes. Consulta la [documentación de IDBTransaction](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction).

Ante un error:

- Aborta el conjunto de cambios cuando corresponda.
- Mantén los datos anteriores.
- Conserva el contenido del formulario mientras la sesión siga abierta.
- Muestra que no se ha guardado.
- Evita reintentos que puedan duplicar operaciones.

Desactiva temporalmente el botón de guardado durante una operación. Utiliza identificadores de operación e idempotencia para acciones que crean movimientos relacionados.

Coordina pestañas mediante un arrendamiento de escritura en IndexedDB, adquirido y renovado transaccionalmente. Cada escritura debe comprobar propietario, vigencia, conjunto activo y revisión.

La segunda pestaña debe abrirse en modo lectura o solicitar tomar el control. Una pestaña que pierda el control debe dejar de escribir.

BroadcastChannel puede mejorar la comunicación entre pestañas si funciona en ese entorno, pero no puede ser la única protección.

Comprueba también `revision` al editar registros. Si otra operación ha modificado el dato, muestra el conflicto y permite recargar o revisar los cambios; no sobrescribas silenciosamente.

**12. Durabilidad y límites del navegador**

La persistencia del navegador no equivale a una copia de seguridad.

Los navegadores gestionan cuotas y pueden eliminar almacenamiento no persistente. Solicitar persistencia mediante Storage API no garantiza que se conceda ni protege frente al borrado realizado por el usuario. Consulta las [cuotas y políticas de almacenamiento de MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).

Implementa:

- Detección de capacidades al iniciar.
- Prueba real de escritura y lectura.
- Consulta de cuota estimada cuando esté disponible.
- Solicitud de persistencia mediante una acción comprensible del usuario cuando sea compatible.
- Tratamiento explícito de rechazo o ausencia de estas API.
- Avisos de espacio y errores de cuota.
- Recordatorios de copia externa.

No intentes detectar de manera infalible el modo privado. Explica que las ventanas privadas pueden no conservar los datos.

No utilices el cierre de la página como momento principal de guardado. Guarda cada operación válida mientras la aplicación está abierta.

Si IndexedDB no está disponible, no aceptes datos como si fueran persistentes. Presenta una pantalla de diagnóstico y recuperación. No cambies silenciosamente a memoria o LocalStorage.

Si no hay datos accesibles, ofrece “Crear una organización” y “Restaurar una copia”. No concluyas automáticamente que es la primera instalación: también podría tratarse de otro perfil, otra ruta o almacenamiento borrado.

En la ayuda explica claramente:

- Los datos se guardan en el perfil del navegador.
- Otro navegador o perfil puede mostrar otra base.
- Mover la carpeta puede afectar al acceso.
- Limpiar los datos del navegador puede borrar la información.
- Una copia dentro del mismo almacenamiento no protege de su eliminación.
- La aplicación no puede recuperar información que el navegador ya haya eliminado y que no tenga backup.

**13. Migraciones y compatibilidad entre versiones**

Distingue:

- `appVersion`: versión del producto.
- `dbVersion`: versión física de IndexedDB.
- `schemaVersion`: versión del modelo de negocio.
- `backupFormatVersion`: versión del contenedor de backup.

Implementa migraciones numeradas, secuenciales y probadas.

Las modificaciones físicas de IndexedDB se realizarán mediante el mecanismo de actualización correspondiente. Las transformaciones amplias de datos se prepararán en un conjunto separado para evitar reemplazos destructivos.

Antes de una migración que transforme información:

1. Identificar versión de origen.
2. Mostrar qué se va a actualizar.
3. Facilitar una copia externa.
4. Preparar el nuevo conjunto.
5. Validarlo.
6. Activarlo solo si todo es correcto.
7. Mantener el conjunto anterior temporalmente para recuperación.

No borres datos anteriores para intentar liberar espacio y completar una migración.

Gestiona actualizaciones bloqueadas por pestañas abiertas. Cierra conexiones cuando se reciba un cambio de versión y muestra instrucciones claras.

Si el programa encuentra datos o backups de una versión futura incompatible:

- No intentes interpretarlos parcialmente.
- No modifiques la base.
- Explica que se necesita una versión compatible.

No implementes degradaciones de esquema improvisadas.

La restauración de backups antiguos debe utilizar migraciones explícitas. Mantén archivos de prueba de cada versión soportada.

**14. Dashboard**

Crea un panel inicial útil, con información calculada a partir de datos reales.

Incluye:

- Total de animales bajo cuidado.
- Animales alojados en la protectora.
- Animales en acogida.
- Animales disponibles.
- Animales reservados.
- Adopciones del mes.
- Entradas del mes.
- Próximas citas veterinarias.
- Vacunas pendientes.
- Tratamientos o actos de cuidados pendientes.
- Tareas vencidas y próximas.
- Ingresos del mes.
- Gastos del mes.
- Balance del mes.
- Artículos bajo mínimos.
- Estado del último backup.

Define cada indicador:

- Bajo cuidado: animales con episodio abierto.
- En protectora o acogida: subconjuntos según ubicación.
- Disponibles y reservados: disponibilidad entre animales bajo cuidado.
- Entradas: episodios iniciados durante el periodo, incluidas devoluciones.
- Adopciones: adopciones efectivamente realizadas durante el periodo.
- Finanzas: movimientos válidos por fecha, sin contar anulados.

Advierte mediante diseño y etiquetas que algunas tarjetas se solapan. No sumes “en acogida” y “disponibles” como si fueran grupos excluyentes.

Permite abrir las listas filtradas desde las tarjetas.

Incluye como máximo unos pocos gráficos útiles: entradas y adopciones mensuales, ingresos y gastos, distribución actual por especie.

Las alertas deben enlazar al registro que permite actuar.

**15. Gestión de animales**

Debe ser el centro de la aplicación.

Incluye:

- Vista de tabla.
- Vista de tarjetas con fotografía.
- Búsqueda.
- Ordenación.
- Paginación.
- Filtros combinables.
- Creación y edición.
- Archivo.
- Acceso a historial.
- Acciones de entrada, acogida, reserva, adopción, devolución y fallecimiento.

Organiza la ficha en:

- Información.
- Salud.
- Acogida.
- Adopción.
- Gastos.
- Documentos.
- Historial.

La cabecera debe mostrar nombre, código humano cuando resulte útil, fotografía, especie, sexo, edad y etiquetas de situación.

El formulario debe presentar primero los campos esenciales y agrupar la información adicional. No conviertas la creación de un animal en un formulario abrumador.

Los campos desconocidos deben poder permanecer sin completar cuando sea razonable.

Muestra alergias y necesidades especiales de forma visible sin convertir toda la ficha en una alerta.

La pestaña Gastos debe utilizar movimientos económicos relacionados. No debe crear un sistema paralelo de gastos.

**16. Salud y tratamientos**

Permite registrar todos los tipos sanitarios definidos en el modelo.

Incluye:

- Historial cronológico.
- Enfermedades y alergias activas.
- Tratamientos en curso.
- Vacunas y desparasitaciones registradas.
- Próximos actos sanitarios.
- Revisiones pendientes.
- Veterinario y coste relacionado.
- Documentación adjunta.

Calcula alertas a partir de fechas introducidas por el usuario:

- Vencido.
- Hoy.
- Próximos siete días.
- Más adelante.

No marques una vacuna como administrada por haber alcanzado su fecha prevista.

Las tareas relacionadas y el calendario utilizarán el mismo registro de tarea. No crees copias independientes de la misma cita en varios módulos.

Al completar un acto sanitario que deba generar un registro clínico:

1. Solicita confirmación de realización y fecha.
2. Crea el registro sanitario.
3. Completa la tarea.
4. Actualiza el plan cuando corresponda.
5. Añade el evento.
6. Guarda todo de forma coherente.

Un tratamiento de varias administraciones puede tener varias tareas. Evita generar series infinitas o ejecutar cambios mientras la aplicación está cerrada.

Si registrar una esterilización actualiza el estado del animal, ambas modificaciones deben ser coherentes y transaccionales.

**17. Contactos, acogidas y adopciones**

La agenda será la fuente central de personas y organizaciones.

Desde cualquier módulo, permite seleccionar un contacto existente antes de crear otro.

Implementa detección de posibles duplicados por:

- Email normalizado.
- Teléfono normalizado.
- Combinación de nombre y otros datos.

Una coincidencia de nombre no basta para fusionar personas automáticamente.

La fusión de contactos debe incluir:

- Comparación.
- Selección del contacto que se conserva.
- Resolución de campos diferentes.
- Unión de roles.
- Reasignación de relaciones.
- Conservación de referencias históricas.
- Confirmación.
- Operación atómica.

Para acogidas:

- Lista de familias.
- Disponibilidad.
- Capacidad.
- Ocupación actual.
- Especies y tamaños admitidos.
- Animales actuales.
- Historial.

La ocupación se calcula a partir de acogidas abiertas.

La superación de capacidad o una incompatibilidad declarada debe generar una advertencia clara. Si permites registrar una excepción porque refleja una situación real, exige confirmación y motivo. No relajes la prohibición de dos acogidas abiertas para un animal.

Para adopciones:

- Lista y filtros por estado.
- Creación desde la ficha del animal.
- Entrevistas y observaciones.
- Aprobación o rechazo.
- Reserva.
- Formalización.
- Cancelación.
- Devolución.
- Documentos.
- Tareas de seguimiento.

No borres solicitudes ni adopciones anteriores cuando cambie el estado actual del animal.

**18. Voluntarios**

Incluye:

- Listado de voluntarios.
- Perfil relacionado con contacto.
- Disponibilidad.
- Funciones.
- Especialidades.
- Estado activo o inactivo.
- Registro de horas.
- Totales por periodo.

Funciones iniciales:

- Paseos.
- Limpieza.
- Transporte.
- Alimentación.
- Fotografía.
- Redes sociales.
- Eventos.
- Visitas veterinarias.

Evita desarrollar nóminas, fichajes laborales o un sistema complejo de recursos humanos.

No crees otra ficha de persona con teléfono y email independientes del contacto central.

**19. Tareas y calendario**

Incluye:

- Vista de lista.
- Vista de calendario mensual.
- Agenda de próximos días.
- Filtros por estado, prioridad, tipo, animal, contacto y responsable.
- Creación desde otros módulos.
- Edición.
- Finalización.
- Cancelación.
- Identificación de tareas vencidas.

Tipos iniciales:

- Visita veterinaria.
- Vacuna.
- Medicación.
- Entrevista.
- Llamada.
- Transporte.
- Compra.
- Limpieza.
- Seguimiento postadopción.
- Otro.

El calendario y las listas deben consultar las mismas tareas.

Las notificaciones visuales funcionan al abrir o utilizar la aplicación. No prometas avisos cuando el navegador esté cerrado.

No solicites permisos de notificación del sistema como requisito de uso.

**20. Finanzas y donaciones**

Implementa un registro sencillo y fiable de ingresos y gastos.

Ingresos iniciales:

- Donaciones.
- Cuotas.
- Adopciones.
- Eventos.
- Subvenciones.
- Otros.

Gastos iniciales:

- Veterinario.
- Medicamentos.
- Alimentación.
- Instalaciones.
- Transporte.
- Suministros.
- Mantenimiento.
- Otros.

Permite:

- Crear movimientos.
- Filtrar por periodo, categoría, animal y contacto.
- Consultar totales.
- Ver balance.
- Anular un movimiento con motivo.
- Corregirlo conservando referencia a la operación original.
- Exportar.

No presentes la aplicación como una solución de contabilidad fiscal o certificación de donativos.

Utiliza una moneda de trabajo por organización.

Incluye inicialmente EUR, USD, GBP, CAD, AUD, MXN, JPY y KWD, con sus unidades menores correctamente configuradas. Añadir monedas debe ser sencillo y explícito.

No presupongas que todas las monedas tienen dos decimales.

Impide cambiar la moneda de los datos existentes mediante una simple preferencia visual. Si ya hay movimientos, el cambio no debe reinterpretar los importes.

No mezcles monedas ni implementes conversión de divisas en esta versión.

Al registrar una donación económica:

- Crear la donación.
- Crear un único ingreso.
- Relacionarlos.
- Impedir duplicados.
- Guardar ambas entidades en una transacción.

Al registrar un coste veterinario desde Salud:

- Crear o seleccionar un único gasto.
- Relacionarlo con el registro sanitario y el animal.
- Mostrarlo en Finanzas y en la ficha.
- Contarlo una sola vez.

Al registrar una donación material:

- Conservar el detalle.
- Permitir incorporarla al inventario.
- Crear movimientos de stock una sola vez.
- No sumarla a ingresos monetarios.

La anulación o corrección de operaciones relacionadas debe mantener coherencia entre módulos.

**21. Inventario**

Incluye categorías:

- Alimentación.
- Medicamentos.
- Higiene.
- Productos veterinarios.
- Mantas.
- Transportines.
- Accesorios.
- Otros.

Permite:

- Crear artículos.
- Registrar saldo inicial.
- Entradas.
- Consumos.
- Ajustes justificados.
- Consultar movimientos.
- Configurar mínimos.
- Relacionar proveedor.
- Archivar artículos.

Muestra:

- Stock disponible.
- Unidad.
- Stock mínimo.
- Indicador bajo mínimos.
- Indicador de existencia en el mínimo.

No permitas que una salida deje stock negativo. Si falta información histórica, ofrece registrar primero un ajuste justificado.

Una corrección de inventario se hará mediante movimientos compensatorios, conservando el rastro. Evita editar una cifra total que deje de corresponderse con los movimientos.

**22. Fotografías y documentos**

Utiliza una política conservadora de tamaño y formatos.

Fotografías:

- Acepta JPEG, PNG y WebP.
- Comprueba que pueden decodificarse.
- Limita inicialmente la entrada a 15 MiB y 40 megapíxeles.
- Redimensiona a un máximo aproximado de 1.600 píxeles en el lado mayor.
- Genera una miniatura de aproximadamente 320 píxeles.
- Intenta mantener la imagen optimizada por debajo de 1 MiB.
- Ajusta orientación cuando sea necesario.
- Vuelve a codificar la imagen para reducir tamaño y metadatos innecesarios.
- Informa de que se guarda una versión optimizada.

No guardes la imagen original a máxima resolución por defecto.

Documentos incorporados:

- Admite inicialmente PDF, JPEG, PNG, WebP y TXT UTF-8.
- Limita cada archivo a 8 MiB.
- Valida extensión, tipo declarado, tamaño y contenido identificable.
- No confíes únicamente en la extensión.
- No ejecutes el contenido.
- Ofrece descarga de PDF y otros documentos sin incrustar contenido activo.
- Las vistas previas de imágenes deben utilizar contenido validado.

Otros formatos podrán registrarse como referencias externas.

No aceptes HTML, SVG aportado por el usuario, ejecutables ni documentos con macros como contenido visual ejecutable de la aplicación.

Para archivos grandes o formatos no incorporados, ofrece “Referencia a archivo externo”:

- Guardar nombre, tipo, descripción y ubicación indicada por el usuario.
- Opcionalmente calcular el hash del archivo seleccionado.
- No almacenar un identificador temporal como si garantizara acceso futuro.
- No asumir que el navegador puede reabrir una ruta del disco.
- Permitir volver a seleccionar el archivo.
- Advertir si el hash no coincide.

El texto debe indicar claramente:

“Este archivo está fuera de la aplicación. Su contenido no se incluye en la copia de seguridad; conserva también el archivo original”.

No presentes referencias externas como documentos incorporados.

Como límites iniciales de producto, establece:

- 64 MiB de recursos binarios incorporados por conjunto activo.
- 128 MiB como tamaño máximo admitido para un backup JSON.

Estos límites son de seguridad de la aplicación, no cuotas garantizadas del navegador. Deben comprobarse con pruebas de memoria y dispositivos antes de publicar. Si las pruebas exigen límites inferiores, documenta el ajuste.

Calcula el presupuesto antes de aceptar archivos y considera el incremento de Base64 en los backups.

No elimines fotografías o documentos automáticamente para recuperar espacio.

Libera las URL de objetos cuando dejen de utilizarse.

**23. Historial del animal**

Genera una línea temporal automática con hechos de otros módulos:

- Entrada.
- Devolución.
- Revisión.
- Vacuna.
- Desparasitación.
- Tratamiento.
- Esterilización.
- Inicio y finalización de acogida.
- Solicitud.
- Reserva.
- Adopción.
- Traslado.
- Fallecimiento.
- Documento añadido, cuando sea relevante.

Cada evento debe enlazar al registro de origen.

Evita generar dos eventos por ejecutar dos veces la misma acción. Utiliza claves de origen únicas e idempotencia.

Distingue:

- Fecha del hecho.
- Fecha en la que se registró.
- Correcciones posteriores.

No construyas todo el historial exclusivamente a partir del estado actual, porque se perderían transiciones anteriores.

Al corregir un hecho conserva una referencia a la corrección y evita mostrar simultáneamente dos versiones como hechos válidos.

**24. Informes y estadísticas**

Incluye:

- Entradas por mes.
- Adopciones por mes.
- Animales actualmente bajo cuidado.
- Animales en protectora.
- Animales en acogida.
- Animales disponibles.
- Distribución por especie.
- Distribución por sexo.
- Distribución por edad.
- Distribución por situación y disponibilidad.
- Tiempo medio hasta adopción.
- Ingresos por mes.
- Gastos por mes.
- Balance.
- Gastos veterinarios.
- Donaciones económicas.
- Donaciones materiales.
- Costes por animal.
- Evolución anual.

Todos los informes deben permitir un periodo cuando tenga sentido y explicar sus criterios.

Define expresamente:

- Las entradas cuentan episodios.
- Las adopciones cuentan adopciones realizadas.
- Una devolución no elimina una adopción histórica del mes en que ocurrió.
- El tiempo hasta adopción se calcula por episodio cerrado mediante adopción.
- Los animales todavía no adoptados no entran en ese promedio.
- Muestra el número de casos del promedio.
- El coste por animal suma gastos relacionados con ese animal.
- Los gastos sin animal se muestran como gastos generales.
- No distribuyas gastos generales entre animales mediante una fórmula oculta.
- Las donaciones materiales no incrementan el balance monetario.
- Los movimientos anulados no se incluyen en los totales válidos.

Para edad, utiliza tramos administrativos explícitos y una categoría desconocida. No los presentes como clasificación veterinaria universal.

Distingue informes de situación actual de informes de hechos por periodo. No presentes como exacta una situación histórica que el modelo no permita reconstruir.

Los gráficos deben:

- Funcionar sin bibliotecas remotas.
- Tener títulos y unidades.
- Disponer de alternativa tabular.
- Utilizar colores y leyendas coherentes.
- Mostrar estados sin datos.
- Evitar animaciones innecesarias.

Permite exportar las tablas y utilizar impresión.

**25. Buscador global y filtros**

Implementa búsqueda global por:

- Nombre de animal.
- Código.
- Microchip.
- Nombre de contacto.
- Teléfono.
- Email.

Agrupa resultados por tipo y permite abrir la ficha correspondiente.

Para nombres, utiliza una normalización de búsqueda que facilite encontrar mayúsculas, minúsculas y acentos sin modificar el texto original.

Para teléfonos y microchips conserva el valor original y utiliza un valor normalizado para comparar.

No conviertas los microchips en números.

Aplica un pequeño retraso de búsqueda, por ejemplo 150–250 ms, y limita la cantidad inicial de resultados.

Filtros de animales:

- Especie.
- Sexo.
- Raza.
- Situación.
- Disponibilidad.
- Ubicación.
- Fecha de entrada.
- Familia de acogida.
- Datos de adopción.

Combina opciones del mismo filtro mediante OR y filtros distintos mediante AND. Indica visualmente los filtros activos.

Incluye “Limpiar filtros” y un estado específico para búsquedas sin coincidencias.

**26. Exportación CSV y JSON**

Distingue claramente:

- Exportación por módulo: para consultar o trabajar con datos.
- Backup completo: para reconstruir la aplicación.

Exportaciones obligatorias:

- Animales.
- Contactos.
- Solicitudes y adopciones.
- Gastos.
- Ingresos.
- Voluntarios y horas.
- Donaciones.

Permite exportar todos los registros del módulo o los resultados filtrados, indicando el alcance antes de descargar.

CSV:

- Codificación UTF-8.
- Opción adecuada para apertura en Excel.
- Separador coma o punto y coma.
- Escape correcto de comillas, separadores y saltos de línea.
- Fechas sin ambigüedad.
- Importes con formato documentado.
- Códigos y referencias preservados como texto en la medida que permita el formato.
- Encabezados legibles.
- Plantillas de importación con nombres de campo estables.
- Protección frente a fórmulas introducidas mediante texto no confiable.

Utiliza las capacidades de Papa Parse y pruebas propias para exportar campos con comillas y saltos de línea. Consulta su [documentación oficial](https://www.papaparse.com/docs).

Activa protección de fórmulas para valores que puedan interpretarse como tales, incluyendo prefijos peligrosos y caracteres de control. Prueba también teléfonos con `+`, identificadores y variantes relevantes.

Documenta que las hojas de cálculo pueden transformar valores o modificar protecciones al volver a guardar el CSV. No prometas una sanitización universal ni una restauración exacta mediante CSV. JSON será el formato para conservar tipos y valores sin esas transformaciones. Consulta la [descripción de CSV Injection de OWASP](https://github.com/OWASP/www-community/blob/master/pages/attacks/CSV_Injection.md).

JSON por módulo:

- Contenedor identificable.
- Versión de formato.
- Tipo de módulo.
- Fecha de exportación.
- Registros.
- Referencias necesarias.
- Indicación de si incluye archivos.

Una exportación de animales sin documentos no debe etiquetarse como backup completo.

Utiliza nombres de archivo claros, con módulo y fecha, evitando nombres personales innecesarios.

**27. Importación y prevención de duplicados**

Implementa un asistente:

1. Seleccionar tipo de importación.
2. Seleccionar archivo.
3. Leer estructura.
4. Configurar separador o codificación si es necesario.
5. Mapear columnas.
6. Elegir interpretación de fechas e importes.
7. Validar.
8. Revisar resultados y conflictos.
9. Confirmar alcance.
10. Aplicar.
11. Mostrar resumen.

La vista previa debe mostrar:

- Registros válidos.
- Registros con errores.
- Posibles duplicados.
- Campos desconocidos.
- Relaciones no resueltas.
- Registros que se crearían.
- Registros que se modificarían.
- Registros que se omitirían.

No hagas conversiones ambiguas de fechas como `03/04/2026`. Solicita el formato en el asistente.

No conviertas automáticamente identificadores numéricos largos.

Utiliza esquemas de destino y listas de campos permitidos. No copies objetos importados directamente a entidades internas mediante asignaciones indiscriminadas.

Rechaza o trata explícitamente claves peligrosas como `__proto__`, `constructor` y `prototype`.

No interpretes fórmulas, HTML ni JavaScript importado.

Límites iniciales:

- CSV de hasta 10 MiB por archivo.
- Hasta 10.000 filas por operación CSV.
- JSON sujeto al límite de formato y tamaño correspondiente.
- Profundidad, longitud de cadenas, número de registros y tamaño binario limitados.

Los errores deben identificar fila, campo y motivo. Permite descargar un informe.

Política de duplicados:

- Coincidencia exacta de UUID de una exportación propia: mostrar posible actualización.
- Microchip coincidente: conflicto de animal que requiere resolución.
- Código interno coincidente: revisar.
- Contacto con email o teléfono coincidente: posible duplicado.
- Nombre coincidente sin más datos: advertencia, no fusión automática.
- Archivo repetido: identificar mediante hash cuando corresponda.

Ofrece decisiones explícitas: crear, actualizar, vincular, omitir o cancelar. Nunca sobrescribas silenciosamente.

Los CSV no pueden resolver relaciones únicamente por nombres. Utiliza identificadores externos, códigos o un paso de asociación.

Para importaciones repetidas, conserva la correspondencia de identificadores externos por fuente cuando el usuario quiera reutilizarla.

La importación inicial CSV debe cubrir animales, contactos, solicitudes de adopción, movimientos económicos, perfiles de voluntariado y donaciones. Los formatos JSON deben cubrir estructuras relacionadas con mayor fidelidad.

Las donaciones materiales con varias líneas deben tener una clave de agrupación documentada.

No importes datos parcialmente por accidente:

- Para lotes pequeños, hasta 1.000 registros sin binarios, aplica el conjunto confirmado en una transacción.
- Para lotes mayores o complejos, prepara una copia del conjunto activo, aplica allí los cambios y valida antes de activarla.
- Si el usuario decide importar solo filas válidas, debe confirmar expresamente ese subconjunto.
- Un fallo durante la aplicación no debe dejar una importación a medias.

Revalida la revisión del conjunto antes de confirmar. Si cambió desde la vista previa, actualiza la comprobación.

**28. Backup completo: función prioritaria**

Incluye un botón claramente visible:

**“Crear copia de seguridad” / “Create backup”.**

Debe generar un archivo JSON autocontenido con todos los datos gestionados por la aplicación:

- Configuración y logo.
- Catálogos personalizados.
- Ubicaciones.
- Animales.
- Episodios.
- Mediciones.
- Contactos y roles.
- Acogidas.
- Solicitudes.
- Reservas.
- Adopciones y devoluciones.
- Voluntariado y horas.
- Salud.
- Planes de tratamiento.
- Tareas.
- Finanzas.
- Donaciones y líneas.
- Inventario y movimientos.
- Documentos y vínculos.
- Fotografías y miniaturas.
- Archivos incorporados.
- Historial.
- Registro funcional de actividad.
- Datos archivados y papelera.

Los archivos externos referenciados no se incluyen; sus referencias sí. Muestra cuántos existen y recuerda conservarlos por separado.

No exportes bloqueos de sesión, URL temporales, cachés reconstruibles ni datos de diagnóstico innecesarios.

Utiliza un contenedor equivalente a:

```json
{
  "format": "animal-rescue-manager-backup",
  "backupFormatVersion": 1,
  "content": {
    "appVersion": "1.0.0",
    "schemaVersion": 1,
    "backupId": "UUID",
    "createdAt": "ISO-8601-UTC",
    "sourceDatasetId": "UUID",
    "dataRevision": 0,
    "manifest": {
      "recordCounts": {},
      "embeddedAssetCount": 0,
      "embeddedAssetBytes": 0,
      "externalReferenceCount": 0
    },
    "tables": {},
    "assets": []
  },
  "integrity": {
    "algorithm": "SHA-256",
    "canonicalization": "arsm-canonical-json-v1",
    "contentHash": "HASH"
  }
}
```

Completa el contrato en `BACKUP_FORMAT.md`.

Define una serialización determinista:

- Claves de objetos ordenadas.
- Orden de arrays definido.
- Registros ordenados de forma estable.
- Cadenas y números válidos.
- Sin valores `undefined`, no finitos ni datos ejecutables.
- UTF-8.
- Base64 sin saltos de línea para binarios.

Calcula el hash sobre `content` usando la representación canónica documentada.

Cada recurso incorporado debe incluir identificador, tipo, nombre, tamaño, hash y bytes Base64. Verifica el tamaño y el hash al restaurar.

La suma de comprobación permite detectar alteraciones o daños; no acredita quién creó el archivo y no sustituye a una firma digital.

Obtén una instantánea coherente:

1. Coordinar la operación con las escrituras.
2. Leer el conjunto activo y su revisión.
3. Capturar registros y referencias binarias de una misma versión consistente.
4. Liberar la lectura.
5. Codificar y calcular hashes fuera de la transacción.
6. Construir el archivo.
7. Validar el archivo generado con el propio validador.
8. Ofrecer descarga.

No generes una copia mezclando estados anteriores y posteriores a una edición.

Distingue:

- Copia generada.
- Descarga solicitada.
- Copia verificada.

El navegador no siempre permite confirmar que una descarga quedó guardada en disco. No muestres “copia guardada y segura” por haber activado un enlace.

Incluye “Verificar una copia”: el usuario vuelve a seleccionar el JSON descargado y la aplicación comprueba estructura, hashes y correspondencia.

Como vía común utiliza selección de archivos y descarga estándar. No hagas depender el producto de `showSaveFilePicker()`, que tiene disponibilidad limitada. Consulta la [documentación de showSaveFilePicker](https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker).

Incluye recordatorios configurables, inicialmente cada siete días o tras cien operaciones de escritura, comprobados cuando la aplicación está abierta.

Un recordatorio no equivale a una copia automática.

**29. Restauración segura**

Incluye:

**“Restaurar copia de seguridad” / “Restore backup”.**

La restauración reemplaza el conjunto activo después de confirmación. No es una importación de mezcla.

Procedimiento:

1. Seleccionar el archivo.
2. Comprobar tamaño antes de leerlo completamente.
3. Validar formato.
4. Verificar integridad.
5. Comprobar versiones.
6. Migrar una copia de trabajo si procede.
7. Validar cada entidad.
8. Comprobar relaciones.
9. Comprobar claves únicas y duplicados.
10. Comprobar recursos binarios.
11. Mostrar resumen.
12. Facilitar y verificar una copia de los datos actuales si existen.
13. Solicitar confirmación explícita.
14. Preparar un conjunto independiente.
15. Validar el conjunto preparado.
16. Activarlo mediante una operación atómica.
17. Mostrar resultado y comprobación posterior.

El resumen debe mostrar organización, fecha del backup, versión, cantidades por módulo, archivos incorporados y referencias externas.

Nunca empieces por vaciar las tablas actuales.

Implementa conjuntos con estados como preparación, activo y recuperación:

- Las filas nuevas utilizan un `datasetId` nuevo.
- Los UUID de las entidades se conservan.
- Las referencias apuntan al nuevo conjunto.
- El conjunto actual sigue intacto durante la preparación.
- El cambio del puntero activo ocurre en una transacción corta.
- Cualquier pestaña anterior detecta el cambio y deja de escribir sobre el conjunto sustituido.

Mantén temporalmente el conjunto anterior para poder revertir. Explica que esa recuperación local no sustituye al backup externo.

Si no hay cuota suficiente:

- Cancela la restauración.
- Conserva el conjunto activo.
- No borres el anterior para hacer sitio.
- Muestra el motivo y opciones comprensibles.

Si la aplicación se cierra durante la preparación, al reiniciar debe seguir activo el conjunto anterior. Los conjuntos incompletos pueden limpiarse de forma controlada.

Si se cierra después de la activación, el conjunto nuevo debe estar completo.

La restauración no debe ejecutar otra vez efectos de negocio. Reconstruir una donación no puede crear un ingreso adicional, ni reconstruir un tratamiento debe duplicar tareas o eventos.

Después de restaurar, comprueba recuentos, relaciones, importes y hashes. Una restauración válida debe conservar los datos de negocio; los únicos metadatos nuevos admisibles son los propios de la operación de restauración.

**30. Archivo, papelera y eliminación**

Distingue:

- Archivar: retirar de listados operativos conservando historia.
- Enviar a papelera: borrado lógico.
- Eliminar permanentemente: operación excepcional.

Un animal adoptado no debe eliminarse automáticamente.

Los animales y contactos con historial deben archivarse preferentemente.

La papelera debe permitir revisar y restaurar registros.

No borres definitivamente información relacionada sin analizar dependencias.

Para eliminación permanente:

- Mostrar el elemento.
- Mostrar relaciones afectadas.
- Explicar consecuencias.
- Exigir confirmación.
- Facilitar copia previa.
- Impedir referencias rotas.

En finanzas utiliza anulación con motivo. En inventario utiliza movimientos compensatorios. No conviertas la papelera en una vía para alterar silenciosamente el historial económico.

No vacíes la papelera automáticamente por tiempo sin una decisión explícita del usuario.

Los informes históricos deben seguir contando hechos válidos de animales archivados.

**31. Diseño visual y responsive**

Diseña un panel de administración profesional.

Estructura:

- Barra lateral.
- Barra superior.
- Contenido principal.
- Tarjetas.
- Tablas.
- Formularios.
- Diálogos.
- Alertas.
- Navegación contextual.

Agrupa la navegación:

- Resumen.
- Animales y cuidados.
- Personas.
- Organización y recursos.
- Informes.
- Configuración y ayuda.

No conviertas la aplicación en una web corporativa con secciones promocionales.

Utiliza:

- Paleta neutra.
- Un color principal.
- Colores semánticos consistentes.
- Tipografía del sistema.
- Espaciado regular.
- Bordes y sombras discretos.
- Iconos SVG locales y coherentes.
- Fotografías con proporciones estables.

Define variables CSS para colores, espacios, tipografía, radios y tamaños.

Los colores de estados deben acompañarse de texto o iconos. Evita depender solo del color.

Diseña para:

- Ordenador: navegación lateral y tablas completas.
- Tablet: navegación compacta y formularios adaptados.
- Móvil: menú desplegable, acciones accesibles y columnas prioritarias.

No reduzcas una tabla de muchas columnas hasta hacerla ilegible. Utiliza tarjetas, columnas prioritarias o desplazamiento horizontal delimitado.

Comprueba anchos aproximados de 360, 768, 1024 y 1440 píxeles, además de dispositivos reales disponibles.

No impongas desplazamiento horizontal a toda la página.

**32. UX y accesibilidad**

Todos los formularios deben incluir:

- Etiquetas visibles.
- Indicación de campos obligatorios.
- Ayudas breves cuando aporten valor.
- Errores junto al campo.
- Resumen de errores cuando sea necesario.
- Guardar.
- Cancelar.
- Estado de guardado.
- Protección frente a pérdida de cambios sin guardar.

No utilices placeholders como sustituto de etiquetas.

Reserva confirmaciones para operaciones con consecuencias. No obligues a confirmar cada guardado ordinario.

Incluye estados:

- Sin datos.
- Sin coincidencias.
- Cargando.
- Guardando.
- Guardado.
- Error recuperable.
- Modo lectura.
- Almacenamiento no disponible.
- Espacio insuficiente.
- Operación cancelada.

Los mensajes deben explicar qué ocurrió y qué puede hacer el usuario.

Evita mensajes técnicos como única explicación.

Permite navegación por teclado, foco visible, cierre de diálogos con Escape cuando sea seguro y retorno del foco al elemento de origen.

Los diálogos deben tener nombre accesible y gestión correcta del foco.

Utiliza HTML semántico, encabezados ordenados, tablas con cabeceras, nombres accesibles para iconos y avisos mediante regiones apropiadas.

Mantén contraste suficiente, controles táctiles cómodos y compatibilidad con ampliación.

Respeta la preferencia de movimiento reducido.

No muestres UUID salvo en herramientas de diagnóstico o exportaciones que lo necesiten.

**33. Internacionalización**

Incluye inglés y español completos desde la versión comercial inicial.

El primer acceso debe ofrecer ambos idiomas de forma evidente. Utiliza inglés como idioma comercial inicial si todavía no hay una selección guardada.

Centraliza todos los textos visibles en `locales/en.js` y `locales/es.js`:

- Navegación.
- Títulos.
- Botones.
- Formularios.
- Validaciones.
- Estados.
- Mensajes.
- Alertas.
- Calendario.
- Gráficos.
- Ayuda.
- Atributos accesibles.
- Cabeceras de exportación legibles.
- Textos de impresión.

Utiliza claves estables y una función de traducción con interpolación y pluralización.

No construyas frases concatenando fragmentos que cambien de orden según el idioma.

Los datos del usuario no se traducen automáticamente.

Los códigos internos de enumeraciones no cambian al cambiar el idioma.

Utiliza `Intl` para visualización de números, fechas y moneda, manteniendo formatos internos estables.

Implementa detección de claves ausentes:

- En desarrollo: aviso claro.
- En producción: alternativa comprensible.
- Nunca mostrar una interfaz llena de `undefined`.

Verifica paridad de claves entre idiomas.

La arquitectura debe permitir añadir un tercer diccionario sin modificar reglas de negocio.

El cambio de idioma no debe reiniciar la aplicación ni modificar importes, fechas o estados guardados.

**34. Seguridad y protección de datos**

La aplicación no debe iniciar conexiones externas.

No incluyas:

- Analytics.
- Trackers.
- Fuentes remotas.
- Imágenes externas.
- Telemetría.
- Informes de errores enviados.
- Formularios que transmitan datos.
- Vista previa automática de enlaces.

Trata como no confiables los datos de formularios, importaciones, nombres de archivos y documentos.

Utiliza `textContent` o construcción segura del DOM para contenido del usuario.

No introduzcas datos del usuario mediante `innerHTML`.

No utilices `eval()`, `new Function()` ni ejecución de expresiones importadas.

Valida las rutas internas y evita construir selectores, URLs o código con valores sin controlar.

Los SVG del sistema deben ser recursos propios estáticos. No permitas subir SVG activo como si fuera una fotografía.

Aplica una política CSP mediante `<meta>` con restricciones apropiadas, incluyendo bloqueo de conexiones, objetos y formularios externos. Comprueba su funcionamiento real bajo `file://`; la política no debe romper los scripts locales ni resolverse con permisos amplios sin analizar.

No utilices manejadores de eventos inline.

No cargues automáticamente enlaces, `mailto:` ni servicios externos. Cualquier salida voluntaria debe requerir una acción clara del usuario.

Incluye un aviso de privacidad local que explique:

- La aplicación no transmite sus datos.
- La información reside en el almacenamiento del navegador.
- Los backups exportados contienen datos.
- No hay autenticación ni cifrado en reposo implementados por esta versión.
- La protección del equipo y de los archivos exportados corresponde a su entorno de uso.

No presentes un PIN visual como si protegiera criptográficamente los datos.

No afirmes cumplimiento legal automático.

Distingue el comportamiento de la aplicación del de extensiones, sincronización del sistema operativo o carpetas personales que el usuario haya configurado con servicios externos.

No añadas funciones de cifrado improvisadas que impidan recuperar información. La versión inicial utilizará backups JSON sin contraseña y lo indicará claramente.

**35. Validaciones obligatorias**

Centraliza y reutiliza validaciones.

Como mínimo:

- Nombre y especie de animal.
- Fechas reales de calendario.
- Nacimiento no posterior a hoy.
- Salida no anterior a entrada.
- Adopción no anterior al episodio correspondiente.
- Finalización de acogida no anterior al inicio.
- Ausencia de episodios y acogidas activas incompatibles.
- Peso positivo.
- Capacidad de acogida válida.
- Importes positivos y dentro de enteros seguros.
- Decimales compatibles con la moneda.
- Duraciones de voluntariado positivas.
- Cantidades y unidades compatibles.
- Stocks no negativos.
- Email con validación razonable.
- Teléfonos internacionales sin exigir un único país.
- Longitud de textos.
- Referencias existentes.
- Microchips duplicados.
- Archivos, tamaños y formatos.
- Compatibilidad de versiones.

No impongas que todo microchip sea necesariamente de quince dígitos. Puedes advertir sobre formatos habituales, pero el producto se dirige a distintos países y debe conservar identificadores legítimos alternativos.

Límites iniciales de texto:

- Nombres: 120 caracteres.
- Títulos y conceptos: 200.
- Emails: 254.
- Teléfonos: 50.
- Notas extensas: 20.000.

Documenta las excepciones justificadas.

No sustituyas datos desconocidos por valores inventados.

Los errores detectados al guardar deben conservar el formulario y señalar los campos afectados.

**36. Rendimiento y gestión de errores**

Objetivo inicial de pruebas:

- 2.000 animales.
- 5.000 contactos.
- 50.000 registros relacionados entre salud, tareas, movimientos e historial.
- Recursos binarios dentro de los límites establecidos.

Este volumen es un escenario de comprobación, no una capacidad garantizada sin mediciones.

Utiliza:

- Paginación.
- Consultas por índices.
- Miniaturas.
- Carga diferida de archivos.
- Cachés reconstruibles.
- Invalidación de cachés tras escrituras.
- Búsqueda con retraso breve.
- Procesamiento por lotes.
- Cesión periódica al hilo de interfaz durante trabajos largos.

No cargues todos los documentos y fotografías al abrir el dashboard.

No reconstruyas toda la interfaz por cada pulsación.

Los workers pueden ser una mejora si funcionan bajo `file://`, pero no deben ser un requisito no comprobado. Evita que una biblioteca los active de una forma incompatible.

Para operaciones largas:

- Muestra fase real.
- Ofrece progreso cuando pueda calcularse.
- Permite cancelar en puntos seguros.
- No muestres porcentajes inventados.
- Indica cuándo una operación ya no puede cancelarse porque está confirmando cambios.

Gestiona al menos:

- `QuotaExceededError`.
- `SecurityError`.
- Base bloqueada.
- Transacción abortada.
- Versión incompatible.
- Archivo corrupto.
- JSON inválido.
- Hash incorrecto.
- Relación rota.
- Conflicto de revisión.
- Cierre inesperado.
- Formato de archivo no admitido.

Mantén un diagnóstico local limitado, por ejemplo a los últimos 200 sucesos técnicos, sin incluir el contenido completo de fichas o documentos.

Permite exportar un diagnóstico revisable por el usuario, sin enviarlo automáticamente.

Nunca captures errores para continuar como si la operación hubiera funcionado.

**37. Datos de demostración**

Incluye una carga opcional y explícita.

Los ejemplos deben mostrar:

- Perro disponible.
- Gato disponible.
- Cachorro.
- Animal en acogida.
- Animal reservado.
- Animal adoptado.
- Animal devuelto con nueva entrada.
- Animal con tratamiento.
- Animal con datos desconocidos.
- Personas con varios roles.
- Familia con varios animales.
- Voluntarios y horas.
- Tareas vencidas, actuales y futuras.
- Donaciones económicas.
- Donaciones materiales.
- Gastos veterinarios.
- Inventario bajo mínimos.
- Documentos ficticios pequeños.

Utiliza nombres ficticios y direcciones de ejemplo. No incluyas datos personales reales.

Haz las fechas relativas a la fecha de carga para que el dashboard siga siendo demostrativo con el paso del tiempo.

Marca todos los registros con un lote de demostración.

Debe existir una forma sencilla de eliminar la demostración sin borrar datos reales.

Para reducir riesgos, la carga de demostración se permitirá únicamente cuando no haya datos de negocio reales. Si posteriormente se crean relaciones reales con registros de demostración, al limpiarla debes:

- Detectar dependencias.
- Mostrar el conflicto.
- Permitir convertir esos registros en reales.
- Evitar borrar información real relacionada.

No utilices un botón genérico “Borrar todo” para eliminar exclusivamente la demostración.

**38. Ayuda, impresión y paquete comercial**

Incluye una guía interna que funcione sin conexión.

Debe explicar:

- Primeros pasos.
- Configuración.
- Gestión de animales.
- Contactos.
- Salud.
- Acogidas.
- Adopciones y devoluciones.
- Tareas.
- Finanzas.
- Donaciones.
- Inventario.
- Documentos incorporados y externos.
- Importación y exportación.
- Backup, verificación y restauración.
- Cambio de navegador.
- Cambio de ordenador.
- Actualización del producto.
- Papelera.
- Limitaciones conocidas.
- Solución de problemas.

Incluye una sección especialmente visible: “Dónde se guardan mis datos”.

Los README en inglés y español deben explicar:

1. Descomprimir antes de abrir.
2. Qué archivo abrir.
3. Navegadores comprobados.
4. Uso sin Internet.
5. Configuración inicial.
6. Ubicación real de los datos.
7. Importancia de las copias externas.
8. Traslado de información.
9. Actualización segura.
10. Ausencia de suscripciones.

Para actualizar:

- Crear y verificar un backup.
- Conservar la versión anterior temporalmente.
- Sustituir archivos de aplicación siguiendo la guía.
- Abrir la versión nueva.
- Ejecutar migraciones cuando proceda.
- Verificar datos.
- Restaurar el backup si el navegador está utilizando otra ubicación de almacenamiento.

No prometas que basta con copiar archivos para trasladar la base del navegador.

Incluye estilos de impresión para ficha del animal e informes básicos. Usa datos de organización y permite elegir si se incluyen datos personales.

La generación directa de PDF queda como ampliación futura. La impresión del navegador puede permitir guardar en PDF sin dependencias adicionales.

Prepara el ZIP comercial con:

- Aplicación completa.
- Recursos locales.
- Bibliotecas permitidas.
- Avisos de terceros.
- Instrucciones.
- Licencia del producto.
- Historial de cambios.
- Versión identificable.

No incluyas bases con datos reales, archivos temporales, herramientas de desarrollo innecesarias ni configuraciones personales.

No inventes condiciones legales o comerciales definitivas. Si faltan, marca la licencia comercial como pendiente de revisión antes de publicar.

No implementes pagos, anuncios en Etsy ni publicación del producto: entrega el paquete preparado para revisión.

**39. Pruebas obligatorias**

Crea pruebas con valor real sobre integridad y comportamiento. Prioriza el núcleo de datos y los flujos que podrían perder o duplicar información.

Pruebas unitarias:

- UUID y unicidad.
- Normalización.
- Fechas y años bisiestos.
- Cálculo de edad.
- Dinero con monedas de cero, dos y tres decimales.
- Cantidades escaladas.
- Estados y transiciones.
- Validaciones.
- Canonicalización y hashes.
- Importación y escape CSV.
- Fórmulas de informes.

Pruebas de integración:

- Transacción que modifica varias entidades.
- Fallo intermedio sin datos parciales.
- Doble pulsación sin duplicados.
- Edición con revisión antigua.
- Dos pestañas.
- Cambio de conjunto activo.
- Donación económica con un solo ingreso.
- Donación material con un solo movimiento por línea.
- Coste veterinario contado una sola vez.
- Adopción que cierra acogida y episodio.
- Devolución que crea un episodio nuevo.
- Fusión de contactos sin referencias rotas.
- Restauración de papelera cuando sea válida.

Backup y restauración:

- Base vacía.
- Base con todos los módulos.
- Fotografías.
- Documentos.
- Caracteres internacionales.
- Notas con saltos de línea.
- Datos archivados.
- Papelera.
- Backup antiguo.
- Backup futuro incompatible.
- Archivo truncado.
- Hash alterado.
- Binario alterado.
- Tamaños declarados incorrectos.
- Referencias inexistentes.
- IDs duplicados.
- Cuota insuficiente.
- Cancelación.
- Cierre durante preparación.
- Cierre después de activación.
- Comparación de datos antes y después.

Importación:

- Comas y punto y coma.
- Comillas y saltos dentro de campos.
- UTF-8 con y sin BOM.
- Fechas ambiguas.
- Ceros iniciales.
- Microchips largos.
- Campos desconocidos.
- Duplicados.
- Relaciones no resueltas.
- Claves peligrosas.
- Cadenas excesivas.
- Fórmulas.
- Lote fallido sin aplicación parcial.

Compatibilidad:

- Primera apertura sin Internet.
- Ejecución real mediante `file://`.
- Chrome estable.
- Edge estable.
- Firefox estable.
- Cierre completo y reapertura.
- Cambio de ruta.
- Otro perfil.
- Almacenamiento denegado.
- Limitaciones de modo privado.
- Recursos locales y CSP.
- Tablet y móvil dentro de la matriz declarada.

UX:

- Uso completo con teclado.
- Foco en diálogos.
- Estados vacíos.
- Errores comprensibles.
- Formularios con cambios sin guardar.
- Idiomas.
- Ampliación.
- Responsive.
- Impresión.

Las pruebas automatizadas pueden utilizar herramientas del entorno de desarrollo. Las pruebas de aceptación deben comprobar la distribución final, sin servidor.

No presentes pruebas no ejecutadas como aprobadas.

Si no puedes ejecutar alguna, indica exactamente cuál queda pendiente y no declares el producto comercialmente verificado.

**40. Criterios de aceptación del producto**

La aplicación solo podrá considerarse terminada cuando:

1. Se ejecute desde `index.html` en la matriz obligatoria comprobada.
2. Funcione sin Internet desde la primera apertura.
3. No realice conexiones externas.
4. Todos los módulos obligatorios funcionen con datos reales.
5. Los registros persistan tras cerrar y reabrir el navegador.
6. El guardado espere a la confirmación de transacciones.
7. Los fallos no dejen cambios parciales.
8. No haya duplicación de ingresos, gastos, stock o eventos.
9. Las transiciones de animales mantengan relaciones coherentes.
10. Las devoluciones conserven adopciones y episodios anteriores.
11. Las fotografías y archivos incorporados sobrevivan a un backup y restauración.
12. Las referencias externas estén identificadas como tales.
13. Un archivo corrupto no modifique los datos actuales.
14. La restauración no borre primero la base en uso.
15. Las migraciones soportadas conserven la información.
16. Las importaciones tengan validación y vista previa.
17. No se sobrescriban datos silenciosamente.
18. CSV y JSON puedan exportarse.
19. Los informes concuerden con registros de origen.
20. Inglés y español estén completos.
21. La interfaz sea utilizable en ordenador y tablet y se adapte a móvil.
22. La demostración sea opcional y pueda retirarse de forma segura.
23. La ayuda explique el almacenamiento y las copias.
24. Las limitaciones conocidas estén documentadas.
25. El paquete comercial no contenga información personal ni dependencias remotas.

Como prueba funcional completa, ejecuta este recorrido:

- Crear organización.
- Crear contacto con roles de acogida y donante.
- Registrar animal.
- Añadir fotografía.
- Registrar revisión con gasto.
- Programar vacuna.
- Asignar acogida.
- Crear solicitud y reserva.
- Completar adopción.
- Registrar seguimiento.
- Registrar devolución.
- Añadir donación económica y material.
- Comprobar inventario.
- Comprobar dashboard e informes.
- Exportar módulos.
- Crear y verificar backup.
- Restaurarlo en un almacenamiento de prueba vacío.
- Comparar registros, relaciones, importes y archivos.
- Reabrir el navegador y verificar persistencia.

**41. Fases de desarrollo**

No desarrolles todo de golpe. Sigue este orden para resolver primero los riesgos.

**Fase 0. Viabilidad**

- Probar `file://`.
- Probar IndexedDB y binarios.
- Probar persistencia entre sesiones.
- Probar descarga y lectura de JSON.
- Comprobar los tres navegadores.
- Documentar limitaciones.
- Resolver bloqueos antes de construir el producto.

**Fase 1. Arquitectura y núcleo**

- Documentación inicial.
- Esquemas.
- Enumeraciones.
- Reglas.
- Repositorios.
- Transacciones.
- Índices.
- Conjuntos de datos.
- Gestión de errores.
- Coordinación de escritura.
- Base de internacionalización.

**Fase 2. Protección de datos**

- Backup básico completo del núcleo.
- Validación.
- Hashes.
- Restauración mediante preparación separada.
- Recuperación.
- Migraciones de prueba.

El backup debe ampliarse en cada fase conforme se incorporan entidades. No lo dejes para el final.

**Fase 3. Interfaz general**

- Diseño visual.
- Navegación.
- Componentes.
- Formularios.
- Tablas.
- Diálogos.
- Estados vacíos.
- Responsive.
- Configuración inicial.
- Traducciones de los componentes creados.

**Fase 4. Contactos y animales**

- Agenda central.
- Roles.
- Animales.
- Episodios.
- Fotografías.
- Pesos.
- Documentos.
- Historial.
- Archivo y papelera.

**Fase 5. Salud y tareas**

- Registros sanitarios.
- Planes.
- Tareas.
- Calendario.
- Alertas.
- Integración sin duplicados.

**Fase 6. Acogidas y adopciones**

- Perfiles.
- Capacidad.
- Estancias.
- Solicitudes.
- Reservas.
- Adopciones.
- Devoluciones.
- Transiciones completas.

**Fase 7. Voluntariado**

- Perfiles.
- Funciones.
- Disponibilidad.
- Horas.
- Relación con tareas.

**Fase 8. Finanzas, donaciones e inventario**

- Movimientos.
- Monedas.
- Gastos veterinarios.
- Donaciones económicas.
- Donaciones materiales.
- Existencias.
- Correcciones y anulaciones.

**Fase 9. Dashboard, buscador e informes**

- Indicadores.
- Búsqueda global.
- Filtros.
- Gráficos.
- Informes.
- Impresión.

**Fase 10. Importación y exportación completas**

- CSV.
- JSON por módulos.
- Mapeo.
- Duplicados.
- Relaciones.
- Importaciones grandes.
- Backup y restauración de todos los módulos.
- Pruebas de compatibilidad de versiones.

**Fase 11. Producto y ayuda**

- Datos de demostración.
- Retirada segura de demostración.
- Guía interna.
- README.
- Traducciones completas.
- Licencias.
- Instrucciones de actualización.
- Preparación del paquete.

**Fase 12. Verificación y pulido**

- Pruebas integrales.
- Pruebas de fallos.
- Rendimiento.
- Accesibilidad.
- Responsive.
- Compatibilidad.
- Revisión de conexiones externas.
- Revisión de paquete.
- Corrección de defectos.

En todas las fases:

1. Desarrolla.
2. Revisa.
3. Prueba.
4. Corrige.
5. Comprueba compatibilidad con lo anterior.
6. Actualiza documentación.
7. Actualiza backup y validadores si cambió el modelo.
8. Registra el estado.

No avances sobre un fallo conocido que comprometa integridad o recuperación.

**42. Forma de trabajo y entregables**

Comienza analizando el documento completo.

En tu primera entrega:

- Expón las decisiones esenciales.
- Presenta el modelo de datos y las relaciones.
- Define invariantes.
- Confirma la estructura.
- Describe cómo comprobarás la viabilidad.
- Identifica contradicciones técnicas reales, si existen.
- Empieza por la fase de viabilidad cuando tengas acceso al entorno.

No te limites a producir una planificación si dispones de medios para implementar. Continúa por fases hasta completar el alcance.

No solicites decisiones rutinarias que ya estén resueltas aquí. Si aparece una incompatibilidad real, aporta evidencia y describe el requisito afectado antes de proponer un cambio.

Mantén `PROJECT_STATUS.md` con:

- Fase actual.
- Funcionalidades terminadas.
- Decisiones.
- Versiones.
- Pruebas realizadas.
- Pruebas pendientes.
- Defectos abiertos.
- Próxima acción concreta.

Al finalizar cada fase, informa brevemente:

- Qué funciona.
- Cómo se ha probado.
- Qué problemas quedan.
- Qué sigue.

No confundas una pantalla dibujada con una funcionalidad terminada.

No incluyas botones sin comportamiento, cifras ficticias permanentes, errores ignorados, módulos vacíos ni mensajes de éxito simulados.

No sustituyas código necesario por comentarios como “implementar después” en una entrega considerada final.

Si trabajas mediante archivos, guarda los archivos completos. Si solo puedes responder en texto, entrega cada archivo con su ruta y contenido, sin omitir partes necesarias para ejecutarlo.

Si se agota el espacio de una entrega, termina en un punto coherente, registra el estado y especifica dónde continuar. No comprimas toda la aplicación en un archivo gigante ni elimines requisitos para aparentar finalización.

La entrega final debe incluir:

- Aplicación funcional.
- Carpeta comercial preparada.
- Documentación técnica.
- Guías de usuario.
- Especificación de datos.
- Especificación de backup.
- Formatos de importación.
- Migraciones.
- Pruebas y resultados reales.
- Matriz de compatibilidad.
- Limitaciones conocidas.
- Lista de aceptación completada.
- Lista explícita de cualquier requisito pendiente.

El resultado debe ser un producto offline mantenible, comprensible y recuperable. Ante cualquier decisión, prioriza conservar información, evitar incoherencias y permitir que una persona sin conocimientos técnicos trabaje con confianza.