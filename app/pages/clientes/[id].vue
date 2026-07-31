<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { useRoute } from 'vue-router'
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  UserCheck
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

import ProfileHeader from '~/components/clients/ProfileHeader.vue'
import ProfileOverview from '~/components/clients/ProfileOverview.vue'
import ProfileBilling from '~/components/clients/ProfileBilling.vue'

import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useAgendaStore } from '~/stores/useAgendaStore'

definePageMeta({ layout: 'default' })
const { locale, t } = useI18n()
const route = useRoute()
const clientId = route.params.id as string
const queryClient = useQueryClient()
const agendaStore = useAgendaStore()

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
  agendaStore.openBookingDrawer(null, new Date(), null, clientId)
}

const handleEditBooking = (b: any) => {
  agendaStore.openBookingDrawer(b)
}
</script>

<template>
  <div class="bg-base-200/30 min-h-screen w-full p-4 font-sans lg:p-8 2xl:p-12 transition-colors duration-500">
    <div class="mx-auto max-w-[1400px] 2xl:max-w-[1600px] 3xl:max-w-[1800px]">
      
      <!-- DaisyUI Breadcrumbs & Navigation Bar -->
      <div class="mb-6 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <NuxtLink
            to="/clientes"
            class="btn btn-circle btn-ghost bg-base-100 border border-base-300 hover:bg-base-200 shadow-sm transition-all hover:scale-105"
            aria-label="Volver"
          >
            <ArrowLeft class="text-base-content h-5 w-5" />
          </NuxtLink>

          <!-- DaisyUI Breadcrumbs -->
          <div class="breadcrumbs text-sm">
            <ul>
              <li>
                <NuxtLink to="/clientes" class="text-base-content/70 font-semibold hover:text-primary">
                  {{ $t('nav.clients') || 'Clientes' }}
                </NuxtLink>
              </li>
              <li>
                <span class="font-black text-base-content flex items-center gap-1">
                  <UserCheck class="w-4 h-4 text-primary" />
                  {{ client ? `${client.name} ${client.surname}` : $t('catalog.clients.profile.title') }}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div v-if="isFetching && !isPending" class="badge badge-info badge-sm gap-1 animate-pulse font-bold">
          {{ locale === 'es' ? 'Sincronizando...' : 'Syncing...' }}
        </div>
      </div>

      <!-- Loading State with DaisyUI Skeletons -->
      <div v-if="isPending" class="space-y-6">
        <div class="skeleton h-64 w-full rounded-3xl"></div>
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div class="skeleton h-96 rounded-3xl"></div>
          <div class="skeleton h-96 rounded-3xl"></div>
          <div class="skeleton h-96 rounded-3xl"></div>
        </div>
      </div>

      <!-- Error State with DaisyUI Alert Component -->
      <div
        v-else-if="error"
        class="alert alert-error shadow-xl rounded-3xl p-12 flex flex-col items-center justify-center text-center"
      >
        <AlertCircle class="h-16 w-16 mb-2 text-error-content" />
        <h2 class="text-2xl font-black text-error-content">{{ $t('catalog.clients.profile.status.error') }}</h2>
        <p class="mt-1 text-sm font-semibold text-error-content/80 max-w-md">
          {{ error.statusMessage || $t('catalog.clients.profile.status.errorMsg') }}
        </p>
        <NuxtLink to="/clientes" class="btn btn-outline btn-neutral btn-sm mt-6 rounded-xl font-bold">
          {{ locale === 'es' ? 'Volver al Listado' : 'Back to List' }}
        </NuxtLink>
      </div>

      <!-- Main Content -->
      <div v-else-if="client" class="space-y-8 animate-in fade-in duration-500">
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
        <div class="space-y-8 pb-16">
            <!-- Strategic Overview -->
            <ProfileOverview 
                :client="client" 
                @update="handleFieldUpdate" 
                @open-booking="handleEditBooking"
                @open-purchase="purchaseDetailsModalRef?.open($event)"
                @open-debt="debtDetailsModalRef?.open($event)"
            />

            <!-- Divider -->
            <div class="divider my-8"></div>

            <!-- Billing & Financial History -->
            <ProfileBilling 
                :client="client" 
                @open-debt="debtDetailsModalRef?.open($event)" 
                @open-purchase="purchaseDetailsModalRef?.open($event)" 
            />
        </div>
      </div>

      <!-- Modals -->
      <LazyClientsConsentFormModal v-if="isConsentModalOpen" v-model="isConsentModalOpen" :item-to-edit="mockItemToEdit" @success="queryClient.invalidateQueries({ queryKey: ['client', clientId] })" />
      <LazyClientsQuestionnaireFormModal v-if="isQuestionnaireModalOpen" v-model="isQuestionnaireModalOpen" :item-to-edit="mockItemToEdit" @success="queryClient.invalidateQueries({ queryKey: ['client', clientId] })" />
      <LazyClientsRevokeFormModal v-if="isRevokeModalOpen" v-model="isRevokeModalOpen" :item-to-edit="mockItemToEdit" @success="queryClient.invalidateQueries({ queryKey: ['client', clientId] })" />
      <LazyAgendaBookingDrawer @refresh="queryClient.invalidateQueries({ queryKey: ['client', clientId] })" @toast="addToast" />
      <LazyClientsDebtDetailsModal ref="debtDetailsModalRef" @payment-success="() => { queryClient.invalidateQueries({ queryKey: ['client', clientId] }); queryClient.invalidateQueries({ queryKey: ['sales'] }); }" @toast="addToast" />
      <LazySharedPurchaseDetailsModal ref="purchaseDetailsModalRef" />
      
      <!-- DaisyUI Toast Container -->
      <div v-if="showToast" class="toast toast-end toast-bottom z-50">
        <div 
          class="alert shadow-xl font-bold flex items-center gap-2"
          :class="toastType === 'success' ? 'alert-success text-success-content' : 'alert-error text-error-content'"
        >
          <component :is="toastType === 'success' ? CheckCircle2 : AlertCircle" class="w-5 h-5 shrink-0" />
          <span>{{ toastMessage }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
