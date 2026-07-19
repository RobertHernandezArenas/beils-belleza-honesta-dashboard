<script setup lang="ts">
import { X, Receipt, Printer, FileText } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { printReceipt, printInvoice } from '~/utils/printHelpers'

const props = defineProps<{
  cart: any
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { locale } = useI18n()

const handlePrintReceipt = () => {
    printReceipt(props.cart)
}

const handlePrintInvoice = () => {
    printInvoice(props.cart)
}
</script>

<template>
  <div class="border-border-subtle bg-bg-card flex items-center justify-between border-b px-6 py-5">
    <div class="flex items-center gap-3">
      <div class="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-xl">
        <Receipt class="h-5 w-5" />
      </div>
      <div>
        <h3 class="text-text-primary text-lg font-bold">Detalle de Compra</h3>
        <p class="text-text-muted text-xs font-medium uppercase tracking-wider">
          TICKET ID: {{ cart.cart_id.split('-')[0] }}
        </p>
      </div>
    </div>
    <div class="flex items-center gap-2">
        <button @click="handlePrintReceipt" :aria-label="locale === 'es' ? 'Imprimir Ticket Térmico' : 'Print Thermal Ticket'" title="Imprimir Ticket Térmico" class="btn btn-outline btn-sm text-text-primary border-border-default hover:bg-bg-muted rounded-xl">
            <Printer class="w-4 h-4 mr-1 hidden sm:block" /> Ticket
        </button>
        <button @click="handlePrintInvoice" :aria-label="locale === 'es' ? 'Imprimir Factura A4' : 'Print A4 Invoice'" title="Imprimir Factura A4" class="btn btn-primary btn-sm text-bg-card rounded-xl shadow-sm">
            <FileText class="w-4 h-4 mr-1 hidden sm:block" /> Factura A4
        </button>
        <button @click.prevent="emit('close')" class="btn btn-circle btn-ghost btn-sm bg-bg-muted/50 hover:bg-bg-muted ml-1">
          <X class="text-text-primary h-4 w-4" />
        </button>
    </div>
  </div>
</template>
