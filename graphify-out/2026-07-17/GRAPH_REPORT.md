# Graph Report - .  (2026-07-17)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1310 nodes · 1351 edges · 189 communities (132 shown, 57 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.59)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f6d60afd`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- BookingDrawer.vue
- PurchaseDetailsModal.vue
- prisma.ts
- ClientFormModal.vue
- [id].vue
- PackFormModal.vue
- index.vue
- index.vue
- ProfileHeader.vue
- index.vue
- index.vue
- design_system.py
- DesignSystemGenerator
- ProfileOverview.vue
- design_system.py
- DesignSystemGenerator
- ConsentFormModal.vue
- QuestionnaireFormModal.vue
- RevokeFormModal.vue
- scripts
- default.vue
- index.vue
- DebtDetailsModal.vue
- BonusFormModal.vue
- MediaLibrary.vue
- EditableField.vue
- index.vue
- index.vue
- index.vue
- index.vue
- index.vue
- devDependencies
- _sync_all.py
- AgendaDayView.vue
- ProductFormModal.vue
- Login.vue
- UserFormModal.vue
- index.vue
- index.vue
- index.vue
- _sync_all.py
- auth.ts
- AgendaGridView.vue
- GiftcardFormModal.vue
- AgendaSidebar.vue
- CouponFormModal.vue
- ServiceFormModal.vue
- _search_csv
- dependencies
- AgendaYearView.vue
- TpvCart.vue
- AppPagination.vue
- _search_csv
- seed-db.ts
- jwt.ts
- AgendaMonthView.vue
- LanguageSelector.vue
- seed-db.ts
- verifactu.ts
- compilerOptions
- BM25
- ClientAutocomplete.vue
- TpvCatalog.vue
- BM25
- DaySummaryModal.vue
- UserDeleteModal.vue
- SalesFilters.vue
- index.vue
- index.vue
- GenericDeleteModal.vue
- ProfileInfoSidebar.vue
- ImageCropperModal.vue
- useOfflineSync.ts
- index.vue
- AgendaListView.vue
- ProfileBilling.vue
- ProfileTabs.vue
- AppBreadcrumbs.vue
- jspdf
- _generate_intelligent_overrides
- error.vue
- format_ascii_box
- package.json
- catalog.ts
- invoice.ts
- marketing.ts
- format_output
- ClientChart.client.vue
- SalesPagination.vue
- SalesTable.vue
- useSync.ts
- format_output
- index.ts
- UserFilterPanel.vue
- UserHeader.vue
- SalesMetrics.vue
- index.vue
- index.vue
- auth.ts
- useAgendaStore.ts
- useUsersFilterStore.ts
- dexie
- bcryptjs
- echarts
- gsap
- html2pdf.js
- jsonwebtoken
- lucide-vue-next
- mariadb
- nuxt
- @nuxt/eslint
- @nuxt/fonts
- @nuxt/image
- @nuxtjs/google-fonts
- @peculiar/webcrypto
- pinia
- @pinia/nuxt
- @prisma/client
- qrcode.vue
- soap
- @tailwindcss/vite
- @tanstack/vue-query
- @types/aos
- vue
- vue-advanced-cropper
- vue-echarts
- vue-i18n
- vue-router
- @vueuse/core
- workbox-window
- @xmldom/xmldom
- zod
- prettier
- tsx
- @types/jsonwebtoken
- vite
- @vite-pwa/nuxt
- prettier-plugin-tailwindcss
- [id].put.ts
- index.post.ts
- [id].put.ts

## God Nodes (most connected - your core abstractions)
1. `scripts` - 18 edges
2. `DesignSystemGenerator` - 11 edges
3. `DesignSystemGenerator` - 11 edges
4. `_search_csv()` - 8 edges
5. `_search_csv()` - 8 edges
6. `requireAdmin()` - 8 edges
7. `derive_row()` - 7 edges
8. `BM25` - 7 edges
9. `search()` - 7 edges
10. `generate_design_system()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `_generate_intelligent_overrides()` --calls--> `search()`  [INFERRED]
  .agents/skills/ui-ux-pro-max/scripts/design_system.py → .agents/skills/ui-ux-pro-max/scripts/core.py
- `_generate_intelligent_overrides()` --calls--> `search()`  [INFERRED]
  .claude/skills/ui-ux-pro-max/scripts/design_system.py → .claude/skills/ui-ux-pro-max/scripts/core.py
- `useSales()` --references--> `jspdf`  [EXTRACTED]
  app/composables/useSales.ts → package.json
- `H3EventContext` --references--> `JwtPayload`  [EXTRACTED]
  server/types/auth.d.ts → server/utils/jwt.ts
- `processVerifactuInvoice()` --calls--> `submitToAeat()`  [EXTRACTED]
  server/utils/verifactu.ts → server/utils/aeatSoapClient.ts

## Import Cycles
- None detected.

## Communities (189 total, 57 thin omitted)

### Community 0 - "BookingDrawer.vue"
Cohesion: 0.06
Nodes (32): activeTab, addGroupItem(), addItem(), BookingItemData, ClientItem, clientSearch, clientWallet, { data: bonuses } (+24 more)

### Community 1 - "PurchaseDetailsModal.vue"
Cohesion: 0.06
Nodes (21): cart, catalogItems, clients, close(), { data: catalogResults, isPending: isSearchingItems }, { data: clientSearchResults, isPending: isSearchingClients }, emit, isEditingItems (+13 more)

### Community 2 - "prisma.ts"
Cohesion: 0.06
Nodes (7): questionnaireSchema, revokeUpdateSchema, revokeSchema, userSchema, adapter, localGlobal, poolConfig

### Community 3 - "ClientFormModal.vue"
Cohesion: 0.07
Nodes (18): { animateOpen, animateClose }, apiError, avatarError, avatarFile, avatarPreview, clientDialog, clientSchema, emit (+10 more)

### Community 4 - "[id].vue"
Cohesion: 0.08
Nodes (17): agendaStore, clientId, {
  data: client,
  isPending,
  error,
  isFetching,
}, debtDetailsModalRef, isConsentModalOpen, isQuestionnaireModalOpen, isRevokeModalOpen, { locale, t } (+9 more)

### Community 5 - "PackFormModal.vue"
Cohesion: 0.09
Nodes (16): { animateOpen, animateClose }, calculatedBasePrice, { data: availableProducts }, { data: availableServices }, editingPack, emit, filteredProducts, filteredServices (+8 more)

### Community 6 - "index.vue"
Cohesion: 0.09
Nodes (18): authStore, avatarErrors, { data: bookings, isPending: loadingBookings }, { data: carts, isPending: loadingCarts }, { data: clients, isPending: loadingClients }, { data: debts, isPending: loadingDebts }, { data: products, isPending: loadingProducts }, dateOptions (+10 more)

### Community 7 - "index.vue"
Cohesion: 0.09
Nodes (19): currentPage, {
		data: usersData,
		refetch: refresh,
		isPending: pending,
	}, filteredUsers, filtersStore, handleToast(), itemsPerPage, { mutate: deleteUser, isPending: isDeletingUser }, { mutate: updateStatus } (+11 more)

### Community 8 - "ProfileHeader.vue"
Cohesion: 0.10
Nodes (15): avatarError, avatarTimestamp, currentFileMeta, displayAvatar, emit, fileInput, isUploadingAvatar, localAvatarPreview (+7 more)

### Community 9 - "index.vue"
Cohesion: 0.10
Nodes (14): avatarErrors, clients, {
		data: clientsResponse,
		isPending,
		error,
	}, limit, { mutate: deleteClient, isPending: deleting }, page, pagination, queryClient (+6 more)

### Community 10 - "index.vue"
Cohesion: 0.11
Nodes (17): { data: debts, isPending }, displayToast(), filteredDebts, filterStatus, { mutate: updateDebt }, paymentAmount, paymentMethod, paymentModalRef (+9 more)

### Community 11 - "design_system.py"
Cohesion: 0.15
Nodes (18): ansi_ljust(), format_ascii_box(), format_markdown(), format_master_md(), format_page_override_md(), generate_design_system(), hex_to_ansi(), persist_design_system() (+10 more)

### Community 12 - "DesignSystemGenerator"
Cohesion: 0.14
Nodes (11): DesignSystemGenerator, Find matching reasoning rule for a category., Apply reasoning rules to search results., Select best matching result based on priority keywords., Extract results list from search result dict., Generate complete design system recommendation.          variance/motion/densi, Bucket a 1-10 dial value into its tier config. Returns None if value is None., Generates design system recommendations from aggregated searches. (+3 more)

### Community 13 - "ProfileOverview.vue"
Cohesion: 0.12
Nodes (18): emit, formatDate(), gdprStatus, getConsentStatus(), isSavingNotes, kpis, lastVisitDays, { locale, t } (+10 more)

### Community 14 - "design_system.py"
Cohesion: 0.19
Nodes (14): _detect_page_type(), format_markdown(), format_master_md(), format_page_override_md(), generate_design_system(), _generate_intelligent_overrides(), persist_design_system(), Format a page-specific override file with intelligent AI-generated content. (+6 more)

### Community 15 - "DesignSystemGenerator"
Cohesion: 0.14
Nodes (11): DesignSystemGenerator, Find matching reasoning rule for a category., Apply reasoning rules to search results., Select best matching result based on priority keywords., Extract results list from search result dict., Generate complete design system recommendation.          variance/motion/densi, Bucket a 1-10 dial value into its tier config. Returns None if value is None., Generates design system recommendations from aggregated searches. (+3 more)

### Community 16 - "ConsentFormModal.vue"
Cohesion: 0.11
Nodes (14): { animateOpen, animateClose }, apiError, consentDialog, consentSchema, emit, { emitSync }, errors, form (+6 more)

### Community 17 - "QuestionnaireFormModal.vue"
Cohesion: 0.11
Nodes (14): { animateOpen, animateClose }, apiError, emit, { emitSync }, errors, form, isEditing, localVisible (+6 more)

### Community 18 - "RevokeFormModal.vue"
Cohesion: 0.11
Nodes (14): { animateOpen, animateClose }, apiError, emit, { emitSync }, errors, form, isEditing, localVisible (+6 more)

### Community 19 - "scripts"
Cohesion: 0.11
Nodes (18): scripts, build, db:check, db:fix, db:push, db:reset-empty, dev, generate (+10 more)

### Community 20 - "default.vue"
Cohesion: 0.12
Nodes (12): activePill, authStore, currentActivePath, currentRouteTranslated, isDrawerOpen, localeCookie, navItems, navRefs (+4 more)

### Community 21 - "index.vue"
Cohesion: 0.12
Nodes (8): {
		data: consents,
		isPending,
		error,
	}, filteredConsents, { mutate: deleteItem, isPending: deleting }, queryClient, searchQuery, selectedItem, showDeleteModal, showFormModal

### Community 22 - "DebtDetailsModal.vue"
Cohesion: 0.17
Nodes (12): amountToPay, close(), debt, emit, getRemainingAfterPayment(), isProcessing, isValidPayment, { locale } (+4 more)

### Community 23 - "BonusFormModal.vue"
Cohesion: 0.13
Nodes (11): { animateOpen, animateClose }, { data: services }, editingBonus, emit, form, isSaving, modalRef, { mutate: performSave } (+3 more)

### Community 24 - "MediaLibrary.vue"
Cohesion: 0.16
Nodes (13): categories, fetchFiles(), files, handleFileUpload(), isLoading, isUploading, searchQuery, selectCategory() (+5 more)

### Community 25 - "EditableField.vue"
Cohesion: 0.19
Nodes (13): animateBackToText(), cancelEdit(), displayValue, editContainerRef, emit, handleBlur(), handleKeyDown(), inputRef (+5 more)

### Community 26 - "index.vue"
Cohesion: 0.13
Nodes (9): { data: products, isPending }, modalRef, { mutate: deleteProduct }, queryClient, queryParams, searchQuery, showToast, toastMessage (+1 more)

### Community 27 - "index.vue"
Cohesion: 0.13
Nodes (8): {
		data: questionnaires,
		isPending,
		error,
	}, filteredItems, { mutate: deleteItem, isPending: deleting }, queryClient, searchQuery, selectedItem, showDeleteModal, showFormModal

### Community 28 - "index.vue"
Cohesion: 0.13
Nodes (9): { data: coupons, isPending }, modalRef, { mutate: deleteCoupon }, queryClient, queryParams, searchQuery, showToast, toastMessage (+1 more)

### Community 29 - "index.vue"
Cohesion: 0.13
Nodes (9): { data: packs, isPending }, modalRef, { mutate: deletePack }, queryClient, queryParams, searchQuery, showToast, toastMessage (+1 more)

### Community 30 - "index.vue"
Cohesion: 0.13
Nodes (9): { data: services, isPending }, modalRef, { mutate: deleteService }, queryClient, queryParams, searchQuery, showToast, toastMessage (+1 more)

### Community 31 - "devDependencies"
Cohesion: 0.13
Nodes (15): daisyui, h3, devDependencies, daisyui, h3, sharp, tailwindcss, ts-node (+7 more)

### Community 32 - "_sync_all.py"
Cohesion: 0.29
Nodes (13): blend(), derive_row(), derive_ui_reasoning(), h2r(), is_dark(), lum(), on_color(), r2h() (+5 more)

### Community 33 - "AgendaDayView.vue"
Cohesion: 0.15
Nodes (7): currentTimePosition, emit, handleGridClick(), hours, processedBookings, props, store

### Community 34 - "ProductFormModal.vue"
Cohesion: 0.14
Nodes (9): { animateOpen, animateClose }, editingProduct, emit, form, isActionBarVisible, isSaving, modalRef, { mutate: performSave } (+1 more)

### Community 35 - "Login.vue"
Cohesion: 0.14
Nodes (9): authStore, errors, form, loginCard, loginSchema, { mutate, isPending, isError, error, reset }, router, showPassword (+1 more)

### Community 36 - "UserFormModal.vue"
Cohesion: 0.14
Nodes (9): { animateOpen, animateClose }, authStore, editingUser, emit, form, isAdmin, { mutate: performSave, isPending: isSaving }, queryClient (+1 more)

### Community 37 - "index.vue"
Cohesion: 0.14
Nodes (8): {
		data: revokes,
		isPending,
		error,
	}, filteredItems, { mutate: deleteItem, isPending: deleting }, queryClient, searchQuery, selectedItem, showDeleteModal, showFormModal

### Community 38 - "index.vue"
Cohesion: 0.14
Nodes (9): { data: bonuses, isPending }, modalRef, { mutate: deleteBonus }, queryClient, queryParams, searchQuery, showToast, toastMessage (+1 more)

### Community 39 - "index.vue"
Cohesion: 0.14
Nodes (9): { data: giftcards, isPending }, modalRef, { mutate: deleteGiftcard }, queryClient, queryParams, searchQuery, showToast, toastMessage (+1 more)

### Community 40 - "_sync_all.py"
Cohesion: 0.29
Nodes (13): blend(), derive_row(), derive_ui_reasoning(), h2r(), is_dark(), lum(), on_color(), r2h() (+5 more)

### Community 41 - "auth.ts"
Cohesion: 0.27
Nodes (5): clientSchema, clientSchema, paymentSchema, requireAdmin(), maskDocument()

### Community 42 - "AgendaGridView.vue"
Cohesion: 0.17
Nodes (6): daysToDisplay, emit, handleGridClick(), hours, processedDays, props

### Community 43 - "GiftcardFormModal.vue"
Cohesion: 0.17
Nodes (10): { animateOpen, animateClose }, editingCard, emit, form, generateCode(), isSaving, modalRef, { mutate: performSave } (+2 more)

### Community 44 - "AgendaSidebar.vue"
Cohesion: 0.20
Nodes (8): calendarDays, currentMonth, isSameDay(), isSelected(), isToday(), monthName, { selectedDate, searchQuery }, store

### Community 45 - "CouponFormModal.vue"
Cohesion: 0.17
Nodes (8): { animateOpen, animateClose }, editingCoupon, emit, form, isSaving, modalRef, { mutate: performSave }, queryClient

### Community 46 - "ServiceFormModal.vue"
Cohesion: 0.17
Nodes (8): { animateOpen, animateClose }, editingService, emit, form, isSaving, modalRef, { mutate: performSave }, queryClient

### Community 47 - "_search_csv"
Cohesion: 0.25
Nodes (10): detect_domain(), _load_csv(), Load CSV and return list of dicts, Core search function using BM25, Auto-detect the most relevant domain from query, Main search function with auto-domain detection, Search stack-specific guidelines, search() (+2 more)

### Community 48 - "dependencies"
Cohesion: 0.18
Nodes (11): aos, dotenv, dependencies, aos, dotenv, prisma, @prisma/adapter-mariadb, xadesjs (+3 more)

### Community 49 - "AgendaYearView.vue"
Cohesion: 0.18
Nodes (5): currentYear, emit, monthNames, months, props

### Community 50 - "TpvCart.vue"
Cohesion: 0.22
Nodes (10): clientSearch, confirmLastSession(), discountAmount, emit, handleAttemptCheckout(), isConfirmingLastSession, isPromoOpen, paymentMethod (+2 more)

### Community 51 - "AppPagination.vue"
Cohesion: 0.18
Nodes (7): currentPage, emit, endItem, pages, props, startItem, totalPages

### Community 52 - "_search_csv"
Cohesion: 0.25
Nodes (10): detect_domain(), _load_csv(), Load CSV and return list of dicts, Core search function using BM25, Auto-detect the most relevant domain from query, Main search function with auto-domain detection, Search stack-specific guidelines, search() (+2 more)

### Community 53 - "seed-db.ts"
Cohesion: 0.22
Nodes (10): cities, getRandomItem(), getRandomNumber(), namesFemale, namesMale, productBaseNames, seedDB(), serviceBaseNames (+2 more)

### Community 54 - "jwt.ts"
Cohesion: 0.25
Nodes (7): loginSchema, PUBLIC_ROUTES, h3, H3EventContext, JwtPayload, signToken(), verifyToken()

### Community 55 - "AgendaMonthView.vue"
Cohesion: 0.22
Nodes (5): calendarDays, daysOfWeek, emit, handleDayClick(), props

### Community 56 - "LanguageSelector.vue"
Cohesion: 0.20
Nodes (7): currentLanguage, dropdownRef, isOpen, languageMap, { locale, setLocale }, localeCookie, locales

### Community 57 - "seed-db.ts"
Cohesion: 0.24
Nodes (9): cities, documentTypes, getRandomItem(), getRandomNumber(), namesFemale, namesMale, seedDB(), statuses (+1 more)

### Community 58 - "verifactu.ts"
Cohesion: 0.42
Nodes (5): submitToAeat(), generateInvoiceHash(), generateQrUrl(), generateInvoiceNumber(), processVerifactuInvoice()

### Community 59 - "compilerOptions"
Cohesion: 0.20
Nodes (9): compilerOptions, esModuleInterop, ignoreDeprecations, module, moduleResolution, strict, target, files (+1 more)

### Community 60 - "BM25"
Cohesion: 0.28
Nodes (5): BM25, BM25 ranking algorithm for text search, Lowercase, split, remove punctuation, filter short words, Build BM25 index from documents, Score all documents against query

### Community 61 - "ClientAutocomplete.vue"
Cohesion: 0.28
Nodes (8): clients, clientSearch, { data: clientsResponse }, emit, filteredClients, props, removeClient(), selectClient()

### Community 62 - "TpvCatalog.vue"
Cohesion: 0.22
Nodes (6): activePill, activeTab, emit, Props, searchQuery, tabRefs

### Community 63 - "BM25"
Cohesion: 0.28
Nodes (5): BM25, BM25 ranking algorithm for text search, Lowercase, split, remove punctuation, filter short words, Build BM25 index from documents, Score all documents against query

### Community 64 - "DaySummaryModal.vue"
Cohesion: 0.25
Nodes (4): dayBookings, emit, isOpen, selectedDate

### Community 65 - "UserDeleteModal.vue"
Cohesion: 0.32
Nodes (7): { animateOpen, animateClose }, closeModal(), deleteModal, emit, executeDelete(), props, { t }

### Community 66 - "SalesFilters.vue"
Cohesion: 0.25
Nodes (7): emit, filterDateMode, filterDateRange, filterDateSingle, filterPaymentMethod, Props, searchQuery

### Community 67 - "index.vue"
Cohesion: 0.25
Nodes (6): {
		data: reports,
		isPending,
		isError,
	}, isExporting, paymentMethodsOptions, revenueTrendOptions, { t }, topItemsOptions

### Community 68 - "index.vue"
Cohesion: 0.25
Nodes (6): purchaseDetailsModalRef, queryClient, salesCount, salesTotalSum, {
	searchQuery,
	filterDateMode,
	filterDateSingle,
	filterDateRange,
	filterPaymentMethod,
	summaryTimeframe,
	sortKey,
	sortOrder,
	currentPage,
	itemsPerPage,
	sales,
	isPending,
	filteredSales,
	paginatedSales,
	totalPages,
	timeframeLabels,
	summaryStats,
	totalSparkline,
	totalSparklineArea,
	countSparkline,
	countSparklineArea,
	averageSparkline,
	averageSparklineArea,
	monthlyProjection,
	isGeneratingPdf,
	toastMessage,
	toastType,
	showToast,
	toggleSort,
	getPaymentMethodBadge,
	getTotalItems,
	formatCurrency,
	formatCustomDate,
	getTicketDisplay,
	downloadCsv,
	downloadPdf,
}, { t }

### Community 69 - "GenericDeleteModal.vue"
Cohesion: 0.38
Nodes (6): { animateOpen, animateClose }, closeModal(), confirmDelete(), deleteModal, emit, props

### Community 70 - "ProfileInfoSidebar.vue"
Cohesion: 0.33
Nodes (4): emit, { locale }, props, { revealedDocs, revealedLoading, toggleDocumentVisibility }

### Community 71 - "ImageCropperModal.vue"
Cohesion: 0.53
Nodes (5): cropperRef, emit, handleClose(), handleCrop(), props

### Community 72 - "useOfflineSync.ts"
Cohesion: 0.33
Nodes (3): db, OfflineDB, SyncAction

### Community 73 - "index.vue"
Cohesion: 0.33
Nodes (4): daySummaryModalRef, queryClient, {
    store,
    selectedDate,
    viewMode,
    searchQuery,
    deleteModalOpen,
    bookingToDelete,
    toastMessage,
    toastType,
    showToast,
    isPending,
    isDeletingBooking,
    prevPeriod,
    nextPeriod,
    setToday,
    displayBookings,
    confirmDelete,
    handleActualDelete,
    setBookingStatus,
    displayToast,
    formatDayDate,
}, viewContainer

### Community 75 - "ProfileBilling.vue"
Cohesion: 0.40
Nodes (3): emit, { locale }, props

### Community 76 - "ProfileTabs.vue"
Cohesion: 0.50
Nodes (4): emit, props, setActiveTab(), tabs

### Community 77 - "AppBreadcrumbs.vue"
Cohesion: 0.40
Nodes (4): breadcrumbs, props, route, { t }

### Community 78 - "jspdf"
Cohesion: 0.40
Nodes (4): TicketSeriesRow, useSales(), jspdf, jspdf

### Community 79 - "_generate_intelligent_overrides"
Cohesion: 0.50
Nodes (4): _detect_page_type(), _generate_intelligent_overrides(), Generate intelligent overrides based on page type using layered search., Detect page type from context and search results.

### Community 81 - "format_ascii_box"
Cohesion: 0.25
Nodes (8): ansi_ljust(), format_ascii_box(), hex_to_ansi(), Convert hex color to ANSI True Color swatch (██) with fallback., Like str.ljust but accounts for zero-width ANSI escape sequences., Create a Unicode section separator: ├─── NAME ───...┤, Format design system as Unicode box with ANSI color swatches., section_header()

### Community 82 - "package.json"
Cohesion: 0.50
Nodes (3): name, private, type

### Community 83 - "catalog.ts"
Cohesion: 0.50
Nodes (3): IPack, IProduct, IService

### Community 84 - "invoice.ts"
Cohesion: 0.50
Nodes (3): AEATStatus, IInvoice, IIssuer

### Community 85 - "marketing.ts"
Cohesion: 0.50
Nodes (3): IBonus, ICoupon, IGiftcard

## Knowledge Gaps
- **640 isolated node(s):** `containerRef`, `ready`, `store`, `{ selectedDate, searchQuery }`, `currentMonth` (+635 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **57 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `@types/aos`, `vue`, `vue-advanced-cropper`, `vue-echarts`, `vue-i18n`, `vue-router`, `@vueuse/core`, `workbox-window`, `@xmldom/xmldom`, `zod`, `jspdf`, `package.json`, `dexie`, `bcryptjs`, `echarts`, `gsap`, `html2pdf.js`, `jsonwebtoken`, `lucide-vue-next`, `mariadb`, `nuxt`, `@nuxt/eslint`, `@nuxt/fonts`, `@nuxt/image`, `@peculiar/webcrypto`, `pinia`, `@pinia/nuxt`, `@prisma/client`, `qrcode.vue`, `soap`, `@tailwindcss/vite`, `@tanstack/vue-query`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `prettier`, `tsx`, `@types/jsonwebtoken`, `vite`, `@vite-pwa/nuxt`, `prettier-plugin-tailwindcss`, `package.json`, `@nuxtjs/google-fonts`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Why does `echarts` connect `echarts` to `dependencies`?**
  _High betweenness centrality (0.001) - this node is a cross-community bridge._
- **What connects `containerRef`, `ready`, `store` to the rest of the system?**
  _640 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `BookingDrawer.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.06156156156156156 - nodes in this community are weakly interconnected._
- **Should `PurchaseDetailsModal.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.06439393939393939 - nodes in this community are weakly interconnected._
- **Should `prisma.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._