<script setup lang="ts">
import { ref } from 'vue'
import { X, Receipt, CheckCircle, Clock, CreditCard, Banknote, Printer } from 'lucide-vue-next'

const modalRef = ref<HTMLDialogElement | null>(null)
const debt = ref<any>(null)
const amountToPay = ref<number | null>(null)
const paymentMethod = ref('card')
const isProcessing = ref(false)

const emit = defineEmits(['payment-success', 'toast'])

const isValidPayment = computed(() => {
  if (!amountToPay.value || amountToPay.value <= 0 || !debt.value) return false
  const safeAmount = Number(Number(amountToPay.value).toFixed(2))
  const safeRemaining = Number(Number(debt.value.remaining).toFixed(2))
  return safeAmount <= safeRemaining
})

const open = (debtData: any) => {
  debt.value = JSON.parse(JSON.stringify(debtData)) // Deep copy to avoid proxy mutation issues
  if (debt.value) {
    debt.value.amount = Number(Number(debt.value.amount).toFixed(2))
    debt.value.remaining = Number(Number(debt.value.remaining).toFixed(2))
  }
  amountToPay.value = 0
  paymentMethod.value = 'card'
  isProcessing.value = false
  modalRef.value?.showModal()
}

const formatAmount = () => {
  if (amountToPay.value !== null && amountToPay.value !== undefined) {
    amountToPay.value = Number(amountToPay.value.toFixed(2))
  }
}

const getRemainingAfterPayment = (payment: any) => {
  if (!debt.value?.payments) return debt.value.remaining
  const sorted = [...debt.value.payments].sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime())
  let currentBalance = debt.value.amount
  for (const p of sorted) {
    currentBalance -= p.amount
    if (p.payment_id === payment.payment_id) {
      return currentBalance
    }
  }
  return debt.value.remaining
}

const printReceipt = (payment: any) => {
  const iframe = document.createElement('iframe')
  iframe.style.display = 'none'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (!doc) return

  const dateStr = new Date(payment.payment_date).toLocaleString()
  const itemsHtml = debt.value.cart?.items?.map((item: any) => `
    <tr>
      <td style="text-align: left;">${item.name} <br><small style="color:#666">IVA sugerido ${item.tax_rate}%</small></td>
      <td style="text-align: center;">${item.quantity}</td>
      <td style="text-align: right;">${item.total.toFixed(2)}€</td>
    </tr>
  `).join('') || `<tr><td colspan="3">Deuda manual sin ticket</td></tr>`

  const paymentMethodLabel = payment.payment_method === 'cash' ? 'Efectivo' : 
                             payment.payment_method === 'card' ? 'Tarjeta' : 
                             payment.payment_method === 'mixed' ? 'Mixto' : 'Transferencia';

  const html = `
    <html>
      <head>
        <title>Recibo de Pago</title>
        <style>
          body { font-family: 'Courier New', monospace; padding: 20px; font-size: 12px; max-width: 320px; margin: auto; color: #000; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-bottom: 1px dashed #000; margin: 10px 0; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th, td { padding: 4px 0; }
          th { border-bottom: 1px solid #000; text-align: center; }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size: 16px;">BEILS BELLEZA HONESTA</div>
        <div class="center">CIF: B12345678</div>
        <div class="divider"></div>
        <div class="center bold">RECIBO DE PAGO DE CUOTA</div>
        <div class="divider"></div>
        <div><strong>Fecha:</strong> ${dateStr}</div>
        <div><strong>Recibo:</strong> #${payment.payment_id.split('-')[0].toUpperCase()}</div>
        <div class="divider"></div>

        <div class="bold">Conceptos de la Deuda Original:</div>
        <table>
          <thead>
            <tr>
              <th style="text-align:left;">Concepto</th>
              <th>Cant.</th>
              <th style="text-align:right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="divider"></div>
        <table>
          <tr>
            <td>Deuda Total Inicial:</td>
            <td style="text-align:right;">${debt.value.amount.toFixed(2)}€</td>
          </tr>
          <tr class="bold" style="font-size: 14px;">
            <td>IMPORTE RECIBIDO:</td>
            <td style="text-align:right;">${payment.amount.toFixed(2)}€</td>
          </tr>
          <tr>
            <td>Método de Pago:</td>
            <td style="text-align:right;">${paymentMethodLabel.toUpperCase()}</td>
          </tr>
        </table>
        <div class="divider"></div>
        <div class="center">
          <p>La deuda restante calculada es de:<br><strong style="font-size: 16px;">${getRemainingAfterPayment(payment).toFixed(2)}€</strong></p>
        </div>
        <div class="divider"></div>
        <div class="center">
          <p>¡Gracias por confiar en nosotros!</p>
        </div>
      </body>
    </html>
  `

  doc.open()
  doc.write(html)
  doc.close()

  setTimeout(() => {
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
    setTimeout(() => {
      document.body.removeChild(iframe)
    }, 1000)
  }, 250)
}

const close = () => {
  modalRef.value?.close()
  setTimeout(() => { debt.value = null }, 300)
}

const processPayment = async () => {
  if (!isValidPayment.value) {
    emit('toast', 'Importe inválido', 'error')
    return
  }

  isProcessing.value = true
  try {
    await $fetch(`/api/debts/${debt.value.debt_id}/pay`, {
      method: 'POST',
      body: {
        amount: Number(amountToPay.value),
        payment_method: paymentMethod.value
      }
    })
    
    emit('toast', 'Pago registrado correctamente', 'success')
    emit('payment-success')
    close()
  } catch (err: any) {
    emit('toast', err.data?.statusMessage || 'Error al procesar el pago', 'error')
  } finally {
    isProcessing.value = false
  }
}

defineExpose({ open, close })
</script>

<template>
  <dialog ref="modalRef" class="modal modal-bottom sm:modal-middle z-50">
    <div v-if="debt" class="modal-box bg-bg-app border-border-subtle p-0 sm:max-w-3xl sm:rounded-3xl border shadow-2xl">
      <!-- Header -->
      <div class="border-border-subtle bg-bg-card flex items-center justify-between border-b px-6 py-5">
        <div class="flex items-center gap-3">
          <div class="bg-error/10 text-error flex h-10 w-10 items-center justify-center rounded-xl">
            <Receipt class="h-5 w-5" />
          </div>
          <div>
            <h3 class="text-text-primary text-lg font-bold">Detalle de Deuda</h3>
            <p class="text-text-muted text-xs font-medium uppercase tracking-wider">
              ID: {{ debt.debt_id.split('-')[0] }}
            </p>
          </div>
        </div>
        <button @click.prevent="close" class="btn btn-circle btn-ghost btn-sm bg-bg-muted/50 hover:bg-bg-muted">
          <X class="text-text-primary h-4 w-4" />
        </button>
      </div>

      <div class="p-6">
         <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Left: Breakdown -->
            <div class="space-y-4">
               <h4 class="text-text-primary text-sm font-bold uppercase tracking-wider">Desglose de Conceptos</h4>
               <div v-if="debt.cart?.items?.length > 0" class="space-y-3">
                  <div v-for="item in debt.cart.items" :key="item.cart_item_id" class="bg-bg-card border-border-subtle rounded-2xl border p-3 flex justify-between items-center shadow-sm">
                     <div class="flex-1 min-w-0 pr-4">
                        <p class="text-text-primary text-sm font-bold truncate">{{ item.name }}</p>
                        <p class="text-text-muted text-xs font-medium mt-0.5">{{ item.quantity }} × {{ item.unit_price.toFixed(2) }}€</p>
                     </div>
                     <span class="text-text-primary font-black tabular-nums shrink-0">{{ item.total.toFixed(2) }}€</span>
                  </div>
               </div>
               <div v-else class="bg-bg-muted/30 border border-border-subtle rounded-2xl p-6 text-center">
                  <p class="text-text-muted text-xs font-bold uppercase">Deuda manual sin ticket asociado</p>
                  <p class="text-text-primary mt-2 text-sm font-bold">{{ debt.notes || 'Ajuste de Saldo' }}</p>
               </div>
               
               <div class="border-border-subtle flex justify-between items-center mt-6 shadow-sm border-t-0 p-0 rounded-none bg-transparent pl-2 pr-2">
                  <span class="text-text-muted text-xs font-bold uppercase tracking-wider">Deuda Original Acumulada</span>
                  <span class="text-text-primary text-lg font-black tabular-nums">{{ debt.amount.toFixed(2) }}€</span>
               </div>
            </div>

            <!-- Right: Payment Action & History -->
            <div class="space-y-6">
               <div class="bg-primary/5 border-primary/20 rounded-3xl border p-6">
                  <h4 class="text-primary text-sm font-bold uppercase tracking-wider mb-5">Procesar Cuota</h4>
                  
                  <div class="space-y-4">
                     <div class="flex items-end justify-between border-b border-primary/20 pb-3 mb-4">
                        <label class="text-text-muted text-[10px] font-black uppercase tracking-widest">Saldo Restante</label>
                        <span class="text-error text-3xl font-black tabular-nums leading-none">{{ debt.remaining.toFixed(2) }}€</span>
                     </div>
                     
                     <div class="flex flex-col gap-2">
                        <label class="text-text-primary text-xs font-black uppercase tracking-widest ml-1">Abonar Importe (€)</label>
                        <input v-model.number="amountToPay" @blur="formatAmount" type="number" step="0.01" :max="debt.remaining" class="input bg-bg-card border-border-subtle focus:border-primary focus:ring-primary text-text-primary w-full rounded-xl font-black shadow-sm text-lg outline-none transition-all h-14" />
                     </div>

                     <div class="flex gap-2 pt-2">
                        <button @click="paymentMethod = 'cash'" class="btn flex-1 rounded-xl h-12" :class="paymentMethod === 'cash' ? 'bg-text-secondary text-bg-app border-transparent hover:bg-text-primary' : 'bg-bg-card border-border-default text-text-secondary hover:border-text-primary'">
                          <Banknote class="w-4 h-4 mr-1" /> Efectivo
                        </button>
                        <button @click="paymentMethod = 'card'" class="btn flex-1 rounded-xl h-12" :class="paymentMethod === 'card' ? 'bg-text-secondary text-bg-app border-transparent hover:bg-text-primary' : 'bg-bg-card border-border-default text-text-secondary hover:border-text-primary'">
                          <CreditCard class="w-4 h-4 mr-1" /> Tarjeta
                        </button>
                     </div>

                     <button @click="processPayment" :disabled="isProcessing || !isValidPayment" class="btn btn-primary h-14 w-full rounded-xl font-bold mt-4 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all border-0">
                        <span v-if="isProcessing" class="loading loading-spinner loading-sm"></span>
                        Abonar {{ amountToPay ? amountToPay.toFixed(2) : '0.00' }}€
                     </button>
                  </div>
               </div>

               <!-- History -->
               <div>
                  <h4 class="text-text-primary text-sm font-bold uppercase tracking-wider mb-3 ml-1">Historial Acumulado</h4>
                  <div v-if="debt.payments?.length > 0" class="space-y-2 max-h-40 overflow-y-auto pr-2 no-scrollbar">
                     <div v-for="pay in debt.payments" :key="pay.payment_id" class="bg-bg-card border-border-subtle rounded-xl border p-3 flex justify-between items-center hover:bg-bg-muted/30 transition-colors">
                        <div class="flex items-center gap-3">
                           <div class="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                               <CheckCircle class="text-success w-4 h-4" />
                           </div>
                           <div class="flex flex-col">
                               <span class="text-text-primary text-xs font-bold uppercase">Pago Registrado</span>
                               <span class="text-text-muted text-[10px] font-bold uppercase">{{ new Date(pay.payment_date).toLocaleString() }}</span>
                           </div>
                        </div>
                        <div class="flex flex-col items-end gap-1">
                           <div class="flex items-center gap-2">
                              <button @click="printReceipt(pay)" class="btn btn-ghost btn-xs text-text-muted hover:text-primary p-1 h-auto min-h-0" title="Imprimir Recibo">
                                 <Printer class="w-3.5 h-3.5" />
                              </button>
                              <span class="text-success text-sm font-black tabular-nums">-{{ pay.amount.toFixed(2) }}€</span>
                           </div>
                           <span class="text-text-muted text-[9px] font-bold uppercase tracking-wider bg-bg-muted/50 px-2 py-0.5 rounded">{{ pay.payment_method }}</span>
                        </div>
                     </div>
                  </div>
                  <div v-else class="text-text-muted text-xs font-medium ml-1">Ningún pago abonado todavía.</div>
               </div>
            </div>
         </div>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click.prevent="close">Cerrar</button>
    </form>
  </dialog>
</template>
