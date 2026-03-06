# CRM (Customer Relationship Management)

El módulo CRM de Beils Dashboard centraliza toda la información relacionada con las personas que interactúan
con el sistema: Clientes, Empleados (Staff) y Administradores.

## Modelo Principal: `User`

En lugar de tener tablas separadas para `Client` y `Staff`, el sistema utiliza un modelo unificado `User` en
la base de datos (Prisma). El campo `role` (`ADMIN`, `USER`) determina los permisos y capacidades de la
persona dentro del sistema. Los clientes siempre tienen el rol `USER`.

### Datos de Usuario

Un perfil de usuario (`User`) contiene:

- **Información Personal:** Nombre, Apellidos, Fecha de nacimiento, Género.
- **Contacto:** Email, Teléfono, Dirección completa (Ciudad, País, Código Postal).
- **Identificación Legal:** `document_type` (DNI, PASSPORT, NIE) y `document_number`. Esta información es
  crucial para la posterior emisión de facturas legales a través de Veri\*Factu.
- **Estado:** `status` (`ON`, `OFF`) permite desactivar usuarios sin borrar su historial (Soft delete logico).

## Componentes del Perfil de Cliente

Cuando se accede a la ficha detallada de un cliente, la interfaz carga información adicional estructurada en
los siguientes submódulos:

### 1. Consentimientos Legales (`Consent`)

- **Propósito:** Registrar que el cliente ha firmado y aceptado los términos legales (ej. RGPD, LOPD,
  grabaciones de imagen) o riesgos médicos antes de un tratamiento.
- **Estructura:** Almacena la URL del documento firmado (`document_url`), la fecha de firma y su estado
  (`active`, `revoked`).

### 2. Cuestionarios Médicos/Estéticos (`Questionnaire`)

- **Propósito:** Historial clínico. Permite a los especialistas rellenar o adjuntar respuestas del cliente
  sobre alergias, tipo de piel, historial médico, etc.
- **Estructura:** Utiliza un campo de tipo `Json` en la base de datos, lo que le da máxima flexibilidad para
  almacenar cualquier estructura de formulario dinámico sin necesidad de crear cientos de columnas en la
  tabla.

### 3. Revocaciones (`Revoke`)

- **Propósito:** Trazabilidad legal en caso de que un cliente decida revocar un consentimiento previamente
  firmado.

### 4. Historial Relacional

La vista del cliente (App) también debe consultar y mostrar de forma resumida, interactuando con otros
módulos:

- Historial de **Citas** (`Booking`).
- Historial de **Compras / Facturas** (`Cart`).
- Historial de **Bonos Adquiridos** (`ClientBonus`) para ver cuántas sesiones le quedan.
- **Deudas pendientes** (`Debt`).

## Backend de Gestión (API)

El CRUD de usuarios se gestiona habitualmente en `server/api/users/...`.

- Para listar los clientes en la tabla principal (`pages/clients/index.vue`), el frontend llama a
  `GET /api/users?role=USER`.
- La creación de un nuevo cliente (`POST /api/users`) valida estrictamente mediante Zod que el formato del
  correo y el teléfono sean correctos, y que la fecha de nacimiento no sea futura.
