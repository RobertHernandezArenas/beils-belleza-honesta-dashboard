<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { useRoute } from 'vue-router'
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

import ProfileHeader from '~/components/clients/ProfileHeader.vue'
import ProfileOverview from '~/components/clients/ProfileOverview.vue'
import ProfileBilling from '~/components/clients/ProfileBilling.vue'


import ConsentFormModal from '~/components/clients/ConsentFormModal.vue'
import QuestionnaireFormModal from '~/components/clients/QuestionnaireFormModal.vue'
import BookingFormModal from '~/components/agenda/BookingFormModal.vue'
import BookingDetailsModal from '~/components/agenda/BookingDetailsModal.vue'
import RevokeFormModal from '~/components/clients/RevokeFormModal.vue'
import DebtDetailsModal from '~/components/clients/DebtDetailsModal.vue'
import PurchaseDetailsModal from '~/components/shared/PurchaseDetailsModal.vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'

definePageMeta({ layout: 'default' })
const { locale, t } = useI18n()
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

const { onSync } = useSync()

// Handle remote sync events (from other tabs like TPV)
onSync((event) => {
  if (event.type === 'REFRESH_CLIENT' && (!event.clientId || event.clientId === clientId)) {
    queryClient.invalidateQueries({ queryKey: ['client', clientId] })
  }
})

const {
  data: client,
  isPending,
  error,
  isFetching,
} = useQuery<any, any>({
  queryKey: ['client', clientId],
  queryFn: () => $fetch(`/api/clients/${clientId}`),
  refetchInterval: 3000,
})

useHead({
  title: computed(() =>
    client.value ? `${client.value.name} ${client.value.surname} | ${locale.value === 'es' ? 'Perfil CRM' : 'CRM Profile'}` : t('catalog.clients.profile.status.loading'),
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



// Modal States
const isConsentModalOpen = ref(false)
const isQuestionnaireModalOpen = ref(false)
const isRevokeModalOpen = ref(false)
const bookingModalRef = ref<any>(null)
const bookingDetailsModalRef = ref<any>(null)
const debtDetailsModalRef = ref<any>(null)
const purchaseDetailsModalRef = ref<any>(null)

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
    addToast(locale.value === 'es' ? 'Perfil actualizado correctamente' : 'Profile updated successfully', 'success')
  },
  onError: (err: any) => {
    addToast(err.data?.statusMessage || (locale.value === 'es' ? 'Error al actualizar el perfil' : 'Error updating profile'), 'error')
  }
})

const handleFieldUpdate = (field: string, value: any) => {
  updateClient({ [field]: value })
}

const handleNewBooking = () => {
  bookingModalRef.value?.showModal(null, new Date(), clientId)
}

const handleEditBooking = (b: any) => {
  bookingModalRef.value?.showModal(b, new Date(b.booking_date), clientId)
}
</script>

<template>
  <div class="bg-bg-app overflow-x-clip min-h-screen w-full p-4 font-sans lg:p-10 3xl:p-16 transition-all duration-500">
    <div class="mx-auto max-w-[1400px] 2xl:max-w-[1600px] 3xl:max-w-[1800px]">
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
            <h1 class="text-text-primary text-2xl font-bold tracking-tight">{{ $t('catalog.clients.profile.title') }}</h1>
            <p class="text-text-muted text-xs font-medium uppercase tracking-widest">{{ $t('catalog.clients.profile.subtitle') }}</p>
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
        <h2 class="text-2xl font-bold">{{ $t('catalog.clients.profile.status.error') }}</h2>
        <p class="mt-2 text-sm font-medium opacity-80 max-w-md">
          {{ error.statusMessage || $t('catalog.clients.profile.status.errorMsg') }}
        </p>
        <NuxtLink to="/clientes" class="btn btn-error btn-sm mt-8 rounded-xl font-bold">
          {{ locale === 'es' ? 'Volver al Listado' : 'Back to List' }}
        </NuxtLink>
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



        <!-- 2. Continuous Content (Overview + Billing) -->
        <div class="space-y-8 lg:space-y-12 pb-20">
            <!-- Strategic Overview -->
            <ProfileOverview 
                :client="client" 
                @update="handleFieldUpdate" 
                @open-booking="bookingDetailsModalRef?.open($event)"
                @open-purchase="purchaseDetailsModalRef?.open($event)"
                @open-debt="debtDetailsModalRef?.open($event)"
            />

            <!-- Divider -->
            <div class="border-t border-border-subtle/20 my-8"></div>

            <!-- Billing & Financial History -->
            <ProfileBilling 
                :client="client" 
                @open-debt="debtDetailsModalRef?.open($event)" 
                @open-purchase="purchaseDetailsModalRef?.open($event)" 
            />
        </div>
      </div>

      <!-- Modals -->
      <ConsentFormModal v-model="isConsentModalOpen" :item-to-edit="mockItemToEdit" @success="queryClient.invalidateQueries({ queryKey: ['client', clientId] })" />
      <QuestionnaireFormModal v-model="isQuestionnaireModalOpen" :item-to-edit="mockItemToEdit" @success="queryClient.invalidateQueries({ queryKey: ['client', clientId] })" />
      <RevokeFormModal v-model="isRevokeModalOpen" :item-to-edit="mockItemToEdit" @success="queryClient.invalidateQueries({ queryKey: ['client', clientId] })" />
      <BookingDetailsModal ref="bookingDetailsModalRef" @edit="handleEditBooking" />
      <BookingFormModal ref="bookingModalRef" @refresh="queryClient.invalidateQueries({ queryKey: ['client', clientId] })" @toast="addToast" />
      <DebtDetailsModal ref="debtDetailsModalRef" @payment-success="queryClient.invalidateQueries({ queryKey: ['client', clientId] })" @toast="addToast" />
      <PurchaseDetailsModal ref="purchaseDetailsModalRef" />
      
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
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
