<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search, Plus } from 'lucide-vue-next'

const props = defineProps<{
    services: any[] | undefined
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
        normalizeStr(item.code).includes(q)
    ).slice(0, 15)
})

const addItem = (item: any) => {
    const id = item.service_id
    emit('add', {
        item_type: 'SERVICE',
        item_id: id,
        name: item.name,
        duration: Number(item.duration || 0)
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
        <!-- Item Search -->
        <div class="relative z-40">
            <Search class="text-text-muted absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <input v-model="itemSearch" type="text" placeholder="Añadir..." :disabled="disabled"
                class="input bg-bg-card border-border-default focus:border-primary/50 h-11 w-full rounded-xl pl-9 text-xs font-bold shadow-sm transition-all focus:outline-none disabled:opacity-60"
                @focus="!disabled && (isItemDropdownOpen = true)" 
                @keydown.esc="isItemDropdownOpen = false" />
            
            <div v-show="isItemDropdownOpen" class="bg-bg-card border-border-default absolute z-50 top-full left-0 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border shadow-xl">
                <button v-for="it in filteredItems" :key="it.service_id"
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
