<script setup lang="ts">
import { 
  Calendar, 
  FileSignature, 
  FileText, 
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-vue-next'

const props = defineProps({
  client: {
    type: Object as PropType<any>,
    required: true
  }
})

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return 'N/A'
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed': return CheckCircle2
    case 'cancelled': return XCircle
    case 'pending': return Clock
    default: return AlertCircle
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'text-success'
    case 'cancelled': return 'text-error'
    case 'pending': return 'text-warning'
    default: return 'text-primary'
  }
}

// Combine all activities into a timeline
const timeline = computed(() => {
  const activities: any[] = []
  
  // Bookings
  props.client.client_bookings?.forEach((b: any) => {
    activities.push({
      id: b.booking_id,
      date: new Date(b.booking_date),
      type: 'booking',
      title: `Cita: ${b.item_type}`,
      status: b.status,
      icon: Calendar,
      color: 'bg-primary/10 text-primary'
    })
  })

  // Consents
  props.client.consents?.forEach((c: any) => {
    activities.push({
      id: c.consent_id,
      date: new Date(c.signed_date),
      type: 'consent',
      title: `Consentimiento: ${c.consent_type || 'General'}`,
      status: c.status,
      icon: FileSignature,
      color: 'bg-success/10 text-success'
    })
  })

  // Questionnaires
  props.client.questionnaires?.forEach((q: any) => {
    activities.push({
      id: q.questionnaire_id,
      date: new Date(q.created_at),
      type: 'questionnaire',
      title: `Formulario: ${q.title}`,
      status: 'completado',
      icon: FileText,
      color: 'bg-info/10 text-info'
    })
  })

  // Sort by date desc
  return activities.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10)
})
</script>

<template>
  <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
    <!-- Activity Timeline -->
    <div class="bg-bg-card border-border-subtle overflow-hidden rounded-3xl border shadow-sm">
      <div class="border-border-subtle bg-bg-muted/30 flex items-center justify-between border-b px-6 py-4">
        <h3 class="text-text-primary text-sm font-bold uppercase tracking-wider">Actividad Reciente</h3>
        <span class="text-text-muted text-[10px] font-bold uppercase">{{ timeline.length }} Eventos</span>
      </div>
      <div class="p-6">
        <div v-if="timeline.length > 0" class="relative space-y-8 before:absolute before:left-[11px] before:top-2 before:h-[calc(100%-16px)] before:w-0.5 before:bg-border-subtle">
          <div v-for="event in timeline" :key="event.id" class="relative flex gap-4 pl-8">
            <!-- Timeline Dot/Icon -->
            <div 
              class="absolute left-0 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white shadow-sm"
              :class="event.color"
            >
              <component :is="event.icon" class="h-3 w-3" />
            </div>
            
            <div class="flex-1">
              <div class="flex items-center justify-between">
                <h4 class="text-text-primary text-sm font-bold leading-none">{{ event.title }}</h4>
                <time class="text-text-muted text-[10px] font-medium uppercase">{{ formatDateTime(event.date) }}</time>
              </div>
              <div class="mt-2 flex items-center gap-2">
                <component :is="getStatusIcon(event.status)" class="h-3 w-3" :class="getStatusColor(event.status)" />
                <span class="text-text-muted text-xs font-semibold capitalize">{{ event.status }}</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="flex flex-col items-center justify-center py-10 text-center">
          <Clock class="text-text-muted mb-3 h-8 w-8 opacity-20" />
          <p class="text-text-muted text-sm font-bold uppercase tracking-wide">Sin actividad registrada</p>
        </div>
      </div>
    </div>

    <!-- Quick Insights / Notes -->
    <div class="flex flex-col gap-6">
      <div class="bg-bg-card border-border-subtle overflow-hidden rounded-3xl border shadow-sm">
        <div class="border-border-subtle bg-bg-muted/30 border-b px-6 py-4">
          <h3 class="text-text-primary text-sm font-bold uppercase tracking-wider">Notas del CRM</h3>
        </div>
        <div class="p-6">
          <textarea 
            class="textarea textarea-bordered border-border-subtle bg-bg-muted/30 h-32 w-full rounded-2xl p-4 text-sm font-medium focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="Añadir una nota rápida sobre este cliente..."
          ></textarea>
          <button class="btn btn-primary btn-sm mt-4 w-full rounded-xl font-bold">
            Guardar Nota
          </button>
        </div>
      </div>

      <div class="bg-primary border-primary/20 relative overflow-hidden rounded-3xl p-6 text-white shadow-lg">
        <div class="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
        <h3 class="relative text-lg font-bold">Resumen de Cuenta</h3>
        <p class="relative mt-1 text-sm font-medium opacity-80">Estado financiero y comercial</p>
        
        <div class="relative mt-6 grid grid-cols-2 gap-4">
          <div class="bg-white/10 rounded-2xl p-4 backdrop-blur-md">
            <span class="text-[10px] font-black uppercase opacity-60">Total Venta</span>
            <p class="text-xl font-black">--- €</p>
          </div>
          <div class="bg-white/10 rounded-2xl p-4 backdrop-blur-md">
            <span class="text-[10px] font-black uppercase opacity-60">Puntos Beils</span>
            <p class="text-xl font-black">1.250</p>
          </div>
        </div>
        
        <button class="btn btn-ghost btn-sm relative mt-6 w-full rounded-xl bg-white/20 font-bold hover:bg-white/30">
          Ver Detalles Financieros
          <ArrowRight class="ml-2 h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
</template>
