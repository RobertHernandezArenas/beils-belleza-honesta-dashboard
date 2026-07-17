export const printReceipt = (cart: any) => {
  if (!cart) return

  const dateStr = new Date(cart.created_at).toLocaleString()
  const itemsHtml = cart.items?.map((item: any) => `
    <tr>
      <td style="text-align: left;">${item.name} <br><small style="color:#666">IVA aplicado: ${item.tax_rate}%</small></td>
      <td style="text-align: center;">${item.quantity}</td>
      <td style="text-align: right;">${item.total.toFixed(2)}€</td>
    </tr>
  `).join('') || `<tr><td colspan="3">Venta sin ticket detallado</td></tr>`

  const paymentMethodLabel = cart.payment_method === 'cash' ? 'Efectivo' : 
                             cart.payment_method === 'card' ? 'Tarjeta' : 
                             cart.payment_method === 'mixed' ? 'Mixto' : 'Tarjeta/Transferencia';

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
        <div><strong>Ticket:</strong> #${cart.cart_id.split('-')[0].toUpperCase()}</div>
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
            <td style="text-align:right;">${cart.total.toFixed(2)}€</td>
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

export const printInvoice = (cart: any) => {
  if (!cart) return
  
  const dateStr = new Date(cart.created_at).toLocaleString()
  
  // Calculate Base Imponible by Tax Rate
  const taxes: Record<number, { base: number, quota: number }> = {}
  let totalBase = 0
  let totalQuota = 0

  cart.items?.forEach((item: any) => {
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
  const itemsHtml = cart.items?.map((item: any) => {
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

  const paymentMethodLabel = cart.payment_method === 'cash' ? 'Efectivo' : 
                             cart.payment_method === 'card' ? 'Tarjeta' : 
                             cart.payment_method === 'mixed' ? 'Mixto' : 'Tarjeta/Transferencia';

  const clientName = cart.user ? `${cart.user.name} ${cart.user.surname}` : 'Cliente Mostrador'
  const clientDoc = cart.user?.document_number ? `<br>NIF/NIE: ${cart.user.document_number}` : ''
  const clientEmail = cart.user?.email ? `<br>Email: ${cart.user.email}` : ''
  
  const invoiceNumber = cart.invoice_number || `#${cart.cart_id.split('-')[0].toUpperCase()}`
  const invoiceTitle = cart.invoice_type === 'F1' ? 'FACTURA' : cart.invoice_type === 'F2' ? 'FACTURA SIMPLIFICADA' : 'FACTURA / TICKET'

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
            ${cart.discount > 0 ? `<tr><td style="color: red;">Descuento aplicado:</td><td style="text-align:right; color:red;">-${cart.discount.toFixed(2)}€</td></tr>` : ''}
            <tr class="grand-total">
              <td>TOTAL FACTURA:</td>
              <td style="text-align:right;">${cart.total.toFixed(2)}€</td>
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
