<script setup lang="ts">
	import { ref, computed } from 'vue'
	import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
	import { Landmark, Search, MoreVertical, CheckCircle2, AlertCircle } from 'lucide-vue-next'

	definePageMeta({ layout: 'default' })
	useHead({ title: 'Gestión de Deudas | Finanzas' })

	const queryClient = useQueryClient()
	const searchQuery = ref('')
	const filterStatus = ref('')
	const toastMessage = ref('')
	const toastType = ref<'success' | 'error'>('success')
	const showToast = ref(false)
	const selectedDebt = ref<any | null>(null)
	const paymentAmount = ref<number | null>(null)
	const paymentModalRef = ref<HTMLDialogElement | null>(null)

	const queryParams = computed(() => {
		const params: Record<string, string> = {}
		if (filterStatus.value) params.status = filterStatus.value
		return params
	})

	const { data: debts, isPending } = useQuery({
		queryKey: ['debts', queryParams],
		queryFn: () => $fetch('/api/sales/debts', { query: queryParams.value }),
	})

	const filteredDebts = computed(() => {
		if (!debts.value) return []
		if (!searchQuery.value) return debts.value

		const query = searchQuery.value.toLowerCase()
		return debts.value.filter(
			(d: any) =>
				d.user?.name?.toLowerCase().includes(query) || d.user?.surname?.toLowerCase().includes(query),
		)
	})

	const { mutate: updateDebt } = useMutation({
		mutationFn: (payload: { id: string; remaining: number; status: string }) =>
			$fetch(`/api/sales/debts/${payload.id}`, {
				method: 'PUT',
				body: { remaining: payload.remaining, status: payload.status },
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['debts'] })
			displayToast('Pago registrado correctamente', 'success')
			closePaymentModal()
		},
		onError: (error: any) => {
			displayToast(error.data?.statusMessage || 'Error al procesar el pago', 'error')
		},
	})

	const openPaymentModal = (debt: any) => {
		selectedDebt.value = debt
		paymentAmount.value = debt.remaining
		paymentModalRef.value?.showModal()
	}

	const closePaymentModal = () => {
		paymentModalRef.value?.close()
		setTimeout(() => {
			selectedDebt.value = null
			paymentAmount.value = null
		}, 300)
	}

	const processPayment = () => {
		if (!selectedDebt.value || !paymentAmount.value) return

		let amount = Number(paymentAmount.value)
		if (amount <= 0 || amount > selectedDebt.value.remaining) {
			displayToast('El monto es inválido', 'error')
			return
		}

		const newRemaining = selectedDebt.value.remaining - amount
		const newStatus = newRemaining <= 0 ? 'paid' : 'partial'

		updateDebt({
			id: selectedDebt.value.debt_id,
			remaining: newRemaining,
			status: newStatus,
		})
	}

	const displayToast = (message: string, type: 'success' | 'error') => {
		toastMessage.value = message
		toastType.value = type
		showToast.value = true
		setTimeout(() => (showToast.value = false), 3000)
	}

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount)
	}

	const formatDate = (dateString: string | null) => {
		if (!dateString) return 'N/T'
		return new Date(dateString).toLocaleDateString('es-ES', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
		})
	}
</script>

<template>
	<div class="bg-bg-app text-text-secondary min-h-screen w-full p-4 lg:p-8">
		<div class="mx-auto max-w-7xl">
			<!-- Header -->
			<div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div class="flex items-center gap-3">
					<div class="bg-error/10 text-error flex h-12 w-12 items-center justify-center rounded-2xl">
						<Landmark class="h-6 w-6" />
					</div>
					<div>
						<h1 class="text-2xl font-bold tracking-tight">Cuentas por Cobrar</h1>
						<p class="text-text-muted text-sm font-medium">Gestión de deudas de clientes e impagos</p>
					</div>
				</div>

				<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
					<select
						v-model="filterStatus"
						class="select bg-bg-card border-border-default h-12 rounded-2xl">
						<option value="">Todas las deudas</option>
						<option value="pending">Pendientes / Parciales</option>
						<option value="paid">Saldadas (Cobrado)</option>
					</select>

					<div class="relative w-full sm:w-64">
						<Search class="text-text-muted absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2" />
						<input
							v-model="searchQuery"
							type="text"
							placeholder="Buscar cliente..."
							class="input bg-bg-card border-border-default focus:border-error focus:ring-error/20 h-12 w-full rounded-2xl pl-10 text-sm shadow-sm transition-[border-color,box-shadow]" />
					</div>
				</div>
			</div>

			<!-- Loading State -->
			<div
				v-if="isPending"
				class="bg-bg-card border-border-default h-96 w-full animate-pulse rounded-3xl border opacity-50 mix-blend-multiply"></div>

			<!-- List -->
			<div
				v-else-if="filteredDebts && filteredDebts.length > 0"
				class="bg-bg-card border-border-default overflow-hidden rounded-3xl border shadow-sm">
				<div class="overflow-x-auto">
					<table class="table w-full">
						<thead>
							<tr
								class="border-border-default bg-bg-muted/50 text-text-muted text-xs tracking-wider uppercase">
								<th class="py-4 pl-6">Cliente</th>
								<th>Fecha Ori.</th>
								<th>Vencimiento</th>
								<th class="text-right">Total Deuda</th>
								<th class="text-right">Saldo Pende.</th>
								<th class="text-center">Estado</th>
								<th class="pr-6 text-right">Acciones</th>
							</tr>
						</thead>
						<tbody>
							<tr
								v-for="debt in filteredDebts"
								:key="debt.debt_id"
								class="border-border-default hover:bg-bg-muted/30 group transition-colors">
								<td class="py-4 pl-6">
									<div class="flex items-center gap-3">
										<div class="avatar placeholder">
											<div class="bg-neutral text-neutral-content w-10 rounded-full">
												<span class="text-xs">
													{{ debt.user?.name?.charAt(0) }}{{ debt.user?.surname?.charAt(0) }}
												</span>
											</div>
										</div>
										<div>
											<div class="text-sm font-bold">
												{{ debt.user?.name }} {{ debt.user?.surname }}
											</div>
											<div class="text-text-muted text-xs">{{ debt.user?.phone }}</div>
										</div>
									</div>
								</td>
								<td class="text-sm font-medium">{{ formatDate(debt.created_at) }}</td>
								<td class="text-sm font-medium">
									<span
										:class="{
											'text-error font-bold':
												debt.status !== 'paid' &&
												debt.due_date &&
												new Date(debt.due_date) < new Date(),
										}">
										{{ formatDate(debt.due_date) }}
									</span>
								</td>
								<td class="text-text-muted text-right text-sm font-bold tabular-nums">
									{{ formatCurrency(debt.amount) }}
								</td>
								<td
									class="text-right text-base font-black tabular-nums"
									:class="debt.status === 'paid' ? 'text-success' : 'text-error'">
									{{ formatCurrency(debt.remaining) }}
								</td>
								<td class="text-center">
									<div
										class="badge badge-sm font-bold tracking-wider uppercase"
										:class="{
											'badge-success text-white': debt.status === 'paid',
											'badge-warning text-yellow-900': debt.status === 'partial',
											'badge-error text-white': debt.status === 'pending',
										}">
										{{
											debt.status === 'paid'
												? 'Saldada'
												: debt.status === 'partial'
													? 'Abono Parcial'
													: 'Impago'
										}}
									</div>
								</td>
								<td class="sticky right-0 pr-6 text-right">
									<button
										v-if="debt.status !== 'paid'"
										@click="openPaymentModal(debt)"
										class="btn btn-sm bg-text-primary text-bg-card hover:bg-text-secondary rounded-lg border-none font-bold shadow-sm">
										Cobrar Abono
									</button>
									<div
										v-else
										class="text-success tooltip flex justify-end pr-4"
										data-tip="Deuda completamente saldada">
										<CheckCircle2 class="h-6 w-6" />
									</div>
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
				<div class="bg-success/10 mb-4 flex h-20 w-20 items-center justify-center rounded-full">
					<CheckCircle2 class="text-success h-10 w-10" />
				</div>
				<h3 class="mb-1 text-xl font-bold">Sin Inconvenientes</h3>
				<p class="text-text-muted mb-6 max-w-sm text-sm">
					No hay clientes con cuentas por pagar o deudas registradas con los filtros actuales.
				</p>
			</div>
		</div>

		<!-- Payment Modal -->
		<dialog ref="paymentModalRef" class="modal">
			<div
				class="modal-box bg-bg-card text-text-secondary relative w-11/12 max-w-sm overflow-hidden rounded-4xl p-0 shadow-xl">
				<div
					class="bg-bg-muted/30 border-border-default sticky top-0 z-20 flex items-center justify-between border-b px-6 py-4 backdrop-blur-md">
					<h3 class="text-xl font-bold tracking-tight">Registrar Pago</h3>
					<button
						type="button"
						class="btn btn-sm btn-circle btn-ghost text-text-light hover:bg-text-primary"
						@click="closePaymentModal">
						✕
					</button>
				</div>

				<div class="flex flex-col gap-5 p-6" v-if="selectedDebt">
					<div
						class="bg-error/5 border-error/10 mb-2 flex flex-col items-center rounded-2xl border p-4 text-center">
						<AlertCircle class="text-error mb-2 h-8 w-8 opacity-80" />
						<span class="text-text-muted mb-1 text-xs font-bold tracking-widest uppercase">
							Monto restante a liquidar
						</span>
						<span class="text-error text-3xl leading-none font-black tabular-nums">
							{{ formatCurrency(selectedDebt.remaining) }}
						</span>
					</div>

					<div class="form-control">
						<label class="label pb-1" for="pay-amount">
							<span class="label-text text-primary text-xs font-bold tracking-wider uppercase">
								Monto Recibido (€) *
							</span>
						</label>
						<input
							id="pay-amount"
							v-model="paymentAmount"
							type="number"
							step="0.01"
							min="0.01"
							:max="selectedDebt.remaining"
							class="input bg-bg-muted border-border-default focus:bg-bg-card focus:border-primary text-primary focus:ring-primary/20 hover:bg-bg-hover h-14 w-full rounded-2xl px-4 text-center text-2xl font-black tabular-nums shadow-sm transition-all focus:shadow-md focus:outline-none" />
					</div>

					<div class="text-text-muted mt-2 px-4 text-center text-xs font-bold tracking-wider uppercase">
						Al registrar el pago, el saldo pendiente de {{ selectedDebt.user?.name }} se reducirá.
					</div>
				</div>

				<div
					class="bg-bg-muted/30 border-border-default sticky bottom-0 z-20 flex w-full gap-3 p-4 backdrop-blur-md">
					<button
						type="button"
						class="btn btn-ghost text-text-muted hover:bg-bg-hover h-12 flex-1 rounded-xl"
						@click="closePaymentModal">
						Cancelar
					</button>
					<button
						type="button"
						@click="processPayment"
						class="btn text-bg-card hover:bg-text-secondary/80 bg-text-primary h-12 flex-1 rounded-xl border-none font-bold shadow-md">
						Confirmar Abono
					</button>
				</div>
			</div>
			<form method="dialog" class="modal-backdrop bg-text-secondary/40 backdrop-blur-sm">
				<button>close</button>
			</form>
		</dialog>

		<!-- Toast Provider -->
		<div v-if="showToast" class="toast toast-end toast-bottom z-50">
			<div
				:class="[
					'alert rounded-2xl border-none text-white shadow-lg',
					toastType === 'success' ? 'bg-success' : 'bg-error',
				]">
				<span class="font-medium">{{ toastMessage }}</span>
			</div>
		</div>
	</div>
</template>
