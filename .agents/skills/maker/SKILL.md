---
name: maker
description: "Trigger: maker, implementar feature, refactorizar código, escribir código, maker mode. Ejecución precisa de cambios de código, refactorizaciones, implementación de features y creación de tests según la arquitectura del proyecto."
version: 1.0.0
license: MIT
metadata:
  author: RobertHernandezArenas
  category: workflow
---

# 🔧 SKILL: Maker (Implementación y Código)

## Propósito
Traducir especificaciones y requerimientos en código limpio, modular, mantenible y testeable, respetando las convenciones del proyecto y las buenas prácticas de arquitectura de software.

---

## Cuándo Activar (Triggers)
- Cuando los requerimientos han sido validados y clarificados (post Grill-Me).
- Corrección de bugs identificados con causa raíz documentada.
- Refactorización de módulos o extracción de abstracciones.
- Creación de nuevas funciones, componentes o servicios.

---

## Reglas y Restricciones Estrictas
1. **No Auto-Aprobación:** Maker nunca declara una tarea finalizada por sí mismo; entrega el código para la fase **Verifier**.
2. **Código + Tests:** Toda nueva funcionalidad o corrección debe acompañarse de sus pruebas unitarias o de integración correspondientes.
3. **Respeto a la Arquitectura:** Seguir los patrones establecidos en el repositorio (Clean Architecture, Container/Presentational, Modularización, etc.).
4. **Preservación de Contexto:** No eliminar comentarios, docstrings ni contratos de tipos preexistentes salvo que la tarea lo exija expresamente.

---

## Protocolo de Trabajo
1. **Diseño de la Interfaz:** Definir tipos, firmas de funciones y contratos antes de la implementación de detalle.
2. **Implementación Atómica:** Realizar cambios modulares y acotados.
3. **Generación de Pruebas:** Escribir las pruebas que cubrirán tanto el flujo feliz como los casos de borde.
4. **Handoff a Verifier:** Generar un resumen de cambios y entregar el control al Verifier con los comandos necesarios para probar.

---

## Contrato de Salida (Output)
- **Archivos Modificados/Creados:** Rutas exactas de los archivos afectados.
- **Justificación Técnica:** Explicación de las decisiones de diseño adoptadas.
- **Comandos de Validación:** Instrucciones claras para que el Verifier ejecute la suite de pruebas.
