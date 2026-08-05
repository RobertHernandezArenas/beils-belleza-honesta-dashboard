<script setup lang="ts">
import type { CatalogItem } from '~~/shared/types/domain'
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Trash2, X } from 'lucide-vue-next'
import { useAgendaStore } from '~/stores/useAgendaStore'
import { useBookingForm } from '~/composables/useBookingForm'
import BookingClientSelector from './BookingClientSelector.vue'
import BookingItemSelector from './BookingItemSelector.vue'
import BookingSelectedItems from './BookingSelectedItems.vue'
import AppSelect from '~/components/ui/AppSelect.vue'

const statusOptions = [
    { value: 'PENDIENTE', label: 'PENDIENTE' },
    { value: 'CONFIRMADA', label: 'CONFIRMADA' },
    { value: 'CANCELADA', label: 'CANCELADA' },
    { value: 'COMPLETADA', label: 'COMPLETADA' },
    { value: 'AUSENTE', label: 'AUSENTE' },
]

const store = useAgendaStore()
const { isBookingDrawerOpen, selectedBooking } = storeToRefs(store)

const emit = defineEmits(['refresh', 'toast', 'delete'])

const {
    form,
    clients,

    services,
    clientPackages,
    catalogPackages,
    isSaving,
    saveBooking,
    proceedSaveBooking,

    localError,
    showLocalError,
    updateDuration
} = useBookingForm(emit)

const clientSelectorRef = ref<InstanceType<typeof BookingClientSelector> | null>(null)
const itemSelectorRef = ref<InstanceType<typeof BookingItemSelector> | null>(null)
const router = useRouter()

const handlePayInTpv = async () => {
    if (!selectedBooking.value?.booking_id) return
    const bId = selectedBooking.value.booking_id
    try {
        await proceedSaveBooking()
    } catch (e) {
        console.error('Error auto-saving booking before TPV:', e)
    }
    store.closeBookingDrawer()
    router.push(`/tpv?booking_id=${bId}`)
}



const handleAddItem = (item: CatalogItem) => {
    form.items.push({ item_type: item.item_type || 'SERVICE', item_id: item.item_id || '', name: item.name, duration: item.duration || 0 })
    updateDuration()
}

const closeDropdowns = () => {
    clientSelectorRef.value?.closeDropdown()
    itemSelectorRef.value?.closeDropdown()
}
</script>

<template>
    <!-- Overlay -->
    <Transition
        enter-active-class="transition-opacity ease-linear duration-300"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity ease-linear duration-300"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0">
        <div v-if="isBookingDrawerOpen" class="fixed inset-0 z-100 bg-text-secondary/20 backdrop-blur-sm" @click="store.closeBookingDrawer()"/>
    </Transition>

    <!-- Drawer -->
    <Transition
        enter-active-class="transform transition ease-out duration-300"
        enter-from-class="translate-x-full"
        enter-to-class="translate-x-0"
        leave-active-class="transform transition ease-in duration-300"
        leave-from-class="translate-x-0"
        leave-to-class="translate-x-full">
        <div v-if="isBookingDrawerOpen" class="fixed inset-y-0 right-0 z-110 w-full max-w-md bg-bg-app shadow-2xl flex flex-col border-l border-border-subtle" @click="closeDropdowns">
            
            <!-- Header -->
            <div class="border-border-subtle shrink-0 border-b bg-bg-card/90 px-6 py-5 flex items-center justify-between backdrop-blur-md">
                <h2 class="text-xl font-black uppercase tracking-wider text-text-primary">
                    {{ selectedBooking ? 'Editar Cita' : 'Nueva Cita' }}
                </h2>
                <div class="flex items-center gap-2">
                    <button v-if="selectedBooking" type="button" class="btn btn-sm btn-circle btn-ghost text-error" @click="emit('delete', selectedBooking.booking_id)">
                        <Trash2 class="h-4 w-4" />
                    </button>
                    <button type="button" class="btn btn-sm btn-circle btn-ghost text-text-muted" @click="store.closeBookingDrawer()">
                        <X class="h-5 w-5" />
                    </button>
                </div>
            </div>

            <!-- Body -->
            <div class="flex-1 overflow-y-auto custom-scrollbar p-6">
                <form id="drawerBookingForm" class="flex flex-col gap-6" @submit.prevent="saveBooking" @click.stop>
                    
                    <!-- Status -->
                    <div v-if="selectedBooking" class="form-control">
                        <label class="label pb-1"><span class="label-text text-text-muted text-[10px] font-bold uppercase tracking-widest">Estado</span></label>
                        <AppSelect
                            v-model="form.status"
                            :disabled="form.status === 'COMPLETADA'"
                            aria-label="Estado de la cita"
                            :options="statusOptions" />
                    </div>

                    <!-- Date & Time Row -->
                    <div class="grid grid-cols-2 gap-4">
                        <div class="form-control">
                            <label class="label pb-1"><span class="label-text text-text-muted text-[10px] font-bold uppercase tracking-widest">Fecha *</span></label>
                            <input v-model="form.booking_date" type="date" required :disabled="form.status === 'COMPLETADA'" class="input bg-bg-card border-border-default focus:border-primary/50 h-11 w-full rounded-xl px-4 text-xs font-bold shadow-sm outline-none disabled:opacity-60" >
                        </div>
                        <div class="form-control">
                            <label class="label pb-1"><span class="label-text text-text-muted text-[10px] font-bold uppercase tracking-widest">Hora *</span></label>
                            <input v-model="form.start_time" type="time" required :disabled="form.status === 'COMPLETADA'" class="input bg-bg-card border-border-default focus:border-primary/50 h-11 w-full rounded-xl px-4 text-xs font-bold shadow-sm outline-none disabled:opacity-60" >
                        </div>
                    </div>

                    <BookingClientSelector 
                        ref="clientSelectorRef"
                        v-model="form.client_id" 
                        :clients="clients" 
                        :disabled="form.status === 'COMPLETADA'"
                    />

                    <!-- Professional field removed (auto-assigned in background) -->

                    <div class="divider my-0 opacity-50"/>

                    <!-- Services/Items -->
                    <div class="flex flex-col gap-3">
                        <div class="flex justify-between items-end">
                            <span class="text-primary text-[10px] font-bold uppercase tracking-widest">Servicios *</span>
                            <span class="text-text-muted text-[10px] font-bold tabular-nums">{{ form.duration }} min total</span>
                        </div>
                        
                        <BookingItemSelector 
                            ref="itemSelectorRef"
                            :services="services"
                            :client-packages="clientPackages"
                            :catalog-packages="catalogPackages"
                            :selected-items="form.items"
                            :disabled="form.status === 'COMPLETADA'"
                            @add="handleAddItem"
                        />

                        <!-- Selected Items List -->
                        <BookingSelectedItems 
                            v-model:items="form.items"
                            :disabled="form.status === 'COMPLETADA'"
                            @update:items="updateDuration"
                        />
                    </div>

                    <div class="divider my-0 opacity-50"/>

                    <!-- Notes -->
                    <div class="form-control pb-8">
                        <label class="label pb-1"><span class="label-text text-text-muted text-[10px] font-bold uppercase tracking-widest">Notas (Opcional)</span></label>
                        <textarea
v-model="form.notes" rows="2" placeholder="Detalles de la reserva..." :disabled="form.status === 'COMPLETADA'"
                            class="textarea bg-bg-card border-border-default focus:border-primary/50 w-full rounded-xl px-4 py-3 text-xs font-medium shadow-sm outline-none disabled:opacity-60"/>
                    </div>
                </form>
            </div>

            <!-- Footer -->
            <div class="border-border-subtle shrink-0 border-t bg-bg-card/90 px-6 py-5 backdrop-blur-md space-y-3">
                <button 
                    v-if="selectedBooking && selectedBooking.booking_id && form.status !== 'COMPLETADA'" 
                    type="button"
                    class="btn btn-primary btn-outline w-full h-12 rounded-xl font-black uppercase tracking-widest shadow-sm"
                    :disabled="isSaving"
                    @click="handlePayInTpv">
                    <span v-if="isSaving" class="loading loading-spinner"/>
                    <span v-else>Cobrar en TPV</span>
                </button>
                <button v-if="form.status !== 'COMPLETADA'" type="submit" form="drawerBookingForm" class="btn text-bg-card hover:bg-text-secondary/90 bg-text-secondary w-full h-12 rounded-xl border-none font-black uppercase tracking-widest shadow-lg" :disabled="isSaving">
                    <span v-if="isSaving" class="loading loading-spinner"/>
                    <span v-else>{{ selectedBooking ? 'Guardar Cambios' : 'Confirmar Reserva' }}</span>
                </button>
                <div v-show="showLocalError" class="mt-3 text-center">
                    <span class="text-[10px] font-bold text-error uppercase">{{ localError }}</span>
                </div>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
    width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.05);
    border-radius: 99px;
}
</style>
