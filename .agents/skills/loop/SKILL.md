---
name: loop
description: Orquestación del ciclo iterativo de desarrollo basado en una máquina de estados finitos (Grill-Me, Maker, Verifier, Memory). Activar para gestionar tareas multi-paso complejas con control estricto de progreso.
---

# 🔄 SKILL: Loop Mode (Orquestación Iterativa)

## Propósito
Gobernar la ejecución iterativa de tareas complejas mediante una máquina de estados finitos con contratos estrictos, evitando ciclos infinitos y asegurando convergencia hacia una solución verificada.

---

## Máquina de Estados

```
   ┌──────────┐
   │   INIT   │
   └────┬─────┘
        │
        ▼
   ┌─────────────────┐       ¿Falta contexto?
   │  NEEDS_CONTEXT  │ ──────────────────────────► (Grill-Me)
   └────┬────────────┘
        │ Contexto OK
        ▼
   ┌─────────────────┐
   │    WORKING      │ (Maker)
   └────┬────────────┘
        │
        ▼
   ┌─────────────────┐       ¿Rechazado?
   │   VERIFYING     │ ──────────────────────────► Retorna a WORKING (Max 3 reintentos)
   └────┬────────────┘
        │ Aprobado
        ▼
   ┌─────────────────┐
   │    LEARNING     │ (Memory)
   └────┬────────────┘
        │
        ▼
   ┌─────────────────┐
   │      DONE       │
   └─────────────────┘
```

---

## Contrato de Iteración
Cada ciclo del loop debe emitir un bloque estructurado de telemetría:

```json
{
  "iteration": 1,
  "state": "WORKING | VERIFYING | LEARNING | DONE | FAILED",
  "actor": "Grill-Me | Maker | Verifier | Memory",
  "action": "Descripción concreta de la operación realizada",
  "evidence": "Ruta a logs, tests o capturas generadas",
  "next_state": "Siguiente estado en la máquina de estados"
}
```

---

## Reglas de Control (Circuit Breakers)
1. **Límite de Fallos Consecutivos:** Si el Verifier rechaza la entrega 3 veces consecutivas, el loop transiciona a `FAILED` y solicita intervención humana con un resumen de los intentos.
2. **Prohibido Saltear la Memoria:** Antes de transicionar a `DONE`, es obligatorio registrar los aprendizajes en `LEARNING`.
3. **Avance Basado en Evidencia:** No se permite transicionar de `VERIFYING` a `LEARNING` sin el veredicto `APPROVED` y evidencia comprobable.
