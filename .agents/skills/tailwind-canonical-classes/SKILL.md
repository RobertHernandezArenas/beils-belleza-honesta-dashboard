---
name: tailwind-canonical-classes
description: "Trigger: tailwind, tailwindcss, suggestCanonicalClasses, size-*, clases canonicas tailwind, refactor tailwind, shorthand tailwind. Directrices y reemplazos de clases canónicas de Tailwind CSS (v3.4+ / v4) para prevenir warnings de IntelliSense y código redundante."
version: 1.0.0
license: MIT
metadata:
  author: RobertHernandezArenas
  category: styling
  tags:
    - tailwind
    - css
    - canonical-classes
    - styling-standards
    - nuxt4
---

# 🎨 Clases Canónicas en Tailwind CSS (v3.4+ / v4)

> **Estándar de Estilizado y Calidad de UI**  
> **Autor:** RobertHernandezArenas  
> Directrices obligatorias para evitar el warning recurrente `suggestCanonicalClasses` emitido por el Language Server de Tailwind CSS y mantener un código limpio, conciso y consistente.

---

## 📑 1. El Diagnóstico `suggestCanonicalClasses`
El Tailwind CSS Language Server (IntelliSense en IDEs y herramientas de análisis estático) analiza el árbol de clases de cada componente e identifica patrones donde dos o más utilidades pueden reemplazarse por una utilidad canónica única más concisa.

Escribir clases no canónicas añade deuda técnica, ensucia el markup de los componentes Vue y genera advertencias recurrentes en cada iteración.

---

## 📏 2. Tabla Maestra de Reemplazos Canónicos

### 2.1. Dimensiones Cuadradas / Simétricas (`size-*`)
En Tailwind CSS v3.4 y v4, la utilidad `size-{n}` reemplaza la combinación simultánea de ancho y alto iguales:

| ❌ NO Canónico | ✅ Canónico | Uso Típico |
| :--- | :--- | :--- |
| `w-3 h-3` / `h-3 w-3` | `size-3` | Badges, indicadores de estado |
| `w-3.5 h-3.5` / `h-3.5 w-3.5` | `size-3.5` | Iconos compactos |
| `w-4 h-4` / `h-4 w-4` | `size-4` | Iconos de botones estándar y tablas |
| `w-5 h-5` / `h-5 w-5` | `size-5` | Iconos medianos y checkboxes |
| `w-6 h-6` / `h-6 w-6` | `size-6` | Iconos grandes, avatares de fila |
| `w-8 h-8` / `h-8 w-8` | `size-8` | Contenedores de iconos de cabecera |
| `w-10 h-10` / `h-10 w-10` | `size-10` | Avatares de usuario en tarjetas |
| `w-12 h-12` / `h-12 w-12` | `size-12` | Avatares principales, stat boxes |
| `w-14 h-14` / `h-14 w-14` | `size-14` | Miniaturas de producto en catálogo |
| `w-16 h-16` / `h-16 w-16` | `size-16` | Modales y previews de imagen |
| `w-24 h-24` / `h-24 w-24` | `size-24` | Avatar de perfil de cliente |
| `w-32 h-32` / `h-32 w-32` | `size-32` | Avatar expandido o héroe |
| `w-full h-full` / `h-full w-full` | `size-full` | SVG gráficos, imágenes de fondo, canvas |

---

### 2.2. Posicionamiento Absoluto (`inset-*`)

| ❌ NO Canónico | ✅ Canónico | Razón |
| :--- | :--- | :--- |
| `top-0 right-0 bottom-0 left-0` | `inset-0` | Shorthand de 4 ejes |
| `inset-x-0 inset-y-0` | `inset-0` | Shorthand bidimensional |
| `top-0 bottom-0` | `inset-y-0` | Shorthand vertical |
| `left-0 right-0` | `inset-x-0` | Shorthand horizontal |

---

### 2.3. Desbordamiento (`overflow-*`)

| ❌ NO Canónico | ✅ Canónico | Razón |
| :--- | :--- | :--- |
| `overflow-x-hidden overflow-y-hidden` | `overflow-hidden` | Ambas direcciones unificadas |
| `overflow-x-auto overflow-y-auto` | `overflow-auto` | Ambas direcciones unificadas |
| `overflow-hidden overflow-x-auto` | `overflow-x-auto` | `overflow-hidden` es redundante / entra en conflicto con `overflow-x-auto` |

---

### 2.4. Flexbox Shorthands

| ❌ NO Canónico | ✅ Canónico |
| :--- | :--- |
| `flex-grow` | `grow` |
| `flex-grow-0` | `grow-0` |
| `flex-shrink` | `shrink` |
| `flex-shrink-0` | `shrink-0` |

---

### 2.5. Márgenes y Padding Bidireccionales

| ❌ NO Canónico | ✅ Canónico | Condición |
| :--- | :--- | :--- |
| `px-4 py-4` | `p-4` | Cuando el espaciado X e Y es el mismo |
| `mx-auto my-auto` | `m-auto` | Cuando el centrado automático es en ambos ejes |
| `border-t border-b border-l border-r` | `border` | Cuando todos los bordes comparten grosor |

---

### 2.6. Opacidad de Color (Sintaxis Slash)
Tailwind CSS moderno desaconseja utilidades dedicadas de opacidad en favor del modificador slash:

| ❌ Obsoleto | ✅ Canónico |
| :--- | :--- |
| `bg-primary bg-opacity-50` | `bg-primary/50` |
| `text-text-muted text-opacity-80` | `text-text-muted/80` |
| `border-border-default border-opacity-70` | `border-border-default/70` |
| `ring-primary ring-opacity-20` | `ring-primary/20` |

---

## 🛡️ 3. Regla para Nuevas Iteraciones del Agente Maker
Cada vez que el agente `Maker` cree o edite un componente Vue:
1. **Iconos Lucide:** NUNCA escribas `<Icon class="w-4 h-4" />`. Escribe SIEMPRE `<Icon class="size-4" />`.
2. **Imágenes / SVGs de contenedor completo:** Escribe SIEMPRE `<img class="size-full object-cover" />`.
3. **Tablas con scroll horizontal:** Usa `<div class="overflow-x-auto">`, nunca `<div class="overflow-hidden overflow-x-auto">`.
4. **Contenedores de avatar:** `<div class="size-10 rounded-full ...">`.
