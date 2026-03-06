# Catálogo (Inventario y Productos)

El módulo de Catálogo de Beils Dashboard está diseñado para gestionar el inventario de recursos físicos
vendibles o consumibles: los Productos.

## Estructura Jerárquica

Para facilitar la navegación tanto para el personal como para reportes estadísticos, el inventario se organiza
en una taxonomía de 3 a 4 niveles:

### 1. Marca (`Brand`)

El fabricante del producto. Útil para filtrar y aplicar promociones en bloque.

- _Ejemplo: L'Oréal, Kerastase, OPI._

### 2. Categoría (`Category`) y Subcategoría (`Subcategory`)

Clasificación temática del producto. La Subcategoría impone una relación estricta en base de datos
(`subcategory.category_id` debe coincidir con `category.category_id`).

- _Ejemplo Categoría: Capilar, Facial, Uñas._
- _Ejemplo Subcategoría: Champús (dentro de Capilar), Esmaltes (dentro de Uñas)._

### 3. Etiquetas (`Tag`)

A diferencia de las categorías (donde un producto solo puede pertenecer a una), las etiquetas ofrecen
categorización transversal M:N (muchos a muchos).

- _Ejemplo: "Vegano", "Sin Sulfatos", "Novedad", "Oferta Verano"._
- Se gestionan a través de la tabla intermedia `ProductTag`.

## El Producto (`Product`)

El modelo `Product` es el eje central del catálogo. Contiene todos los datos físicos y transaccionales
básicos:

- **Identificación Comercial:** Nombre, Descripción, Imagen (`image_url`).
- **Identificación Técnica:** `sku` (Stock Keeping Unit, código interno único) y `barcode` (para lectura por
  escáner láser TPV).
- **Precios e Impuestos:**
   - `price`: Precio base de venta al público (PVP sin impuestos, o con impuestos según configuración).
   - `tax_rate`: El porcentaje de IVA aplicable (Ej: 21.0). Fundamental para el desglose contable de
     Veri\*Factu.
- **Control de Inventario:**
   - `stock`: Nivel de unidades actual disponible.
   - `min_stock`: Umbral que dispara alertas en el Dashboard cuando el stock cae por debajo de este número,
     indicando necesidad de reabastecimiento.
- **Estado:** `status` (`activo`, `inactivo`). Permite descatalogar productos temporal o permanentemente sin
  romper historiales de facturas previas.

## Integraciones y Restricciones

- **Packs:** Un producto físico puede formar parte de un "Pack" más grande (Ej. Cesta de Navidad) definido en
  el módulo de Servicios. Esta relación se establece mediante la tabla pivote `PackItemProduct` indicando la
  cantidad (ej. 2 champús dentro del pack).
- **Ventas (Snapshot):** Cuando un producto se vende, no se vincula eternamente al carrito como una foreign
  key que pueda romperse si el producto se borra. En su lugar, el sistema TPV toma una "foto" (Snapshot)
  creando un `CartItem` que copia el nombre y precio del producto _en el momento exacto de la venta_,
  asegurando inmutabilidad contable (ver [TPV / Ventas](./pos_verifactu.md)).
