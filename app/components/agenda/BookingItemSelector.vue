<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search, Plus, Package, Sparkles } from 'lucide-vue-next'

const props = defineProps<{
    services: any[] | undefined
    clientPackages?: any[] | undefined
    selectedItems?: any[] | undefined
    disabled?: boolean
}>()

const emit = defineEmits<{
    (e: 'add', item: any): void
}>()

const itemSearch = ref('')
const isItemDropdownOpen = ref(false)

const normalizeStr = (str: string) => {
    return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : ''
}

const filteredItems = computed(() => {
    const q = normalizeStr(itemSearch.value)
    let source: any[] = props.services || []
    
    if (!q) return source.slice(0, 10)
    
    return source.filter(item => 
        normalizeStr(item.name).includes(q) || 
        normalizeStr(item.code || '').includes(q)
    ).slice(0, 15)
})

const getUsedCount = (pkg: any) => {
    if (!props.selectedItems) return 0
    const pkgId = pkg.client_package_id || pkg.package_id
    return props.selectedItems.filter((item: any) => 
        item.item_id === pkgId
    ).length
}

const getEffectiveRemaining = (pkg: any) => {
    const used = getUsedCount(pkg)
    return Math.max(0, (pkg.remaining_sessions || 0) - used)
}

const addServiceItem = (item: any) => {
    emit('add', {
        item_type: 'SERVICE',
        item_id: item.service_id,
        name: item.name,
        duration: Number(item.duration || 0)
    })
    itemSearch.value = ''
    isItemDropdownOpen.value = false
}

const addPackageItem = (pkg: any) => {
    if (getEffectiveRemaining(pkg) <= 0) return
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

const closeDropdown = () => {
    isItemDropdownOpen.value = false
}

defineExpose({
    closeDropdown
})
</script>

<template>
    <div class="flex flex-col gap-3">
        
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

            <div class="space-y-1.5">
                <button 
                    v-for="pkg in clientPackages" 
                    :key="pkg.client_package_id || pkg.package_id"
                    type="button"
                    :disabled="disabled || getEffectiveRemaining(pkg) <= 0"
                    @click="addPackageItem(pkg)"
                    class="w-full bg-bg-card hover:bg-bg-muted border border-border-subtle hover:border-primary/50 p-2.5 rounded-lg flex items-center justify-between text-left transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <div class="flex items-center gap-2">
                        <Package class="w-4 h-4 text-primary shrink-0" />
                        <div>
                            <p class="text-xs font-bold text-text-primary group-hover:text-primary transition-colors leading-snug">{{ pkg.name }}</p>
                            <span class="text-[9px] font-bold text-text-muted">
                                Quedan <strong class="text-text-primary font-black tabular-nums">{{ getEffectiveRemaining(pkg) }}</strong> de {{ pkg.total_sessions }} sesiones
                            </span>
                        </div>
                    </div>
                    <div class="badge badge-neutral font-bold text-[9px] px-2.5 py-1 group-hover:bg-primary group-hover:text-white transition-colors">
                        {{ getEffectiveRemaining(pkg) > 0 ? 'Usar Sesión' : 'Agotado' }}
                    </div>
                </button>
            </div>
        </div>

        <!-- Item Search Input & Dropdown -->
        <div class="relative z-40">
            <Search class="text-text-muted absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <input v-model="itemSearch" type="text" placeholder="Añadir otro servicio del catálogo..." :disabled="disabled"
                class="input bg-bg-card border-border-default focus:border-primary/50 h-11 w-full rounded-xl pl-9 text-xs font-bold shadow-sm transition-all focus:outline-none disabled:opacity-60"
                @focus="!disabled && (isItemDropdownOpen = true)" 
                @keydown.esc="isItemDropdownOpen = false" />
            
            <div v-show="isItemDropdownOpen" class="bg-bg-card border-border-default absolute z-50 top-full left-0 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border shadow-xl">
                <button v-for="it in filteredItems" :key="it.service_id"
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
    </div>
</template>

<style scoped>
</style>
