---
name: Loop Mode
description: "Coordinar Grill‑Me, Maker, Verifier, Memoria y Evaluaciones en iteraciones."
---
# 🔄 SKILL: Loop Mode

## Propósito
Coordinar Grill‑Me, Maker, Verifier, Memoria y Evaluaciones en iteraciones.

## Estados
- INIT
- NEEDS_CONTEXT
- WORKING
- VERIFYING
- LEARNING
- DONE
- FAILED

## Contrato
Cada iteración produce:
{
  "state": "...",
  "action": "...",
  "input": "...",
  "output": "...",
  "evidence": "...",
  "next": "..."
}

## Reglas
- No avanzar sin evidencia.
- No saltar memoria.
- Máximo 3 fallos consecutivos.
