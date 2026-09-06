---
name: agent_foundation
description: "Trigger: agent foundation, skillforge, arquitectura de agentes, ciclo de vida de desarrollo con IA. Base unificada para coordinar agentes de desarrollo: Maker, Verifier, Memoria, Evaluaciones y Loop."
version: 1.0.0
license: MIT
metadata:
  author: RobertHernandezArenas
  category: workflow
---

# 🧠 SKILL: Agent Foundation

## Propósito
Definir y gobernar el ciclo de vida de desarrollo asistido por agentes de inteligencia artificial, garantizando rigor arquitectónico, evidencia empírica antes de aprobación, separación de responsabilidades y mejora continua.

---

## Cuándo Activar (Triggers)
- Al inicializar un nuevo proyecto o sesión de trabajo con agentes.
- Cuando se requiere definir la interacción entre diferentes roles (Maker vs. Verifier).
- Al estructurar pipelines de CI/CD, automatización de tareas o loops iterativos.

---

## Principios Fundamentales
1. **Separación de Roles (Maker / Verifier):** El rol que diseña e implementa el código (Maker) no puede auto-aprobarse sin una validación formal independiente (Verifier).
2. **Evidencia antes de Aprobación:** Ningún cambio se considera completado sin pruebas observables (logs de ejecución, tests pasando, capturas visuales, mediciones de rendimiento).
3. **Memoria como Ventaja Acumulativa:** Las decisiones de diseño, patrones acordados y errores resueltos deben persistirse para evitar regresiones y re-trabajo.
4. **Ciclo Disciplinado:** Toda tarea compleja atraviesa: `Grill-Me ➔ Maker ➔ Verifier ➔ Memory ➔ Loop`.

---

## Mapa de Responsabilidades

```
┌─────────────────────────────────────────────────────────────┐
│                       GRILL-ME                              │
│       (Preguntas críticas y aclaración de contexto)         │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                         MAKER                               │
│      (Diseño, refactorización y escritura de código)        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                        VERIFIER                             │
│     (Ejecución de tests, análisis visual, linter y QA)      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                        MEMORY                               │
│     (Persistencia de decisiones, hechos y lecciones)        │
└─────────────────────────────────────────────────────────────┘
```

---

## Checklist de Calidad
- [ ] Contexto y requisitos clarificados mediante **Grill-Me**.
- [ ] Implementación modular y testeable por **Maker**.
- [ ] Validación con evidencia explícita por **Verifier**.
- [ ] Registro de lecciones en **Memory**.
