<script setup lang="ts">
	import { ref, computed } from 'vue'
	import { useQuery } from '@tanstack/vue-query'
	import { ShoppingBag, Search, ExternalLink, Calendar, Receipt } from 'lucide-vue-next'
	import { useI18n } from 'vue-i18n'
	import QrcodeVue from 'qrcode.vue'

	definePageMeta({ layout: 'default' })
	useHead({ title: 'Ventas | Finanzas' })

	const { t } = useI18n()
	const searchQuery = ref('')
	const filterDate = ref('')

	const selectedSale = ref<any | null>(null)
	const detailsModalRef = ref<HTMLDialogElement | null>(null)

	const printTicket = () => {
		window.print()
	}

	// We fetch carts with status completed
	const { data: sales, isPending } = useQuery<any[]>({
		queryKey: ['sales', 'completed'],
		queryFn: () => $fetch('/api/sales/carts', { query: { status: 'completed' } }),
	})

	const filteredSales = computed(() => {
		if (!sales.value) return []
		let result = sales.value

		if (searchQuery.value) {
			const query = searchQuery.value.toLowerCase()
			result = result.filter((s: any) => {
				const clientName = s.user ? `${s.user.name} ${s.user.surname}`.toLowerCase() : ''
				return clientName.includes(query) || s.cart_id.toLowerCase().includes(query)
			})
		}

		if (filterDate.value) {
			result = result.filter((s: any) => {
				const saleDate = new Date(s.created_at).toISOString().split('T')[0]
				return saleDate === filterDate.value
			})
		}

		return result
	})

	

	

	const getPaymentMethodBadge = (method: string) => {
		const methods: Record<string, { label: string; class: string }> = {
			cash: { label: t('Efectivo'), class: 'bg-emerald-100 text-emerald-800' },
			card: { label: t('Tarjeta'), class: 'bg-blue-100 text-blue-800' },
			mixed: { label: t('Mixto'), class: 'bg-purple-100 text-purple-800' },
			transfer: { label: 'Transferencia', class: 'bg-orange-100 text-orange-800' },
		}
		return methods[method] || { label: method, class: 'bg-neutral text-neutral-content' }
	}

	const getTotalItems = (items: any[]) => {
		if (!items) return 0
		return items.reduce((acc: number, item: any) => acc + item.quantity, 0)
	}

	const openDetails = (sale: any) => {
		selectedSale.value = sale
		detailsModalRef.value?.showModal()
	}

	const closeDetails = () => {
		detailsModalRef.value?.close()
		setTimeout(() => {
			selectedSale.value = null
		}, 300)
	}
</script>

<template>
	<div class="bg-bg-app text-text-secondary min-h-screen w-full p-4 lg:p-8">
		<div class="mx-auto max-w-7xl">
			<!-- Header -->
			<div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div class="flex items-center gap-3">
					<div class="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-2xl">
						<ShoppingBag class="h-6 w-6" />
					</div>
					<div>
						<h1 class="text-text-primary mb-1 text-3xl font-medium tracking-tight">
							{{ $t('sales.title') }}
						</h1>
						<p class="text-text-muted text-sm font-medium">{{ $t('sales.subtitle') }}</p>
					</div>
				</div>

				<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
					<div class="relative w-full sm:w-auto">
						<Calendar class="text-text-muted absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2" />
						<input
							v-model="filterDate"
							type="date"
							class="input bg-bg-card border-border-default h-12 w-full rounded-2xl pl-10 text-sm shadow-sm" />
					</div>

					<div class="relative w-full sm:w-64">
						<Search class="text-text-muted absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2" />
						<input
							v-model="searchQuery"
							type="text"
							:placeholder="$t('sales.search')"
							class="input bg-bg-card border-border-default focus:border-primary focus:ring-primary/20 h-12 w-full rounded-2xl pl-10 text-sm shadow-sm transition-[border-color,box-shadow]" />
					</div>
				</div>
			</div>

			<!-- Loading State -->
			<div
				v-if="isPending"
				class="bg-bg-card border-border-default h-96 w-full animate-pulse rounded-3xl border mix-blend-multiply shadow-sm"></div>

			<!-- List -->
			<div
				v-else-if="filteredSales && filteredSales.length > 0"
				class="bg-bg-card border-border-default rounded-3xl border shadow-sm">
				<div class="w-full">
					<table class="table w-full">
						<thead>
							<tr
								class="border-border-default bg-bg-muted/50 text-text-muted text-xs tracking-wider uppercase">
								<th class="py-4 pl-6">{{ $t('sales.table.id') }}</th>
								<th>{{ $t('sales.table.date') }}</th>
								<th>{{ $t('sales.table.client') }}</th>
								<th class="hidden text-center lg:table-cell">{{ $t('sales.table.items') }}</th>
								<th class="text-center">{{ $t('sales.table.method') }}</th>
								<th class="text-right">{{ $t('sales.table.total') }}</th>
								<th class="pr-6 text-right">{{ $t('sales.table.actions') }}</th>
							</tr>
						</thead>
						<tbody>
							<tr
								v-for="sale in filteredSales"
								:key="sale.cart_id"
								@click.stop.prevent="openDetails(sale)"
								class="border-border-default hover:bg-bg-muted/30 group cursor-pointer transition-colors">
								<td class="text-text-muted py-4 pl-6 text-xs font-bold tracking-wider uppercase">
									<span v-if="sale.invoice_number" class="text-text-primary px-1">
										{{ sale.invoice_number }}
									</span>
									<span v-else>#{{ sale.cart_id.split('-')[0] }}</span>
								</td>

								<td class="text-sm font-medium">
									{{ formatDate(sale.created_at) }}
								</td>

								<td>
									<div class="flex items-center gap-3">
										<div class="avatar placeholder">
											<div
												class="bg-neutral text-neutral-content flex h-8 w-8 items-center justify-center rounded-full">
												<span
													class="flex h-full w-full items-center justify-center text-[10px] font-bold uppercase">
													{{
														sale.user
															? `${sale.user.name?.charAt(0)}${sale.user.surname?.charAt(0)}`
															: 'W'
													}}
												</span>
											</div>
										</div>
										<div class="text-sm font-bold">
											<NuxtLink
												v-if="sale.user"
												:to="`/clientes/${sale.user_id}`"
												@click.stop
												class="hover:text-primary transition-colors hover:underline">
												{{ sale.user.name }} {{ sale.user.surname }}
											</NuxtLink>
											<span v-else>
												{{ $t('sales.table.unregistered') }}
											</span>
										</div>
									</div>
								</td>

								<td class="hidden text-center lg:table-cell">
									<div class="badge badge-ghost font-bold">
										{{ getTotalItems(sale.items) }} items
									</div>
								</td>

								<td class="text-center">
									<span
										class="badge badge-sm border-none font-bold tracking-wider uppercase"
										:class="getPaymentMethodBadge(sale.payment_method).class">
										{{ getPaymentMethodBadge(sale.payment_method).label }}
									</span>
								</td>

								<td class="text-text-primary text-right text-base font-black tabular-nums">
									{{ formatCurrency(sale.total) }}
								</td>

								<td class="sticky right-0 pr-6 text-right">
									<button
										@click.stop.prevent="openDetails(sale)"
										class="btn btn-sm btn-ghost text-text-muted hover:text-primary hover:bg-primary/10 rounded-lg">
										<ExternalLink class="h-4 w-4" />
										<span class="hidden md:inline">{{ $t('sales.table.details') }}</span>
									</button>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>

			<!-- Empty State -->
			<div
				v-else
				class="bg-bg-card border-border-default flex flex-col items-center justify-center rounded-3xl border border-dashed px-4 py-20 text-center">
				<div class="bg-primary/10 mb-4 flex h-20 w-20 items-center justify-center rounded-full">
					<ShoppingBag class="text-primary h-10 w-10" />
				</div>
				<h3 class="mb-1 text-xl font-bold">{{ $t('sales.emptyState.title') }}</h3>
				<p class="text-text-muted mb-6 max-w-sm text-sm">{{ $t('sales.emptyState.desc') }}</p>
			</div>
		</div>

		<!-- Details Modal -->
		<dialog ref="detailsModalRef" class="modal">
			<div
				class="modal-box bg-bg-card text-text-secondary w-11/12 max-w-2xl overflow-hidden rounded-4xl p-0 shadow-xl"
				v-if="selectedSale">
				<!-- Modal Header -->
				<div
					class="bg-bg-muted/30 border-border-default sticky top-0 z-20 flex items-center justify-between border-b px-6 py-4 backdrop-blur-md">
					<div>
						<h3 class="text-xl font-bold tracking-tight">
							{{
								selectedSale.invoice_type === 'F1'
									? 'Factura'
									: selectedSale.invoice_type === 'F2'
										? 'Factura Simplificada'
										: $t('sales.modal.title')
							}}
						</h3>
						<p class="text-text-muted text-xs font-medium tracking-wider uppercase">
							<span
								v-if="selectedSale.invoice_number"
								class="text-text-primary border-border-default mr-1 border-r pr-2">
								{{ selectedSale.invoice_number }}
							</span>
							<span v-else class="border-border-default mr-1 border-r pr-2">
								#{{ selectedSale.cart_id.split('-')[0] }}
							</span>
							<span class="ml-1">{{ formatDate(selectedSale.created_at) }}</span>
						</p>
					</div>
					<button
						type="button"
						class="btn btn-sm btn-circle btn-ghost text-text-light hover:bg-text-primary print:hidden"
						@click="closeDetails">
						✕
					</button>
				</div>

				<!-- Modal Body -->
				<div class="p-6">
					<!-- Client Info Summary -->
					<div
						class="bg-bg-muted/30 border-border-default mb-6 flex items-center justify-between rounded-2xl border p-4">
						<div class="flex items-center gap-3">
							<div class="avatar placeholder">
								<div
									class="bg-primary/10 text-primary flex w-12 items-center justify-center rounded-full">
									<span
										class="flex h-full w-full items-center justify-center text-sm font-bold uppercase">
										{{
											selectedSale.user
												? `${selectedSale.user.name?.charAt(0)}${selectedSale.user.surname?.charAt(0)}`
												: 'W'
										}}
									</span>
								</div>
							</div>
							<div>
								<div class="text-text-primary font-bold">
									{{
										selectedSale.user
											? `${selectedSale.user.name} ${selectedSale.user.surname}`
											: $t('sales.modal.walkInClient')
									}}
								</div>
								<div class="text-text-muted text-xs" v-if="selectedSale.user?.document_number">
									NIF/CIF: {{ selectedSale.user.document_number }}
								</div>
								<div class="text-text-muted text-xs" v-if="selectedSale.user?.email">
									{{ selectedSale.user.email }}
								</div>
							</div>
						</div>
						<div class="text-right">
							<div class="text-text-muted text-xs font-bold tracking-wider uppercase">
								{{ $t('sales.modal.method') }}
							</div>
							<div
								class="badge badge-sm font-bold tracking-wider uppercase"
								:class="getPaymentMethodBadge(selectedSale.payment_method).class">
								{{ getPaymentMethodBadge(selectedSale.payment_method).label }}
							</div>
						</div>
					</div>

					<!-- Items List -->
					<h4 class="text-text-primary mb-3 text-sm font-bold tracking-wider uppercase">
						{{ $t('sales.modal.itemsTitle') }} ({{ getTotalItems(selectedSale.items) }})
					</h4>
					<div class="border-border-default bg-bg-app mb-6 rounded-2xl border">
						<div class="max-h-[300px] overflow-y-auto">
							<table class="table w-full">
								<thead class="bg-bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
									<tr class="text-text-muted border-none text-xs tracking-wider uppercase">
										<th class="py-3 pl-4">{{ $t('sales.modal.table.concept') }}</th>
										<th class="text-center">{{ $t('sales.modal.table.qty') }}</th>
										<th class="text-right">{{ $t('sales.modal.table.price') }}</th>
										<th class="pr-4 text-right">{{ $t('sales.modal.table.subtotal') }}</th>
									</tr>
								</thead>
								<tbody>
									<tr
										v-for="item in selectedSale.items"
										:key="item.cart_item_id"
										class="border-border-default hover:bg-bg-muted/30 border-t">
										<td class="py-3 pl-4">
											<div class="text-text-primary font-bold">{{ item.name }}</div>
											<div class="text-text-muted text-[10px] uppercase">{{ item.item_type }}</div>
										</td>
										<td class="text-center font-medium">{{ item.quantity }}</td>
										<td class="text-right tabular-nums">{{ formatCurrency(item.unit_price) }}</td>
										<td class="text-text-primary pr-4 text-right font-bold tabular-nums">
											{{ formatCurrency(item.total) }}
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>

					<!-- Totals Summary -->
					<div class="flex flex-col items-end gap-2 text-sm">
						<div class="text-text-muted flex w-full max-w-[250px] justify-between font-medium">
							<span>{{ $t('sales.modal.totals.subtotal') }}:</span>
							<span class="tabular-nums">{{ formatCurrency(selectedSale.subtotal) }}</span>
						</div>
						<div
							class="text-error flex w-full max-w-[250px] justify-between font-medium"
							v-if="selectedSale.discount > 0">
							<span>{{ $t('sales.modal.totals.discount') }}:</span>
							<span class="tabular-nums">-{{ formatCurrency(selectedSale.discount) }}</span>
						</div>
						<div
							class="border-border-default text-text-primary mt-2 flex w-full max-w-[250px] justify-between border-t pt-2 text-lg font-black">
							<span>{{ $t('sales.modal.totals.total') }}:</span>
							<span class="tabular-nums">{{ formatCurrency(selectedSale.total) }}</span>
						</div>
					</div>

					<!-- VERI*FACTU & QR Block -->
					<div
						v-if="selectedSale.qr_content"
						class="border-border-default bg-bg-muted/10 mt-6 flex flex-col items-center justify-between gap-6 rounded-2xl border-t px-2 pt-6 pb-2 md:flex-row">
						<div class="flex max-w-sm flex-col gap-2">
							<div class="flex items-center gap-2">
								<span
									class="badge badge-success badge-sm border-none px-2 py-3 text-[10px] font-bold tracking-widest uppercase opacity-90">
									AEAT Verificada
								</span>
								<h5 class="text-text-primary font-bold tracking-widest">VERI*FACTU</h5>
							</div>
							<p class="text-text-muted text-[11px] leading-relaxed">
								Esta factura ha sido enviada al registro oficial de la Agencia Estatal de
								Administración Tributaria. Puede verificar su vigencia escaneando este código QR con
								un dispositivo habilitado.
							</p>
						</div>
						<div class="border-border-default shrink-0 rounded-xl border bg-white p-2 shadow-sm">
							<qrcode-vue :value="selectedSale.qr_content" :size="90" level="M" />
						</div>
					</div>
				</div>

				<!-- Footer Action -->
				<div
					class="bg-bg-muted/30 border-border-default sticky bottom-0 z-20 flex w-full justify-end gap-3 p-4 backdrop-blur-md print:hidden">
					<button
						type="button"
						class="btn btn-ghost text-text-muted hover:bg-bg-hover h-12 rounded-xl"
						@click="closeDetails">
						{{ $t('sales.modal.buttons.close') }}
					</button>
					<button
						type="button"
						@click="printTicket"
						class="btn text-bg-card hover:bg-text-secondary/80 bg-text-primary h-12 rounded-xl border-none font-bold shadow-md">
						{{ $t('sales.modal.buttons.download') }}
					</button>
				</div>
			</div>
			<form method="dialog" class="modal-backdrop bg-text-secondary/40 backdrop-blur-sm">
				<button @click="closeDetails">close</button>
			</form>
		</dialog>
	</div>
</template>

<style>
	@media print {
		body * {
			visibility: hidden;
		}
		.modal-box,
		.modal-box * {
			visibility: visible;
		}
		.modal-box {
			position: absolute !important;
			left: 0 !important;
			top: 0 !important;
			width: 100% !important;
			max-width: 100% !important;
			margin: 0 !important;
			border-radius: 0 !important;
			box-shadow: none !important;
			height: auto !important;
			max-height: none !important;
		}
		.print\:hidden {
			display: none !important;
		}
	}
</style>
