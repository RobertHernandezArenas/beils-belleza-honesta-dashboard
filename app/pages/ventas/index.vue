<script setup lang="ts">
	import { useQuery, useQueryClient } from '@tanstack/vue-query'
	import { ShoppingBag, Search, ExternalLink, Calendar, Receipt, CreditCard, Eye, EyeOff } from 'lucide-vue-next'
	import { useI18n } from 'vue-i18n'
	import QrcodeVue from 'qrcode.vue'
	import { useDataPrivacy } from '~/composables/useDataPrivacy'
	import PurchaseDetailsModal from '~/components/shared/PurchaseDetailsModal.vue'

	definePageMeta({ layout: 'default' })
	useHead({ title: 'Ventas | Finanzas' })

	const { t } = useI18n()
	const searchQuery = ref('')
	const filterDate = ref('')
	const queryClient = useQueryClient()

	const purchaseDetailsModalRef = ref<any>(null)

	const openDetails = (sale: any) => {
		purchaseDetailsModalRef.value?.open(sale)
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
			stripe: { label: 'Stripe', class: 'bg-indigo-100 text-indigo-800' },
		}
		return methods[method] || { label: method, class: 'bg-neutral text-neutral-content' }
	}

	const getStripeStatusBadge = (status: string | null) => {
		const statuses: Record<string, { label: string; class: string }> = {
			succeeded: { label: 'Completado', class: 'badge-success' },
			requires_payment_method: { label: 'Pendiente', class: 'badge-warning' },
			requires_confirmation: { label: 'Confirmación', class: 'badge-warning' },
			processing: { label: 'Procesando', class: 'badge-info' },
			canceled: { label: 'Cancelado', class: 'badge-error' },
			requires_action: { label: 'Acción requerida', class: 'badge-warning' },
		}
		if (!status) return { label: 'Desconocido', class: 'badge-ghost' }
		return statuses[status] || { label: status, class: 'badge-ghost' }
	}

	const getTotalItems = (items: any[]) => {
		if (!items) return 0
		return items.reduce((acc: number, item: any) => acc + item.quantity, 0)
	}

	// Privacidad de documentos
	const { revealedDocs, revealedLoading, toggleDocumentVisibility } = useDataPrivacy()
</script>

<template>
	<div class="bg-bg-app text-text-secondary min-h-screen w-full p-4 lg:p-8 lg:h-[calc(100dvh-73px)] lg:flex lg:flex-col lg:overflow-hidden">
		<div class="mx-auto flex h-full w-full max-w-7xl flex-col lg:overflow-hidden">
			<!-- Header -->
			<div class="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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

				<div class="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
					<div class="relative w-full sm:w-3/4 lg:w-64">
						<Search class="text-text-muted absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2" />
						<input
							v-model="searchQuery"
							type="text"
							:placeholder="$t('sales.search')"
							class="input bg-bg-card border-border-default focus:border-primary focus:ring-primary/20 h-12 w-full rounded-2xl pl-10 text-sm shadow-sm transition-[border-color,box-shadow]" />
					</div>
					<div class="relative w-full shrink-0 sm:w-1/4 lg:w-auto">
						<Calendar class="text-text-muted absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2" />
						<input
							v-model="filterDate"
							type="date"
							class="input bg-bg-card border-border-default h-12 w-full rounded-2xl pl-10 text-sm shadow-sm" />
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
				class="bg-bg-card border-border-default flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-3xl border shadow-sm">
				<div class="w-full flex-1 overflow-auto">
					<table class="table w-full relative">
						<thead class="sticky top-0 z-10 bg-bg-muted/50 backdrop-blur-md">
							<tr
								class="border-border-default text-text-muted border-none text-xs tracking-wider uppercase">
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
									<div class="flex flex-col items-center gap-1">
										<span
											class="badge badge-sm border-none font-bold tracking-wider uppercase"
											:class="getPaymentMethodBadge(sale.payment_method).class">
											{{ getPaymentMethodBadge(sale.payment_method).label }}
										</span>
										<span
											v-if="sale.payment_method === 'stripe' && sale.stripe_installments && sale.stripe_installments > 1"
											class="badge badge-xs bg-indigo-50 text-indigo-600 border-none font-semibold">
											{{ sale.stripe_installments }} cuotas
										</span>
									</div>
								</td>

								<td class="text-text-primary text-right text-base font-black tabular-nums">
									{{ formatCurrency(sale.total) }}
								</td>

								<td class="pr-6 text-right">
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
		<PurchaseDetailsModal ref="purchaseDetailsModalRef" @success="() => queryClient.invalidateQueries({ queryKey: ['sales'] })" />
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
