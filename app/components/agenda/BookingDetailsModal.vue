<script setup lang="ts">
import { ref, computed } from 'vue'
import { X, Calendar, Clock, User, Scissors, Package, FileText, Edit } from 'lucide-vue-next'
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

const { data: services } = useQuery({
    queryKey: ['services-agenda'],
    queryFn: () => $fetch<any[]>('/api/services'),
})

const { data: packs } = useQuery({
    queryKey: ['packs-agenda'],
    queryFn: () => $fetch<any[]>('/api/catalog/packs'),
})

const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Intl.DateTimeFormat('es-ES', { dateStyle: 'long' }).format(new Date(dateString))
}

const getItemDetails = computed(() => {
    if (!booking.value) return null
    if (booking.value.item_type === 'service' && services.value) {
        return services.value.find(s => s.service_id === booking.value.item_id)
    } else if (booking.value.item_type === 'pack' && packs.value) {
        return packs.value.find(p => p.pack_id === booking.value.item_id)
    }
    return null
})

const getStaffDetails = computed(() => {
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
            <div class="p-8 space-y-6 flex-1 overflow-y-auto">
                <div class="flex items-center justify-between p-4 bg-bg-muted/30 rounded-2xl border border-border-subtle group hover:border-primary/20 transition-all">
                    <div>
                        <p class="text-text-muted text-[10px] font-black uppercase tracking-widest mb-1">Estado Actual</p>
                        <span class="badge badge-lg font-bold uppercase ring-1 ring-inset" :class="{
                              'bg-warning/10 text-warning ring-warning/20': booking.status === 'pending',
                              'bg-success/10 text-success ring-success/20': booking.status === 'completed',
                              'bg-primary/10 text-primary ring-primary/20': booking.status === 'confirmed',
                              'bg-error/10 text-error ring-error/20': booking.status === 'cancelled' || booking.status === 'no_show',
                            }">{{ booking.status === 'no_show' ? 'Ausente' : booking.status }}</span>
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

                <div class="p-5 bg-primary/5 rounded-2xl border border-primary/20 relative overflow-hidden group">
                    <div class="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
                        <component :is="booking.item_type === 'pack' ? Package : Scissors" class="w-32 h-32" />
                    </div>
                    <div class="relative z-10">
                        <div class="flex items-center gap-2 mb-2 text-primary">
                            <component :is="booking.item_type === 'pack' ? Package : Scissors" class="w-4 h-4" />
                            <span class="text-[10px] font-black uppercase tracking-widest">{{ booking.item_type === 'pack' ? 'Bono Seleccionado' : 'Servicio Reservado' }}</span>
                        </div>
                        <p class="text-text-primary text-lg font-bold">{{ getItemDetails?.name || 'Recuperando catálogo...' }}</p>
                        <p class="text-text-muted text-xs font-bold uppercase mt-1">{{ booking.item_type }} ID: {{ booking.item_id.split('-')[0] }}</p>
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
            <div class="bg-bg-muted/30 border-border-default border-t px-8 py-5 flex items-center justify-end gap-3">
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
