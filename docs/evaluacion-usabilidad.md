# Evaluación de Usabilidad — Plataforma Social MTG

> Documento de Fase 5. Define el protocolo de evaluación con usuarios reales de la
> comunidad MTG hispanohablante. Los **resultados** se rellenan tras ejecutar las
> sesiones; las secciones de metodología y materiales están listas para usarse.

## Objetivo

Validar la usabilidad de los flujos principales (registro/login, construcción de mazos,
foros, simulador y recomendaciones IA) con usuarios representativos, midiendo la
satisfacción percibida mediante el cuestionario **SUS (System Usability Scale)**.

## Participantes

- **Perfil:** jugadores de MTG hispanohablantes (mezcla de niveles: casual, competitivo).
- **Tamaño de muestra:** 5–8 participantes (suficiente para detectar la mayoría de
  problemas de usabilidad según Nielsen).
- **Reclutamiento:** comunidades de Discord/Reddit de MTG en español.

## Tareas guiadas (think-aloud)

Cada participante completa estas tareas mientras verbaliza su razonamiento:

1. Registrarse e iniciar sesión.
2. Buscar una carta en Scryfall y crear un mazo Commander con al menos 10 cartas.
3. Revisar la curva de maná y las sinergias del mazo; pedir sugerencias de IA.
4. Publicar en un foro y seguir a otro usuario.
5. Crear/inscribirse en un evento (torneo/draft).
6. Abrir el simulador, barajar, robar 7 y hacer mulligan.

Se registra: tasa de finalización, tiempo por tarea, errores y comentarios.

## Cuestionario SUS

Escala Likert 1–5 (1 = totalmente en desacuerdo, 5 = totalmente de acuerdo):

1. Creo que usaría este sistema frecuentemente.
2. Encuentro el sistema innecesariamente complejo.
3. Pienso que el sistema es fácil de usar.
4. Creo que necesitaría apoyo técnico para usar el sistema.
5. Las funciones del sistema están bien integradas.
6. Hay demasiada inconsistencia en el sistema.
7. La mayoría aprendería a usar el sistema muy rápido.
8. El sistema es muy incómodo de usar.
9. Me sentí muy seguro usando el sistema.
10. Necesité aprender muchas cosas antes de poder usar el sistema.

### Cálculo de la puntuación SUS

- Ítems impares (1,3,5,7,9): contribución = (respuesta − 1).
- Ítems pares (2,4,6,8,10): contribución = (5 − respuesta).
- SUS = (suma de contribuciones) × 2.5 → rango 0–100.
- **Criterio de aceptación (Fase 5): SUS promedio ≥ 70.**

## Resultados

> _Pendiente de ejecución de las sesiones._ Completar la tabla y la media.

| Participante | Perfil | SUS | Notas cualitativas |
|--------------|--------|-----|--------------------|
| P1 | — | — | — |
| P2 | — | — | — |
| P3 | — | — | — |
| P4 | — | — | — |
| P5 | — | — | — |

- **SUS promedio:** _pendiente_ (objetivo ≥ 70)
- **Problemas detectados (prioridad):** _pendiente_
- **Acciones de mejora:** _pendiente_

## Métricas complementarias de rendimiento

- **Lighthouse (frontend):** objetivo Performance > 85. Ejecutar:
  `npx lighthouse http://localhost:80 --only-categories=performance`
- **Carga (k6) contra el gateway:** 100 req/s, p95 < 500 ms. Ver
  [load-test/gateway-load-test.js](load-test/gateway-load-test.js).
