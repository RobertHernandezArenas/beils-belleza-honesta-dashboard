---
name: memory
description: "Trigger: memory, mem_save, registrar lección, decisiones arquitectónicas, registrar patrón. Gestión de memoria técnica persistente para registrar decisiones arquitectónicas, lecciones aprendidas, patrones adoptados y soluciones a bugs recurrentes."
version: 1.0.0
license: MIT
metadata:
  author: RobertHernandezArenas
  category: workflow
---

# 🧠 SKILL: Memory (Persistencia de Aprendizaje)

## Propósito
Preservar el conocimiento adquirido durante el desarrollo del proyecto, asegurando que las decisiones técnicas, advertencias de arquitectura y soluciones a errores no se pierdan entre sesiones.

---

## Cuándo Activar (Triggers)
- Al completar una funcionalidad o refactorización relevante.
- Al resolver un bug complejo (registrando la causa raíz).
- Al establecer una nueva convención o patrón de diseño.
- Cuando el usuario exprese preferencias explícitas de estilo o arquitectura.

---

## Qué Registrar
1. **Decisiones de Arquitectura:** Elección de librerías, separación de capas o modelos de estado.
2. **Gotchas y Trampas:** Comportamientos inesperados de dependencias o del entorno.
3. **Causa Raíz de Bugs:** Qué causó el fallo y cómo se previno a futuro.
4. **Patrones Convencionados:** Reglas de nombrado, estructura de carpetas o flujos de datos.

---

## Esquema de Registro de Memoria
Cada entrada en memoria debe seguir una estructura clara:

```markdown
### [TIPO]: Título descriptivo (Ej: [DECISION] Adopción de Repository Pattern en Auth)
- **Qué:** Resumen de lo realizado en una o dos oraciones.
- **Por qué:** Motivación técnica y beneficios esperados.
- **Dónde:** Rutas de archivos y módulos involucrados.
- **Lecciones / Gotchas:** Advertencias o consideraciones para futuras intervenciones.
```

---

## Regla de Oro
La memoria no sustituye la respuesta al usuario; es el cuaderno de bitácora del agente para garantizar consistencia y evolución técnica a largo plazo.
