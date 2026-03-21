<script setup lang="ts">
import { 
  MapPin, 
  UserCircle, 
  FileSignature, 
  Calendar,
  Eye,
  EyeOff,
  User
} from 'lucide-vue-next'
import { useDataPrivacy } from '~/composables/useDataPrivacy'
import EditableField from '~/components/shared/EditableField.vue'

const props = defineProps({
  client: {
    type: Object as PropType<any>,
    required: true
  },
  isUpdating: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update'])

const { revealedDocs, revealedLoading, toggleDocumentVisibility } = useDataPrivacy()

const formatDate = (dateStr: string) => {
  if (!dateStr) return '---'
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateStr))
}
</script>

<template>
  <div class="flex flex-col gap-6 md:grid md:grid-cols-2 md:items-start xl:flex xl:flex-col">
    <!-- Contact & Location Card -->
    <div class="bg-bg-card border-border-subtle overflow-hidden rounded-3xl border shadow-sm">
      <div class="border-border-subtle bg-text-secondary  border-b px-6 py-4">
        <h3 class="text-bg-card flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
          <MapPin class="h-4 w-4 text-bg-card" />
          Ubicación y Contacto
        </h3>
      </div>
      <div class="p-6 space-y-4">
        <div class="flex flex-col gap-1 w-full">
          <span class="text-text-muted text-[10px] font-black uppercase tracking-widest">Dirección</span>
          <EditableField 
            :model-value="client.address" 
            label="Dirección"
            :is-mutating="isUpdating" 
            @save="emit('update', 'address', $event)" 
            class="text-text-primary text-sm font-bold leading-tight"
          />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="flex w-full flex-col gap-1">
            <span class="text-text-muted text-[10px] font-black tracking-widest uppercase">Ciudad</span>
            <EditableField 
              :model-value="client.city" 
              label="Ciudad"
              :is-mutating="isUpdating" 
              @save="emit('update', 'city', $event)" 
              class="text-text-primary text-sm font-bold"
            />
          </div>
          <div class="flex w-full flex-col gap-1">
            <span class="text-text-muted text-[10px] font-black tracking-widest uppercase">C.P.</span>
            <EditableField 
              :model-value="client.postal_code" 
              label="Código Postal"
              :is-mutating="isUpdating" 
              @save="emit('update', 'postal_code', $event)" 
              class="text-text-primary text-sm font-bold"
            />
          </div>
          <div class="flex w-full flex-col gap-1 col-span-2">
            <span class="text-text-muted text-[10px] font-black tracking-widest uppercase">País</span>
            <EditableField 
              :model-value="client.country" 
              label="País"
              :is-mutating="isUpdating" 
              @save="emit('update', 'country', $event)" 
              class="text-text-primary text-sm font-bold"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Document Info Card -->
    <div class="bg-bg-card border-border-subtle overflow-hidden rounded-3xl border shadow-sm">
      <div class="border-border-subtle bg-text-secondary border-b px-6 py-4">
        <h3 class="text-bg-card flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
          <FileSignature class="h-4 w-4 text-bg-card" />
          Identificación
        </h3>
      </div>
      <div class="p-6 space-y-4">
        <div class="flex items-center justify-between gap-4">
          <div class="flex flex-col gap-1 w-full flex-1 min-w-0">
            <div class="w-fit">
              <EditableField
                :model-value="client.document_type"
                label="Tipo Doc"
                type="select"
                :options="[{label:'DNI', value:'DNI'}, {label:'PASSPORT', value:'PASSPORT'}, {label:'NIE', value:'NIE'}]"
                :is-mutating="isUpdating"
                @save="emit('update', 'document_type', $event)"
                class="text-text-muted text-[10px] font-black uppercase tracking-widest"
              >
                 <template #display="{ value }">{{ value || 'TIPO DOC' }}</template>
              </EditableField>
            </div>
            
            <EditableField
              :model-value="client.document_number"
              label="Número Doc"
              :is-mutating="isUpdating"
              @save="emit('update', 'document_number', $event)"
              class="text-text-primary font-mono text-sm font-black tabular-nums tracking-wider w-full"
            >
               <template #display>
                 <span class="truncate">{{ revealedDocs[client.user_id] || client.document_number || '---' }}</span>
               </template>
            </EditableField>
          </div>

          <button 
            @click="toggleDocumentVisibility(client.user_id, client.document_number)"
            class="btn btn-circle btn-ghost btn-xs text-text-muted hover:text-primary transition-colors shrink-0"
            :disabled="revealedLoading[client.user_id]"
            title="Mostrar/Ocultar"
          >
            <span v-if="revealedLoading[client.user_id]" class="loading loading-spinner h-3 w-3"></span>
            <component 
              v-else 
              :is="revealedDocs[client.user_id] ? EyeOff : Eye" 
              class="h-3.5 w-3.5"
            />
          </button>
        </div>
        <div class="bg-primary/5 flex items-center gap-3 rounded-2xl p-4">
           <User class="h-8 w-8 text-primary opacity-20 shrink-0" />
           <p class="text-primary text-[11px] font-bold leading-relaxed">
             Asegúrate de verificar la identidad del cliente antes de realizar tratamientos médicos.
           </p>
        </div>
      </div>
    </div>

    <!-- Demographic Card -->
    <div class="bg-bg-card border-border-subtle overflow-hidden rounded-3xl border shadow-sm md:col-span-2 xl:col-span-1">
      <div class="border-border-subtle bg-text-secondary border-b px-6 py-4">
        <h3 class="text-bg-card flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
          <Calendar class="h-4 w-4 text-bg-card" />
          Datos Demográficos
        </h3>
      </div>
      <div class="p-6 space-y-4">
        <div class="flex justify-between items-center border-b border-border-subtle pb-3 gap-4">
          <span class="text-text-muted text-xs font-bold uppercase shrink-0">Nacimiento</span>
          <EditableField
            :model-value="client.birth_date"
            label="Nacimiento"
            type="date"
            :is-mutating="isUpdating"
            @save="emit('update', 'birth_date', $event)"
            class="text-text-primary text-sm font-bold w-auto ml-auto flex justify-end"
          >
             <template #display>{{ formatDate(client.birth_date) }}</template>
          </EditableField>
        </div>
        <div class="flex justify-between items-center border-b border-border-subtle pb-3 gap-4">
          <span class="text-text-muted text-xs font-bold uppercase shrink-0">Género</span>
          <EditableField
            :model-value="client.gender"
            label="Género"
            type="select"
            :options="[{label:'Female', value:'Female'}, {label:'Male', value:'Male'}, {label:'Other', value:'Other'}]"
            :is-mutating="isUpdating"
            @save="emit('update', 'gender', $event)"
            class="text-text-primary text-sm font-bold capitalize w-auto ml-auto flex justify-end"
          >
             <template #display="{ value }">{{ value || 'No especificado' }}</template>
          </EditableField>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-text-muted text-xs font-bold uppercase shrink-0">Alta</span>
          <span class="text-text-primary text-sm font-bold flex p-1">{{ formatDate(client.created_at) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
