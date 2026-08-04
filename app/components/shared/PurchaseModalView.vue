<script setup lang="ts">
import { Edit2, CheckCircle, Trash2, UserPlus, CreditCard, Banknote, Calendar } from 'lucide-vue-next'

import { ref } from 'vue'

const props = defineProps<{
    cart: any
}>()

const emit = defineEmits<{
    (e: 'editItems'): void
    (e: 'searchClient'): void
    (e: 'removeClient'): void
    (e: 'editClient'): void
    (e: 'updateDate', newDate: string): void
}>()

const isEditingDate = ref(false)
const editableDate = ref('')

const startEditingDate = () => {
    // Format to YYYY-MM-DDThh:mm for datetime-local input
    const date = new Date(props.cart.created_at)
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    editableDate.value = localDate.toISOString().slice(0, 16)
    isEditingDate.value = true
}

const saveDate = () => {
    if (editableDate.value) {
        emit('updateDate', new Date(editableDate.value).toISOString())
    }
    isEditingDate.value = false
}

const formatCustomDate = (dateString: string) => {
    return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(dateString))
}
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 animate-slide-up">
    <!-- Left: Breakdown -->
    <div class="space-y-4">
       <div class="flex items-center justify-between">
          <h4 class="text-text-primary text-sm font-bold uppercase tracking-wider">Desglose de Conceptos</h4>
          <button 
            class="btn btn-xs btn-ghost text-primary gap-1" 
            @click="emit('editItems')"
          >
            <Edit2 class="w-3 h-3" /> Editar compra
          </button>
       </div>
       <div v-if="cart.items?.length > 0" class="space-y-3">
          <div v-for="item in cart.items" :key="item.cart_item_id" class="bg-bg-card border-border-subtle rounded-2xl border p-3 flex justify-between items-center shadow-sm">
             <div class="flex-1 min-w-0 pr-4">
                <p class="text-text-primary text-sm font-bold truncate">{{ item.name }}</p>
                <p class="text-text-muted text-xs font-medium mt-0.5">{{ item.quantity }} × {{ item.unit_price.toFixed(2) }}€ <span class="text-text-muted mx-1">•</span> IVA: {{ item.tax_rate }}%</p>
             </div>
             <span class="text-text-primary font-black tabular-nums shrink-0">{{ item.total.toFixed(2) }}€</span>
          </div>
       </div>
       <div v-else class="bg-bg-muted/30 border border-border-subtle rounded-2xl p-6 text-center">
          <p class="text-text-muted text-xs font-bold uppercase">Venta manual sin items detallados</p>
       </div>
       
       <div class="border-border-subtle flex justify-between items-center mt-6 shadow-sm border-t-0 p-0 rounded-none bg-transparent pl-2 pr-2">
          <span class="text-text-muted text-xs font-bold uppercase tracking-wider">Total Oficial del Ticket</span>
          <span class="text-text-primary text-lg font-black tabular-nums">{{ cart.total.toFixed(2) }}€</span>
       </div>
    </div>

    <!-- Right: Status / Context -->
    <div class="space-y-6">
       <div class="bg-success/5 border-success/20 rounded-3xl border p-6">
          <div class="flex items-center justify-between mb-4">
              <h4 class="text-success text-sm font-bold uppercase tracking-wider">Completado</h4>
              <CheckCircle class="text-success w-5 h-5" />
          </div>
          
          <div class="space-y-4">
             <div class="flex items-end justify-between border-b border-success/20 pb-3 mb-4">
                <label class="text-text-muted text-[10px] font-black uppercase tracking-widest">Total Abonado</label>
                <span class="text-success text-3xl font-black tabular-nums leading-none">{{ cart.total.toFixed(2) }}€</span>
             </div>
             
             <div class="flex flex-col gap-1 border-b border-border-subtle pb-3">
                <label class="text-text-primary text-[10px] font-black uppercase tracking-widest">Cliente</label>
                <div v-if="cart.user" class="flex items-center justify-between group/client transition-all">
                   <div class="flex flex-col">
                      <span class="text-text-secondary text-sm font-bold">{{ cart.user.name }} {{ cart.user.surname }}</span>
                      <span class="text-text-muted text-[10px] font-medium">{{ cart.user.email || 'Sin email' }}</span>
                   </div>
                   <div class="flex gap-1 opacity-0 group-hover/client:opacity-100 transition-opacity">
                      <button class="btn btn-xs btn-circle btn-ghost text-primary hover:bg-primary/10" title="Cambiar Cliente" @click="emit('editClient')">
                         <Edit2 class="w-3 h-3" />
                      </button>
                      <button class="btn btn-xs btn-circle btn-ghost text-rose-500 hover:bg-rose-500/10" title="Quitar Cliente" @click="emit('removeClient')">
                         <Trash2 class="w-3 h-3" />
                      </button>
                   </div>
                </div>
                <div v-else class="mt-1">
                    <div class="flex flex-col gap-2">
                        <span class="text-text-muted text-[10px] font-bold italic uppercase tracking-wider">Mostrador / No registrado</span>
                        <button class="btn btn-sm btn-ghost bg-primary/10 text-primary hover:bg-primary/20 rounded-xl border-none" @click="emit('searchClient')">
                            <UserPlus class="w-4 h-4 mr-1" /> Asignar Cliente
                        </button>
                    </div>
                </div>
             </div>

             <div class="flex flex-col gap-1 border-b border-border-subtle pb-3">
                <label class="text-text-primary text-[10px] font-black uppercase tracking-widest">Método</label>
                <div class="flex items-center gap-2 mt-1">
                    <span class="bg-bg-card font-bold text-xs uppercase text-text-secondary border border-border-default px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                        <CreditCard v-if="cart.payment_method === 'card'" class="w-3.5 h-3.5" />
                        <Banknote v-if="cart.payment_method === 'cash'" class="w-3.5 h-3.5" />
                        {{ cart.payment_method }}
                    </span>
                </div>
             </div>

             <div class="flex flex-col gap-1">
                <label class="text-text-primary text-[10px] font-black uppercase tracking-widest">Fecha</label>
                <div class="flex items-center gap-2 mt-1">
                    <div v-if="!isEditingDate" class="flex items-center gap-2 group/date transition-all">
                        <span class="bg-bg-card font-bold text-xs uppercase text-text-secondary border border-border-default px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                            <Calendar class="w-3.5 h-3.5" />
                            {{ formatCustomDate(cart.created_at) }}
                        </span>
                        <div class="date-edit flex gap-1 opacity-0 transition-opacity group-hover/date:opacity-100">
                            <button class="btn btn-xs btn-circle btn-ghost text-primary hover:bg-primary/10" title="Cambiar Fecha" @click="startEditingDate">
                                <Edit2 class="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                    <div v-else class="flex flex-col gap-2 w-full">
                        <input v-model="editableDate" type="datetime-local" class="input input-sm input-bordered w-full text-xs font-bold bg-bg-card" >
                        <div class="flex gap-2 justify-end">
                            <button class="btn btn-xs btn-ghost rounded-lg" @click="isEditingDate = false">Cancelar</button>
                            <button class="btn btn-xs btn-primary rounded-lg" @click="saveDate">Guardar</button>
                        </div>
                    </div>
                </div>
             </div>
          </div>
       </div>
    </div>
  </div>
</template>

<style scoped>
	/* Touch devices (no hover): the date edit button is always visible next to
	   the input. On hover-capable devices it stays hover-revealed. */
	@media (hover: none) {
		.date-edit {
			opacity: 1;
		}
	}
</style>
