<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Trash2, X } from 'lucide-vue-next'
import { useAgendaStore } from '~/stores/useAgendaStore'
import { useBookingForm } from '~/composables/useBookingForm'
import BookingClientSelector from './BookingClientSelector.vue'
import BookingItemSelector from './BookingItemSelector.vue'
import BookingSelectedItems from './BookingSelectedItems.vue'

const store = useAgendaStore()
const { isBookingDrawerOpen, selectedBooking } = storeToRefs(store)

const emit = defineEmits(['refresh', 'toast', 'delete'])

const {
    form,
    clients,
    staff,
    services,
    packs,
    bonuses,
    clientWallet,
    isSaving,
    saveBooking,
    proceedSaveBooking,
    bonusWarningType,
    availableClientBonuses,
    resetForm,
    localError,
    showLocalError,
    updateDuration
} = useBookingForm(emit as any)

const clientSelectorRef = ref<InstanceType<typeof BookingClientSelector> | null>(null)
const itemSelectorRef = ref<InstanceType<typeof BookingItemSelector> | null>(null)

// Watch pinia state to reset form
watch(isBookingDrawerOpen, (isOpen) => {
    if (isOpen) {
        resetForm()
    }
})

const handleAddItem = (item: any) => {
    form.items.push(item)
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
        <div v-if="isBookingDrawerOpen" class="fixed inset-0 z-100 bg-text-secondary/20 backdrop-blur-sm" @click="store.closeBookingDrawer()"></div>
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
                <form id="drawerBookingForm" @submit.prevent="saveBooking" class="flex flex-col gap-6" @click.stop>
                    
                    <!-- Status -->
                    <div v-if="selectedBooking" class="form-control">
                        <label class="label pb-1"><span class="label-text text-text-muted text-[10px] font-bold uppercase tracking-widest">Estado</span></label>
                        <select
                            v-model="form.status"
                            :disabled="form.status === 'COMPLETADA'"
                            class="select bg-bg-card border-border-default focus:border-primary/50 w-full rounded-xl shadow-sm text-xs font-bold disabled:opacity-60">
                            <option value="PENDIENTE">PENDIENTE</option>
                            <option value="CONFIRMADA">CONFIRMADA</option>
                            <option value="CANCELADA">CANCELADA</option>
                            <option value="COMPLETADA">COMPLETADA</option>
                            <option value="AUSENTE">AUSENTE</option>
                        </select>
                    </div>

                    <!-- Date & Time Row -->
                    <div class="grid grid-cols-2 gap-4">
                        <div class="form-control">
                            <label class="label pb-1"><span class="label-text text-text-muted text-[10px] font-bold uppercase tracking-widest">Fecha *</span></label>
                            <input v-model="form.booking_date" type="date" required :disabled="form.status === 'COMPLETADA'" class="input bg-bg-card border-border-default focus:border-primary/50 h-11 w-full rounded-xl px-4 text-xs font-bold shadow-sm outline-none disabled:opacity-60" />
                        </div>
                        <div class="form-control">
                            <label class="label pb-1"><span class="label-text text-text-muted text-[10px] font-bold uppercase tracking-widest">Hora *</span></label>
                            <input v-model="form.start_time" type="time" required :disabled="form.status === 'COMPLETADA'" class="input bg-bg-card border-border-default focus:border-primary/50 h-11 w-full rounded-xl px-4 text-xs font-bold shadow-sm outline-none disabled:opacity-60" />
                        </div>
                    </div>

                    <!-- Client Selection -->
                    <BookingClientSelector 
                        ref="clientSelectorRef"
                        v-model="form.client_id" 
                        :clients="clients" 
                        :client-wallet="clientWallet" 
                        :available-bonuses="availableClientBonuses"
                        :disabled="form.status === 'COMPLETADA'"
                    />

                    <!-- Professional field removed (auto-assigned in background) -->

                    <div class="divider my-0 opacity-50"></div>

                    <!-- Services/Items -->
                    <div class="flex flex-col gap-3">
                        <div class="flex justify-between items-end">
                            <span class="text-primary text-[10px] font-bold uppercase tracking-widest">Servicios/Packs *</span>
                            <span class="text-text-muted text-[10px] font-bold tabular-nums">{{ form.duration }} min total</span>
                        </div>
                        
                        <!-- Item Selector Component -->
                        <BookingItemSelector 
                            ref="itemSelectorRef"
                            :services="services"
                            :bonuses="bonuses"
                            :available-bonuses="availableClientBonuses"
                            :client-wallet="clientWallet"
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

                    <div class="divider my-0 opacity-50"></div>

                    <!-- Notes -->
                    <div class="form-control pb-8">
                        <label class="label pb-1"><span class="label-text text-text-muted text-[10px] font-bold uppercase tracking-widest">Notas (Opcional)</span></label>
                        <textarea v-model="form.notes" rows="2" placeholder="Detalles de la reserva..." :disabled="form.status === 'COMPLETADA'"
                            class="textarea bg-bg-card border-border-default focus:border-primary/50 w-full rounded-xl px-4 py-3 text-xs font-medium shadow-sm outline-none disabled:opacity-60"></textarea>
                    </div>
                </form>
            </div>

            <!-- Footer -->
            <div class="border-border-subtle shrink-0 border-t bg-bg-card/90 px-6 py-5 backdrop-blur-md space-y-3">
                <NuxtLink 
                    v-if="selectedBooking && selectedBooking.booking_id && form.status !== 'COMPLETADA'" 
                    :to="`/tpv?booking_id=${selectedBooking.booking_id}`" 
                    class="btn btn-primary btn-outline w-full h-12 rounded-xl font-black uppercase tracking-widest shadow-sm"
                    @click="store.closeBookingDrawer()">
                    Cobrar en TPV
                </NuxtLink>
                <button v-if="form.status !== 'COMPLETADA'" type="submit" form="drawerBookingForm" class="btn text-bg-card hover:bg-text-secondary/90 bg-text-secondary w-full h-12 rounded-xl border-none font-black uppercase tracking-widest shadow-lg" :disabled="isSaving">
                    <span v-if="isSaving" class="loading loading-spinner"></span>
                    <span v-else>{{ selectedBooking ? 'Guardar Cambios' : 'Confirmar Reserva' }}</span>
                </button>
                <div v-show="showLocalError" class="mt-3 text-center">
                    <span class="text-[10px] font-bold text-error uppercase">{{ localError }}</span>
                </div>
            </div>
        </div>
    </Transition>

    <!-- Last Session Warning Modal -->
    <div class="modal modal-bottom sm:modal-middle" :class="{ 'modal-open': bonusWarningType !== 'NONE' }">
        <div class="modal-box bg-bg-app border border-border-subtle shadow-2xl">
            <h3 class="font-black uppercase tracking-wider text-lg text-primary">
                {{ bonusWarningType === 'FINISHED' ? '¡Bono Finalizado!' : '¡Última Sesión de Bono!' }}
            </h3>
            <p class="py-4 text-text-primary text-sm font-medium">
                <span v-if="bonusWarningType === 'FINISHED'">
                    Al confirmar esta cita, <strong>no le quedarán sesiones disponibles</strong> al cliente y el bono finalizará. Por favor, <strong>informa al cliente</strong> de esta situación.
                </span>
                <span v-else>
                    Has seleccionado un bono que se encuentra en su <strong>última sesión restante</strong>. Por favor, <strong>informa al cliente</strong> de que este bono se agotará próximamente.
                </span>
            </p>
            <div class="modal-action">
                <button type="button" class="btn btn-ghost hover:bg-bg-muted text-text-muted" @click="bonusWarningType = 'NONE'">Cancelar</button>
                <button type="button" class="btn bg-primary text-white hover:bg-primary/90 font-black uppercase tracking-widest border-none" @click="proceedSaveBooking()">Entendido, Confirmar Cita</button>
            </div>
        </div>
    </div>
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
