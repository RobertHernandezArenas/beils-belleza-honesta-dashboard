---
title: Principios SOLID en JavaScript y TypeScript
description: Guía prescriptiva para refactorización, desacoplamiento y diseño modular en aplicaciones JS/TS.
category: Arquitectura de Software & Clean Code
version: 1.1.0
last_updated: 2026-09
tags:
  - solid
  - clean-code
  - typescript
  - architecture
---

# 📐 Principios SOLID en JavaScript / TypeScript

> **Guía Prescriptiva de Ingeniería de Software**  
> Aplica estos principios para reducir el coste del cambio, desacoplar módulos y diseñar sistemas mantenibles. Léela antes de refactorizar clases, servicios o módulos con responsabilidades difusas.

---

## 📑 Tabla de Contenidos

1. [Fundamento Previo: Duplicidad Real vs. Accidental](#1-fundamento-previo-duplicidad-real-vs-accidental)
2. [SRP — Single Responsibility Principle (Responsabilidad Única)](#2-srp--single-responsibility-principle-responsabilidad-única)
3. [OCP — Open/Closed Principle (Abierto / Cerrado)](#3-ocp--openclosed-principle-abierto--cerrado)
4. [LSP — Liskov Substitution Principle (Sustitución de Liskov)](#4-lsp--liskov-substitution-principle-sustitución-de-liskov)
5. [ISP — Interface Segregation Principle (Segregación de Interfaces)](#5-isp--interface-segregation-principle-segregación-de-interfaces)
6. [DIP — Dependency Inversion Principle (Inversión de Dependencias)](#6-dip--dependency-inversion-principle-inversión-de-dependencias)
7. [Matriz de Diagnóstico Rápido](#7-matriz-de-diagnóstico-rápido)
8. [Cuándo NO Aplicar SOLID (Trade-offs y Pragmatismo)](#8-cuándo-no-aplicar-solid-trade-offs-y-pragmatismo)
9. [Checklist de Verificación para Code Review](#9-checklist-de-verificación-para-code-review)

---

## 1. Fundamento Previo: Duplicidad Real vs. Accidental

No todo el código duplicado debe unificarse de forma apresurada.

| Tipo de Duplicidad | Definición y Comportamiento | Acción Recomendada |
| :--- | :--- | :--- |
| **Duplicidad Real** | Dos o más fragmentos representan el **mismo concepto de negocio**. Cambiarán siempre por la misma causa y al mismo tiempo. | **Extraer abstracción común** inmediatamente. |
| **Duplicidad Accidental** | Los fragmentos coinciden estructuralmente por azar hoy, pero responden a **razones de cambio distintas** (diferentes actores o requerimientos). | **Mantenerlos separados**. Unificarlos crea un acoplamiento artificial peor que la duplicación. |

> [!IMPORTANT]
> **Regla práctica de las 3 apariciones (Rule of Three):** Tolera la duplicación hasta la tercera repetición antes de apresurarte a introducir una abstracción. La abstracción errónea es mucho más costosa de deshacer que el código duplicado.

---

## 2. SRP — Single Responsibility Principle (Responsabilidad Única)

> *"Una clase o módulo debe tener una sola razón para cambiar."*  
> — Robert C. Martin

Responsabilidad no significa «hacer una sola cosa», sino **responder ante un único actor, dominio o motivo de evolución**.

### Señales de Alarma (Code Smells)
- El nombre del archivo/clase contiene sufijos ambiguos como `Manager`, `Helper`, `Utils` o conjunciones como `And`.
- Métodos de la clase que no interactúan con los mismos campos o estado interno.
- Cambiar un formato de presentación (ej. JSON a CSV) obliga a tocar lógica de cálculo de negocio.
- Los `imports` mezclan capas: controladores HTTP + consultas SQL + reglas de dominio en el mismo archivo.

### Ejemplo de Refactorización

#### ❌ Antipatrón: Múltiples razones de cambio
```ts
// ❌ Tres razones de cambio en el mismo servicio:
// 1. Reglas de validación comercial.
// 2. Persistencia en base de datos.
// 3. Mecanismo de notificación por correo.
class OrderService {
  validate(order: Order): void {
    if (order.items.length === 0) throw new Error("Empty order");
  }

  async saveToDatabase(order: Order): Promise<void> {
    await db.query("INSERT INTO orders VALUES (...)");
  }

  async sendConfirmationEmail(order: Order): Promise<void> {
    await smtpClient.send({ to: order.customerEmail, subject: "Order Placed" });
  }
}
```

#### ✅ Solución: Colaboradores con responsabilidades delimitadas
```ts
// ✅ Cada componente cambia por su propio motivo y bajo su propia abstracción
export class OrderValidator {
  validate(order: Order): ValidationResult {
    if (order.items.length === 0) {
      return { isValid: false, reason: "ORDER_EMPTY" };
    }
    return { isValid: true };
  }
}

export interface OrderRepository {
  save(order: Order): Promise<void>;
}

export interface OrderNotifier {
  notifyConfirmed(order: Order): Promise<void>;
}

// Orquestador de caso de uso: solo coordina, no implementa I/O directo
export class PlaceOrderUseCase {
  constructor(
    private readonly validator: OrderValidator,
    private readonly repository: OrderRepository,
    private readonly notifier: OrderNotifier,
  ) {}

  async execute(order: Order): Promise<void> {
    const validation = this.validator.validate(order);
    if (!validation.isValid) {
      throw new InvalidOrderError(validation.reason);
    }

    await this.repository.save(order);
    await this.notifier.notifyConfirmed(order);
  }
}
```

---

## 3. OCP — Open/Closed Principle (Abierto / Cerrado)

> *"Las entidades de software deben estar abiertas a la extensión, pero cerradas a la modificación."*

Añadir una nueva variante o caso de uso no debe obligar a editar código existente que ya está verificado y en producción.

### Señales de Alarma (Code Smells)
- Presencia de sentencias `switch` o cadenas de `if/else` sobre propiedades de discriminación de tipo que crecen continuamente.
- Cada nuevo requerimiento comercial exige editar archivos fuente centrales en lugar de crear nuevos módulos.

### Ejemplo de Refactorización

#### ❌ Antipatrón: Switch creciente
```ts
// ❌ Cada nuevo método de pago exige editar la función calculateFee
function calculateFee(payment: Payment): number {
  switch (payment.type) {
    case "card":
      return payment.amount * 0.03;
    case "paypal":
      return payment.amount * 0.035;
    case "crypto":
      return payment.amount * 0.01;
    default:
      throw new Error(`Unsupported payment type: ${(payment as Payment).type}`);
  }
}
```

#### ✅ Solución: Estrategias declarativas (Polimorfismo o Mapas de Estrategia)
```ts
export interface FeePolicy {
  calculate(amount: number): number;
}

export const feePolicies: Record<PaymentType, FeePolicy> = {
  card: { calculate: (amount) => amount * 0.03 },
  paypal: { calculate: (amount) => amount * 0.035 },
  crypto: { calculate: (amount) => amount * 0.01 },
};

export const calculateFee = (payment: Payment): number => {
  const policy = feePolicies[payment.type];
  if (!policy) throw new UnsupportedPaymentTypeError(payment.type);
  return policy.calculate(payment.amount);
};
```

> [!TIP]
> **Enfoque TypeScript Idiomático:** En TypeScript moderno, una **unión discriminada** con comprobación de exhaustividad mediante `never` es a menudo preferible a jerarquías de clases pesadas. Ofrece seguridad de compilación completa sin sobrecarga de indirección.

---

## 4. LSP — Liskov Substitution Principle (Sustitución de Liskov)

> *"Si $S$ es un subtipo de $T$, los objetos de tipo $T$ deben poder ser reemplazados por objetos de tipo $S$ sin alterar las propiedades deseables del programa."*

Un subtipo debe honrar los contratos explícitos e implícitos de su tipo base sin sorprender al consumidor.

### Señales de Alarma (Code Smells)
- Métodos sobrescritos que lanzan `NotImplementedError` o `UnsupportedOperationException`.
- El código consumidor utiliza comprobaciones `instanceof` para alterar su comportamiento según el subtipo.
- La subclase endurece las precondiciones (ej. exige parámetros más restrictivos) o debilita las postcondiciones (retorna valores inválidos o nulos inesperados).

### Ejemplo de Refactorización

#### ❌ Antipatrón: La falsa herencia (Cuadrado hereda de Rectángulo)
```ts
// ❌ Cambiar el ancho de un cuadrado altera forzosamente el alto, violando el contrato de Rectangle
class Rectangle {
  constructor(protected width: number, protected height: number) {}

  setWidth(w: number) { this.width = w; }
  setHeight(h: number) { this.height = h; }
  getArea(): number { return this.width * this.height; }
}

class Square extends Rectangle {
  override setWidth(w: number) {
    this.width = w;
    this.height = w; // Comportamiento colateral inesperado para quien esperaba un Rectangle
  }
  override setHeight(h: number) {
    this.width = h;
    this.height = h;
  }
}
```

#### ✅ Solución: Modelar contratos precisos y favorecer composición
```ts
export interface Shape {
  getArea(): number;
}

export class Rectangle implements Shape {
  constructor(
    private readonly width: number,
    private readonly height: number,
  ) {}

  getArea(): number {
    return this.width * this.height;
  }
}

export class Square implements Shape {
  constructor(private readonly side: number) {}

  getArea(): number {
    return this.side ** 2;
  }
}
```

> [!WARNING]
> En JavaScript y TypeScript, evita extender clases nativas de la plataforma (como `Array`, `Map` o `Error`) mediante herencia profunda. Utiliza **composición** con tipos wrapper o funciones utilitarias para evitar discrepancias de prototipos en runtime.

---

## 5. ISP — Interface Segregation Principle (Segregación de Interfaces)

> *"Ningún cliente debe verse obligado a depender de métodos o propiedades que no utiliza."*

Diseña interfaces granulares, acotadas y orientadas al rol específico del consumidor.

### Ejemplo de Refactorización

#### ❌ Antipatrón: Interfaz inflada
```ts
// ❌ Un componente que solo lee datos se ve acoplado a mutaciones y eliminaciones
interface UserStore {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
  delete(id: string): Promise<void>;
  generateReport(): Promise<Buffer>;
}
```

#### ✅ Solución: Interfaces segregadas por rol
```ts
// ✅ Definición granular orientada al cliente
export interface UserReader {
  findById(id: string): Promise<User | null>;
}

export interface UserWriter {
  save(user: User): Promise<void>;
  delete(id: string): Promise<void>;
}

// Composición limpia para quienes realmente necesiten el conjunto completo
export type FullUserStore = UserReader & UserWriter;
```

> [!TIP]
> **Tipado Estructural de TypeScript:** TypeScript evalúa la compatibilidad de tipos por su forma (**duck typing estructural**), no por declaración nominal. No requieres sentencias `implements` explícitas para satisfacer una interfaz; define contratos mínimos en el punto de consumo.

---

## 6. DIP — Dependency Inversion Principle (Inversión de Dependencias)

> *"1. Los módulos de alto nivel no deben depender de los módulos de bajo nivel. Ambos deben depender de abstracciones.*  
> *2. Las abstracciones no deben depender de los detalles. Los detalles deben depender de las abstracciones."*

El núcleo de negocio define los contratos (puertos) que requiere; los adaptadores técnicos (infraestructura) los implementan.

### Ejemplo de Refactorización

#### ❌ Antipatrón: Módulo de negocio acoplado a infraestructura
```ts
// ❌ La lógica de negocio depende directamente de un cliente HTTP específico (axios)
import axios from "axios";

export class PriceService {
  async getPrice(sku: string): Promise<number> {
    const response = await axios.get(`https://api.external.com/prices/${sku}`);
    return response.data.amount;
  }
}
```

#### ✅ Solución: Inversión de control mediante interfaces
```ts
// Contrato de dominio (puerto de salida)
export interface PriceProvider {
  getPrice(sku: string): Promise<Money>;
}

// Servicio de dominio (alto nivel): desacoplado de la red
export class PriceService {
  constructor(private readonly provider: PriceProvider) {}

  async getPrice(sku: string): Promise<Money> {
    return this.provider.getPrice(sku);
  }
}

// Adaptador de infraestructura (bajo nivel): implementa el puerto
export class HttpPriceProvider implements PriceProvider {
  constructor(private readonly httpClient: HttpClient) {}

  async getPrice(sku: string): Promise<Money> {
    const data = await this.httpClient.get<{ amount: number; currency: string }>(
      `/prices/${sku}`,
    );
    return new Money(data.amount, data.currency);
  }
}
```

> [!NOTE]
> **Beneficio de Testeabilidad:** Al desacoplar la infraestructura mediante DIP, el servicio de negocio puede probarse de forma unitaria en milisegundos mediante stubs o fakes en memoria, sin levantar mocks de módulos externos ni recurrir a I/O real.

---

## 7. Matriz de Diagnóstico Rápido

Utiliza esta tabla para diagnosticar la violación de diseño y seleccionar el principio adecuado:

| Principio | Síntoma Principal | Riesgo de Ignorarlo | Solución Técnica |
| :--- | :--- | :--- | :--- |
| **SRP** | Archivo extenso, múltiples imports de capas distintas. | Cambios en una regla rompen flujos no relacionados. | Separar en clases/funciones con un solo actor de negocio. |
| **OCP** | Sentencias `switch/case` o `if/else` crecientes. | Regresión en casos probados al introducir variantes. | Patrón Strategy, mapas de funciones o uniones discriminadas. |
| **LSP** | Excepciones no implementadas o `instanceof` dispersos. | Clientes rotos en tiempo de ejecución por subtipos anómalos. | Composición sobre herencia y contratos uniformes. |
| **ISP** | Métodos vacíos o parámetros no requeridos por el cliente. | Acoplamiento a cambios irrelevantes para el consumidor. | Interfaces pequeñas segregadas por rol funcional. |
| **DIP** | `import` directo de librerías externas o DB en capas centrales. | Imposibilidad de testear sin I/O; rigidez ante cambios de vendor. | Inyección de dependencias mediante interfaces/puertos. |

---

## 8. Cuándo NO Aplicar SOLID (Trade-offs y Pragmatismo)

SOLID es un conjunto de heurísticas orientadas a mitigar el coste del cambio, **no un dogma arquitectónico**.

> [!CAUTION]
> **Peligro de Sobreingeniería (Overengineering):**
> 1. **Prototipos desechables o scripts aislados:** No agregues abstracciones a código que solo se ejecutará una vez.
> 2. **Abstracciones especulativas:** No crees interfaces con una única implementación si no existe una necesidad concreta o requerimiento previsible de variabilidad.
> 3. **Indirección excesiva:** Si una función clara de 15 líneas se convierte en 6 archivos y 3 interfaces sin ganancia tangible, la arquitectura está perjudicando la legibilidad.
> 4. **Falta de comprensión compartida:** Una solución compleja que el equipo no puede mantener ni depurar introduce más deuda técnica que la que intenta resolver.

---

## 9. Checklist de Verificación para Code Review

Antes de aprobar un cambio o refactorización, comprueba:

- [ ] ¿Cada módulo o clase tiene un único motivo de cambio justificado?
- [ ] ¿Las nuevas funcionalidades se incorporan extendiendo contratos en vez de modificar lógica preexistente probada?
- [ ] ¿Se prefiere la composición sobre jerarquías complejas de herencia?
- [ ] ¿Las interfaces están definidas en función de las necesidades del consumidor y no de la implementación?
- [ ] ¿Las capas de dominio están libres de dependencias directas de frameworks, librerías de UI o clientes de infraestructura?
- [ ] ¿El diseño simplifica la creación de pruebas unitarias sin mocks excesivos?

