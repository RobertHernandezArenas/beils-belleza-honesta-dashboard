<script setup lang="ts">
import type { ClientProfile, ModalRef, FetchError } from '~~/shared/types/domain'
import { useQuery, useMutation, useQueryClient  } from '@tanstack/vue-query'
import { useRoute } from 'vue-router'
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  LayoutGrid,
  Activity,
  Receipt,
  Package
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import type { Component } from 'vue'

import ProfileHeader from '~/components/clients/ProfileHeader.vue'
import ProfileOverview from '~/components/clients/ProfileOverview.vue'
import ProfileAppointmentHistory from '~/components/clients/ProfileAppointmentHistory.vue'
import ProfileBilling from '~/components/clients/ProfileBilling.vue'
import ProfileHealthSection from '~/components/clients/ProfileHealthSection.vue'
import ProfilePackagesSection from '~/components/clients/ProfilePackagesSection.vue'


import { useAgendaStore } from '~/stores/useAgendaStore'

// View Transitions carry the avatar + name over from the client list (shared element)
definePageMeta({ layout: 'default', viewTransition: true, pageTransition: false })
const { locale, t } = useI18n()
const route = useRoute()
const clientId = route.params.id as string

// Alias / typo resolution: redirect Kathryn McCrary typo 87f8a... to canonical 87f8b...
if (clientId === '87f8a95a-1763-47e6-8acd-824bdae7b5ef') {
  navigateTo('/clientes/87f8b95a-1763-47e6-8acd-824bdae7b5ef', { replace: true })
}

const queryClient = useQueryClient()
const agendaStore = useAgendaStore()

// Navigation Tabs State
type ProfileTab = 'OVERVIEW' | 'HEALTH' | 'BILLING' | 'PACKAGES'
const activeTab = ref<ProfileTab>('OVERVIEW')

const tabs: { id: ProfileTab; label: string; icon: Component }[] = [
  { id: 'OVERVIEW', label: 'Visión General & Bento', icon: LayoutGrid },
  { id: 'HEALTH', label: 'Salud Estética (Indiba & Láser)', icon: Activity },
  { id: 'BILLING', label: 'Ventas & Métodos de Pago', icon: Receipt },
  { id: 'PACKAGES', label: 'Paquetes & Servicios', icon: Package },
]

// Spring pill that slides under the active tab
const tabListRef = ref<HTMLElement | null>(null)
const { pill, pillStyle, setItemRef: setTabRef } = useSlidingPill(tabListRef, activeTab)
useMagnification(tabListRef, '.magnify-item')

// Crossfade between tabs (utils/motion): a snapshot of the old panel fades into the new one
const selectTab = (id: ProfileTab) => {
  if (id !== activeTab.value) crossfadePanel(() => (activeTab.value = id), 'profile')
}

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
} = useQuery<ClientProfile, FetchError & { statusCode?: number; status?: number; statusMessage?: string }>({
  queryKey: ['client', clientId],
  queryFn: () => $fetch(`/api/clients/${clientId}`),
})

const isNotFound = computed(() => {
  const err = error.value as (FetchError & { statusCode?: number; status?: number }) | null
  return err?.statusCode === 404 || err?.status === 404
})

const errorMessage = computed(() => {
  if (!error.value) return ''
  const err = error.value as (FetchError & { statusCode?: number; status?: number; statusMessage?: string }) | null
  if (isNotFound.value) {
    return locale.value === 'es'
      ? 'El cliente solicitado no existe en la base de datos o el enlace es incorrecto.'
      : 'The requested client does not exist or the link is incorrect.'
  }
  return (
    err?.data?.statusMessage ||
    err?.response?._data?.statusMessage ||
    err?.statusMessage ||
    err?.message ||
    t('catalog.clients.profile.status.errorMsg')
  )
})

useHead({
  title: computed(() =>
    client.value ? `${client.value.name} ${client.value.surname} | ${locale.value === 'es' ? 'Perfil CRM' : 'CRM Profile'}` : t('catalog.clients.profile.status.loading'),
  ),
})

// Modal States
const isConsentModalOpen = ref(false)
const isQuestionnaireModalOpen = ref(false)
const isRevokeModalOpen = ref(false)
const debtDetailsModalRef = ref<ModalRef | null>(null)
const purchaseDetailsModalRef = ref<ModalRef | null>(null)

const mockItemToEdit = computed(() => {
  if (!client.value) return null
  return { user_id: clientId, user: client.value }
})

// Update Client Mutation
const { mutate: updateClient, isPending: isUpdating } = useMutation({
  mutationFn: async (data: Record<string, unknown>) => {
    return await $fetch(`/api/clients/${clientId}`, {
      method: 'PUT',
      body: data
    })
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['client', clientId] })
    addToast(locale.value === 'es' ? 'Perfil actualizado correctamente' : 'Profile updated successfully', 'success')
  },
  onError: (err: FetchError) => {
    addToast(err.data?.statusMessage || (locale.value === 'es' ? 'Error al actualizar el perfil' : 'Error updating profile'), 'error')
  }
})

const handleFieldUpdate = (field: string, value: unknown) => {
  updateClient({ [field]: value })
}

// When a visible button triggered it, the drawer morphs out of that button
const handleNewBooking = (source?: HTMLElement | null) => {
  agendaStore.openBookingDrawer(null, new Date(), null, clientId, source ?? null)
}
</script>

<template>
  <div class="focus-scope bg-bg-app min-h-screen w-full px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 2xl:px-10 2xl:py-10 font-sans transition-colors duration-500">
    <div class="mx-auto w-full max-w-7xl 2xl:max-w-[1560px] 3xl:max-w-[1760px] space-y-5 sm:space-y-6">
      
      <!-- Navigation Bar & Breadcrumbs -->
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <NuxtLink
            to="/clientes"
            class="btn btn-circle btn-ghost btn-sm sm:btn-md bg-bg-card border border-border-default hover:bg-bg-muted shadow-xs transition-transform active:scale-95 shrink-0"
            aria-label="Volver"
          >
            <ArrowLeft class="text-text-primary size-4 sm:size-5" />
          </NuxtLink>

          <!-- Breadcrumbs with safe truncation -->
          <div class="breadcrumbs text-xs sm:text-sm min-w-0">
            <ul class="flex items-center">
              <li>
                <NuxtLink to="/clientes" class="text-text-muted font-semibold hover:text-primary transition-colors">
                  {{ $t('nav.clients') || 'Clientes' }}
                </NuxtLink>
              </li>
              <li class="min-w-0">
                <span class="font-black text-text-primary flex items-center gap-1.5 truncate max-w-[180px] sm:max-w-xs md:max-w-md">
                  <UserCheck class="size-3.5 sm:size-4 text-primary shrink-0" />
                  <span class="truncate">{{ client ? `${client.name?.trim()} ${client.surname?.trim() || ''}` : $t('catalog.clients.profile.title') }}</span>
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div v-if="isFetching && !isPending" class="badge badge-neutral badge-xs sm:badge-sm gap-1 animate-pulse font-bold shrink-0">
          {{ locale === 'es' ? 'Sincronizando...' : 'Syncing...' }}
        </div>
      </div>

      <div class="crossfade-stack">
      <Transition name="crossfade">
      <!-- Loading State -->
      <div v-if="isPending" key="loading" class="space-y-6">
        <div class="skeleton h-56 sm:h-64 w-full rounded-3xl"/>
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div class="skeleton h-80 sm:h-96 rounded-3xl"/>
          <div class="skeleton h-80 sm:h-96 rounded-3xl"/>
          <div class="skeleton h-80 sm:h-96 rounded-3xl md:col-span-2 lg:col-span-1"/>
        </div>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        key="error"
        class="alert alert-error shadow-xl rounded-3xl p-8 sm:p-12 flex flex-col items-center justify-center text-center"
      >
        <AlertCircle class="size-12 sm:size-16 mb-2 text-white" />
        <h2 class="text-xl sm:text-2xl font-black text-white">
          {{ isNotFound ? (locale === 'es' ? 'Cliente no encontrado' : 'Client not found') : $t('catalog.clients.profile.status.error') }}
        </h2>
        <p class="mt-1 text-xs sm:text-sm font-semibold text-white/80 max-w-md">
          {{ errorMessage }}
        </p>
        <NuxtLink to="/clientes" class="btn btn-outline btn-neutral btn-sm mt-6 rounded-xl font-bold active:scale-95">
          {{ locale === 'es' ? 'Volver al Listado' : 'Back to List' }}
        </NuxtLink>
      </div>

      <!-- Main Profile Content -->
      <div v-else-if="client" key="content" class="motion-stagger space-y-6 sm:space-y-8">
        
        <!-- 1. Full Width Profile Header -->
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

        <!-- 2. Apple Segmented Control / Fluid Responsive Tabs -->
        <div class="focus-item relative w-full" data-vt-group="profile" data-vt-name="profile-tabs">
          <div
            ref="tabListRef"
            class="relative flex items-center gap-1.5 sm:gap-2 bg-bg-card/95 backdrop-blur-xl p-1.5 border border-border-default/80 rounded-2xl shadow-xs overflow-x-auto scrollbar-none snap-x touch-pan-x"
            role="tablist"
            aria-label="Pestañas de perfil de cliente"
          >
            <!-- Active pill: slides between tabs on a spring -->
            <span
              v-if="pill"
              aria-hidden="true"
              class="motion-pill bg-text-primary pointer-events-none absolute top-1.5 bottom-1.5 left-0 rounded-xl shadow-xs"
              :style="pillStyle"
            />
            <button
              v-for="tab in tabs"
              :key="tab.id"
              :ref="setTabRef(tab.id)"
              type="button"
              role="tab"
              :aria-selected="activeTab === tab.id"
              class="relative shrink-0 whitespace-nowrap px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors duration-200 flex items-center gap-2"
              :class="activeTab === tab.id
                ? ['text-bg-card', !pill && 'bg-text-primary shadow-xs']
                : 'text-text-muted hover:text-text-primary hover:bg-bg-muted/60'"
              @click="selectTab(tab.id)"
            >
              <component :is="tab.icon" class="magnify-item size-3.5 sm:size-4 shrink-0" />
              <span>{{ tab.label }}</span>
            </button>
          </div>
        </div>

        <!-- 3. Dynamic Tab Content (crossfaded by selectTab via View Transitions) -->
        <div class="pb-16" data-vt-group="profile" data-vt-name="profile-panel">
            <div v-if="activeTab === 'OVERVIEW'" key="overview" class="space-y-6">
              <ProfileOverview
                :client="client"
                :is-updating="isUpdating"
                @update="handleFieldUpdate"
                @open-booking="handleNewBooking"
                @open-purchase="purchaseDetailsModalRef?.open?.($event)"
                @open-debt="debtDetailsModalRef?.open?.($event)"
              />
              <ProfileAppointmentHistory 
                :client="client" 
                @open-purchase="purchaseDetailsModalRef?.open?.($event)" 
              />
            </div>

            <ProfileHealthSection 
              v-else-if="activeTab === 'HEALTH'"
              :client="client"
              @add-consent="isConsentModalOpen = true"
              @add-questionnaire="isQuestionnaireModalOpen = true"
            />

            <ProfileBilling 
              v-else-if="activeTab === 'BILLING'"
              :client="client" 
              @open-debt="debtDetailsModalRef?.open?.($event)" 
              @open-purchase="purchaseDetailsModalRef?.open?.($event)" 
            />

            <ProfilePackagesSection 
              v-else-if="activeTab === 'PACKAGES'"
              :client="client"
            />
        </div>

      </div>
      </Transition>
      </div>

      <!-- Modals -->
      <LazyClientsConsentFormModal v-if="isConsentModalOpen" v-model="isConsentModalOpen" :item-to-edit="mockItemToEdit" @success="queryClient.invalidateQueries({ queryKey: ['client', clientId] })" />
      <LazyClientsQuestionnaireFormModal v-if="isQuestionnaireModalOpen" v-model="isQuestionnaireModalOpen" :item-to-edit="mockItemToEdit" @success="queryClient.invalidateQueries({ queryKey: ['client', clientId] })" />
      <LazyClientsRevokeFormModal v-if="isRevokeModalOpen" v-model="isRevokeModalOpen" :item-to-edit="mockItemToEdit" @success="queryClient.invalidateQueries({ queryKey: ['client', clientId] })" />
      <LazyAgendaBookingDrawer @refresh="queryClient.invalidateQueries({ queryKey: ['client', clientId] })" @toast="addToast" />
      <LazyClientsDebtDetailsModal ref="debtDetailsModalRef" @payment-success="() => { queryClient.invalidateQueries({ queryKey: ['client', clientId] }); queryClient.invalidateQueries({ queryKey: ['sales'] }); }" @toast="addToast" />
      <LazySharedPurchaseDetailsModal ref="purchaseDetailsModalRef" />
      
      <!-- Toast Notification Container -->
      <Transition name="toast-rise">
        <div v-if="showToast" class="toast toast-end toast-bottom z-50">
          <div
            class="alert shadow-xl font-bold flex items-center gap-2"
            :class="toastType === 'success' ? 'alert-success text-white' : 'alert-error text-white'"
          >
            <component :is="toastType === 'success' ? CheckCircle2 : AlertCircle" class="size-5 shrink-0" />
            <span>{{ toastMessage }}</span>
          </div>
        </div>
      </Transition>

    </div>
  </div>
</template>

<style scoped>
</style>
