<script setup lang="ts">
import { ref } from 'vue'
import { X, Receipt, CheckCircle, CreditCard, Banknote, Printer, FileText } from 'lucide-vue-next'

const modalRef = ref<HTMLDialogElement | null>(null)
const cart = ref<any>(null)

const open = (cartData: any) => {
  cart.value = cartData
  modalRef.value?.showModal()
}

const close = () => {
  modalRef.value?.close()
  setTimeout(() => { cart.value = null }, 300)
}

const printReceipt = () => {
  if (!cart.value) return

  const dateStr = new Date(cart.value.created_at).toLocaleString()
  const itemsHtml = cart.value.items?.map((item: any) => `
    <tr>
      <td style="text-align: left;">${item.name} <br><small style="color:#666">IVA aplicado: ${item.tax_rate}%</small></td>
      <td style="text-align: center;">${item.quantity}</td>
      <td style="text-align: right;">${item.total.toFixed(2)}€</td>
    </tr>
  `).join('') || `<tr><td colspan="3">Venta sin ticket detallado</td></tr>`

  const paymentMethodLabel = cart.value.payment_method === 'cash' ? 'Efectivo' : 
                             cart.value.payment_method === 'card' ? 'Tarjeta' : 
                             cart.value.payment_method === 'mixed' ? 'Mixto' : 'Tarjeta/Transferencia';

  const html = `
    <html>
      <head>
        <title>Ticket de Compra</title>
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
        <div class="center bold">TICKET DE COMPRA</div>
        <div class="divider"></div>
        <div><strong>Fecha:</strong> ${dateStr}</div>
        <div><strong>Ticket:</strong> #${cart.value.cart_id.split('-')[0].toUpperCase()}</div>
        <div class="divider"></div>

        <div class="bold">Conceptos de Compra:</div>
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
          <tr class="bold" style="font-size: 14px;">
            <td>TOTAL PAGADO:</td>
            <td style="text-align:right;">${cart.value.total.toFixed(2)}€</td>
          </tr>
          <tr>
            <td>Método de Cobro:</td>
            <td style="text-align:right;">${paymentMethodLabel.toUpperCase()}</td>
          </tr>
        </table>
        <div class="divider"></div>
        <div class="center">
          <p>Compra facturada y pagada correctamente.</p>
          <p>¡Gracias por confiar en nosotros!</p>
        </div>
      </body>
    </html>
  `

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  if (isMobile) {
    const printWin = window.open('', '_blank')
    if (printWin) {
      printWin.document.open()
      printWin.document.write(html)
      printWin.document.close()
      printWin.focus()
      setTimeout(() => {
        printWin.print()
      }, 500)
      return
    }
  }

  const iframe = document.createElement('iframe')
  iframe.style.display = 'none'
  document.body.appendChild(iframe)
  const doc = iframe.contentWindow?.document
  if (!doc) return
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

const printInvoice = () => {
  if (!cart.value) return
  
  const dateStr = new Date(cart.value.created_at).toLocaleString()
  
  // Calculate Base Imponible by Tax Rate
  const taxes: Record<number, { base: number, quota: number }> = {}
  let totalBase = 0
  let totalQuota = 0

  cart.value.items?.forEach((item: any) => {
    const rate = item.tax_rate || 0
    if (!taxes[rate]) taxes[rate] = { base: 0, quota: 0 }
    
    const baseObj = item.total / (1 + (rate / 100))
    const quotaObj = item.total - baseObj
    
    taxes[rate].base += baseObj
    taxes[rate].quota += quotaObj
    totalBase += baseObj
    totalQuota += quotaObj
  })

  // Format Items
  const itemsHtml = cart.value.items?.map((item: any) => {
    const rate = item.tax_rate || 0
    const itemUnitPriceBase = item.unit_price / (1 + (rate / 100))
    return `
    <tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 10px 0; text-align: left;">
        <strong>${item.name}</strong><br>
        <span style="color:#666; font-size:11px;">${item.item_type || 'Concepto'}</span>
      </td>
      <td style="padding: 10px 0; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px 0; text-align: right;">${itemUnitPriceBase.toFixed(2)}€</td>
      <td style="padding: 10px 0; text-align: center;">${rate}%</td>
      <td style="padding: 10px 0; text-align: right;">${item.total.toFixed(2)}€</td>
    </tr>
  `
  }).join('') || `<tr><td colspan="5">Factura sin detalles</td></tr>`

  const taxRowsHtml = Object.keys(taxes).map(rate => {
    const val = taxes[Number(rate)]
    if (!val) return ''
    return `
      <tr style="font-size: 12px; color: #555;">
        <td style="padding: 4px 0;">IVA al ${rate}% sobre ${val.base.toFixed(2)}€:</td>
        <td style="text-align:right;">${val.quota.toFixed(2)}€</td>
      </tr>
    `
  }).join('')

  const paymentMethodLabel = cart.value.payment_method === 'cash' ? 'Efectivo' : 
                             cart.value.payment_method === 'card' ? 'Tarjeta' : 
                             cart.value.payment_method === 'mixed' ? 'Mixto' : 'Tarjeta/Transferencia';

  const clientName = cart.value.user ? `${cart.value.user.name} ${cart.value.user.surname}` : 'Cliente Mostrador'
  const clientDoc = cart.value.user?.document_number ? `<br>NIF/NIE: ${cart.value.user.document_number}` : ''
  const clientEmail = cart.value.user?.email ? `<br>Email: ${cart.value.user.email}` : ''
  
  const invoiceNumber = cart.value.invoice_number || `#${cart.value.cart_id.split('-')[0].toUpperCase()}`
  const invoiceTitle = cart.value.invoice_type === 'F1' ? 'FACTURA' : cart.value.invoice_type === 'F2' ? 'FACTURA SIMPLIFICADA' : 'FACTURA / TICKET'

  const html = `
    <html>
      <head>
        <title>Factura ${invoiceNumber}</title>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; max-width: 800px; margin: auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #000; padding-bottom: 20px;}
          .title { font-size: 24px; font-weight: bold; margin: 0; }
          .subtitle { color: #666; font-size: 14px; margin-top: 5px; }
          .info-block { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 14px; line-height: 1.5; }
          .box { background: #f9fafb; padding: 15px; border-radius: 8px; width: 45%; border: 1px solid #e5e7eb;}
          .box-title { font-weight: bold; font-size: 12px; text-transform: uppercase; color: #6b7280; margin-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { border-bottom: 2px solid #e5e7eb; text-align: left; padding: 12px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; }
          .totals { width: 100%; display: flex; justify-content: flex-end; }
          .totals-table { width: 350px; }
          .totals-table td { padding: 8px 0; }
          .grand-total { font-size: 18px; font-weight: bold; border-top: 2px solid #000; padding-top: 10px; margin-top: 10px; }
          .footer { margin-top: 50px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">BEILS BELLEZA HONESTA</h1>
            <div class="subtitle">CIF: B12345678 <br> C/ Muestra 123, 28000 Madrid<br>contacto@bellezahonesta.com</div>
          </div>
          <div style="text-align: right;">
            <h2 style="margin:0; font-size: 20px; color: #111;">${invoiceTitle}</h2>
            <div style="font-size: 16px; font-weight: bold; color: #4b5563; margin-top: 5px;">${invoiceNumber}</div>
            <div style="color: #6b7280; margin-top: 5px;">Fecha: ${dateStr}</div>
          </div>
        </div>

        <div class="info-block">
          <div class="box">
            <div class="box-title">Datos del Cliente</div>
            <strong>${clientName}</strong>
            ${clientDoc}
            ${clientEmail}
          </div>
          <div class="box" style="display:flex; flex-direction: column; justify-content:center;">
             <div class="box-title">Datos de Pago</div>
             <div><strong>Método:</strong> ${paymentMethodLabel}</div>
             <div><strong>Estado:</strong> Pagado</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Concepto</th>
              <th style="text-align: center;">Cant.</th>
              <th style="text-align: right;">Precio Ud. (Base)</th>
              <th style="text-align: center;">% IVA</th>
              <th style="text-align: right;">Subtotal (IVA incl.)</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="totals">
          <table class="totals-table">
            <tr>
              <td>Base Imponible Acumul.:</td>
              <td style="text-align:right;">${totalBase.toFixed(2)}€</td>
            </tr>
            ${taxRowsHtml}
            ${cart.value.discount > 0 ? `<tr><td style="color: red;">Descuento aplicado:</td><td style="text-align:right; color:red;">-${cart.value.discount.toFixed(2)}€</td></tr>` : ''}
            <tr class="grand-total">
              <td>TOTAL FACTURA:</td>
              <td style="text-align:right;">${cart.value.total.toFixed(2)}€</td>
            </tr>
          </table>
        </div>

        <div class="footer">
          Documento expedido y validado a través de Beils Finanzas.<br>
          Gracias por su visita.
        </div>
      </body>
    </html>
  `

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  if (isMobile) {
    const printWin = window.open('', '_blank')
    if (printWin) {
      printWin.document.open()
      printWin.document.write(html)
      printWin.document.close()
      printWin.focus()
      setTimeout(() => {
        printWin.print()
      }, 500)
      return
    }
  }

  const iframe = document.createElement('iframe')
  iframe.style.display = 'none'
  document.body.appendChild(iframe)
  const doc = iframe.contentWindow?.document
  if (!doc) return
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

defineExpose({ open, close })
</script>

<template>
  <dialog ref="modalRef" class="modal modal-bottom sm:modal-middle z-50">
    <div v-if="cart" class="modal-box bg-bg-app border-border-subtle p-0 sm:max-w-2xl sm:rounded-3xl border shadow-2xl">
      <!-- Header -->
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
            <button @click="printReceipt" title="Imprimir Ticket Térmico" class="btn btn-outline btn-sm text-text-primary border-border-default hover:bg-bg-muted rounded-xl">
                <Printer class="w-4 h-4 mr-1 hidden sm:block" /> Ticket
            </button>
            <button @click="printInvoice" title="Imprimir Factura A4" class="btn btn-primary btn-sm text-bg-card rounded-xl shadow-sm">
                <FileText class="w-4 h-4 mr-1 hidden sm:block" /> Factura A4
            </button>
            <button @click.prevent="close" class="btn btn-circle btn-ghost btn-sm bg-bg-muted/50 hover:bg-bg-muted ml-1">
              <X class="text-text-primary h-4 w-4" />
            </button>
        </div>
      </div>

      <div class="p-6">
         <div class="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
            <!-- Left: Breakdown -->
            <div class="space-y-4">
               <h4 class="text-text-primary text-sm font-bold uppercase tracking-wider">Desglose de Conceptos</h4>
               <div v-if="cart.items?.length > 0" class="space-y-3">
                  <div v-for="item in cart.items" :key="item.cart_item_id" class="bg-bg-card border-border-subtle rounded-2xl border p-3 flex justify-between items-center shadow-sm">
                     <div class="flex-1 min-w-0 pr-4">
                        <p class="text-text-primary text-sm font-bold truncate">{{ item.name }}</p>
                        <p class="text-text-muted text-xs font-medium mt-0.5">{{ item.quantity }} × {{ item.unit_price.toFixed(2) }}€ <span class="text-text-muted mx-1">•</span> IVA: {{ item.tax_rate }}%</p>
                     </div>
                     <span class="text-text-primary font-black tabular-nums shrink-0">{{ item.total.toFixed(2) }}€</span>
                  </div>
               </div>
               <div v-else class="bg-bg-muted/30 border border-border-subtle rounded-2xl p-6 text-center">
                  <p class="text-text-muted text-xs font-bold uppercase">Venta manual sin items detallados</p>
               </div>
               
               <div class="border-border-subtle flex justify-between items-center mt-6 shadow-sm border-t-0 p-0 rounded-none bg-transparent pl-2 pr-2">
                  <span class="text-text-muted text-xs font-bold uppercase tracking-wider">Total Oficial del Ticket</span>
                  <span class="text-text-primary text-lg font-black tabular-nums">{{ cart.total.toFixed(2) }}€</span>
               </div>
            </div>

            <!-- Right: Status / Context -->
            <div class="space-y-6">
               <div class="bg-success/5 border-success/20 rounded-3xl border p-6">
                  <div class="flex items-center justify-between mb-4">
                      <h4 class="text-success text-sm font-bold uppercase tracking-wider">Completado</h4>
                      <CheckCircle class="text-success w-5 h-5" />
                  </div>
                  
                  <div class="space-y-4">
                     <div class="flex items-end justify-between border-b border-success/20 pb-3 mb-4">
                        <label class="text-text-muted text-[10px] font-black uppercase tracking-widest">Total Abonado</label>
                        <span class="text-success text-3xl font-black tabular-nums leading-none">{{ cart.total.toFixed(2) }}€</span>
                     </div>
                     
                     <div class="flex flex-col gap-1 border-b border-border-subtle pb-3">
                        <label class="text-text-primary text-[10px] font-black uppercase tracking-widest">Fecha y Registro</label>
                        <span class="text-text-secondary text-sm font-bold">{{ new Date(cart.created_at).toLocaleString() }}</span>
                     </div>
                     
                     <div class="flex flex-col gap-1">
                        <label class="text-text-primary text-[10px] font-black uppercase tracking-widest">Método</label>
                        <div class="flex items-center gap-2 mt-1">
                            <span class="bg-bg-card font-bold text-xs uppercase text-text-secondary border border-border-default px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                                <CreditCard v-if="cart.payment_method === 'card'" class="w-3.5 h-3.5" />
                                <Banknote v-if="cart.payment_method === 'cash'" class="w-3.5 h-3.5" />
                                {{ cart.payment_method }}
                            </span>
                        </div>
                     </div>
                  </div>
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
