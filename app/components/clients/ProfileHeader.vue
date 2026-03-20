<script setup lang="ts">
import { ref, computed } from 'vue'
import { 
  Mail, Phone, Calendar, BadgeCheck, Plus,
  TrendingUp, CreditCard, Camera, ChevronDown, 
  FileSignature, FileText, ShieldOff, ImageUp
} from 'lucide-vue-next'
import EditableField from '~/components/shared/EditableField.vue'
import ImageCropperModal from '~/components/shared/ImageCropperModal.vue'

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

const emit = defineEmits(['update', 'new-booking', 'add-consent', 'add-questionnaire', 'add-revoke', 'toast'])

const avatarError = ref(false)
const isUploadingAvatar = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const handleAvatarError = () => {
  avatarError.value = true
}

const triggerAvatarUpload = () => {
  fileInput.value?.click()
}

const showCropper = ref(false)
const selectedImageSrc = ref('')
const currentFileMeta = ref<{ name: string, type: string } | null>(null)
const avatarTimestamp = ref(Date.now())

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  currentFileMeta.value = { name: file.name, type: file.type }

  // Use FileReader to create data URL for cropper
  const reader = new FileReader()
  reader.onload = (e) => {
    selectedImageSrc.value = e.target?.result as string
    showCropper.value = true
  }
  reader.readAsDataURL(file)

  // reset input so the same file can be selected again
  if (fileInput.value) fileInput.value.value = ''
}

const uploadCroppedImage = async (blob: Blob) => {
  isUploadingAvatar.value = true
  avatarError.value = false
  try {
    const formData = new FormData()
    formData.append('file', blob, currentFileMeta.value?.name || 'avatar.jpg')
    formData.append('category', 'usuarios')
    formData.append('type', 'clientes')

    const response = await $fetch<{ url: string }>('/api/multimedia/upload', {
      method: 'POST',
      body: formData
    })
    
    if (response.url) {
      avatarTimestamp.value = Date.now()
      emit('update', 'avatar', response.url)
      emit('toast', 'Avatar actualizado correctamente', 'success')
    }
  } catch (err: any) {
    emit('toast', err.data?.statusMessage || 'Error subiendo la imagen', 'error')
  } finally {
    isUploadingAvatar.value = false
  }
}

// Calculated Stats
const totalBookings = computed(() => props.client.client_bookings?.length || 0)
const totalSpent = computed(() => {
  return props.client.debts?.reduce((acc: number, d: any) => acc + d.amount, 0) || 0
})

const getStatusClass = (status: string) => status === 'ON' ? 'border-success' : 'border-error'
const getStatusBadge = (status: string) => status === 'ON' ? 'badge-success' : 'badge-error'
</script>

<template>
  <div class="glass-header relative z-30 overflow-visible rounded-3xl p-6 shadow-sm lg:p-8">
    <!-- Decorative background elements -->
    <div class="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/5 blur-3xl z-0 pointer-events-none"></div>
    <div class="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-secondary/5 blur-3xl z-0 pointer-events-none"></div>

    <div class="relative z-10 flex flex-col items-start gap-8 lg:flex-row lg:items-center">
      <!-- Avatar Section -->
      <div class="relative shrink-0">
        <div 
          class="aspect-square w-24 overflow-hidden rounded-full border-4 shadow-md md:w-32 group cursor-pointer relative transition-transform hover:scale-105"
          :class="getStatusClass(client.status)"
          @click="triggerAvatarUpload"
        >
          <div v-if="isUploadingAvatar" class="absolute inset-0 bg-black/60 z-20 flex flex-col items-center justify-center text-white">
             <span class="loading loading-spinner"></span>
          </div>
          <div class="absolute inset-0 bg-black/40 z-10 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera class="w-8 h-8 mb-1" />
            <span class="text-[9px] font-bold uppercase tracking-wider">Cambiar</span>
          </div>
          <img 
            v-if="client.avatar && !avatarError" 
            :src="`${client.avatar}?t=${avatarTimestamp}`" 
            class="h-full w-full object-cover"
            @error="handleAvatarError"
          />
          <div v-else class="bg-bg-muted flex h-full w-full items-center justify-center text-3xl font-bold text-text-muted">
            {{ client.name.charAt(0) }}{{ client.surname?.charAt(0) || '' }}
          </div>
        </div>
        <input type="file" class="hidden" ref="fileInput" accept="image/jpeg, image/png, image/webp" @change="handleFileSelect" />
        <div 
          class="absolute bottom-1 right-1 h-6 w-6 rounded-full border-4 border-white shadow-sm z-30 pointer-events-none"
          :class="client.status === 'ON' ? 'bg-success' : 'bg-error'"
        ></div>
      </div>

      <!-- Identity & Info -->
      <div class="flex-1 space-y-4">
        <div class="flex flex-wrap items-center gap-3">
          <div class="flex items-center gap-2 max-w-full overflow-hidden">
            <EditableField 
              :model-value="client.name" 
              label="Nombre"
              :is-mutating="isUpdating" 
              @save="emit('update', 'name', $event)" 
              class="text-text-primary text-3xl font-bold tracking-tight md:text-4xl"
            />
            <EditableField 
              :model-value="client.surname" 
              label="Apellido"
              :is-mutating="isUpdating" 
              @save="emit('update', 'surname', $event)" 
              class="text-text-primary text-3xl font-bold tracking-tight md:text-4xl"
            />
          </div>
          <BadgeCheck class="text-primary h-6 w-6" />
          <EditableField 
            :model-value="client.status" 
            label="Estado"
            type="select"
            :options="[{label:'Activo', value:'ON'}, {label:'Inactivo', value:'OFF'}]"
            :is-mutating="isUpdating" 
            @save="emit('update', 'status', $event)" 
          >
             <template #display>
                <div class="badge badge-sm font-bold uppercase cursor-pointer" :class="getStatusBadge(client.status)">
                  {{ client.status === 'ON' ? 'Activo' : 'Inactivo' }}
                </div>
             </template>
          </EditableField>
        </div>

        <div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium text-text-secondary">
          <div class="flex items-center gap-2">
            <Mail class="h-4 w-4 opacity-70" />
            <EditableField 
              :model-value="client.email" 
              label="Email"
              type="email"
              placeholder="correo@ejemplo.com"
              :is-mutating="isUpdating" 
              @save="emit('update', 'email', $event)" 
            >
              <template #display="{ value }">{{ value || 'Sin correo (Añadir)' }}</template>
            </EditableField>
          </div>
          <div class="flex items-center gap-2">
            <Phone class="h-4 w-4 opacity-70" />
            <EditableField 
              :model-value="client.phone" 
              label="Teléfono"
              type="tel"
              placeholder="+34..."
              :is-mutating="isUpdating" 
              @save="emit('update', 'phone', $event)" 
            >
               <template #display="{ value }">{{ value || 'Sin teléfono (Añadir)' }}</template>
            </EditableField>
          </div>
          <span class="flex items-center gap-2 cursor-default" title="Fecha de Alta (No editable)">
            <Calendar class="h-4 w-4 opacity-70" />
            Registrado: {{ new Date(client.created_at).toLocaleDateString() }}
          </span>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid w-full grid-cols-2 gap-4 md:flex md:w-auto md:gap-6">
        <div class="bg-bg-card/50 border-border-subtle flex flex-col rounded-2xl border p-4 shadow-sm backdrop-blur-sm md:w-32">
          <div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted">
            <TrendingUp class="h-3 w-3" />
            Citas
          </div>
          <div class="text-text-primary mt-1 text-2xl font-bold tabular-nums">
            {{ totalBookings }}
          </div>
        </div>
        <div class="bg-bg-card/50 border-border-subtle flex flex-col rounded-2xl border p-4 shadow-sm backdrop-blur-sm md:w-32">
          <div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted">
            <CreditCard class="h-3 w-3" />
            Deuda
          </div>
          <div class="text-text-primary mt-1 text-2xl font-bold tabular-nums">
            {{ totalSpent.toFixed(2) }}€
          </div>
        </div>
      </div>

      <!-- Actions Stack -->
      <div class="flex w-full gap-3 lg:w-auto lg:flex-col lg:justify-center">
        <button 
          @click="$emit('new-booking')"
          class="btn btn-primary btn-sm h-12 flex-1 rounded-xl px-6 font-bold lg:flex-none"
        >
          <Plus class="mr-2 h-4 w-4" />
          Nueva Cita
        </button>
        
        <div class="dropdown dropdown-end flex-1 lg:flex-none">
          <div tabindex="0" role="button" class="btn btn-ghost btn-sm h-12 w-full rounded-xl bg-bg-muted/50 px-6 font-bold hover:bg-bg-muted">
            Acciones
            <ChevronDown class="h-4 w-4 ml-1 opacity-70" />
          </div>
          <ul tabindex="0" class="dropdown-content z-50 menu p-2 shadow-xl bg-bg-card rounded-2xl w-56 border border-border-subtle mt-2">
            <li>
              <a @click="$emit('add-consent')" class="font-bold py-3 hover:bg-bg-muted text-text-primary">
                <FileSignature class="w-4 h-4 mr-2 text-success" /> Añadir Consentimiento
              </a>
            </li>
            <li>
              <a @click="$emit('add-questionnaire')" class="font-bold py-3 hover:bg-bg-muted text-text-primary">
                <FileText class="w-4 h-4 mr-2 text-info" /> Nuevo Cuestionario
              </a>
            </li>
            <li>
              <a @click="$emit('add-revoke')" class="font-bold py-3 hover:bg-bg-muted text-error">
                <ShieldOff class="w-4 h-4 mr-2" /> Revocar Consentimiento
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
    
    <ImageCropperModal 
      v-model="showCropper" 
      :image-src="selectedImageSrc"
      @crop="uploadCroppedImage"
    />
  </div>
</template>

<style scoped>
.glass-header {
  border: 1px solid rgba(255, 255, 255, 0.3);
}
</style>
