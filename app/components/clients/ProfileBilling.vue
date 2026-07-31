<script setup lang="ts">
import { Receipt, CheckCircle2, ShoppingBag, ExternalLink, ChevronRight, Wallet, History, AlertCircle } from 'lucide-vue-next'
import { type PropType } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  client: { type: Object as PropType<any>, required: true }
})

const emit = defineEmits(['open-debt', 'open-purchase'])
const { locale } = useI18n()

const formatDate = (dateStr: string) => {
  if (!dateStr) return '---'
  return new Intl.DateTimeFormat(locale.value, { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(dateStr))
}
</script>

<template>
  <div class="space-y-8 transition-all duration-300">
    <!-- DEUDAS PENDIENTES CARD (Ultra Premium) -->
    <div class="card bg-base-100/90 backdrop-blur-md border border-base-200/80 shadow-md rounded-3xl overflow-hidden hover:shadow-lg transition-all duration-300">
      <!-- Card Header -->
      <div class="border-b border-base-200/80 bg-gradient-to-r from-base-200/60 to-base-200/20 px-8 py-5 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-2xl bg-error/15 text-error shadow-sm"><Wallet class="w-5 h-5" /></div>
          <h3 class="text-base-content text-lg font-black tracking-tight">{{ $t('catalog.clients.profile.billing.debts') }}</h3>
        </div>
        <span v-if="client.debts?.length > 0" class="badge badge-error badge-sm font-black p-2.5 shadow-sm">
          {{ client.debts.length }} {{ $t('catalog.clients.profile.billing.pending') }}
        </span>
      </div>
      
      <div class="p-0 overflow-x-auto">
        <table v-if="client.debts?.length > 0" class="table table-zebra w-full">
          <thead>
            <tr class="text-base-content/60 text-[10px] font-black uppercase tracking-widest border-b border-base-200/80 bg-base-200/30">
              <th class="px-8 py-4">{{ $t('catalog.clients.profile.billing.table.concept') }}</th>
              <th class="px-6 py-4">{{ $t('catalog.clients.profile.billing.table.due') }}</th>
              <th class="px-6 py-4 text-right">{{ $t('catalog.clients.profile.billing.table.pending') }}</th>
              <th class="px-8 py-4 text-right">{{ $t('catalog.clients.profile.billing.table.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="debt in client.debts" :key="debt.debt_id" class="border-b border-base-200/50 hover:bg-base-200/60 transition-colors cursor-pointer group" @click="emit('open-debt', debt)">
              <td class="px-8 py-4">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-2xl bg-base-200 flex items-center justify-center border border-base-300/80 group-hover:border-primary/50 transition-colors shadow-sm">
                    <Receipt class="w-5 h-5 text-base-content opacity-80" />
                  </div>
                  <div class="flex flex-col">
                    <span class="text-base-content text-sm font-bold">{{ debt.notes || (locale === 'es' ? 'Deuda por servicio/producto' : 'Debt for service/product') }}</span>
                    <span class="text-[10px] text-base-content/60 font-black uppercase tracking-tighter">{{ debt.cart?.items?.length || 0 }} {{ locale === 'es' ? 'ítems asociados' : 'associated items' }}</span>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <span class="text-base-content text-xs font-semibold">{{ debt.due_date ? formatDate(debt.due_date) : (locale === 'es' ? 'Inmediato' : 'Immediate') }}</span>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex flex-col items-end">
                  <span class="text-error text-base font-black tabular-nums">{{ debt.remaining.toFixed(2) }}€</span>
                  <span v-if="debt.remaining < debt.amount" class="text-[9px] text-base-content/60 font-bold uppercase">{{ locale === 'es' ? 'de' : 'of' }} {{ debt.amount.toFixed(2) }}€</span>
                </div>
              </td>
              <td class="px-8 py-4 text-right">
                <div class="tooltip tooltip-left z-50 relative" :data-tip="locale === 'es' ? 'Ver detalles de deuda' : 'View debt details'">
                  <button class="btn btn-ghost btn-xs rounded-xl font-bold uppercase text-[10px] border border-base-300/80 group-hover:bg-base-300/80">
                    {{ $t('catalog.clients.profile.billing.manage') }} <ChevronRight class="w-3.5 h-3.5 ml-1" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- EMPTY STATE DEUDAS -->
        <div v-else class="flex flex-col items-center justify-center py-16 text-center">
          <div class="bg-success/15 text-success mb-4 flex h-16 w-16 items-center justify-center rounded-3xl shadow-inner">
            <CheckCircle2 class="h-8 w-8" />
          </div>
          <p class="text-base-content text-lg font-black">{{ $t('catalog.clients.profile.billing.empty.noDebts') }}</p>
          <p class="text-base-content/60 mt-1 text-xs font-medium uppercase tracking-widest">{{ $t('catalog.clients.profile.billing.empty.noDebtsSub') }}</p>
        </div>
      </div>
    </div>

    <!-- HISTORIAL DE COMPRAS CARD (Ultra Premium) -->
    <div class="card bg-base-100/90 backdrop-blur-md border border-base-200/80 shadow-md rounded-3xl overflow-hidden hover:shadow-lg transition-all duration-300">
      <!-- Card Header -->
      <div class="border-b border-base-200/80 bg-gradient-to-r from-base-200/60 to-base-200/20 px-8 py-5 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-2xl bg-primary/15 text-primary shadow-sm"><History class="w-5 h-5" /></div>
          <h3 class="text-base-content text-lg font-black tracking-tight">{{ $t('catalog.clients.profile.billing.history') }}</h3>
        </div>
        <span v-if="client.carts?.length > 0" class="badge badge-primary badge-outline badge-sm font-black p-2.5 uppercase">
          {{ client.carts.length }} {{ $t('nav.sales') }}
        </span>
      </div>

      <div class="p-0 overflow-x-auto">
        <table v-if="client.carts?.length > 0" class="table table-zebra w-full">
          <thead>
            <tr class="text-base-content/60 text-[10px] font-black uppercase tracking-widest border-b border-base-200/80 bg-base-200/30">
              <th class="px-8 py-4">{{ $t('catalog.clients.profile.billing.table.ticket') }}</th>
              <th class="px-6 py-4 text-center">{{ $t('catalog.clients.profile.billing.table.status') }}</th>
              <th class="px-6 py-4 text-center">{{ $t('catalog.clients.profile.billing.table.method') }}</th>
              <th class="px-8 py-4 text-right">{{ $t('catalog.clients.profile.billing.table.total') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cart in client.carts" :key="cart.cart_id" class="border-b border-base-200/50 hover:bg-base-200/60 transition-colors cursor-pointer group" @click="emit('open-purchase', cart)">
              <td class="px-8 py-4">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-2xl bg-base-200 flex items-center justify-center border border-base-300/80 group-hover:border-primary/50 transition-colors shadow-sm">
                    <ShoppingBag class="w-5 h-5 text-base-content opacity-80" />
                  </div>
                  <div class="flex flex-col">
                    <span class="text-base-content text-sm font-bold">{{ formatDate(cart.created_at) }}</span>
                    <span class="text-[10px] text-base-content/60 font-black uppercase tracking-tighter">{{ cart.items?.length || 0 }} {{ locale === 'es' ? 'servicios/productos' : 'services/products' }}</span>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 text-center">
                <span class="badge badge-sm font-black uppercase px-2.5 py-1 border-none" :class="cart.status === 'completed' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'">
                  {{ (cart.status === 'completed' ? $t('catalog.clients.profile.appointments.status.completed') : (cart.status === 'pending' ? $t('catalog.clients.profile.appointments.status.pending') : cart.status)).toUpperCase() }}
                </span>
              </td>
              <td class="px-6 py-4 text-center">
                <span class="badge badge-ghost badge-sm font-bold uppercase">{{ cart.payment_method || (locale === 'es' ? 'PENDIENTE' : 'PENDING') }}</span>
              </td>
              <td class="px-8 py-4 text-right">
                <span class="text-base-content text-base font-black tabular-nums">{{ cart.total.toFixed(2) }}€</span>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- EMPTY STATE COMPRAS -->
        <div v-else class="flex flex-col items-center justify-center py-16 text-center">
          <div class="bg-primary/15 text-primary mb-4 flex h-16 w-16 items-center justify-center rounded-3xl shadow-inner">
            <AlertCircle class="h-8 w-8" />
          </div>
          <p class="text-base-content text-lg font-black">{{ $t('catalog.clients.profile.billing.empty.noSales') }}</p>
          <p class="text-base-content/60 mt-1 text-xs font-medium uppercase tracking-widest">{{ $t('catalog.clients.profile.billing.empty.noSalesSub') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
