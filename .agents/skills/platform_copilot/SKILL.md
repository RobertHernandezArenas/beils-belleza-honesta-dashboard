---
name: platform_copilot
description: Adaptador y directivas para GitHub Copilot en VS Code. Activar para flujos de edición asistida en el editor e integración con Prompt Files y CI.
---

# 🧩 SKILL: Copilot VSCode Edition

## Propósito
Integrar la metodología de SkillForge en el flujo interactivo de **GitHub Copilot en VS Code**, aprovechando Prompt Files (`.github/prompts/`) e instrucciones de repositorio (`.github/copilot-instructions.md`).

---

## Capacidades de la Plataforma
- **Edición Inline y Chat en Editor:** Feedback inmediato en el contexto del archivo abierto.
- **Prompt Files (`.prompt.md`):** Estandarización de roles invocables directamente desde la UI de chat.
- **Integración con CI/CD:** Delegación de la verificación exhaustiva al pipeline de integración continua.

---

## Mapeo de Roles en Copilot
- **Grill-Me:** Invocado vía `.github/prompts/grill-me.prompt.md` para acotar tareas ambiguas.
- **Maker:** Copilot actúa como asistente de codificación primaria.
- **Verifier:** Pruebas locales y validación en CI antes de mergear.
