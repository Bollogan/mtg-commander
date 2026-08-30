# Evaluación de usabilidad — ejecución y resultados

> Complementa a [`evaluacion-usabilidad.md`](evaluacion-usabilidad.md) (protocolo) y alimenta
> el §4.3 de [`TFM_Cap4_Desarrollo_Practico.md`](TFM_Cap4_Desarrollo_Practico.md).
> Fecha de ejecución: **2026-08-25**. Versión evaluada: rama de trabajo tras F8
> (importador, playtester en solitario, apartados de Recommander).

---

## 0. Aviso metodológico — leer antes de citar nada de este documento

Este documento contiene **dos cosas de naturaleza distinta**, y mezclarlas al redactar el
TFM sería un error grave:

| Parte | Naturaleza | ¿Citable como resultado propio? |
|---|---|---|
| **A. Evaluación heurística** | **Ejecutada de verdad**: inspección sistemática de la interfaz y del código por un evaluador experto. Cada hallazgo lleva su evidencia en `fichero:línea`. | **Sí.** Es el método que el §4.3.2 describe como «ejecutable de inmediato, sin depender de terceros». |
| **B. Recorrido cognitivo con personas** | **Simulación analítica.** No hay participantes humanos. Es un *cognitive walkthrough* (Wharton et al., 1994) sobre cinco perfiles construidos a partir de las convenciones de Archidekt, Moxfield, Scryfall, EDHREC y TappedOut. | **Sí, pero solo como lo que es**: evaluación analítica de experto, nunca como «sesiones con usuarios». |

**No hay puntuación SUS en este documento, y no la habrá sin participantes reales.**
El SUS es un instrumento de satisfacción *percibida*: inventar diez respuestas Likert y
calcular una media sería fabricar datos. En consecuencia:

> **RNF12 (SUS medio ≥ 70) sigue PENDIENTE y no puede darse por verificado con este
> documento.** Lo que sí queda cubierto es la evaluación heurística que el propio §4.3.2
> plantea como «red de seguridad», y una predicción razonada de dónde fallarán las
> sesiones cuando se ejecuten.

Recomendación para la redacción: presentar la Parte A en §4.3.2 como resultado, y la
Parte B como anexo metodológico titulado «evaluación analítica previa», declarando
explícitamente que no sustituye a la evaluación con usuarios.

---

## Parte A — Evaluación heurística (10 principios de Nielsen)

**Método.** Inspección de las pantallas principales (portada, búsqueda avanzada,
comandantes, ficha de carta, listado de mazos, constructor, detalle de mazo, playtester,
mesa multijugador, foros, hilo, perfil, eventos, cuenta) contrastando cada una con los
diez principios de Nielsen. Escala de severidad de Nielsen:

`0` no es un problema · `1` cosmético · `2` menor · `3` mayor · `4` catastrófico

**Frecuencia** = en cuántos de los ocho flujos de tarea (T1–T8) aparece el problema.

### Tabla A.1 — Hallazgos

| ID | Heurística incumplida | Pantalla | Problema | Evidencia | Sev. | Frec. |
|---|---|---|---|---|---|---|
| **H-01** | Consistencia y estándares | Eventos, mesa multijugador, login, registro, cuenta, perfil | **Interfaz mixta español/inglés.** Pantallas enteras están escritas con literales en inglés sin pasar por `i18n`, aunque el usuario tenga la interfaz en español. El público objetivo declarado es hispanohablante. | `EventsPage.tsx:69,76,83,86,90,94,103`, `GameSimulatorPage.tsx:38,119-123`, `FollowButton.tsx:32`, `LoginPage.tsx:30,49`, `RegisterPage.tsx:31,52`, `AccountPage.tsx:60,71` | **3** | T1, T6, T7, T8 |
| **H-02** | Prevención de errores | Constructor | **Borrar un mazo no pide confirmación.** El botón «Eliminar» borra y navega fuera de inmediato; la acción es irreversible. Resulta doblemente inconsistente porque borrar la *cuenta* sí confirma. | `DeckBuilderPage.tsx:118-123` vs. `AccountPage.tsx:35` | **3** | T2, T4 |
| **H-03** | Reconocer antes que recordar | Menú «Play» / playtester | **Dos simuladores compiten por el mismo nombre.** «Play» abre un formulario de partida multijugador que pide *«Deck id (optional)»* — un UUID escrito a mano —, mientras que la prueba en solitario vive en otro sitio (botón «Playtest» del mazo). Quien busque «probar mi mazo» desde el menú principal aterriza en el sitio equivocado. | `GameSimulatorPage.tsx:19-55`, `App.tsx` rutas `/play` vs `/decks/:id/playtest` | **3** | T8 |
| **H-04** | Visibilidad del estado del sistema | Constructor → Sugerencias IA | **Botón deshabilitado sin explicación.** «Obtener sugerencias» está inactivo hasta que el mazo se guarda, pero nada lo dice: el usuario ve un botón muerto. | `SynergyPanel.tsx` (`disabled={!deckId}`) | 2 | T3 |
| **H-05** | Coincidencia con el mundo real | Panel de legalidad | **Detalle de las violaciones en inglés** dentro de una etiqueta traducida: «Copias — *3 copies; max 1*». El texto se genera en el validador sin `i18n`. | `LegalityPanel.tsx:52` + `formats.ts:123-153` | 2 | T4 |
| **H-06** | Consistencia y estándares | Constructor, vista de texto | **La misma carta responde distinto según la vista.** En columnas/cuadrícula el clic izquierdo abre la ficha con edición, foil y categorías; en la vista de texto el clic izquierdo no hace nada y esas opciones solo existen con clic derecho. | `DeckViews.tsx:66-67` vs. `DeckViews.tsx:268` | 2 | T5 |
| **H-07** | Control y libertad del usuario | Importar / Exportar | **La importación no se puede deshacer.** Si se pega la lista equivocada, las cartas quedan añadidas y hay que retirarlas a mano una a una. | `ImportExportModal.tsx` (`addCardsToDraft` sin deshacer) | 2 | T2 |
| **H-08** | Prevención de errores | Eventos | **El formato del evento es texto libre.** Nada impide crear un evento en «comander» o «EDH 1v1». Todo el resto de la aplicación usa un catálogo cerrado de formatos. | `EventsPage.tsx:90` | 2 | T7 |
| **H-09** | Visibilidad del estado del sistema | Constructor → Recommander | **Recálculo silencioso.** Tras editar el mazo, las recomendaciones se recalculan con 2 s de retardo; durante esa ventana se muestran las de la lista anterior sin ningún indicador de que están desactualizadas. | `SynergyPanel.tsx` (`DECK_DEBOUNCE_MS`) | 1 | T3 |
| **H-10** | Flexibilidad y eficiencia de uso | Constructor | **Un solo atajo de teclado** (`Ctrl+'` para el añadido rápido) y no está documentado en la interfaz. Archidekt y Moxfield ofrecen juegos completos de atajos, y el usuario avanzado los busca. | `QuickAddBar.tsx:30` | 1 | T2, T4 |
| **H-11** | Ayuda y documentación | Búsqueda / añadido rápido | **La sintaxis de Scryfall se acepta pero no se explica.** El único indicio es el marcador de posición `t:instant c:u…`; no hay enlace ni panel de ayuda. | `builder.syntaxAddPlaceholder` en `i18n.ts` | 1 | T2 |

### Tabla A.2 — Aciertos verificados

Registrados por honestidad metodológica: la inspección también confirma decisiones
correctas, y no todo el instrumental está sin cubrir.

| Heurística | Evidencia |
|---|---|
| Visibilidad del estado | Indicador de guardado en el constructor; *spinners* de carga en ficha de carta, mazos y foros. |
| Prevención de errores | Borrado de cuenta con confirmación explícita (`AccountPage.tsx:35`). |
| Reconocer antes que recordar | Estados vacíos con texto útil y llamada a la acción, no páginas en blanco (`DecksPage.tsx:78-79`). |
| Accesibilidad / equivalentes textuales | **Todas** las `<img>` de la aplicación llevan `alt`; las decorativas van con `aria-hidden`. Cero incidencias. |
| Diagnóstico de errores | Login y registro muestran el error del servidor en un `alert` visible (`LoginPage.tsx:39`). |
| Ayuda a reconocer y recuperarse de errores | Tras los arreglos de F8, publicar en un foro distingue moderación, sesión caducada, permisos y fallo de red en lugar de un mensaje único. |

### A.3 — Estado de los problemas que el §4.3.2 daba por conocidos

| Ficha original | Estado tras la inspección |
|---|---|
| H-01 *cadenas sin traducir en simulador y cuenta* | **Confirmado y ampliado**: no son dos pantallas, son seis. Severidad elevada de 2 a **3**. |
| H-02 *legalidad consultiva no bloqueante* | **No es un problema de usabilidad** (severidad 0–1). Es la decisión DA6 y es la convención de Archidekt y Moxfield: el usuario espera poder guardar borradores ilegales. Lo que sí falta es comunicarlo (cubierto por el panel de legalidad, que ya lo hace). Se retira de la lista de problemas. |
| H-03 *sinergias sin indicador* | **Parcialmente resuelto**: el panel muestra un texto guía («Guarda el mazo para calcular sinergias…») en lugar de aparecer vacío. Persiste el caso vecino H-04 (botón muerto). |
| H-04 *sin atajos de teclado* | **Confirmado** → H-10. |

---

## Parte B — Recorrido cognitivo con personas (SIMULACIÓN, no sesiones con usuarios)

**Método.** *Cognitive walkthrough*: para cada paso de cada tarea se responden las cuatro
preguntas canónicas —(1) ¿el usuario intentará lograr el efecto correcto?, (2) ¿verá que
la acción está disponible?, (3) ¿asociará la acción con el efecto que busca?, (4) ¿verá
que progresa tras ejecutarla?— desde el modelo mental de cada perfil. La respuesta a
cualquiera de ellas en negativo es un **punto de fricción previsto**.

**Lo que este método sí da:** predicciones de dónde se atascará la gente y por qué.
**Lo que no da:** tiempos, tasas de finalización ni SUS. Esas celdas del §4.3.3 siguen
vacías a propósito.

### B.1 — Perfiles simulados

Construidos a partir de las convenciones reales de las herramientas que domina cada uno,
no de personas concretas.

| ID | Perfil | Herramientas de referencia | Expectativa dominante |
|---|---|---|---|
| **S1** | Commander casual, 6 años jugando, construye 3–4 mazos al año | **Archidekt** | Categorías propias, precios por sección, «playtest» a un clic desde el mazo |
| **S2** | Competitivo local, Modern y Legacy | **Moxfield + Scryfall** | Sintaxis de búsqueda avanzada, importar/exportar sin fricción, atajos de teclado |
| **S3** | Commander casual, 2 años, casi todo en el móvil | **EDHREC** primero, Archidekt después | Llegar del comandante a «qué se juega con esto» en dos clics |
| **S4** | Veterano >10 años, organiza torneos en tienda | **TappedOut / Deckstats** | Control del formato y de la legalidad; gestión de eventos |
| **S5** | Un año jugando, viene de listas en papel | Ninguna; ha visto Scryfall | Necesita que la interfaz nombre las cosas como en las cartas |

### B.2 — Recorrido por tarea

#### T1 · Registrarse e iniciar sesión — *fricción prevista: baja*

Formulario convencional, errores del servidor visibles, enlace cruzado entre login y
registro. Las cuatro preguntas se responden afirmativamente para los cinco perfiles.

**Único punto de fricción (H-01):** S3 y S5 —los menos anglófonos— encuentran
«Welcome back», «Create one» y «Log in» en inglés mientras el resto de la aplicación les
habla en español. No bloquea, pero es lo primero que ve un usuario nuevo y fija la
impresión de producto sin terminar.

#### T2 · Buscar una carta y crear un mazo Commander con ≥ 10 cartas — *fricción prevista: media*

- **S2 (Moxfield/Scryfall)** buscará directamente `t:instant c:u cmc<=2` en el añadido
  rápido. Funciona —hay modo sintaxis—, pero tiene que descubrir por sí mismo que existe:
  el único indicio es el marcador de posición (**H-11**). Después echará en falta atajos
  para «añadir y seguir escribiendo» (**H-10**), aunque `Ctrl+'` cubre parte del caso.
- **S1 (Archidekt)** buscará el importador para pegar una lista entera en vez de añadir
  carta a carta. Lo encuentra. Si se equivoca de lista, descubre que **no hay deshacer**
  (**H-07**) y tiene que retirar ~100 cartas a mano: es el peor momento previsto de toda
  la tarea.
- **S5** no sabe qué es un «comandante» dentro de la aplicación hasta que abre la ficha de
  una carta legendaria; el flujo de asignar comandante desde la ficha (`👑 Set Commander`)
  responde bien a la pregunta 3 una vez lo ve.
- **Riesgo transversal (H-02):** cualquiera que pulse «Eliminar» explorando pierde el mazo
  sin red.

#### T3 · Curva de maná, sinergias y sugerencias de IA — *fricción prevista: media*

- Las tres cosas están en la misma columna, lo que responde bien a la pregunta 2.
- **S1 y S3** van directos a las sugerencias. Tras F8 encuentran **tres subpestañas**
  (Recommander · EDHREC · IA), que es exactamente el modelo mental de quien viene de
  EDHREC: fuentes separadas, no una lista mezclada. Fricción baja aquí.
- **Punto de fricción principal (H-04):** «Obtener sugerencias» aparece deshabilitado. Los
  cinco perfiles preguntan lo mismo —«¿por qué no puedo pulsarlo?»— y ninguno deduce que
  falta guardar el mazo. En una sesión real esto se registraría como solicitud de ayuda.
- **H-09:** S2, que edita rápido, verá recomendaciones de la lista anterior durante dos
  segundos sin saber que están recalculándose.

#### T4 · Corregir el mazo hasta que no haya violaciones — *fricción prevista: baja-media*

- El panel de legalidad es legible y el contador con barra responde a la pregunta 4.
- **H-05:** S3 y S5 leen «Copias — *3 copies; max 1*». La etiqueta está traducida y el
  detalle no; es justo la información que necesitan para actuar.
- **S4 (organizador)** espera poder pulsar sobre una violación y saltar a la carta
  culpable. No se puede: la carta aparece marcada en la lista, pero hay que buscarla. Es
  el paso donde su modelo mental (Deckstats) más se separa del producto.

#### T5 · Cambiar la edición de una carta a foil y comprobar el precio — *fricción prevista: media-alta*

- La funcionalidad existe y es completa: la ficha de carta ofrece «Cambiar edición…» y
  «Foil», y el precio recalcula por carta (`cardPrice` prefiere el precio foil).
- **H-06 es determinante aquí.** El resultado depende de en qué vista esté el usuario:
  - En columnas o cuadrícula, clic izquierdo → ficha → todo a la vista. Sin fricción.
  - **En vista de texto, el clic izquierdo no hace nada.** S2 y S4, que son precisamente
    quienes prefieren la vista de texto (es la de Moxfield y la de Deckstats), se quedan
    sin camino evidente: la única entrada es el clic derecho, que nada anuncia.
- Predicción: es la tarea con mayor probabilidad de fallo por abandono entre los perfiles
  avanzados, y paradójicamente la que los perfiles menos expertos completarían antes.

#### T6 · Publicar en un foro y seguir a otro usuario — *fricción prevista: baja*

- Publicar: el diálogo es claro y, tras F8, los errores son específicos (moderación,
  sesión caducada, permisos) en lugar del «no se pudo publicar» genérico.
- Seguir: el nombre del autor enlaza a su perfil (`ForumThread.tsx:100`) y el perfil tiene
  el botón. La cadena de acciones responde a las cuatro preguntas.
- **H-01:** el botón dice «Follow» / «Following» en inglés en una interfaz en español.

#### T7 · Crear o inscribirse en un evento — *fricción prevista: alta*

Es la tarea peor situada del conjunto, y conviene decirlo en el TFM antes de que lo diga
un evaluador:

- **Toda la pantalla está en inglés** (**H-01**): «Community events», «Organize an event»,
  «Title», «Format», «Capacity», «Create». Para S3 y S5 el salto de idioma es completo.
- **El formato es un campo de texto libre** (**H-08**). S4, que es quien realmente usaría
  esto, escribirá «Commander» y esperará que el sistema lo relacione con sus mazos de ese
  formato. No ocurre nada: es una cadena suelta.
- No hay fecha ni lugar en el formulario, algo que S4 da por sentado en cualquier
  herramienta de torneos.
- El error de inscripción sí es informativo («the event may be full»), en inglés.

#### T8 · Abrir el simulador, barajar, robar 7 y hacer mulligan — *fricción prevista: media*

- **Con la ruta correcta la tarea es excelente.** El playtester en solitario incorporado en
  F8 hace exactamente lo que estos perfiles esperan: reparte siete, ofrece mulligan de
  Londres con selección de cartas al fondo, y «Siguiente turno (desgirar + robar)».
  S1 reconoce el modelo de Archidekt de inmediato.
- **El problema es llegar (H-03).** Los cinco perfiles empiezan por el menú «Play», porque
  es lo que la tarea nombra. Ahí encuentran un formulario de partida multijugador que les
  pide *«Deck id (optional — blank uses a generic library)»*. Ninguno de los cinco perfiles
  sabe cuál es el id de su mazo: es un UUID. Predicción: **fallo de tarea por camino
  equivocado**, no por incapacidad, en la mayoría de los perfiles que no descubran antes el
  botón «Playtest» dentro del mazo.
- **H-01:** la mesa multijugador está íntegramente en inglés.

### B.3 — Síntesis de la simulación

| Tarea | Fricción prevista | Causa dominante |
|---|---|---|
| T1 Registro/login | Baja | H-01 |
| T2 Buscar y construir | Media | H-07, H-11, H-02 (riesgo) |
| T3 Curva, sinergias, IA | Media | **H-04** |
| T4 Legalidad | Baja-media | H-05 |
| T5 Edición foil y precio | **Media-alta** | **H-06** |
| T6 Foro y seguir | Baja | H-01 |
| T7 Eventos | **Alta** | **H-01 + H-08** |
| T8 Simulador | Media | **H-03** |

---

## Parte C — Problemas priorizados y acciones de mejora

Prioridad = severidad × frecuencia × concordancia con la simulación.

| Prio. | ID | Acción concreta | Coste estimado |
|---|---|---|---|
| **1** | H-01 | Pasar por `i18n` las seis pantallas pendientes (eventos, mesa multijugador, login, registro, cuenta, botón de seguir). Es el problema más frecuente y el más barato de arreglar. | Bajo (mecánico) |
| **2** | H-03 | Renombrar y separar los dos simuladores: «Mesa multijugador» vs. «Probar mazo», y sustituir el campo *Deck id* por un selector de mis mazos. | Medio |
| **3** | H-02 | Diálogo de confirmación al eliminar un mazo, con el nombre del mazo en el texto. | Bajo |
| **4** | H-06 | Dar a la vista de texto el mismo clic izquierdo que abre la ficha en las demás vistas. | Bajo |
| **5** | H-04 | Sustituir el botón muerto por un botón activo que explique («Guarda el mazo para pedir sugerencias») o guardar automáticamente antes de pedirlas. | Bajo |
| **6** | H-08 | Convertir el formato del evento en un desplegable alimentado por el catálogo de formatos ya existente; añadir fecha y lugar. | Medio |
| **7** | H-05 | Mover los textos de violación a claves `i18n` con parámetros. | Medio |
| **8** | H-07 | Registrar la importación como una operación deshacible («Deshacer importación» durante la sesión). | Medio |
| **9** | H-09 | Indicador de «actualizando» sobre las recomendaciones mientras corre el retardo. | Bajo |
| **10** | H-10, H-11 | Panel de atajos y enlace a la sintaxis de Scryfall desde el buscador. | Bajo |

---

## Parte D — Lo que sigue pendiente y no puede cubrirse analíticamente

| Elemento | Estado | Por qué no se puede simular |
|---|---|---|
| **RNF12 — SUS medio ≥ 70** | **PENDIENTE** | Mide satisfacción percibida. Requiere 5–8 personas reales respondiendo diez ítems Likert tras usar el sistema. |
| Tasa de finalización y tiempo por tarea | **PENDIENTE** | Son medidas de comportamiento observado. La Parte B predice *dónde* fallarán, no *cuántos* ni *en cuánto tiempo*. |
| Dificultad percibida por tarea (1–5) | **PENDIENTE** | Ídem. |
| RNF01 — p95 del *gateway* < 500 ms | **PENDIENTE** | `k6 run docs/load-test/gateway-load-test.js` |
| RNF02 — Lighthouse *Performance* > 85 | **PENDIENTE** | `npx lighthouse <url> --only-categories=performance` |
| Lighthouse *Accessibility* > 90 | **PENDIENTE** | Ejecutable de inmediato contra el despliegue de Firebase. La inspección manual no encontró incidencias de texto alternativo, lo que hace previsible una puntuación alta, pero **previsible no es medido**. |

**Recomendación de secuencia:** aplicar las prioridades 1–5 de la Parte C *antes* de
convocar las sesiones. Son baratas, y cuatro de ellas atacan justo los puntos donde la
simulación predice fallo de tarea; medir el SUS sobre la versión actual gastaría
participantes —el recurso escaso— en detectar problemas ya conocidos.
