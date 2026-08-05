<script setup lang="ts">
import type { ClientProfile } from '~~/shared/types/domain'
import { Receipt, CheckCircle2, ShoppingBag, Wallet, History, AlertCircle, PieChart } from 'lucide-vue-next'
import type { PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import ClientChart from '~/components/ClientChart.client.vue'

const props = defineProps({
  client: { type: Object as PropType<ClientProfile>, required: true }
})

const emit = defineEmits(['open-debt', 'open-purchase'])
const { locale } = useI18n()

const formatDate = (dateStr: string) => {
  if (!dateStr) return '---'
  return new Intl.DateTimeFormat(locale.value, { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(dateStr))
}

const paymentMethodsData = computed(() => {
  return props.client?.kpis?.paymentMethods || []
})

const chart = useChartTheme()

// ECharts Donut Chart Options (theme-aware)
const chartOptions = computed(() => {
  const ct = chart.value
  const data = paymentMethodsData.value.map((pm: { method: string; count: number; total: number }) => ({
    name: pm.method.toUpperCase(),
    value: pm.total
  }))

  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: ct.tooltipBg,
      borderColor: ct.tooltipBorder,
      textStyle: { color: ct.tooltipText, fontSize: 11, fontWeight: 'bold' },
      formatter: '{b}: <b>{c} €</b> ({d}%)'
    },
    legend: {
      bottom: '0%',
      left: 'center',
      textStyle: { color: ct.label, fontSize: 10, fontWeight: 'bold' }
    },
    color: ct.palette,
    series: [
      {
        name: 'Método de Pago',
        type: 'pie',
        radius: ['45%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: ct.surface,
          borderWidth: 2
        },
        label: { show: false },
        emphasis: {
          label: {
            show: true,
            fontSize: 12,
            fontWeight: 'bold',
            color: ct.highlight
          }
        },
        labelLine: { show: false },
        data: data.length ? data : [{ name: 'EFECTIVO', value: 100 }]
      }
    ]
  }
})
</script>

<template>
  <div class="space-y-8 transition-all duration-300">
    
    <!-- GRID DE METODOS DE PAGO & DEUDAS -->
    <div class="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
      
      <!-- DONUT CHART: Distribución por Método de Pago (Span 5) -->
      <div class="xl:col-span-5 card bg-bg-card border border-border-default/80 shadow-md rounded-3xl p-6 hover:shadow-xl transition-all flex flex-col justify-between">
        <div>
          <div class="border-b border-border-subtle pb-3 mb-4 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <PieChart class="w-4 h-4 text-primary" />
              <h3 class="text-xs font-black uppercase tracking-wider text-text-primary">Métodos de Pago Utilizados</h3>
              <div class="tooltip tooltip-right z-50" data-tip="Gráfico circular con el porcentaje acumulado de importes según el método de pago (Tarjeta, Efectivo, Bizum, etc.).">
                <AlertCircle class="w-3.5 h-3.5 text-text-muted/60 cursor-help" />
              </div>
            </div>
            <span class="text-[10px] font-black text-text-muted uppercase">Distribución</span>
          </div>

          <div class="h-64 w-full pt-2">
            <ClientChart :option="chartOptions" />
          </div>
        </div>
      </div>

      <!-- DEUDAS PENDIENTES CARD (Span 7) -->
      <div class="xl:col-span-7 card bg-bg-card border border-border-default/80 shadow-md rounded-3xl overflow-hidden hover:shadow-xl transition-all flex flex-col justify-between">
        <!-- Card Header -->
        <div class="border-b border-border-subtle bg-bg-muted/20 px-6 py-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-xl bg-error/15 text-error shadow-xs"><Wallet class="w-4 h-4" /></div>
            <h3 class="text-text-primary text-sm font-black tracking-tight flex items-center gap-1.5">
              {{ $t('catalog.clients.profile.billing.debts') }}
              <div class="tooltip tooltip-right z-50" data-tip="Importes no validados o saldos que el cliente tiene pendientes de abonar en la recepción.">
                <AlertCircle class="w-3.5 h-3.5 text-text-muted/60 cursor-help" />
              </div>
            </h3>
          </div>
          <span v-if="(client.debts?.length ?? 0) > 0" class="badge badge-error badge-sm font-black p-2.5 shadow-xs">
            {{ client.debts?.length }} {{ $t('catalog.clients.profile.billing.pending') }}
          </span>
        </div>
        
        <div class="p-0 overflow-x-auto">
          <table v-if="(client.debts?.length ?? 0) > 0" class="table table-zebra w-full text-xs">
            <thead>
              <tr class="text-text-muted text-[10px] font-black uppercase tracking-widest border-b border-border-subtle bg-bg-muted/30">
                <th class="px-6 py-3">{{ $t('catalog.clients.profile.billing.table.concept') }}</th>
                <th class="px-4 py-3">{{ $t('catalog.clients.profile.billing.table.due') }}</th>
                <th class="px-4 py-3 text-right">{{ $t('catalog.clients.profile.billing.table.pending') }}</th>
                <th class="px-6 py-3 text-right">{{ $t('catalog.clients.profile.billing.table.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="debt in client.debts" :key="debt.debt_id" class="border-b border-border-subtle hover:bg-bg-muted/40 transition-colors cursor-pointer group" @click="emit('open-debt', debt)">
                <td class="px-6 py-3">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-xl bg-bg-muted flex items-center justify-center border border-border-subtle group-hover:border-primary/50 transition-colors shadow-xs">
                      <Receipt class="w-4 h-4 text-text-primary opacity-80" />
                    </div>
                    <div class="flex flex-col">
                      <span class="text-text-primary text-xs font-bold">{{ debt.notes || (locale === 'es' ? 'Deuda por servicio/producto' : 'Debt for service/product') }}</span>
                      <span class="text-[9px] text-text-muted font-black uppercase tracking-tighter">{{ debt.cart?.items?.length || 0 }} {{ locale === 'es' ? 'ítems' : 'items' }}</span>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <span class="text-text-primary text-xs font-semibold tabular-nums">{{ debt.due_date ? formatDate(debt.due_date) : (locale === 'es' ? 'Inmediato' : 'Immediate') }}</span>
                </td>
                <td class="px-4 py-3 text-right">
                  <div class="flex flex-col items-end">
                    <span class="text-error text-sm font-black tabular-nums">{{ debt.remaining.toFixed(2) }}€</span>
                    <span v-if="debt.remaining < debt.amount" class="text-[9px] text-text-muted font-bold uppercase">{{ locale === 'es' ? 'de' : 'of' }} {{ debt.amount.toFixed(2) }}€</span>
                  </div>
                </td>
                <td class="px-6 py-3 text-right">
                  <button class="btn btn-ghost btn-xs rounded-xl font-bold uppercase text-[9px] border border-border-subtle">
                    {{ $t('catalog.clients.profile.billing.manage') }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- EMPTY STATE DEUDAS -->
          <div v-else class="flex flex-col items-center justify-center py-12 text-center">
            <div class="bg-success/15 text-success mb-3 flex h-12 w-12 items-center justify-center rounded-2xl shadow-inner">
              <CheckCircle2 class="h-6 w-6" />
            </div>
            <p class="text-text-primary text-sm font-black">{{ $t('catalog.clients.profile.billing.empty.noDebts') }}</p>
            <p class="text-text-muted mt-0.5 text-[10px] font-medium uppercase tracking-widest">{{ $t('catalog.clients.profile.billing.empty.noDebtsSub') }}</p>
          </div>
        </div>
      </div>

    </div>

    <!-- HISTORIAL DE COMPRAS CARD -->
    <div class="card bg-bg-card border border-border-default/80 shadow-md rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300">
      <!-- Card Header -->
      <div class="border-b border-border-subtle bg-bg-muted/20 px-8 py-5 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-2xl bg-primary/15 text-primary shadow-xs"><History class="w-5 h-5" /></div>
          <h3 class="text-text-primary text-lg font-black tracking-tight flex items-center gap-1.5">
            {{ $t('catalog.clients.profile.billing.history') }}
            <div class="tooltip tooltip-right z-50" data-tip="Historial completo de tickets cerrados, métodos de pago utilizados y facturación generada.">
              <AlertCircle class="w-4 h-4 text-text-muted/60 cursor-help" />
            </div>
          </h3>
        </div>
        <span v-if="(client.carts?.length ?? 0) > 0" class="badge badge-neutral badge-sm font-black p-2.5 uppercase">
          {{ client.carts?.length }} {{ $t('nav.sales') }}
        </span>
      </div>

      <div class="p-0 overflow-x-auto">
        <table v-if="(client.carts?.length ?? 0) > 0" class="table table-zebra w-full">
          <thead>
            <tr class="text-text-muted text-[10px] font-black uppercase tracking-widest border-b border-border-subtle bg-bg-muted/30">
              <th class="px-8 py-4">{{ $t('catalog.clients.profile.billing.table.ticket') }}</th>
              <th class="px-6 py-4 text-center">{{ $t('catalog.clients.profile.billing.table.status') }}</th>
              <th class="px-6 py-4 text-center">{{ $t('catalog.clients.profile.billing.table.method') }}</th>
              <th class="px-8 py-4 text-right">{{ $t('catalog.clients.profile.billing.table.total') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cart in client.carts" :key="cart.cart_id" class="border-b border-border-subtle hover:bg-bg-muted/40 transition-colors cursor-pointer group" @click="emit('open-purchase', cart)">
              <td class="px-8 py-4">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-2xl bg-bg-muted flex items-center justify-center border border-border-subtle group-hover:border-primary/50 transition-colors shadow-xs">
                    <ShoppingBag class="w-5 h-5 text-text-primary opacity-80" />
                  </div>
                  <div class="flex flex-col">
                    <span class="text-text-primary text-sm font-bold tabular-nums">{{ formatDate(cart.created_at) }}</span>
                    <span class="text-[10px] text-text-muted font-black uppercase tracking-tighter">{{ cart.items?.length || 0 }} {{ locale === 'es' ? 'servicios/productos' : 'services/products' }}</span>
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
                <span class="text-text-primary text-base font-black tabular-nums">{{ cart.total.toFixed(2) }}€</span>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- EMPTY STATE COMPRAS -->
        <div v-else class="flex flex-col items-center justify-center py-16 text-center">
          <div class="bg-primary/15 text-primary mb-4 flex h-16 w-16 items-center justify-center rounded-3xl shadow-inner">
            <AlertCircle class="h-8 w-8" />
          </div>
          <p class="text-text-primary text-lg font-black">{{ $t('catalog.clients.profile.billing.empty.noSales') }}</p>
          <p class="text-text-muted mt-1 text-xs font-medium uppercase tracking-widest">{{ $t('catalog.clients.profile.billing.empty.noSalesSub') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
