<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Search, Package as PackageIcon } from 'lucide-vue-next'
import type { ClientItem } from '~/composables/useBookingForm'

const props = defineProps<{
    modelValue: string
    clients: ClientItem[] | undefined
    disabled?: boolean
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: string): void
}>()

const clientSearch = ref('')
const isClientDropdownOpen = ref(false)

const filteredClients = computed(() => {
    if (!props.clients) return []
    const q = clientSearch.value.toLowerCase().trim()
    if (!q) return props.clients.slice(0, 10)
    return props.clients.filter((c) => {
        const fullName = `${c.name} ${c.surname || ''}`.toLowerCase()
        return fullName.includes(q) || c.phone?.includes(q)
    })
})

const selectClient = (client: ClientItem) => {
    emit('update:modelValue', client.user_id)
    clientSearch.value = `${client.name} ${client.surname || ''}`.trim()
    isClientDropdownOpen.value = false
}

watch(
    [() => props.modelValue, () => props.clients],
    ([newVal, newClients]) => {
        if (newVal && newClients && newClients.length > 0) {
            const c = (newClients as ClientItem[]).find(x => x.user_id === newVal)
            if (c) clientSearch.value = `${c.name} ${c.surname || ''}`.trim()
        } else if (!newVal) {
            clientSearch.value = ''
        }
    },
    { immediate: true }
)

const formatCurrency = (val: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val)

const rootRef = ref<HTMLElement | null>(null)

const closeDropdown = () => {
    isClientDropdownOpen.value = false
}

const onDocPointer = (e: PointerEvent) => {
    if (!isClientDropdownOpen.value) return
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
    <div ref="rootRef">
        <!-- Client Selection -->
        <div class="form-control">
            <label class="label pb-1"><span class="label-text text-primary text-[10px] font-bold uppercase tracking-widest">Cliente *</span></label>
            <div class="relative">
                <Search class="text-text-muted absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <input v-model="clientSearch" type="text" required placeholder="Buscar cliente..." autocomplete="off" :disabled="disabled"
                    class="input bg-bg-card border-border-default focus:border-primary/50 h-11 w-full rounded-xl pl-9 text-xs font-bold shadow-sm transition-all focus:outline-none disabled:opacity-60"
                    @focus="!disabled && (isClientDropdownOpen = true)" 
                    @keydown.esc="isClientDropdownOpen = false" />
                
                <!-- Dropdown -->
                <div v-show="isClientDropdownOpen" class="bg-bg-card border-border-default absolute z-50 top-full left-0 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border shadow-xl">
                    <button v-for="c in filteredClients" :key="c.user_id"
                        type="button" class="hover:bg-bg-muted flex w-full flex-col px-4 py-3 text-left transition-colors border-b border-border-subtle last:border-none"
                        @mousedown="selectClient(c)">
                        <span class="text-xs font-bold text-text-primary">{{ c.name }} {{ c.surname }}</span>
                        <span class="text-text-muted text-[10px]">{{ c.phone }}</span>
                    </button>
                </div>
            </div>
        </div>

    </div>
</template>
