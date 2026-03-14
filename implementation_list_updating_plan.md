# Implementation Plan - Fixing Query Invalidation

This plan addresses the issue where data consistency is not maintained across the application because TanStack Query mutations do not invalidate all relevant query keys.

## Proposed Changes

### TPV & Sales
#### [MODIFY] [index.vue](file:///c:/Users/VENOM/Repositorio/beils-belleza-honesta-dashboard/app/pages/tpv/index.vue)
- Update `processSale` mutation to invalidate `['sales', 'completed']` and `['debts']` on success.
- Ensure that processing a sale refreshes the sales list immediately.

### Catalog Modules
#### [MODIFY] [CategoryModal.vue](file:///c:/Users/VENOM/Repositorio/beils-belleza-honesta-dashboard/app/components/catalog/categories/CategoryModal.vue)
- Add invalidation for `['categories']` (used by Product mutation dropdowns).

#### [MODIFY] [SubcategoryModal.vue](file:///c:/Users/VENOM/Repositorio/beils-belleza-honesta-dashboard/app/components/catalog/subcategories/SubcategoryModal.vue)
- Add invalidation for `['subcategories']` (used by Product mutation dropdowns).

#### [MODIFY] [ProductFormModal.vue](file:///c:/Users/VENOM/Repositorio/beils-belleza-honesta-dashboard/app/components/catalog/products/ProductFormModal.vue)
- Refactor to use `useMutation` for product saving (currently manual `$fetch`).
- Add invalidation for `['products-tpv']`.

#### [MODIFY] [TagModal.vue](file:///c:/Users/VENOM/Repositorio/beils-belleza-honesta-dashboard/app/components/catalog/tags/TagModal.vue) (and tags in Product modal)
- Ensure all tag creations invalidate `['tags']`.

### Services & Marketing
#### [MODIFY] [ServiceFormModal.vue](file:///c:/Users/VENOM/Repositorio/beils-belleza-honesta-dashboard/app/components/services/ServiceFormModal.vue)
- Refactor to use `useMutation`.
- Add invalidation for `['services-tpv']`.

#### [MODIFY] [PackFormModal.vue](file:///c:/Users/VENOM/Repositorio/beils-belleza-honesta-dashboard/app/components/packs/PackFormModal.vue)
- Refactor to use `useMutation`.
- Add invalidation for `['packs-tpv']`.

#### [MODIFY] [BonusFormModal.vue](file:///c:/Users/VENOM/Repositorio/beils-belleza-honesta-dashboard/app/components/marketing/BonusFormModal.vue)
- Refactor to use `useMutation`.
- Add invalidation for `['bonuses-tpv']`.

### Clients
#### [MODIFY] [ClientFormModal.vue](file:///c:/Users/VENOM/Repositorio/beils-belleza-honesta-dashboard/app/components/clients/ClientFormModal.vue)
- Add invalidation for `['clients-tpv']`.

## Verification Plan

### Automated Tests
- Perform a sale in TPV and verify the Sales list updates automatically.
- Add a new product in the Product list and verify it appears in the TPV catalog without reload.
- Edit a client in the CRM and verify changes are reflected in the TPV client search.

### Manual Verification
- Navigate between TPV and other modules to ensure state consistency.
