<script setup lang="ts">
import type { CatalogItem } from '~~/shared/types/domain'
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Search, Plus, Package, Sparkles, Scissors, ShoppingBag, ChevronDown, ChevronUp } from 'lucide-vue-next'

const props = defineProps<{
    services: CatalogItem[] | undefined
    clientPackages?: CatalogItem[] | undefined
    catalogPackages?: CatalogItem[] | undefined
    selectedItems?: CatalogItem[] | undefined
    disabled?: boolean
}>()

const emit = defineEmits<{
    (e: 'add', item: CatalogItem): void
}>()

const itemSearch = ref('')
const isItemDropdownOpen = ref(false)
const pkgSearch = ref('')
const isPkgDropdownOpen = ref(false)
const expandedPackages = ref<Record<string, boolean>>({})

const toggleExpandPackage = (pkgId: string) => {
    expandedPackages.value[pkgId] = !expandedPackages.value[pkgId]
}

const normalizeStr = (str: string) => {
    return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : ''
}

const filteredItems = computed(() => {
    const q = normalizeStr(itemSearch.value)
    const source: CatalogItem[] = props.services || []
    
    if (!q) return source.slice(0, 10)
    
    return source.filter(item => 
        normalizeStr(item.name).includes(q) || 
        normalizeStr(item.code || '').includes(q)
    ).slice(0, 15)
})

// Calculate used count for individual package or sub-item
const getUsedCount = (itemId: string) => {
    if (!props.selectedItems) return 0
    return props.selectedItems.filter((item: CatalogItem) => item.item_id === itemId).length
}

const getEffectiveRemainingForPackage = (pkg: CatalogItem) => {
    const pkgId = pkg.client_package_id || pkg.package_id || ''
    const used = getUsedCount(pkgId)
    return Math.max(0, (pkg.remaining_sessions || 0) - used)
}

const getEffectiveRemainingForSubItem = (subItem: CatalogItem) => {
    const itemId = subItem.client_package_item_id || subItem.package_item_id || ''
    const used = getUsedCount(itemId)
    return Math.max(0, (subItem.quantity_remaining || 0) - used)
}

const addServiceItem = (item: CatalogItem) => {
    emit('add', {
        item_type: 'SERVICE',
        item_id: item.service_id,
        name: item.name,
        duration: Number(item.duration || 0)
    })
    itemSearch.value = ''
    isItemDropdownOpen.value = false
}

const filteredPackages = computed(() => {
    const q = normalizeStr(pkgSearch.value)
    const source: CatalogItem[] = props.catalogPackages || []
    if (!q) return source.slice(0, 10)
    return source.filter(pkg =>
        normalizeStr(pkg.name).includes(q) ||
        normalizeStr(pkg.code || '').includes(q)
    ).slice(0, 15)
})

// Sell a bono/package within the appointment (assigned to the client on checkout in TPV)
const addPackageSaleItem = (pkg: CatalogItem) => {
    emit('add', {
        item_type: 'package_sale',
        item_id: pkg.package_id,
        name: pkg.name,
        duration: 0,
        price: Number(pkg.price || 0)
    })
    pkgSearch.value = ''
    isPkgDropdownOpen.value = false
}

const addIndividualPackageItem = (pkg: CatalogItem) => {
    if (getEffectiveRemainingForPackage(pkg) <= 0) return
    const pkgId = pkg.client_package_id || pkg.package_id
    emit('add', {
        item_type: 'PACKAGE',
        item_id: pkgId,
        name: `[SESIÓN BONO] ${pkg.name}`,
        duration: 45,
        remaining_sessions: pkg.remaining_sessions
    })
    itemSearch.value = ''
    isItemDropdownOpen.value = false
}

const addMixedPackageSubItem = (pkg: CatalogItem, subItem: CatalogItem) => {
    if (getEffectiveRemainingForSubItem(subItem) <= 0) return
    const itemId = subItem.client_package_item_id || subItem.package_item_id
    emit('add', {
        item_type: 'PACKAGE',
        item_id: itemId,
        name: `[BONO MIXTO: ${pkg.name}] ${subItem.name}`,
        duration: Number(subItem.duration || 0),
        parent_package_id: pkg.client_package_id || pkg.package_id
    })
    itemSearch.value = ''
    isItemDropdownOpen.value = false
}

const rootRef = ref<HTMLElement | null>(null)

const closeDropdown = () => {
    isItemDropdownOpen.value = false
    isPkgDropdownOpen.value = false
}

const onDocPointer = (e: PointerEvent) => {
    if (!isItemDropdownOpen.value && !isPkgDropdownOpen.value) return
    if (rootRef.value && !rootRef.value.contains(e.target as Node)) closeDropdown()
}
const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeDropdown()
}

onMounted(() => {
    document.addEventListener('pointerdown', onDocPointer, true)
    document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
    document.removeEventListener('pointerdown', onDocPointer, true)
    document.removeEventListener('keydown', onKeydown)
})

defineExpose({
    closeDropdown
})
</script>

<template>
    <div ref="rootRef" class="flex flex-col gap-3">

        <!-- BANNER DE BONOS / PAQUETES DISPONIBLES DEL CLIENTE -->
        <div v-if="clientPackages && clientPackages.length > 0" class="bg-primary/10 border border-primary/30 rounded-xl p-3 space-y-2">
            <div class="flex items-center justify-between">
                <span class="text-[10px] font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Sparkles class="w-3.5 h-3.5" />
                    Bonos / Paquetes Disponibles del Cliente
                </span>
                <span class="badge badge-primary badge-sm font-black text-[9px]">
                    {{ clientPackages.length }} Activos
                </span>
            </div>

            <div class="space-y-2">
                <div 
                    v-for="pkg in clientPackages" 
                    :key="pkg.client_package_id || pkg.package_id"
                    class="bg-bg-card border border-border-subtle rounded-xl p-2.5 space-y-2 shadow-xs"
                >
                    <!-- Header Card del Paquete -->
                    <div class="flex items-center justify-between gap-2">
                        <div class="flex items-center gap-2">
                            <Package class="w-4 h-4 text-primary shrink-0" />
                            <div>
                                <div class="flex items-center gap-1.5">
                                    <p class="text-xs font-bold text-text-primary leading-snug">{{ pkg.name }}</p>
                                    <span 
                                        class="badge badge-xs font-black text-[8px] uppercase border-none px-1.5"
                                        :class="pkg.type === 'MIXTO' ? 'bg-amber-500/20 text-amber-700' : 'bg-primary/20 text-primary'"
                                    >
                                        {{ pkg.type === 'MIXTO' ? 'MIXTO' : 'INDIVIDUAL' }}
                                    </span>
                                </div>
                                <span v-if="pkg.type !== 'MIXTO'" class="text-[9px] font-bold text-text-muted">
                                    Quedan <strong class="text-text-primary font-black tabular-nums">{{ getEffectiveRemainingForPackage(pkg) }}</strong> de {{ pkg.total_sessions }} sesiones
                                </span>
                                <span v-else class="text-[9px] font-bold text-text-muted">
                                    Paquete combinado (Servicios + Productos)
                                </span>
                            </div>
                        </div>

                        <!-- Botón para Paquete Individual -->
                        <button 
                            v-if="pkg.type !== 'MIXTO'"
                            type="button"
                            :disabled="disabled || getEffectiveRemainingForPackage(pkg) <= 0"
                            class="badge badge-neutral font-bold text-[9px] px-2.5 py-1 hover:bg-primary hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            @click="addIndividualPackageItem(pkg)"
                        >
                            {{ getEffectiveRemainingForPackage(pkg) > 0 ? 'Usar Sesión' : 'Agotado' }}
                        </button>

                        <!-- Toggle Botón para Paquete Mixto -->
                        <button 
                            v-else
                            type="button"
                            class="btn btn-ghost btn-xs font-black text-[9px] uppercase gap-1 text-primary"
                            @click="toggleExpandPackage((pkg.client_package_id || pkg.package_id) || '')"
                        >
                            <span>{{ expandedPackages[(pkg.client_package_id || pkg.package_id) || ''] ? 'Ocultar Items' : 'Ver Items Incluidos' }}</span>
                            <ChevronUp v-if="expandedPackages[(pkg.client_package_id || pkg.package_id) || '']" class="w-3 h-3" />
                            <ChevronDown v-else class="w-3 h-3" />
                        </button>
                    </div>

                    <!-- DESGLOSE DE SUB-ITEMS DE BONO MIXTO -->
                    <div 
                        v-if="pkg.type === 'MIXTO' && (expandedPackages[(pkg.client_package_id || pkg.package_id) || ''] !== false)"
                        class="pt-2 border-t border-border-subtle/60 space-y-1.5 pl-2"
                    >
                        <p class="text-[9px] font-black uppercase tracking-wider text-text-muted flex items-center gap-1">
                            <span>Selecciona el tratamiento/producto a consumir:</span>
                        </p>
                        
                        <div 
                            v-for="subItem in (pkg.items || [])" 
                            :key="subItem.client_package_item_id || subItem.package_item_id"
                            class="flex items-center justify-between p-2 rounded-lg bg-bg-muted/40 border border-border-subtle/50 hover:border-primary/40 transition-all"
                        >
                            <div class="flex items-center gap-2">
                                <Scissors v-if="subItem.item_type === 'SERVICE'" class="w-3.5 h-3.5 text-primary shrink-0" />
                                <ShoppingBag v-else class="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <div>
                                    <p class="text-[11px] font-bold text-text-primary leading-tight">{{ subItem.name }}</p>
                                    <div class="flex items-center gap-1.5 text-[9px] text-text-muted font-semibold">
                                        <span class="badge badge-outline badge-xs text-[8px] font-extrabold uppercase py-0 px-1">
                                            {{ subItem.item_type === 'SERVICE' ? `${subItem.duration || 30} min` : 'Producto' }}
                                        </span>
                                        <span>
                                            Quedan <strong class="text-text-primary font-black tabular-nums">{{ getEffectiveRemainingForSubItem(subItem) }}</strong> de {{ subItem.quantity_total }}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <button 
                                type="button"
                                :disabled="disabled || getEffectiveRemainingForSubItem(subItem) <= 0"
                                class="badge badge-neutral font-bold text-[9px] px-2 py-1 hover:bg-primary hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                @click="addMixedPackageSubItem(pkg, subItem)"
                            >
                                {{ getEffectiveRemainingForSubItem(subItem) > 0 ? (subItem.item_type === 'SERVICE' ? 'Usar Sesión' : 'Entregar Producto') : 'Agotado' }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Item Search Input & Dropdown -->
        <div class="relative z-40">
            <Search class="text-text-muted absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <input
v-model="itemSearch" type="text" placeholder="Añadir otro servicio del catálogo..." :disabled="disabled"
                class="input bg-bg-card border-border-default focus:border-primary/50 h-11 w-full rounded-xl pl-9 text-xs font-bold shadow-sm transition-all focus:outline-none disabled:opacity-60"
                @focus="!disabled && (isItemDropdownOpen = true)" 
                @keydown.esc="isItemDropdownOpen = false" >
            
            <div v-show="isItemDropdownOpen" class="bg-bg-card border-border-default absolute z-50 top-full left-0 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border shadow-xl">
                <button
v-for="it in filteredItems" :key="it.service_id"
                    type="button" class="hover:bg-bg-muted flex w-full items-center justify-between px-4 py-3 text-left border-b border-border-subtle last:border-none"
                    @mousedown="addServiceItem(it)">
                    <div class="flex flex-col">
                        <span class="text-xs font-bold text-text-primary">{{ it.name }}</span>
                        <span class="text-text-muted text-[10px] uppercase font-bold mt-0.5">{{ it.duration || 0 }} min</span>
                    </div>
                    <Plus class="h-4 w-4 text-primary" />
                </button>
                <div v-if="filteredItems.length === 0" class="px-4 py-4 text-center text-xs text-text-muted italic">No hay resultados</div>
            </div>
        </div>

        <!-- Vender Bono / Paquete -->
        <div v-if="catalogPackages && catalogPackages.length > 0" class="relative z-30">
            <Package class="text-primary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <input
v-model="pkgSearch" type="text" placeholder="Vender bono / paquete..." :disabled="disabled"
                class="input bg-bg-card border-border-default focus:border-primary/50 h-11 w-full rounded-xl pl-9 text-xs font-bold shadow-sm transition-all focus:outline-none disabled:opacity-60"
                @focus="!disabled && (isPkgDropdownOpen = true)"
                @keydown.esc="isPkgDropdownOpen = false" >

            <div v-show="isPkgDropdownOpen" class="bg-bg-card border-border-default absolute z-40 top-full left-0 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border shadow-xl">
                <button
v-for="pkg in filteredPackages" :key="pkg.package_id"
                    type="button" class="hover:bg-bg-muted flex w-full items-center justify-between px-4 py-3 text-left border-b border-border-subtle last:border-none"
                    @mousedown="addPackageSaleItem(pkg)">
                    <div class="flex flex-col">
                        <span class="text-xs font-bold text-text-primary">{{ pkg.name }}</span>
                        <span class="text-text-muted text-[10px] uppercase font-bold mt-0.5">
                            {{ pkg.type === 'MIXTO' ? 'Mixto' : `${pkg.total_sessions} sesiones` }}
                        </span>
                    </div>
                    <span class="text-xs font-black tabular-nums text-primary">
                        {{ new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(pkg.price || 0) }}
                    </span>
                </button>
                <div v-if="filteredPackages.length === 0" class="px-4 py-4 text-center text-xs text-text-muted italic">No hay bonos</div>
            </div>
        </div>
    </div>
</template>

<style scoped>
</style>
