<script setup lang="ts">
import { X, Calendar, Clock, User, Scissors, Package, FileText, Edit, Ticket, Gift } from 'lucide-vue-next'
import { useQuery } from '@tanstack/vue-query'

const modalRef = ref<HTMLDialogElement | null>(null)
const booking = ref<any | null>(null)

const emit = defineEmits(['edit'])

// Fetch Data for mapping names over IDs
const { data: staff } = useQuery({
    queryKey: ['staff-agenda'],
    queryFn: () => $fetch<any[]>('/api/users', {
        query: { roles: 'ADMIN,STAFF' }
    }),
})

const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Intl.DateTimeFormat('es-ES', { dateStyle: 'long' }).format(new Date(dateString))
}

const getStaffDetails = computed(() => {
    // Priority 1: Data already included in the booking object
    if (booking.value?.staff) return booking.value.staff
    
    // Priority 2: Lookup in the global staff list if not provided in the object
    if (!booking.value?.staff_id || !staff.value) return null
    return staff.value.find((s: any) => s.user_id === booking.value.staff_id)
})

const open = (b: any) => {
    booking.value = b
    modalRef.value?.showModal()
}

const close = () => {
    modalRef.value?.close()
    setTimeout(() => { booking.value = null }, 200)
}

const handleEdit = () => {
    close()
    setTimeout(() => {
        emit('edit', booking.value)
    }, 150)
}

const getStatusClass = (status: string) => {
    const s = (status || 'PENDIENTE').toUpperCase()
    if (s === 'PENDIENTE') return 'bg-warning/10 text-warning ring-warning/20'
    if (s === 'CONFIRMADA') return 'bg-primary/10 text-primary ring-primary/20'
    if (s === 'CANCELADA') return 'bg-error/10 text-error ring-error/20'
    if (s === 'COMPLETADA') return 'bg-success/10 text-success ring-success/20'
    if (s === 'AUSENTE') return 'bg-gray-500/10 text-gray-500 ring-gray-500/20'
    return 'bg-bg-muted text-text-muted ring-border-default'
}

const getStatusLabel = (status: string) => {
    const s = (status || 'PENDIENTE').toUpperCase()
    const map: any = {
        'PENDIENTE': 'Pendiente',
        'CONFIRMADA': 'Confirmada',
        'CANCELADA': 'Cancelada',
        'COMPLETADA': 'Finalizada',
        'AUSENTE': 'No asiste'
    }
    return map[s] || s
}

defineExpose({ open, close })
</script>

<template>
<dialog ref="modalRef" class="modal">
    <div class="modal-box bg-bg-card p-0 rounded-4xl max-w-lg shadow-2xl overflow-hidden border border-border-default relative">
        <div v-if="booking" class="flex flex-col h-full">
            
            <!-- Header -->
            <div class="bg-bg-muted/30 border-border-default border-b px-8 py-5 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="bg-primary/10 text-primary w-10 h-10 flex items-center justify-center rounded-xl shadow-inner">
                        <Calendar class="w-5 h-5" />
                    </div>
                    <div>
                        <h3 class="text-xl font-bold tracking-tight">Detalle de la Cita</h3>
                        <p class="text-text-muted text-xs font-bold uppercase tracking-wider">Ref: #{{ booking.booking_id.split('-')[0].toUpperCase() }}</p>
                    </div>
                </div>
                <button @click="close" class="btn btn-ghost btn-circle btn-sm hover:bg-error/10 hover:text-error transition-colors">
                    <X class="w-5 h-5" />
                </button>
            </div>

            <!-- Content -->
            <div class="p-8 space-y-6 flex-1 overflow-y-auto max-h-[60vh] custom-scrollbar">
                <div class="flex items-center justify-between p-4 bg-bg-muted/30 rounded-2xl border border-border-subtle group hover:border-primary/20 transition-all">
                    <div>
                        <p class="text-text-muted text-[10px] font-black uppercase tracking-widest mb-1">Estado Actual</p>
                        <span class="badge badge-lg font-bold uppercase ring-1 ring-inset" :class="getStatusClass(booking.status)">
                            {{ getStatusLabel(booking.status) }}
                        </span>
                    </div>
                    <div class="text-right">
                        <p class="text-text-muted text-[10px] font-black uppercase tracking-widest mb-1">Fecha Programada</p>
                        <p class="text-text-primary text-sm font-bold">{{ formatDate(booking.booking_date) }}</p>
                    </div>
                </div>

                <!-- Info Grid -->
                <div class="grid grid-cols-2 gap-4">
                    <div class="p-4 bg-bg-muted/50 rounded-2xl border border-border-subtle">
                        <div class="flex items-center gap-2 mb-2 text-text-muted">
                            <Clock class="w-4 h-4" />
                            <span class="text-[10px] font-black uppercase tracking-widest">Horario Estimado</span>
                        </div>
                        <p class="text-text-primary text-sm font-bold">{{ booking.start_time }} - {{ booking.end_time }}</p>
                        <p class="text-text-muted text-xs mt-0.5 font-bold uppercase">{{ booking.duration }} mins</p>
                    </div>
                    <div class="p-4 bg-bg-muted/50 rounded-2xl border border-border-subtle">
                        <div class="flex items-center gap-2 mb-2 text-text-muted">
                            <User class="w-4 h-4" />
                            <span class="text-[10px] font-black uppercase tracking-widest">Profesional</span>
                        </div>
                        <p class="text-text-primary text-sm font-bold" v-if="getStaffDetails">{{ getStaffDetails.name }} {{ getStaffDetails.surname }}</p>
                        <p class="text-text-muted text-sm font-bold uppercase" v-else>Sin Asignar</p>
                    </div>
                </div>

                <!-- Items List -->
                <div class="space-y-3">
                    <p class="text-text-muted text-[10px] font-black uppercase tracking-widest px-1">Servicios Agendados</p>
                    <div v-for="(it, idx) in booking.booking_items" :key="idx" 
                        class="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-center gap-4 relative overflow-hidden group">
                        <div class="bg-primary/20 text-primary w-10 h-10 flex items-center justify-center rounded-xl shrink-0 transition-transform group-hover:scale-110">
                            <Scissors v-if="it.item_type === 'SERVICE'" class="w-5 h-5" />
                            <Ticket v-else-if="it.item_type === 'BONUS'" class="w-5 h-5" />
                            <Package v-else-if="it.item_type === 'PACK'" class="w-5 h-5" />
                            <Gift v-else class="w-5 h-5" />
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-text-primary text-sm font-bold truncate">{{ it.name }}</p>
                            <p class="text-text-muted text-[10px] font-bold uppercase tracking-wider">{{ it.item_type }} • {{ it.duration }} mins</p>
                        </div>
                    </div>
                    <div v-if="!booking.booking_items || booking.booking_items.length === 0" class="text-center py-4 bg-bg-muted/30 rounded-2xl border border-dashed border-border-subtle">
                        <p class="text-text-muted text-xs italic font-medium">No hay servicios detallados</p>
                    </div>
                </div>

                <div v-if="booking.notes" class="p-4 bg-warning/5 rounded-2xl border border-warning/20 border-dashed">
                    <div class="flex items-center gap-2 mb-2 text-warning">
                        <FileText class="w-4 h-4" />
                        <span class="text-[10px] font-black uppercase tracking-widest">Notas del Centro</span>
                    </div>
                    <p class="text-text-secondary text-sm font-medium italic">"{{ booking.notes }}"</p>
                </div>
            </div>

            <!-- Footer Actions -->
            <div class="bg-bg-muted/30 border-border-default border-t px-8 py-5 flex items-center justify-end gap-3 rounded-b-4xl">
                <button @click="close" class="btn btn-ghost rounded-xl font-bold">Cerrar Detalle</button>
                <button @click="handleEdit" class="btn btn-primary rounded-xl font-bold border-none shadow-lg shadow-primary/20 gap-2">
                    <Edit class="w-4 h-4" />
                    Modificar Cita
                </button>
            </div>
        </div>
    </div>
</dialog>
</template>

