<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { useRoute } from 'vue-router'
import {
  ArrowLeft,
  AlertCircle,
  ExternalLink,
  FileSignature,
  FileText,
  CalendarDays,
  CheckCircle2
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

import ProfileHeader from '~/components/clients/ProfileHeader.vue'
import ProfileTabs from '~/components/clients/ProfileTabs.vue'
import ProfileInfoSidebar from '~/components/clients/ProfileInfoSidebar.vue'
import ProfileOverview from '~/components/clients/ProfileOverview.vue'

import ConsentFormModal from '~/components/clients/ConsentFormModal.vue'
import QuestionnaireFormModal from '~/components/clients/QuestionnaireFormModal.vue'
import BookingFormModal from '~/components/agenda/BookingFormModal.vue'
import RevokeFormModal from '~/components/clients/RevokeFormModal.vue'
import DebtDetailsModal from '~/components/clients/DebtDetailsModal.vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'

definePageMeta({ layout: 'default' })
const { locale } = useI18n()
const route = useRoute()
const clientId = route.params.id as string
const queryClient = useQueryClient()

// Toast State
const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')
const showToast = ref(false)

const addToast = (payload: { message: string, type?: 'success' | 'error' } | string, type: 'success' | 'error' = 'success') => {
  if (typeof payload === 'object') {
    toastMessage.value = payload.message
    toastType.value = payload.type || 'success'
  } else {
    toastMessage.value = payload
    toastType.value = type
  }
  showToast.value = true
  setTimeout(() => (showToast.value = false), 3000)
}

const currentTab = ref('overview') // overview, bookings, documents, billing

const {
  data: client,
  isPending,
  error,
} = useQuery<any, any>({
  queryKey: ['client', clientId],
  queryFn: () => $fetch(`/api/clients/${clientId}`),
})

useHead({
  title: computed(() =>
    client.value ? `${client.value.name} ${client.value.surname} | Perfil CRM` : 'Cargando Cliente...',
  ),
})

const formatDate = (dateStr: string) => {
  if (!dateStr) return 'N/A'
  return new Intl.DateTimeFormat(locale.value, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateStr))
}

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return 'N/A'
  return new Intl.DateTimeFormat(locale.value, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))
}

// Counts for tabs
const counts = computed(() => ({
  bookings: client.value?.client_bookings?.length || 0,
  documents: (client.value?.consents?.length || 0) + (client.value?.questionnaires?.length || 0),
  debts: client.value?.debts?.length || 0
}))

// Modal States
const isConsentModalOpen = ref(false)
const isQuestionnaireModalOpen = ref(false)
const isRevokeModalOpen = ref(false)
const bookingModalRef = ref<any>(null)
const debtDetailsModalRef = ref<any>(null)

const mockItemToEdit = computed(() => {
  if (!client.value) return null
  return { user_id: clientId, user: client.value }
})

// Update Client Mutation
const { mutate: updateClient, isPending: isUpdating } = useMutation({
  mutationFn: async (data: Record<string, any>) => {
    return await $fetch(`/api/clients/${clientId}`, {
      method: 'PUT',
      body: data
    })
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['client', clientId] })
    addToast('Perfil actualizado correctamente', 'success')
  },
  onError: (err: any) => {
    addToast(err.data?.statusMessage || 'Error al actualizar el perfil', 'error')
  }
})

const handleFieldUpdate = (field: string, value: any) => {
  updateClient({ [field]: value })
}

const handleNewBooking = () => {
  bookingModalRef.value?.showModal(null, new Date(), clientId)
}
</script>

<template>
  <div class="bg-bg-app overflow-x-clip min-h-screen w-full p-4 font-sans lg:p-10">
    <div class="mx-auto max-w-[1400px]">
      <!-- Breadcrumbs / Back button -->
      <div class="mb-8 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <NuxtLink
            to="/clientes"
            class="btn btn-circle btn-ghost bg-bg-card border-border-subtle hover:border-text-secondary border shadow-sm transition-all hover:scale-105"
          >
            <ArrowLeft class="text-text-primary h-5 w-5" />
          </NuxtLink>
          <div class="flex flex-col">
            <h1 class="text-text-primary text-2xl font-bold tracking-tight">Ficha de Cliente</h1>
            <p class="text-text-muted text-xs font-medium uppercase tracking-widest">Gestión CRM Beils</p>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isPending" class="space-y-8">
        <div class="animate-pulse bg-bg-card h-64 w-full rounded-3xl"></div>
        <div class="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_2.5fr]">
          <div class="animate-pulse bg-bg-card h-96 rounded-3xl"></div>
          <div class="animate-pulse bg-bg-card h-96 rounded-3xl"></div>
        </div>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="bg-error/10 text-error flex flex-col items-center justify-center rounded-3xl p-20 text-center shadow-inner"
      >
        <AlertCircle class="mb-4 h-16 w-16 opacity-50" />
        <h2 class="text-2xl font-bold">Error al cargar el perfil</h2>
        <p class="mt-2 text-sm font-medium opacity-80 max-w-md">
          {{ error.statusMessage || 'No hemos podido conectar con el servidor para obtener los datos del cliente.' }}
        </p>
        <button @click="navigateTo('/clientes')" class="btn btn-error btn-sm mt-8 rounded-xl font-bold">
          Volver al Listado
        </button>
      </div>

      <!-- Content -->
      <div v-else-if="client" class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <!-- 1. Full Width Header -->
        <ProfileHeader 
          :client="client" 
          :is-updating="isUpdating"
          @update="handleFieldUpdate"
          @new-booking="handleNewBooking"
          @add-consent="isConsentModalOpen = true"
          @add-questionnaire="isQuestionnaireModalOpen = true"
          @add-revoke="isRevokeModalOpen = true"
          @toast="addToast"
        />

        <!-- 2. Main Navigation Tabs sticky -->
        <div class="sticky top-6 z-20">
          <div class="bg-bg-card/80 border-border-subtle overflow-hidden rounded-3xl border shadow-lg backdrop-blur-xl">
            <ProfileTabs v-model="currentTab" :counts="counts" />
          </div>
        </div>

        <!-- 3. Two Column Layout -->
        <div class="flex flex-col-reverse gap-8 xl:grid xl:grid-cols-[340px_1fr] 2xl:grid-cols-[380px_1fr]">
          <!-- Left Sidebar -->
          <aside class="space-y-6">
            <ProfileInfoSidebar 
              :client="client" 
              :is-updating="isUpdating"
              @update="handleFieldUpdate"
            />
          </aside>

          <!-- Right Content Area -->
          <main class="min-h-[600px] w-full min-w-0">
            <Transition name="page" mode="out-in">
              <!-- OVERVIEW TAB -->
              <div v-if="currentTab === 'overview'" key="overview">
                <ProfileOverview :client="client" />
              </div>

              <!-- BOOKINGS TAB -->
              <div v-else-if="currentTab === 'bookings'" key="bookings" class="bg-bg-card border-border-subtle overflow-hidden rounded-3xl border shadow-sm">
                <div class="border-border-subtle bg-bg-muted/30 border-b px-6 py-4">
                  <h3 class="text-text-primary text-sm font-bold uppercase tracking-wider">Historial Completo de Citas</h3>
                </div>
                <div class="overflow-x-auto">
                  <table v-if="client.client_bookings?.length > 0" class="table w-full">
                    <thead class="bg-bg-muted/50 text-text-secondary border-b border-border-default h-14">
                      <tr>
                        <th class="pl-6 text-xs font-black uppercase">Fecha y Hora</th>
                        <th class="text-xs font-black uppercase">Servicio / Pack</th>
                        <th class="text-xs font-black uppercase">Estado</th>
                        <th class="text-xs font-black uppercase text-right pr-6">Acciones</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-border-subtle">
                      <tr v-for="booking in client.client_bookings" :key="booking.booking_id" class="group hover:bg-bg-muted/30 transition-colors h-16">
                        <td class="pl-6">
                          <div class="flex flex-col">
                            <span class="text-text-primary text-sm font-bold">{{ formatDate(booking.booking_date) }}</span>
                            <span class="text-text-muted text-[11px] font-bold">{{ booking.start_time }} - {{ booking.end_time }}</span>
                          </div>
                        </td>
                        <td>
                          <div class="flex items-center gap-2">
                            <div class="bg-primary/10 h-8 w-8 rounded-lg flex items-center justify-center">
                               <CalendarDays class="h-4 w-4 text-primary" />
                            </div>
                            <span class="text-text-primary text-sm font-bold capitalize">{{ booking.item_type }}</span>
                          </div>
                        </td>
                        <td>
                          <span
                            class="badge badge-sm font-bold uppercase ring-1 ring-inset"
                            :class="{
                              'bg-warning/10 text-warning ring-warning/20': booking.status === 'pending',
                              'bg-success/10 text-success ring-success/20': booking.status === 'completed',
                              'bg-primary/10 text-primary ring-primary/20': booking.status === 'confirmed',
                              'bg-error/10 text-error ring-error/20': booking.status === 'cancelled' || booking.status === 'no_show',
                            }"
                          >
                            {{ booking.status }}
                          </span>
                        </td>
                        <td class="text-right pr-6">
                          <button class="btn btn-ghost btn-xs rounded-lg hover:bg-primary/10 hover:text-primary transition-all">
                            Detalles
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div v-else class="flex flex-col items-center justify-center py-20 text-center">
                    <CalendarDays class="text-text-muted mb-4 h-12 w-12 opacity-20" />
                    <p class="text-text-primary text-lg font-bold">Sin historial de citas</p>
                    <p class="text-text-muted mt-1 text-sm">Este cliente aún no ha agendado su primera sesión.</p>
                  </div>
                </div>
              </div>

              <!-- DOCUMENTS TAB -->
              <div v-else-if="currentTab === 'documents'" key="documents" class="space-y-8">
                <!-- Consents -->
                <div class="bg-bg-card border-border-subtle overflow-hidden rounded-3xl border shadow-sm">
                  <div class="border-border-subtle bg-bg-muted/30 border-b px-6 py-4">
                    <h3 class="text-text-primary text-sm font-bold uppercase tracking-wider">Consentimientos Informados</h3>
                  </div>
                  <div class="p-6">
                    <div v-if="client.consents?.length > 0" class="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div v-for="consent in client.consents" :key="consent.consent_id" class="bg-bg-muted/50 border-border-subtle hover:border-primary/30 flex items-center gap-4 rounded-2xl border p-4 transition-all hover:scale-[1.02]">
                        <div class="bg-success/20 text-success flex h-10 w-10 items-center justify-center rounded-xl shadow-inner">
                          <FileSignature class="h-5 w-5" />
                        </div>
                        <div class="flex-1 min-w-0">
                          <h4 class="text-text-primary truncate text-sm font-bold uppercase leading-none">{{ consent.consent_type || 'General' }}</h4>
                          <p class="text-text-muted mt-1 text-[10px] font-bold uppercase tracking-wider">Firmado el {{ formatDate(consent.signed_date) }}</p>
                        </div>
                        <a :href="consent.document_url" target="_blank" class="btn btn-ghost btn-square btn-sm rounded-xl">
                          <ExternalLink class="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                    <div v-else class="flex flex-col items-center justify-center py-12 text-center">
                      <FileSignature class="text-text-muted mb-4 h-12 w-12 opacity-20" />
                      <p class="text-text-primary font-bold">Sin consentimientos firmados</p>
                    </div>
                  </div>
                </div>

                <!-- Questionnaires -->
                <div class="bg-bg-card border-border-subtle overflow-hidden rounded-3xl border shadow-sm">
                  <div class="border-border-subtle bg-bg-muted/30 border-b px-6 py-4">
                    <h3 class="text-text-primary text-sm font-bold uppercase tracking-wider">Cuestionarios de Salud</h3>
                  </div>
                  <div class="p-6">
                    <div v-if="client.questionnaires?.length > 0" class="grid grid-cols-1 gap-4 md:grid-cols-2">
                       <div v-for="q in client.questionnaires" :key="q.questionnaire_id" class="bg-bg-muted/50 border-border-subtle hover:border-primary/30 flex items-center justify-between rounded-2xl border p-4 transition-all hover:scale-[1.02]">
                        <div class="flex items-center gap-4">
                          <div class="bg-info/20 text-info flex h-10 w-10 items-center justify-center rounded-xl shadow-inner">
                            <FileText class="h-5 w-5" />
                          </div>
                          <div class="flex flex-col">
                            <h4 class="text-text-primary text-sm font-bold uppercase leading-none">{{ q.title }}</h4>
                            <p class="text-text-muted mt-1 text-[10px] font-bold uppercase tracking-wider">Completado: {{ formatDate(q.created_at) }}</p>
                          </div>
                        </div>
                        <button class="btn btn-ghost btn-xs font-bold uppercase">Ver Respuestas</button>
                      </div>
                    </div>
                    <div v-else class="flex flex-col items-center justify-center py-12 text-center">
                      <FileText class="text-text-muted mb-4 h-12 w-12 opacity-20" />
                      <p class="text-text-primary font-bold">Sin cuestionarios registrados</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- BILLING TAB -->
              <div v-else-if="currentTab === 'billing'" key="billing" class="space-y-6">
                <div class="bg-bg-card border-border-subtle overflow-hidden rounded-3xl border shadow-sm">
                  <div class="border-border-subtle bg-bg-muted/30 border-b px-6 py-4">
                    <h3 class="text-text-primary text-sm font-bold uppercase tracking-wider">Deudas Pendientes</h3>
                  </div>
                  <div class="p-0 overflow-x-auto">
                    <table v-if="client.debts?.length > 0" class="table w-full min-w-[500px]">
                      <thead class="bg-bg-muted/50 text-text-secondary border-b border-border-default h-12">
                        <tr>
                          <th class="pl-6 text-xs font-black uppercase">Concepto</th>
                          <th class="text-xs font-black uppercase">Vencimiento</th>
                          <th class="text-xs font-black uppercase text-right">Pendiente</th>
                          <th class="text-xs font-black uppercase text-right pr-6 min-w-[120px]">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="debt in client.debts" :key="debt.debt_id" class="border-b border-border-subtle hover:bg-bg-muted/30 transition-colors h-[72px]">
                          <td class="pl-6">
                             <div class="flex items-center gap-3">
                               <div class="w-10 h-10 rounded-xl bg-bg-muted flex items-center justify-center shrink-0">
                                 <Receipt class="w-5 h-5 text-text-primary" />
                               </div>
                               <div class="flex flex-col max-w-[200px]">
                                 <span class="text-text-primary text-sm font-bold truncate">{{ debt.notes || 'Deuda de cargo' }}</span>
                                 <span v-if="debt.cart?.items?.length" class="text-text-muted text-[10px] font-bold uppercase">{{ debt.cart.items.length }} Items de compra</span>
                                 <span v-else class="text-text-muted text-[10px] font-bold uppercase">Deuda manual</span>
                               </div>
                             </div>
                          </td>
                          <td>
                             <span class="text-text-muted text-xs font-bold uppercase">{{ debt.due_date ? formatDate(debt.due_date) : 'Sin fecha' }}</span>
                          </td>
                          <td class="text-right">
                            <span class="text-error text-sm font-black tabular-nums">{{ debt.remaining.toFixed(2) }}€</span>
                            <span v-if="debt.remaining < debt.amount" class="text-text-muted block text-[10px] font-bold uppercase">de {{ debt.amount.toFixed(2) }}€</span>
                          </td>
                          <td class="pr-6 text-right">
                             <button @click="debtDetailsModalRef?.open(debt)" class="btn btn-sm btn-ghost hover:bg-bg-muted rounded-xl text-text-primary">Detalles</button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <div v-else class="flex flex-col items-center justify-center py-20 text-center">
                      <div class="bg-success/10 text-success mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                        <CheckCircle2 class="h-8 w-8" />
                      </div>
                      <p class="text-text-primary text-lg font-bold">¡Cuenta al día!</p>
                      <p class="text-text-muted mt-1 text-sm font-medium">Este cliente no tiene deudas pendientes en Beils.</p>
                    </div>
                  </div>
                </div>
              </div>
            </Transition>
          </main>
        </div>
      </div>

      <!-- Modals -->
      <ConsentFormModal v-model="isConsentModalOpen" :item-to-edit="mockItemToEdit" />
      <QuestionnaireFormModal v-model="isQuestionnaireModalOpen" :item-to-edit="mockItemToEdit" />
      <RevokeFormModal v-model="isRevokeModalOpen" :item-to-edit="mockItemToEdit" />
      <BookingFormModal ref="bookingModalRef" />
      <DebtDetailsModal ref="debtDetailsModalRef" @payment-success="queryClient.invalidateQueries({ queryKey: ['client', clientId] })" @toast="addToast" />
      
      <!-- Toast -->
      <div v-if="showToast" class="toast toast-end toast-bottom z-100">
        <div class="alert text-white shadow-lg" :class="toastType === 'success' ? 'bg-success' : 'bg-error'">
          <span class="font-medium">{{ toastMessage }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* Animations for tab transition */
.page-enter-active,
.page-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.page-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
