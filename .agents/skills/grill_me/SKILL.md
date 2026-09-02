---
name: grill_me
description: Entrevista técnica interactiva para extraer requerimientos críticos, restricciones arquitectónicas y criterios de aceptación antes de escribir código. Activar cuando el usuario proponga una nueva feature, refactorización o cambio complejo.
---

# 🔍 SKILL: Grill-Me (Contexto y Requisitos)

## Propósito
Desafiar constructivamente las premisas, detectar ambigüedades y consolidar el contexto técnico necesario antes de iniciar cualquier cambio en el código.

---

## Cuándo Activar (Triggers)
- Tareas con requerimientos vagos o incompletos (*"haz que ande más rápido"*, *"agrega login"*).
- Cambios arquitectónicos que afecten la estructura de datos o módulos compartidos.
- Creación de nuevas integraciones externas o endpoints.
- Cuando el usuario solicite explícitamente `/grill-me` o una entrevista técnica previa.

---

## Reglas de Ejecución
1. **Foco y Disciplina:** Realizá preguntas concretas agrupadas o de a una por vez para no saturar al desarrollador.
2. **Parada Obligatoria:** No inicies la fase **Maker** hasta que las dudas críticas estén resueltas.
3. **Validación de Premisas:** Si una decisión del usuario contradice buenas prácticas reconocidas (e.g. acoplamiento excesivo, romper el principio de responsabilidad única), explicá el *por qué* técnico y proponé alternativas con sus respectivos tradeoffs.

---

## Categorías de Preguntas Clave

### 1. Stack & Entorno
- ¿Qué versiones de runtime, frameworks o librerías críticas aplican?
- ¿Existen limitaciones de plataforma (Node, Browser, Edge, Mobile)?

### 2. Arquitectura & Dependencias
- ¿Dónde vive el estado de la aplicación?
- ¿Qué módulos o capas existentes se verán afectados directa o indirectamente?
- ¿Existen patrones de diseño establecidos en el repositorio que debamos respetar?

### 3. Criterios de Aceptación & Verificación
- ¿Qué constituye un resultado exitoso para esta tarea?
- ¿Cuáles son los tests obligatorios (unitarios, e2e, integración)?
- ¿Se requieren evidencias visuales (screenshots) o de rendimiento?

### 4. Casos de Borde & Riesgos
- ¿Qué ocurre en caso de fallo de red o datos corruptos?
- ¿Cuáles son los caminos de error y cómo deben informarse al usuario?

---

## Output del Proceso
Al concluir la entrevista Grill-Me, el agente debe resumir el entendimiento en un bloque estructurado:
- **Objetivo:** Definición concisa de la tarea.
- **Restricciones:** Límites técnicos y de alcance.
- **Plan de Verificación:** Pruebas que validarán la entrega.
