<script setup lang="ts">
import { computed } from 'vue'
import { ArrowLeft, Search, Check, Plus, Scissors, Package, PackageSearch, Ticket } from 'lucide-vue-next'

const props = defineProps<{
    searchQuery: string
    isEditingItems: boolean
    isSearchingClients: boolean
    clients: any[]
    selectedClientToAssign: any
    isSearchingItems: boolean
    catalogItems: any[]
    isAssigningClient: boolean
}>()

const emit = defineEmits<{
    (e: 'update:searchQuery', value: string): void
    (e: 'cancel'): void
    (e: 'selectClient', client: any): void
    (e: 'assignClient'): void
    (e: 'addNewItem', item: any): void
}>()

const internalSearch = computed({
    get: () => props.searchQuery,
    set: (val) => emit('update:searchQuery', val)
})
</script>

<template>
  <div class="space-y-6 animate-slide-right min-h-[400px] flex flex-col">
    <div class="flex items-center gap-4">
        <button @click="emit('cancel')" class="btn btn-circle btn-ghost btn-sm bg-bg-muted/50 hover:bg-bg-muted">
            <ArrowLeft class="w-4 h-4" />
        </button>
        <div class="flex-1 relative">
            <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input 
                v-model="internalSearch"
                type="text" 
                autofocus
                :placeholder="isEditingItems ? 'Buscar servicios o productos...' : 'Buscar cliente por nombre o teléfono...'" 
                class="input w-full bg-bg-card border-border-default rounded-2xl pl-11 focus:border-primary focus:ring-primary/10"
            />
        </div>
    </div>

    <div class="flex-1 overflow-y-auto max-h-[440px] pr-2 custom-scrollbar">
        <!-- CLIENT SEARCH RESULTS -->
        <template v-if="!isEditingItems">
            <div v-if="isSearchingClients" class="flex flex-col gap-3">
                <div v-for="i in 3" :key="i" class="h-16 w-full animate-pulse bg-bg-muted/50 rounded-2xl"></div>
            </div>
            <div v-else-if="clients.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div 
                    v-for="c in clients" 
                    :key="c.user_id" 
                    @click="emit('selectClient', c)"
                    class="bg-bg-card border-border-subtle hover:border-primary/50 cursor-pointer rounded-2xl border p-4 flex items-center justify-between transition-all group"
                    :class="{ 'border-primary bg-primary/5 ring-1 ring-primary': selectedClientToAssign?.user_id === c.user_id }"
                >
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold uppercase overflow-hidden">
                            <img v-if="c.avatar" :src="c.avatar" class="w-full h-full object-cover" />
                            <span v-else>{{ c.name.charAt(0) }}{{ c.surname.charAt(0) }}</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-text-primary text-sm font-bold">{{ c.name }} {{ c.surname }}</span>
                            <span class="text-text-muted text-xs">{{ c.phone }}</span>
                        </div>
                    </div>
                    <div v-if="selectedClientToAssign?.user_id === c.user_id" class="bg-primary text-white rounded-full p-1">
                        <Check class="w-4 h-4" />
                    </div>
                </div>
            </div>
        </template>

        <!-- ITEM SEARCH RESULTS -->
        <template v-else>
            <div v-if="isSearchingItems" class="flex flex-col gap-3">
                <div v-for="i in 3" :key="i" class="h-16 w-full animate-pulse bg-bg-muted/50 rounded-2xl"></div>
            </div>
            <div v-else-if="catalogItems.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div 
                    v-for="item in catalogItems" 
                    :key="item.item_id" 
                    @click="emit('addNewItem', item)"
                    class="group bg-bg-card border-border-default hover:border-primary/50 relative flex h-24 cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border p-3 text-left shadow-xs transition-all hover:shadow-md"
                >
                    <div class="z-10 flex flex-col">
                        <span class="text-text-primary group-hover:text-primary line-clamp-1 text-sm font-bold transition-colors">{{ item.name }}</span>
                        <span class="text-text-muted text-[10px] font-black uppercase tracking-widest">{{ item.sku || item.code }}</span>
                    </div>
                    <div class="z-10 flex items-end justify-between">
                        <span class="text-lg font-black tabular-nums">{{ item.price.toFixed(2) }}€</span>
                        <div class="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white rounded-lg p-1.5 transition-colors">
                            <Plus class="w-4 h-4" />
                        </div>
                    </div>
                    <!-- Background icon -->
                    <div class="absolute -right-2 -bottom-2 opacity-5">
                        <Scissors v-if="item.item_type === 'service'" class="w-16 h-16" />
                        <Package v-else-if="item.item_type === 'product'" class="w-16 h-16" />
                        <Ticket v-else class="w-16 h-16" />
                    </div>
                </div>
            </div>
        </template>

        <div v-if="internalSearch && (!isEditingItems ? clients.length === 0 : catalogItems.length === 0)" class="flex flex-col items-center justify-center py-12 text-center text-text-muted">
            <div class="bg-bg-muted w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <Search class="w-8 h-8 opacity-20" />
            </div>
            <p class="font-bold text-lg mb-1 italic">Vaya, no hemos encontrado nada</p>
            <p class="text-sm max-w-xs">Intenta con otros términos o revisa que esté bien escrito.</p>
        </div>
    </div>

    <!-- Footer for Clients -->
    <div v-if="!isEditingItems" class="pt-4 border-t border-border-subtle flex items-center justify-between">
        <p v-if="selectedClientToAssign" class="text-sm font-medium text-text-primary">
            Seleccionado: <span class="text-primary font-bold">{{ selectedClientToAssign.name }}</span>
        </p>
        <p v-else class="text-sm text-text-muted italic">Selecciona un cliente de la lista</p>
        
        <div class="flex gap-3">
            <button @click="emit('cancel')" class="btn btn-ghost rounded-xl">Cancelar</button>
            <button 
                @click="emit('assignClient')" 
                :disabled="!selectedClientToAssign || isAssigningClient" 
                class="btn btn-primary rounded-xl px-8 shadow-lg shadow-primary/20"
            >
                <span v-if="isAssigningClient" class="loading loading-spinner loading-xs"></span>
                Asignar Cliente
            </button>
        </div>
    </div>
  </div>
</template>
