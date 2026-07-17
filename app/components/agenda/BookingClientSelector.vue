<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Search, Ticket, Package as PackageIcon } from 'lucide-vue-next'
import type { ClientItem } from '~/composables/useBookingForm'

const props = defineProps<{
    modelValue: string
    clients: ClientItem[] | undefined
    clientWallet: {
        bonuses: any[]
        giftcards: any[]
        isLoading: boolean
    }
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

watch(() => props.modelValue, (newVal) => {
    if (newVal && props.clients) {
        const c = props.clients.find(x => x.user_id === newVal)
        if (c) clientSearch.value = `${c.name} ${c.surname || ''}`.trim()
    } else {
        clientSearch.value = ''
    }
}, { immediate: true })

const formatCurrency = (val: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val)

const closeDropdown = () => {
    isClientDropdownOpen.value = false
}

defineExpose({
    closeDropdown
})
</script>

<template>
    <div>
        <!-- Client Selection -->
        <div class="form-control">
            <label class="label pb-1"><span class="label-text text-primary text-[10px] font-bold uppercase tracking-widest">Cliente *</span></label>
            <div class="relative">
                <Search class="text-text-muted absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <input v-model="clientSearch" type="text" required placeholder="Buscar cliente..." autocomplete="off"
                    class="input bg-bg-card border-border-default focus:border-primary/50 h-11 w-full rounded-xl pl-9 text-xs font-bold shadow-sm transition-all focus:outline-none"
                    @focus="isClientDropdownOpen = true" 
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

        <!-- Client Wallet Indicator -->
        <div v-if="props.modelValue && (!clientWallet.isLoading) && (clientWallet.bonuses.length > 0 || clientWallet.giftcards.length > 0)" class="rounded-xl border border-primary/20 bg-primary/5 p-4 mt-2">
            <h4 class="mb-3 text-[10px] font-bold uppercase tracking-widest text-primary">Disponibles del Cliente</h4>
            <div class="flex flex-col gap-2">
                <div v-for="b in clientWallet.bonuses.filter(b => b.remaining_sessions > 0)" :key="b.client_bonus_id" class="flex items-center gap-2 text-[10px] font-bold bg-white/50 px-2 py-1 rounded border border-primary/10">
                    <Ticket class="h-3 w-3 text-primary" />
                    <span>{{ b.bonus?.name || 'Bono' }} (Quedan {{ b.remaining_sessions }})</span>
                </div>
                <div v-for="g in clientWallet.giftcards" :key="g.giftcard_id" class="flex items-center gap-2 text-[10px] font-bold bg-white/50 px-2 py-1 rounded border border-secondary/10">
                    <PackageIcon class="h-3 w-3 text-secondary" />
                    <span>Tarjeta {{ g.code }} ({{ formatCurrency(g.current_balance) }})</span>
                </div>
            </div>
        </div>
    </div>
</template>
