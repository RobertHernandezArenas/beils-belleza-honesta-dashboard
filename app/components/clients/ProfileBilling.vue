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
  <div class="space-y-8 animate-in fade-in slide-in-from-top-4 duration-700 delay-150">
    <!-- DEUDAS PENDIENTES -->
    <div class="bg-[#E5E5E5] dark:bg-[#1E1E1E] border border-border-subtle/20 overflow-hidden rounded-3xl shadow-sm">
      <div class="border-border-subtle/10 bg-white/10 dark:bg-black/10 border-b px-8 py-5 flex items-center justify-between">
        <div class="flex items-center gap-3">
            <div class="p-2 rounded-xl bg-error/10 text-error"><Wallet class="w-5 h-5" /></div>
            <h3 class="text-text-primary text-lg font-bold tracking-tight">{{ $t('catalog.clients.profile.billing.debts') }}</h3>
        </div>
        <span v-if="client.debts?.length > 0" class="badge badge-error badge-sm font-black">{{ client.debts.length }} {{ $t('catalog.clients.profile.billing.pending') }}</span>
      </div>
      
      <div class="p-0 overflow-x-auto">
        <table v-if="client.debts?.length > 0" class="table w-full">
          <thead>
            <tr class="text-text-muted text-[10px] font-black uppercase tracking-widest border-b border-border-subtle/10">
              <th class="px-8 py-4">{{ $t('catalog.clients.profile.billing.table.concept') }}</th>
              <th class="px-6 py-4">{{ $t('catalog.clients.profile.billing.table.due') }}</th>
              <th class="px-6 py-4 text-right">{{ $t('catalog.clients.profile.billing.table.pending') }}</th>
              <th class="px-8 py-4 text-right">{{ $t('catalog.clients.profile.billing.table.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="debt in client.debts" :key="debt.debt_id" class="border-b border-border-subtle/5 hover:bg-white/20 dark:hover:bg-black/20 transition-colors cursor-pointer group" @click="emit('open-debt', debt)">
              <td class="px-8 py-4">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-2xl bg-white/50 dark:bg-black/20 flex items-center justify-center border border-border-subtle/20 group-hover:border-primary/30 transition-colors">
                        <Receipt class="w-5 h-5 text-text-primary opacity-60" />
                    </div>
                    <div class="flex flex-col">
                        <span class="text-text-primary text-sm font-bold">{{ debt.notes || (locale === 'es' ? 'Deuda por servicio/producto' : 'Debt for service/product') }}</span>
                        <span class="text-[10px] text-text-muted font-black uppercase tracking-tighter">{{ debt.cart?.items?.length || 0 }} {{ locale === 'es' ? 'ítems asociados' : 'associated items' }}</span>
                    </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <span class="text-text-primary text-xs font-bold">{{ debt.due_date ? formatDate(debt.due_date) : (locale === 'es' ? 'Inmediato' : 'Immediate') }}</span>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex flex-col items-end">
                    <span class="text-error text-base font-black tabular-nums">{{ debt.remaining.toFixed(2) }}€</span>
                    <span v-if="debt.remaining < debt.amount" class="text-[9px] text-text-muted font-bold uppercase">{{ locale === 'es' ? 'de' : 'of' }} {{ debt.amount.toFixed(2) }}€</span>
                </div>
              </td>
              <td class="px-8 py-4 text-right">
                <button class="btn btn-ghost btn-sm rounded-xl font-black text-[10px] uppercase opacity-40 group-hover:opacity-100 hover:bg-white/50 dark:hover:bg-white/10">
                    {{ $t('catalog.clients.profile.billing.manage') }} <ChevronRight class="w-3.5 h-3.5" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- EMPTY STATE DEUDAS -->
        <div v-else class="flex flex-col items-center justify-center py-16 text-center">
          <div class="bg-success/10 text-success mb-4 flex h-16 w-16 items-center justify-center rounded-3xl shadow-inner">
            <CheckCircle2 class="h-8 w-8" />
          </div>
          <p class="text-text-primary text-lg font-bold">{{ $t('catalog.clients.profile.billing.empty.noDebts') }}</p>
          <p class="text-text-muted mt-1 text-xs font-medium uppercase tracking-widest">{{ $t('catalog.clients.profile.billing.empty.noDebtsSub') }}</p>
        </div>
      </div>
    </div>

    <!-- HISTORIAL DE COMPRAS -->
    <div class="bg-[#E5E5E5] dark:bg-[#1E1E1E] border border-border-subtle/20 overflow-hidden rounded-3xl shadow-sm">
      <div class="border-border-subtle/10 bg-white/10 dark:bg-black/10 border-b px-8 py-5 flex items-center justify-between">
        <div class="flex items-center gap-3">
            <div class="p-2 rounded-xl bg-primary/10 text-primary"><History class="w-5 h-5" /></div>
            <h3 class="text-text-primary text-lg font-bold tracking-tight">{{ $t('catalog.clients.profile.billing.history') }}</h3>
        </div>
        <span v-if="client.carts?.length > 0" class="text-[10px] text-text-muted font-black tracking-widest uppercase">{{ client.carts.length }} {{ $t('nav.sales').toUpperCase() }}</span>
      </div>

      <div class="p-0 overflow-x-auto">
        <table v-if="client.carts?.length > 0" class="table w-full">
          <thead>
            <tr class="text-text-muted text-[10px] font-black uppercase tracking-widest border-b border-border-subtle/10">
              <th class="px-8 py-4">{{ $t('catalog.clients.profile.billing.table.ticket') }}</th>
              <th class="px-6 py-4">{{ $t('catalog.clients.profile.billing.table.status') }}</th>
              <th class="px-6 py-4">{{ $t('catalog.clients.profile.billing.table.method') }}</th>
              <th class="px-8 py-4 text-right">{{ $t('catalog.clients.profile.billing.table.total') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cart in client.carts" :key="cart.cart_id" class="border-b border-border-subtle/5 hover:bg-white/20 dark:hover:bg-black/20 transition-colors cursor-pointer group" @click="emit('open-purchase', cart)">
              <td class="px-8 py-4">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-2xl bg-white/50 dark:bg-black/20 flex items-center justify-center border border-border-subtle/20 group-hover:border-primary/30 transition-colors">
                        <ShoppingBag class="w-5 h-5 text-text-primary opacity-60" />
                    </div>
                    <div class="flex flex-col">
                        <span class="text-text-primary text-sm font-bold">{{ formatDate(cart.created_at) }}</span>
                        <span class="text-[10px] text-text-muted font-black uppercase tracking-tighter">{{ cart.items?.length || 0 }} {{ locale === 'es' ? 'servicios/productos' : 'services/products' }}</span>
                    </div>
                </div>
              </td>
              <td class="px-6 py-4 text-center">
                <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded-full" :class="cart.status === 'completed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'">
                  {{ (cart.status === 'completed' ? $t('catalog.clients.profile.appointments.status.completed') : (cart.status === 'pending' ? $t('catalog.clients.profile.appointments.status.pending') : cart.status)).toUpperCase() }}
                </span>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-1.5 justify-center">
                    <span class="text-[10px] text-text-muted font-black uppercase tracking-widest bg-white/30 dark:bg-black/20 px-3 py-1 rounded-lg border border-border-subtle/10">{{ cart.payment_method || (locale === 'es' ? 'PENDIENTE' : 'PENDING') }}</span>
                </div>
              </td>
              <td class="px-8 py-4 text-right">
                <span class="text-text-primary text-base font-black tabular-nums">{{ cart.total.toFixed(2) }}€</span>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- EMPTY STATE COMPRAS -->
        <div v-else class="flex flex-col items-center justify-center py-16 text-center">
          <div class="bg-primary/10 text-primary mb-4 flex h-16 w-16 items-center justify-center rounded-3xl shadow-inner">
            <AlertCircle class="h-8 w-8" />
          </div>
          <p class="text-text-primary text-lg font-bold">{{ $t('catalog.clients.profile.billing.empty.noSales') }}</p>
          <p class="text-text-muted mt-1 text-xs font-medium uppercase tracking-widest">{{ $t('catalog.clients.profile.billing.empty.noSalesSub') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
