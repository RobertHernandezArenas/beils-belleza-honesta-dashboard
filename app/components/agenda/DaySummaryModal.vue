<script setup lang="ts">
import { ref } from 'vue'
import { Clock, Scissors, User as UserIcon, Ticket, Package, Gift, X } from 'lucide-vue-next'

const isOpen = ref(false)
const selectedDate = ref(new Date())
const dayBookings = ref<any[]>([])

const emit = defineEmits(['edit', 'create'])

const openModal = (date: Date, bookings: any[]) => {
    selectedDate.value = date
    dayBookings.value = bookings
    isOpen.value = true
}

const closeModal = () => {
    isOpen.value = false
}

const getStatusColorClip = (status: string) => {
    const key = (status || 'pending').toLowerCase()
    const map: Record<string, string> = {
        pending: 'bg-orange-500/10 text-orange-700 border border-orange-500/30',
        pendiente: 'bg-orange-500/10 text-orange-700 border border-orange-500/30',
        confirmed: 'bg-primary/10 text-primary border border-primary/30',
        confirmada: 'bg-primary/10 text-primary border border-primary/30',
        completed: 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/30',
        completada: 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/30',
        cancelled: 'bg-stone-500/10 text-stone-500 opacity-60 border border-stone-500/30',
        cancelada: 'bg-stone-500/10 text-stone-500 opacity-60 border border-stone-500/30',
    }
    return map[key] || 'bg-bg-muted text-text-muted border border-border-default'
}

defineExpose({ openModal, closeModal })
</script>

<template>
    <dialog class="modal modal-bottom sm:modal-middle" :class="{ 'modal-open': isOpen }">
        <div class="modal-box bg-bg-card text-text-secondary w-full max-w-md rounded-t-3xl sm:rounded-3xl p-0 shadow-2xl">
            <!-- Header -->
            <div class="border-b border-border-subtle bg-bg-muted/30 px-6 py-4 flex items-center justify-between backdrop-blur-md">
                <div>
                    <h3 class="text-lg font-black uppercase tracking-wider text-text-primary">
                        Citas del Día
                    </h3>
                    <p class="text-[10px] font-bold text-primary uppercase tracking-widest mt-0.5">
                        {{ selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) }}
                    </p>
                </div>
                <button type="button" class="btn btn-sm btn-circle btn-ghost text-text-muted bg-bg-muted hover:text-text-primary" @click="closeModal">
                    <X class="h-4 w-4" />
                </button>
            </div>

            <!-- Body -->
            <div class="custom-scrollbar max-h-[60vh] overflow-y-auto p-4 flex flex-col gap-2">
                <button
                    v-for="booking in dayBookings"
                    :key="booking.booking_id"
                    @click="closeModal(); emit('edit', booking)"
                    class="flex flex-col w-full text-left p-3 rounded-xl transition-all hover:scale-[1.02] hover:shadow-md"
                    :class="getStatusColorClip(booking.status)">
                    
                    <div class="flex items-start justify-between w-full">
                        <div class="flex items-center gap-2">
                            <span class="text-sm font-black tabular-nums">{{ booking.start_time }}</span>
                            <span class="text-xs font-bold uppercase">{{ booking.client?.name }} {{ booking.client?.surname }}</span>
                        </div>
                        <span class="text-[9px] font-bold uppercase opacity-80 mt-0.5">{{ booking.duration }} min</span>
                    </div>

                    <div class="flex items-center gap-2 mt-2 opacity-80 text-[10px] font-semibold">
                        <span v-if="booking.staff" class="flex items-center gap-1"><UserIcon class="h-3 w-3" /> {{ booking.staff.name }}</span>
                    </div>

                    <div v-if="booking.booking_items?.length" class="mt-2 flex flex-wrap gap-1">
                        <span v-for="it in booking.booking_items" :key="it.item_id" class="text-[9px] bg-white/40 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold">
                            <Scissors v-if="it.item_type === 'SERVICE'" class="h-2 w-2" />
                            <Ticket v-else-if="it.item_type === 'BONUS'" class="h-2 w-2" />
                            <Gift v-else class="h-2 w-2" />
                            {{ it.name }}
                        </span>
                    </div>
                </button>

                <div v-if="dayBookings.length === 0" class="py-8 text-center flex flex-col items-center justify-center text-text-muted">
                    <p class="text-xs font-bold uppercase mb-4">No hay citas en este día</p>
                </div>
            </div>

            <!-- Footer -->
            <div class="p-4 border-t border-border-subtle bg-bg-muted/10">
                <button 
                    @click="closeModal(); emit('create', selectedDate, '10:00')"
                    class="btn bg-text-primary text-bg-card w-full h-12 rounded-xl font-bold uppercase tracking-widest shadow-md">
                    Crear nueva cita aquí
                </button>
            </div>
        </div>
        <form method="dialog" class="modal-backdrop bg-text-primary/20 backdrop-blur-sm" @click="closeModal"><button>close</button></form>
    </dialog>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 99px; }
</style>
