<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search, Plus } from 'lucide-vue-next'

const props = defineProps<{
    services: any[] | undefined
    clientWallet: {
        bonuses: any[]
        isLoading: boolean
    }
    availableBonuses: any[]
    disabled?: boolean
}>()

const emit = defineEmits<{
    (e: 'add', item: any): void
}>()

const activeTab = ref<'SERVICE' | 'BONUS'>('SERVICE')
const itemSearch = ref('')
const isItemDropdownOpen = ref(false)

const filteredItems = computed(() => {
    const q = itemSearch.value.toLowerCase().trim()
    let source: any[] = []
    
    if (activeTab.value === 'SERVICE') source = props.services || []
    else if (activeTab.value === 'BONUS') {
        source = (props.availableBonuses || [])
            .filter((cb: any) => cb.current_remaining > 0)
            .map((cb: any) => ({
                bonus_id: cb.client_bonus_id,
                name: `Bono: ${cb.bonus?.name} (Quedan ${cb.current_remaining})`,
                duration: cb.bonus?.service?.duration || 0,
                is_client_bonus: true,
                remaining_sessions: cb.remaining_sessions // We keep the absolute total max here for limits
            }))
    }
    
    if (!q) return source.slice(0, 10)
    
    return source.filter(item => 
        item.name?.toLowerCase().includes(q) || 
        item.code?.toLowerCase().includes(q)
    ).slice(0, 15)
})

const addItem = (item: any) => {
    const id = item.service_id || item.bonus_id
    emit('add', {
        item_type: activeTab.value,
        item_id: id,
        name: item.name,
        duration: Number(item.duration || 0),
        remaining_sessions: item.remaining_sessions
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
        <!-- Categories Tabs -->
        <div class="flex w-full bg-bg-muted/50 p-1 rounded-lg border border-border-subtle">
            <button v-for="t in ['SERVICE', 'BONUS']" :key="t" 
                type="button"
                :disabled="disabled"
                class="flex-1 py-1.5 text-[9px] font-black uppercase rounded-md transition-all disabled:opacity-60"
                :class="activeTab === t ? 'bg-bg-card text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'"
                @click="activeTab = t as any">
                {{ t === 'SERVICE' ? 'SERV.' : 'BONOS' }}
            </button>
        </div>

        <!-- Item Search -->
        <div class="relative z-40">
            <Search class="text-text-muted absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <input v-model="itemSearch" type="text" placeholder="Añadir..." :disabled="disabled"
                class="input bg-bg-card border-border-default focus:border-primary/50 h-11 w-full rounded-xl pl-9 text-xs font-bold shadow-sm transition-all focus:outline-none disabled:opacity-60"
                @focus="!disabled && (isItemDropdownOpen = true)" 
                @keydown.esc="isItemDropdownOpen = false" />
            
            <div v-show="isItemDropdownOpen" class="bg-bg-card border-border-default absolute z-50 top-full left-0 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border shadow-xl">
                <button v-for="it in filteredItems" :key="it.service_id || it.bonus_id"
                    type="button" class="hover:bg-bg-muted flex w-full items-center justify-between px-4 py-3 text-left border-b border-border-subtle last:border-none"
                    @mousedown="addItem(it)">
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
