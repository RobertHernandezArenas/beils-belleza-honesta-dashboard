# Servicios y Packs

Este módulo define el "Saber Hacer" del salón: el tiempo de los empleados y combinaciones comerciales de
servicios y productos, estableciendo los cimientos para el módulo de Agenda y de Ventas TPV.

---

## 1. Servicios (`Service`)

Representa la prestación principal por la cual un cliente reserva cita y paga. Son intangibles atados al
tiempo y al esfuerzo del personal (Ej: "Corte de señora", "Láser media pierna", "Masaje linfático").

### Características Principales

- **Definición Técnica:** Nombre descriptivo, Descripción y `code` interno (opcional) para agilizar búsquedas.
- **Estructura Financiera:** `price` (precio de venta) y `tax_rate` (IVA). Normalmente servicios llevan el
  21%, pero da flexibilidad para cambios normativos.
- **Dimensión Temporal:** El campo crítico `duration` (en minutos).
   - Este campo es el motor del módulo **Agenda**. Cuando un cliente reserva un "Corte" que dura 45 minutos,
     el sistema sabe automáticamente que debe bloquear un slot de 45 minutos en el calendario del empleado
     asignado.
- **Estado:** `status` (activo / inactivo). Para ocultar servicios antiguos sin borrar la tabla y corromper
  referencias.

---

## 2. Packs (`Pack`)

Los packs permiten realizar marketing compositivo (Cross-Selling), ofertando un conjunto de Servicios y
Productos físicos por un precio frecuentemente inferior al de sus partes (o simplemente empaquetado por
comodidad ritual).

### ¿Cómo se construye un Pack?

A diferencia de un Servicio o un Producto que son entidades estáticas, un Pack (modelo `Pack`) es como una
cesta predefinida:

1. **Datos Básicos:** Tiene nombre propio, un `code`, quizás una imagen especial y, lo más importante, su
   propio **precio final cerrado** (`price`).

2. **Relación con Productos (`PackItemProduct`):**
   - Tabla intermedia que indica qué productos físicos se entregan en el pack y en qué cantidad (`quantity`).
   - _Ejemplo: Pack Novia incluye 2 Mascarillas Capilares._ Cuando se venda el pack, el TPV deberá descontar 2
     unidades del modelo `Product` de inventario.

3. **Relación con Servicios (`PackItemService`):**
   - Tabla intermedia que indica qué servicios se van a realizar y en qué cantidad.
   - _Ejemplo: Pack Corporal Intensivo incluye 3 Masajes Drenantes y 1 Sesión de Láser (total 4 servicios)._

### Implicaciones del Pack en Ventas y Agenda

La existencia de Packs añade complejidad planificada al sistema:

- **Al Vender (TPV):** Si el cajero escoge el "Pack Corporal", el sistema cobra el precio fijado _en el Pack_.
  Opcionalmente, la lógica puede repartir prorrateos impositivos si los items combinados tienen distinto IVA
  (complejo).
- **Al Reservar (Agenda):** Si un cliente reserva un "Pack", el sistema debe descomponer el pack e identificar
  cuáles de sus items son "Servicios", sumando la duración agregada de los mismos para reservar el hueco
  apropiado en el calendario. (Ej: Masaje de 30min + Tratamiento Facial 60min = Bloqueo de 90minutos en
  agenda).
