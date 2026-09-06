---
name: routines
description: "Trigger: routines, automatización desatendida, ci triage, pr review automático, tareas periódicas. Automatización de tareas periódicas, eventos de fondo y rutinas desatendidas."
version: 1.0.0
license: MIT
metadata:
  author: RobertHernandezArenas
  category: workflow
---

# 🔁 SKILL: Routines (Automatización Desatendida)

## Propósito
Ejecutar flujos de trabajo repetitivos y de larga duración de forma autónoma, garantizando monitoreo continuo y reporte de incidencias sin requerir supervisión humana constante.

---

## Cuándo Activar (Triggers)
- Eventos de CI/CD (e.g. fallo en pipeline que requiere diagnóstico automático).
- Notificaciones de apertura de Pull Request (revisión estática previa).
- Tareas programadas o cron jobs (digest diario de errores, limpieza de ramas huérfanas).
- Verificaciones periódicas de salud del sistema o regresiones visuales.

---

## Tipos de Rutinas Comunes

### 1. Triage Automático de CI
- **Disparador:** Webhook de fallo en test/build.
- **Acción:** Analizar los logs del runner, aislar el commit causante y generar un reporte con propuesta de fix.

### 2. Pre-Review de Pull Requests
- **Disparador:** Nuevo PR abierto.
- **Acción:** Verificar estándares de código, cobertura de tests, convenciones de commits y documentar hallazgos preliminares.

### 3. Monitoreo & Digest Técnico
- **Disparador:** Cron programado (e.g. diario a primera hora).
- **Acción:** Resumen de tareas pendientes, estado de la base de código y alertas de deuda técnica.

---

## Reglas de Ejecución
1. **Idempotencia:** La ejecución repetida de una rutina no debe causar efectos colaterales indeseados.
2. **Notificación sin Ruido:** Reportar únicamente cuando existan hallazgos accionables o fallos que requieran atención.
3. **Manejo de Timeouts:** Establecer límites temporales estrictos para evitar procesos colgados en segundo plano.
