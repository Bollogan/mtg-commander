# TFM_SPEC — Red Social MTG (UNIR, Máster Ing. Software)

## Metadatos
- **Título:** Red Social para Magic: The Gathering
- **Autor:** Breogán González Saborido
- **Director/a:** Laura García Borgoñon
- **Tipo:** Desarrollo Práctico (Tipo 1 UNIR)
- **Stack:** React.js + Redux · Node.js + Express + Socket.io · MongoDB + PostgreSQL · Redis · Docker + Kubernetes · GitHub Actions
- **Tokens estimados por sección:** ~800–2.500 (ver cada sección)
- **Formato entrega:** .docx (plantilla UNIR) + Anexo A (artículo 6–8 pp.)
- **Idioma:** Español académico formal · Referencias APA 7ª ed.

> **⚠️ Estado actual del documento:** Capítulos 1 y 2 redactados. Cap. 3, 4, 5 y Anexo A son plantillas vacías pendientes de desarrollo.

---

## Secciones Ejecutables

---

### SEC-01 · Capítulo 3 — Objetivos y Metodología

1. **ID:** CAP3-OBJ
2. **Tarea:** Redactar objetivo general, objetivos específicos y metodología Scrum
3. **Entradas requeridas:**
   - Resumen (ya redactado): propósito de integrar red social + deck-builder + simulador + IA
   - Stack tecnológico: confirmado en Cap. 1 y 2
   - Metodología declarada: Scrum, iteraciones 2–4 semanas
4. **Acciones:**
   - [ ] **3.1 Objetivo general:** formular en 2–3 frases el impacto observable: *"Diseñar e implementar una plataforma web fullStack que integre…"*
   - [ ] **3.2 Objetivos específicos (6–8):** verbo infinitivo + objeto. Cubrir:
     - OE1 Analizar ecosistema plataformas MTG existentes
     - OE2 Diseñar arquitectura fullStack (React/Node/Mongo/PG/Redis)
     - OE3 Implementar módulo red social (perfiles, seguidores, foros, eventos)
     - OE4 Implementar deck-builder con integración Scryfall API
     - OE5 Implementar simulador de partidas básico
     - OE6 Integrar módulo IA/recomendación de cartas/mazos
     - OE7 Desplegar con Docker + Kubernetes + CI/CD GitHub Actions
     - OE8 Evaluar usabilidad con usuarios reales comunidad MTG hispanohablante
   - [ ] **3.3 Metodología:** describir Scrum aplicado: sprints, backlog, roles, herramientas de seguimiento (GitHub Issues / Jira), justificación de stack tecnológico con referencias
5. **⚠️ Riesgos críticos:**
   - Objetivos demasiado genéricos → no superan revisión académica
   - Metodología sin justificación técnica → penalización en rúbrica
   - Olvidar enlazar OE con conclusiones (Cap. 5 los necesita como referencia 1:1)
6. **✓ Criterio de validación:**
   - ≥ 6 objetivos específicos con verbo en infinitivo
   - Metodología menciona sprints concretos y herramientas
   - Cada OE es verificable (no subjetivo)
7. **Guardado:** `ESTADO_CAP3.json` → lista de OE numerados para referenciar en Cap. 5

---

### SEC-02 · Capítulo 4.1 — Identificación de Requisitos

1. **ID:** CAP4-REQ
2. **Tarea:** Especificar requisitos funcionales, no funcionales y restricciones; documentar proceso de elicitación
3. **Entradas requeridas:**
   - Lista OE de SEC-01 (especialmente OE1–OE6)
   - Análisis comparativo Tabla 1 (ya en Cap. 2): brechas identificadas
4. **Acciones:**
   - [ ] **RF (Requisitos Funcionales):** mínimo 15, agrupados por módulo:
     - Módulo Social: RF01–RF05 (registro, perfiles, seguidores, foros, eventos)
     - Módulo Deck-Builder: RF06–RF10 (CRUD mazos, stats, curva maná, Scryfall, compartir)
     - Módulo Simulador: RF11–RF13 (modo solitario, multijugador, historial)
     - Módulo IA: RF14–RF15 (recomendación cartas, recomendación mazos)
   - [ ] **RNF (No Funcionales):** rendimiento (<2s respuesta), disponibilidad (99,5%), RGPD/seguridad OWASP Top 10, localización (ES)
   - [ ] **Restricciones:** datos de cartas vía Scryfall API (sólo lectura), sin replicar MTGA, prototipo (no comercial)
   - [ ] Describir proceso elicitación: análisis plataformas existentes + entrevistas/encuestas comunidad MTG (indicar perfil participantes)
   - [ ] Herramienta de seguimiento: GitHub Issues con etiquetas por módulo
5. **⚠️ Riesgos críticos:**
   - RF demasiado vagos → imposible validar en evaluación
   - Omitir RNF de seguridad/RGPD → incumplimiento normativo señalado en Cap. 2
   - No documentar cómo se obtuvieron los requisitos → penalización rúbrica
6. **✓ Criterio de validación:**
   - ≥ 15 RF numerados y trazables
   - ≥ 5 RNF con métricas concretas
   - Referencia explícita a OWASP y RGPD
7. **Guardado:** `ESTADO_CAP4-REQ.json` → tabla RF/RNF numerada para trazabilidad

---

### SEC-03 · Capítulo 4.2 — Descripción del Sistema Software

1. **ID:** CAP4-SYS
2. **Tarea:** Documentar arquitectura, módulos, diagramas UML y capturas del prototipo
3. **Entradas requeridas:**
   - RF/RNF de SEC-02
   - Stack confirmado: React+Redux / Node+Express+Socket.io / MongoDB+PostgreSQL / Redis / Docker+K8s
4. **Acciones:**
   - [ ] **Arquitectura general:** diagrama de componentes (frontend SPA · API REST · WebSocket · BBs · Redis · módulo IA · Scryfall API ext.)
   - [ ] **Diagrama de clases / entidades principales:** User, Deck, Card, Forum, Event, Simulation, AIRecommendation
   - [ ] **Diagrama de casos de uso:** por módulo (Social, DeckBuilder, Simulador, IA)
   - [ ] **Diagrama de secuencia:** al menos 2 flujos críticos (ej: crear mazo + obtener recomendación IA)
   - [ ] **Descripción de módulos:** para cada módulo → stack, patrón (MVC/microservicio), decisiones de diseño
   - [ ] **Fases e hitos Scrum:** tabla sprint → objetivo → entregable → fecha estimada (mínimo 4 sprints)
   - [ ] **Capturas de pantalla:** ≥5 vistas representativas del prototipo funcional
   - [ ] **Descripción módulo IA:** modelo externo (experto comunidad), parámetros de entrada/salida, integración API
   - [ ] **Seguridad implementada:** JWT auth, HTTPS, validación inputs, medidas OWASP
5. **⚠️ Riesgos críticos:**
   - Diagramas UML incorrectos o ausentes → penalización alta en rúbrica técnica
   - Módulo IA poco detallado → si es diferenciador clave, debe justificarse técnicamente
   - Capturas de pantalla de baja calidad o prototipo incompleto → evidencia insuficiente
   - Omitir decisiones de polyglot persistence (MongoDB vs PostgreSQL) → falta justificación
6. **✓ Criterio de validación:**
   - ≥ 1 diagrama de componentes, ≥ 1 de clases, ≥ 2 de casos de uso, ≥ 2 de secuencia
   - Cada diagrama tiene leyenda y referencia en texto
   - ≥ 5 capturas de pantalla con descripción
   - Tabla de sprints con ≥ 4 iteraciones
7. **Guardado:** `ESTADO_CAP4-SYS.json` → lista diagramas generados + ruta capturas

---

### SEC-04 · Capítulo 4.3 — Evaluación

1. **ID:** CAP4-EVAL
2. **Tarea:** Documentar pruebas de usabilidad + métricas de rendimiento técnico
3. **Entradas requeridas:**
   - Prototipo funcional (de SEC-03)
   - Perfil usuarios objetivo: jugadores MTG hispanohablantes, rango intermedio-avanzado
4. **Acciones:**
   - [ ] **Diseño prueba usabilidad:**
     - Perfil participantes: ≥5 usuarios (describir edad, experiencia MTG, nivel técnico)
     - Tareas a evaluar: crear mazo, buscar carta en Scryfall, unirse a foro, simular partida, recibir recomendación IA
     - Métricas: tasa de éxito por tarea, tiempo por tarea, escala SUS (System Usability Scale) o similar
   - [ ] **Resultados usabilidad:** tabla con resultados por usuario y tarea; puntuación SUS agregada
   - [ ] **Pruebas de rendimiento:** tiempo de respuesta API (promedio, p95), carga concurrente (herramienta: k6/JMeter/Locust), métricas de lighthouse (si aplica frontend)
   - [ ] **Análisis de resultados:** comparar con RNF definidos en SEC-02; identificar gaps y mejoras
   - [ ] **Limitaciones del estudio:** muestra pequeña, prototipo no en producción → señalar en texto
5. **⚠️ Riesgos críticos:**
   - Evaluación solo con 1–2 usuarios → insuficiente para UNIR
   - Sin métricas cuantitativas → evaluación subjetiva no válida académicamente
   - Resultados de rendimiento no alineados con RNF → inconsistencia interna
6. **✓ Criterio de validación:**
   - ≥ 5 participantes documentados en evaluación usabilidad
   - Puntuación SUS (u otra escala estándar) calculada
   - ≥ 3 métricas de rendimiento técnico con valores concretos
   - Análisis conecta resultados con RNF de 4.1
7. **Guardado:** `ESTADO_CAP4-EVAL.json` → tabla resultados usabilidad + métricas rendimiento

---

### SEC-05 · Capítulo 5 — Conclusiones y Trabajo Futuro

1. **ID:** CAP5-CONC
2. **Tarea:** Redactar conclusiones (1:1 con OE) y líneas de trabajo futuro
3. **Entradas requeridas:**
   - Lista OE de SEC-01 (ESTADO_CAP3.json)
   - Resultados evaluación de SEC-04
4. **Acciones:**
   - [ ] **5.1 Conclusiones:**
     - Párrafo intro: resumen del problema + enfoque adoptado
     - Por cada OE (OE1–OE8): 1 conclusión enlazada explícitamente (ej: *"Respecto al OE2, se ha demostrado que…"*)
     - Conclusión transversal: valor diferencial de la plataforma integrada vs. ecosistema fragmentado
   - [ ] **5.2 Trabajo futuro (≥5 líneas):**
     - Expansión módulo IA (modelos más sofisticados, fine-tuning)
     - Soporte idioma portugués (Brasil) y más formatos MTG
     - App móvil nativa (React Native)
     - Integración ActivityPub / Fediverse
     - Monetización/sostenibilidad (modelo freemium)
5. **⚠️ Riesgos críticos:**
   - Conclusión que no referencia ningún OE → incumple requisito UNIR
   - Trabajo futuro demasiado genérico o idéntico al trabajo realizado → penalización
   - Contradecir resultados de evaluación (Cap. 4.3) → inconsistencia grave
6. **✓ Criterio de validación:**
   - Cada OE tiene exactamente 1 conclusión numerada que lo menciona
   - ≥ 5 líneas de trabajo futuro distintas y justificadas
   - No hay afirmaciones no respaldadas por evidencia del Cap. 4
7. **Guardado:** `ESTADO_CAP5.json` → mapa OE → conclusión para auditoría

---

### SEC-06 · Anexo A — Artículo de Investigación

1. **ID:** ANXA-ART
2. **Tarea:** Redactar artículo de investigación (6–8 páginas) según plantilla UNIR
3. **Entradas requeridas:**
   - Memoria completa (Cap. 1–5 finalizados)
   - Plantilla del artículo incluida en el documento (secciones I–VII + Apéndices + Referencias)
4. **Acciones:**
   - [ ] **Título + Autor + Fecha + Palabras clave** (3–5, alfabético)
   - [ ] **Resumen ≤150 palabras:** objetivo, metodología, resultados, conclusiones
   - [ ] **I. Introducción:** síntesis del problema y motivación (≈200 palabras)
   - [ ] **II. Estado del Arte:** síntesis crítica de Cap. 2 con citas numeradas [1][2]… (≈400 palabras)
   - [ ] **III. Objetivos y Metodología:** OG + OE resumidos + Scrum (≈200 palabras)
   - [ ] **IV. Contribución:** descripción de la plataforma desarrollada, módulos, arquitectura (≈600 palabras + 1–2 figuras)
   - [ ] **V. Resultados:** datos concretos de evaluación usabilidad + rendimiento (≈300 palabras + tabla)
   - [ ] **VI. Discusión:** interpretación de resultados, comparación con estado del arte (≈200 palabras)
   - [ ] **VII. Conclusiones + Trabajo Futuro:** síntesis de Cap. 5 (≈200 palabras)
   - [ ] **Referencias:** formato [1] numérico, ≥8 refs, distintas de la bibliografía principal
   - [ ] Verificar extensión total: 6–8 páginas en plantilla IEEE/UNIR
5. **⚠️ Riesgos críticos:**
   - Artículo = copia literal de la memoria → UNIR lo penaliza explícitamente
   - Extensión < 6 pp. o > 8 pp. → fuera de requisito
   - Secciones I–VII desordenadas o faltantes → incumple plantilla
   - Citas del artículo en formato APA en lugar de [numerado] → error de formato
6. **✓ Criterio de validación:**
   - 7 secciones principales presentes (I–VII)
   - Resumen ≤ 150 palabras (contar)
   - Citas en formato [N] numérico
   - ≥ 1 figura y ≥ 1 tabla propias
   - Extensión 6–8 páginas (estimar: ~500 palabras/página en columna IEEE)
7. **Guardado:** `ESTADO_ANXA.json` → sección completada + wordcount

---

## Matriz de Dependencias

| Sección | Depende de | Bloquea |
|---|---|---|
| SEC-01 (Cap. 3) | Cap. 1+2 ✅ ya redactados | SEC-02, SEC-03, SEC-05 |
| SEC-02 (Cap. 4.1) | SEC-01 (OE definidos) | SEC-03, SEC-04 |
| SEC-03 (Cap. 4.2) | SEC-02 (RF/RNF) | SEC-04, ANXA |
| SEC-04 (Cap. 4.3) | SEC-03 (prototipo) | SEC-05, ANXA |
| SEC-05 (Cap. 5) | SEC-01 (OE) + SEC-04 (resultados) | ANXA |
| SEC-06 (Anexo A) | SEC-01 → SEC-05 todos completos | — |

**Orden de ejecución recomendado:** SEC-01 → SEC-02 → SEC-03 → SEC-04 → SEC-05 → SEC-06

---

## Resumen de Puntos Críticos

| # | Sección | Riesgo | Severidad | Mitigación |
|---|---|---|---|---|
| 1 | SEC-01 | OE sin verbo en infinitivo o no verificables | 🔴 Alta | Revisar cada OE contra plantilla UNIR antes de continuar |
| 2 | SEC-01 | OE no enlazan 1:1 con conclusiones futuras | 🔴 Alta | Guardar ESTADO_CAP3.json y cargarlo en SEC-05 |
| 3 | SEC-03 | Diagramas UML ausentes o incorrectos | 🔴 Alta | Generar con PlantUML/draw.io antes de redactar texto |
| 4 | SEC-04 | Evaluación sin usuarios reales | 🟠 Media-Alta | Mínimo 5 participantes; si no hay, justificar y usar heurísticas Nielsen |
| 5 | SEC-06 | Artículo = copia literal de memoria | 🔴 Alta | Sintetizar y reescribir; verificar similitud con herramienta antiplagio |
| 6 | SEC-06 | Citas en APA en lugar de [N] | 🟡 Media | Convertir referencias al inicio de la redacción del artículo |
| 7 | SEC-03 | Módulo IA insuficientemente detallado | 🟠 Media-Alta | Documentar inputs/outputs del modelo externo + integración API |
| 8 | SEC-02 | RF sin métricas en RNF | 🟡 Media | Toda RNF debe tener valor cuantificable (ej: <2s, 99.5% uptime) |

---

## Notas de Contexto para Claude Code

- **Tono académico:** español formal, tercera persona o impersonal; evitar primera persona singular
- **Referencias:** APA 7ª ed. en memoria; [N] numérico en artículo (Anexo A)
- **Figuras/tablas:** deben tener numeración, título en cursiva y referencia explícita en texto
- **Extensión orientativa memoria:** Cap. 3 ≈ 3–4 pp. · Cap. 4 ≈ 10–15 pp. · Cap. 5 ≈ 2–3 pp.
- **Palabras clave ya definidas:** Magic: The Gathering, red social, deck-builder, aplicación web, comunidad digital
- **Puntos ya desarrollados (no reescribir):** Cap. 1 completo, Cap. 2 completo, Tabla 1 comparativa, Referencias bibliográficas parciales
