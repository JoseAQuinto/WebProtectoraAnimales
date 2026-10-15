# Arquitectura propuesta

Estado: diseño objetivo; fase 0 de escritorio superada y fase 1 en desarrollo. Este documento no acredita que el producto ni sus módulos estén implementados o verificados. El documento íntegro recibido se conserva en [REQUIREMENTS.es.md](REQUIREMENTS.es.md).

## Decisiones esenciales

- Distribución: carpeta ZIP autocontenida; el comprador la descomprime y abre `index.html` mediante `file://`. No servidor, instalación de herramientas, cuenta ni conexión.
- HTML semántico, CSS y JavaScript vanilla. Scripts clásicos locales con `defer`, encapsulados en IIFE y un único global `window.RescueManager`.
- No módulos ES, carga de JSON local mediante `fetch`, CDN, fuentes remotas, telemetría ni dependencias de red. Traducciones y demostración son archivos JavaScript locales.
- IndexedDB como única fuente persistente de negocio. Si no está disponible, bloquear la introducción de datos persistentes y presentar diagnóstico y recuperación. No degradar silenciosamente a memoria o LocalStorage.
- Una organización y una instalación de trabajo; no sincronización ni edición compartida entre equipos. La segunda pestaña será de lectura salvo toma explícita del control.
- Fechas de negocio `YYYY-MM-DD`; marcas técnicas UTC; cantidades y dinero como enteros; UUID v4 criptográficos. Los códigos humanos son distintos y se asignan en transacción.
- Dos idiomas completos, inglés y español; inglés antes de una selección inicial. Los códigos almacenados no se traducen.
- Backup versionado JSON, binarios Base64 solo al exportar, hash SHA-256; restauración con conjunto separado y activación atómica.

## Puerta de viabilidad

La fase 0 precede a la construcción funcional. Debe probar carga local, IndexedDB, registros y Blob, confirmación de transacciones, descarga y selección de JSON, persistencia tras cerrar completamente y reabrir, primera apertura sin conexión, almacenamiento denegado, dos pestañas y cambio de ruta. CSP y todas las API opcionales utilizadas también deben probarse.

Chrome, Edge y Firefox estables en ordenador son obligatorios: registrar versión exacta, sistema, fecha, procedimiento y resultado real. Una vista de 360 px no acredita un navegador móvil ni una apertura de archivo local en un dispositivo real. Si un navegador obligatorio falla o no puede probarse, el bloqueo se documenta; no se anuncia compatibilidad ni se construye sobre la suposición fallida. Véase la matriz mantenida en `COMPATIBILITY.md` cuando esté disponible.

La prueba debe usar datos desechables aislados de cualquier información real. Abrir un HTML por HTTP, emular IndexedDB o limitarse a ejecutar JavaScript en un proceso de pruebas no sustituye esta aceptación bajo `file://`.

## Capas y dependencias

| Capa | Responsabilidad | Puede depender de |
|---|---|---|
| Presentación | Vistas, componentes, formularios, navegación y estado temporal | Servicios, traducciones y utilidades de presentación |
| Aplicación | Casos de uso, autorización de escritura local, validación y coordinación de cambios | Dominio, repositorios y servicios transversales |
| Dominio | Esquemas, invariantes, transiciones y cálculos puros | Utilidades puras y enumeraciones |
| Persistencia | IndexedDB, índices, transacciones, migraciones y conjuntos | Esquema persistente y utilidades de bajo nivel |
| Transversales | Archivos, imágenes, backup, importación, exportación, traducción y diagnóstico | Dominio y adaptadores explícitos |
| Utilidades | Fechas, enteros, normalización, UUID, canonicalización | API estándar disponibles o adaptadores comprobados |

Las vistas nunca acceden a IndexedDB; los repositorios nunca manipulan el DOM. Validaciones reutilizadas por formularios, importación, restauración y servicios; los informes leen las mismas entidades de origen. No hay efectos de negocio al deserializar registros restaurados.

El estado temporal de interfaz conserva filtros, pestaña seleccionada y formularios. Nunca sustituye datos confirmados. Una notificación de éxito requiere `transaction.oncomplete`, no el éxito de una solicitud individual.

## Organización confirmada

Se adopta la estructura propuesta en el requisito 6, creando únicamente archivos con contenido real cuando corresponda:

```text
index.html                    Punto de entrada local
css/                          tokens, base, layout, components, modules, responsive, print
js/namespace.js               Único espacio global
js/config.js                  Versiones, límites y capacidades admitidas
js/bootstrap.js               Inicio y diagnóstico
js/core/                      router, eventos, estado UI, errores, capacidades
js/domain/                    Enumeraciones, esquemas, validaciones, reglas
js/storage/                   Base, esquema, transacciones, repositorios, conjuntos, escritura
js/storage/migrations/        Migraciones numeradas
js/services/                  Casos de uso por área y operaciones transversales
js/components/                Componentes reutilizables accesibles
js/modules/                   Módulos funcionales, incorporados en su fase
js/utils/                     Operaciones puras y adaptadores pequeños
locales/                      en.js y es.js
data/                         Demostración opcional mediante scripts clásicos
assets/                       Recursos locales propios
vendor/                       Dependencias de versión fija y licencias
docs/                         Contratos, decisiones, estado y resultados reales
tests/                        Pruebas unitarias, integración, fixtures y aceptación
```

Orden explícito de `defer`: bibliotecas, namespace, configuración, traducciones, utilidades, dominio, persistencia, servicios, componentes, módulos e inicio. No cargador dinámico ni sistema de plugins. Revisar archivos propios de más de 400–500 líneas para separar responsabilidades cuando mejore su comprensión.

## Persistencia y coordinación

Nombre propuesto estable de base: `animal-rescue-manager`. No contiene versión de producto. Cada tabla de negocio usa clave `[datasetId, id]`; todos los índices de consulta incluyen `datasetId`. Los almacenes técnicos globales mantienen el puntero activo, revisión global, esquema lógico, metadatos de conjuntos, arrendamiento y estado de operaciones.

Una escritura de aplicación prepara archivos, hashes y decisiones fuera de la transacción. Dentro de una transacción corta comprueba propietario y vigencia del arrendamiento, conjunto activo, revisión esperada e invariantes; escribe entidades relacionadas, historial, actividad y revisión global. El servicio devuelve éxito solo al confirmar toda la transacción. Un fallo conserva datos anteriores y formulario.

La coordinación debe existir en IndexedDB mediante adquisición/renovación transaccional, propietario de sesión y token de control que cambie al tomarlo otra pestaña. Toda escritura debe revalidarlo; un temporizador o BroadcastChannel no bastan. La revisión de entidad evita que una edición antigua sobrescriba una nueva. Los controles de escritura también comprueban cambios de conjunto activo.

Las consultas usan índices por situación, especie, código y microchip; relaciones y fechas de episodios, salud, acogidas, solicitudes, tareas, finanzas, stock y eventos. Los valores opcionales sujetos a unicidad se omiten del índice cuando no existan, sin indexar una cadena vacía compartida. Índices técnicos únicos respaldan códigos e idempotencia, sin sustituir la validación de dominio.

## Conjuntos y recuperación

Estados previstos: `preparing`, `active`, `recovery`, `failed`. Existe un único puntero activo. Restauraciones, migraciones amplias e importaciones grandes preparan otro `datasetId`, conservando UUID de entidades y reasignando su ámbito. Se valida el conjunto completo y se conmuta el puntero mediante una transacción corta; el anterior se conserva temporalmente para recuperación local.

Un cierre durante preparación deja activo el conjunto anterior. Un cierre después de la activación deja un conjunto nuevo ya completo. Sin cuota suficiente se cancela; no se borra información anterior para liberar espacio. Una recuperación local no sustituye una copia externa.

Versiones distintas: `appVersion`, `dbVersion`, `schemaVersion`, `backupFormatVersion`. Las actualizaciones físicas usan `onupgradeneeded`; las transformaciones de negocio son secuenciales y explícitas. Una versión futura incompatible bloquea modificaciones. Las pestañas cierran conexiones ante `versionchange` y explican un bloqueo de actualización.

## Protección y formato de backup

La captura debe obtener un estado consistente de tablas, revisión y referencias Blob. Lectura en una única transacción de las tablas necesarias; codificación, hashes y generación fuera de ella. No mantener una transacción esperando archivos o decisiones de usuario. El archivo generado pasa por el mismo validador usado al verificar/restaurar.

Se preservan configuración, catálogos, todos los módulos, actividad funcional, archivados, papelera y binarios. Se excluyen bloqueos, URL temporales, cachés y diagnóstico innecesario. Las referencias externas se incluyen, su contenido no. La copia se distingue como generada, descarga solicitada y verificada al volver a seleccionar el archivo.

El contrato detallado se desarrollará en `BACKUP_FORMAT.md` durante la fase 2, antes del primer backup funcional. SHA-256 sobre `content` canónico: claves ordenadas, orden estable de tablas/registros/arrays, UTF-8, números finitos seguros, sin `undefined` y Base64 sin saltos. Los hashes detectan cambios o daño; no acreditan autoría ni cifran datos.

## Seguridad y límites

Datos de formularios, importación, nombres y documentos no confiables. Construcción segura del DOM y `textContent`; no datos de usuario en `innerHTML`, ejecución de expresiones, eventos inline ni SVG subido como imagen. CSP local probada que bloquee conexiones, objetos y formularios externos sin romper archivos locales. Cualquier salida externa requiere una acción voluntaria.

Archivos: imágenes JPEG/PNG/WebP hasta 15 MiB y 40 MP, recodificadas a aproximadamente 1600 px con miniatura de 320 px; documentos PDF/JPEG/PNG/WebP/TXT UTF-8 hasta 8 MiB. Validación de contenido y decodificación, no solo extensión. Presupuesto 64 MiB de binarios por conjunto y backup máximo 128 MiB, sujetos a medición real antes de publicar. El solapamiento de conjuntos durante restauración requiere espacio adicional y puede fallar aunque el backup respete el límite.

No autenticación ni cifrado en reposo en esta versión. Los backups contienen información legible y la protección del equipo y archivos depende del entorno del usuario. No afirmar cumplimiento normativo automático.

## Dependencias previstas, aún no incorporadas

Papa Parse 5.7.0 para CSV y js-sha256 1.0.0 como alternativa a Web Crypto, ambos locales y con versión fija. Antes de incluirlos hay que verificar avisos de seguridad, licencia y distribución de navegador, registrar procedencia y avisos de terceros. Una sustitución justificada se documenta. No se considera realizada esa revisión por figurar aquí una versión.

## Riesgos y cuestiones que requieren evidencia

1. `file://` no ofrece un origen portable uniforme. La viabilidad debe acreditarse en cada navegador; mover carpeta, cambiar perfil o navegador puede cambiar el almacenamiento visible. El traslado real se hace mediante backup/restauración.
2. Persistencia del navegador no garantiza durabilidad: cuotas, limpieza, modo privado y políticas del navegador. Se exige prueba real al iniciar, diagnóstico y copias externas; Storage API es opcional.
3. Arrendamientos y temporizadores sufren suspensión de pestañas; comprobar control dentro de cada transacción y rechazar escrituras de un propietario vencido es esencial.
4. Exportar Base64 y preparar conjuntos aumenta memoria y almacenamiento por encima del tamaño del origen. Medir en hardware real los límites; no anunciar la escala objetivo como capacidad garantizada.
5. Las revisiones futuras, tareas clínicas y calendario no pueden existir como copias independientes del mismo acto. El modelo usa vínculos a tareas como agenda de origen.
6. El modelo inicial no reconstruye todos los estados históricos de ubicación a una fecha arbitraria. Separar informes actuales de hechos por periodo y no prometer esa reconstrucción.
7. La licencia comercial y la compatibilidad móvil requieren revisión/evidencia antes de publicar. La aplicación puede avanzar por fases, pero no etiquetarse como producto comercial completo mientras falten módulos o aceptación.

No se ha encontrado una contradicción lógica que obligue a cambiar las decisiones cerradas antes de probarlas. El posible conflicto real es entre el requisito de apertura directa y el comportamiento concreto de un navegador/dispositivo; solo una prueba puede resolverlo. No se propone un servidor, desactivar protecciones ni instalación para ocultar un fallo.

## Secuencia posterior a fase 0

1. Núcleo y contratos de dominio/persistencia/internacionalización.
2. Backup, restauración segura, recuperación y migraciones de prueba.
3. Interfaz y configuración.
4. Contactos, animales y documentos.
5. Salud y tareas.
6. Acogidas y adopciones.
7. Voluntariado.
8. Finanzas, donaciones e inventario.
9. Indicadores, búsqueda, informes e impresión.
10. Importación/exportación completas.
11. Demostración, ayuda, licencias y paquete.
12. Aceptación, fallos, rendimiento, accesibilidad y compatibilidad.

Cada fase añade contratos de backup/validadores y actualiza estado, pruebas reales y requisitos pendientes. Un fallo de integridad o recuperación impide avanzar sobre él.
