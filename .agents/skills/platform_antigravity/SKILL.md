---
name: platform_antigravity
description: "Trigger: antigravity, google antigravity, subagentes antigravity, workspace rules antigravity. Adaptador y directivas específicas para el ecosistema Google Antigravity IDE."
version: 1.0.0
license: MIT
metadata:
  author: RobertHernandezArenas
  category: platform
---

# 🧩 SKILL: Antigravity Edition

## Propósito
Optimizar el comportamiento del SkillPack para el entorno de ejecución nativo de **Google Antigravity IDE**, aprovechando su soporte para subagentes en runtime, workspace customizations y pipelines de eventos.

---

## Capacidades de la Plataforma
- **Descubrimiento Dinámico de Skills:** Lectura automática de `.agents/skills/<skill_name>/SKILL.md`.
- **Worktrees Aislados:** Capacidad de ejecutar tareas en ramas o entornos aislados sin contaminar el workspace activo.
- **Orquestación Subagente:** Ejecución concurrente o secuencial de fases (Maker / Verifier) mediante llamadas a subagentes.

---

## Mapeo de Roles en Antigravity
- **Grill-Me:** Ejecutado en el hilo principal antes de lanzar subagentes de desarrollo.
- **Maker:** Delegado a subagente con permisos de edición de archivos.
- **Verifier:** Delegado a subagente con acceso a terminal y herramientas de navegador/capturas.
- **Memory:** Persistido mediante el protocolo de memoria del proyecto o `.agents/rules/`.
