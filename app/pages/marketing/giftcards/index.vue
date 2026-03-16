<script setup lang="ts">
	import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
	import { CreditCard, Plus, Search, MoreVertical, Edit2, Trash2 } from 'lucide-vue-next'
	import GiftcardFormModal from '~/components/marketing/GiftcardFormModal.vue'
	import type { IGiftcard } from '~~/shared/types/marketing'

	definePageMeta({ layout: 'default' })
	useHead({ title: 'Tarjetas de Regalo | Marketing' })

	const queryClient = useQueryClient()
	const searchQuery = ref('')
	const modalRef = ref<InstanceType<typeof GiftcardFormModal> | null>(null)
	const toastMessage = ref('')
	const toastType = ref<'success' | 'error'>('success')
	const showToast = ref(false)

	const queryParams = computed(() => {
		const params: Record<string, string> = {}
		if (searchQuery.value) params.search = searchQuery.value
		return params
	})

	const { data: giftcards, isPending } = useQuery<IGiftcard[]>({
		queryKey: ['giftcards', queryParams],
		queryFn: () => $fetch('/api/marketing/giftcards', { query: queryParams.value }),
	})

	const { mutate: deleteGiftcard } = useMutation({
		mutationFn: (id: string) => $fetch(`/api/marketing/giftcards/${id}`, { method: 'DELETE' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['giftcards'] })
			displayToast('Tarjeta eliminada exitosamente', 'success')
		},
		onError: (error: any) => {
			displayToast(error.data?.statusMessage || 'Error al eliminar la tarjeta', 'error')
		},
	})

	const openCreateModal = () => {
		modalRef.value?.showModal(null)
	}

	const openEditModal = (giftcard: IGiftcard) => {
		modalRef.value?.showModal(giftcard)
	}

	const confirmDelete = (id: string) => {
		if (confirm('¿Eliminar esta tarjeta de regalo? El saldo asociado se perderá irremediablemente.')) {
			deleteGiftcard(id)
		}
	}

	const displayToast = (message: string, type: 'success' | 'error') => {
		toastMessage.value = message
		toastType.value = type
		showToast.value = true
		setTimeout(() => (showToast.value = false), 3000)
	}
</script>

<template>
	<div class="bg-bg-app text-text-secondary min-h-screen w-full p-4 lg:p-8">
		<div class="mx-auto max-w-7xl">
			<!-- Header -->
			<div class="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
				<div class="flex items-center gap-3">
					<div class="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-2xl">
						<CreditCard class="h-6 w-6" />
					</div>
					<div>
						<h1 class="text-2xl font-bold tracking-tight">Tarjetas de Regalo</h1>
						<p class="text-text-muted text-sm font-medium">
							Gestión de saldos para regalo o devolución
						</p>
					</div>
				</div>

				<div class="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
					<div class="relative w-full sm:w-3/4 lg:w-64">
						<Search class="text-text-muted absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2" />
						<input
							v-model="searchQuery"
							type="text"
							placeholder="Buscar código..."
							class="input bg-bg-card border-border-default focus:border-border-strong focus:ring-border-subtle h-12 w-full rounded-2xl pl-10 text-sm shadow-sm transition-[border-color,box-shadow]" />
					</div>
					<button
						class="btn bg-text-primary text-bg-card hover:bg-text-secondary h-12 flex w-full shrink-0 items-center justify-center rounded-2xl border-none px-6 font-bold shadow-sm sm:w-1/4 lg:w-auto"
						@click="openCreateModal">
						<Plus class="h-5 w-5" />
						Emitir Tarjeta
					</button>
				</div>
			</div>

			<!-- Loading State -->
			<div v-if="isPending" class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				<div
					v-for="i in 6"
					:key="i"
					class="bg-bg-card border-border-default h-40 w-full animate-pulse rounded-3xl border opacity-50 mix-blend-multiply"></div>
			</div>

			<!-- Grid List -->
			<div
				v-else-if="giftcards && giftcards.length > 0"
				class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				<div
					v-for="card in giftcards"
					:key="card.giftcard_id"
					class="group bg-bg-card border-border-default hover:border-border-strong relative flex flex-col justify-between overflow-hidden rounded-3xl border p-6 shadow-sm transition-colors duration-300 hover:shadow-md">
					<!-- Background Pattern -->
					<div class="text-primary/5 pointer-events-none absolute -top-8 -right-8 rotate-12">
						<CreditCard class="h-40 w-40" />
					</div>

					<div class="relative z-10 mb-4">
						<div class="mb-4 flex items-start justify-between">
							<span
								class="badge badge-sm font-bold tracking-wider uppercase"
								:class="{
									'badge-success text-white': card.status === 'active' && card.current_balance > 0,
									'badge-error text-white': card.status === 'expired',
									'badge-ghost text-text-muted':
										card.status === 'used' || card.current_balance === 0,
								}">
								{{
									card.current_balance === 0
										? 'Agotada'
										: card.status === 'active'
											? 'Activa'
											: card.status
								}}
							</span>

							<!-- Menu dropdown -->
							<div class="dropdown dropdown-end">
								<button tabindex="0" class="btn btn-ghost btn-sm btn-circle text-text-muted -mr-2">
									<MoreVertical class="h-4 w-4" />
								</button>
								<ul
									tabindex="0"
									class="dropdown-content menu bg-bg-card text-text-secondary border-border-default z-1 mt-1 w-40 rounded-xl border p-2 shadow-lg">
									<li>
										<a @click="openEditModal(card)" class="hover:bg-bg-muted font-medium">
											<Edit2 class="h-4 w-4" />
											Editar
										</a>
									</li>
									<li>
										<a
											@click="confirmDelete(card.giftcard_id)"
											class="text-error hover:bg-error/10 font-medium">
											<Trash2 class="h-4 w-4" />
											Anular
										</a>
									</li>
								</ul>
							</div>
						</div>

						<div
							class="text-text-primary bg-bg-muted border-border-default rounded-xl border border-dashed px-3 py-2 text-center font-mono text-xl font-black tracking-[0.2em]">
							{{ card.code }}
						</div>
					</div>

					<div class="relative z-10 mt-auto flex flex-col gap-3">
						<div class="border-border-default grid grid-cols-2 gap-4 border-t pt-4">
							<div class="flex flex-col">
								<span class="text-text-muted mb-1 text-[10px] font-bold tracking-widest uppercase">
									Saldo Actual
								</span>
								<span class="text-primary text-2xl leading-none font-black tabular-nums">
									{{ formatCurrency(card.current_balance) }}
								</span>
							</div>
							<div class="flex flex-col text-right">
								<span class="text-text-muted mb-1 text-[10px] font-bold tracking-widest uppercase">
									Saldo Inicial
								</span>
								<span class="text-sm font-bold tabular-nums">
									{{ formatCurrency(card.initial_balance) }}
								</span>
							</div>
						</div>

						<div
							class="border-border-default/50 text-text-muted mt-2 flex items-center justify-between border-t pt-2 text-xs font-medium">
							<span>Emisión: {{ formatDate(card.issue_date) }}</span>
							<span
								:class="{
									'text-error font-bold':
										card.expiration_date && new Date(card.expiration_date) < new Date(),
								}">
								Vence: {{ formatDate(card.expiration_date) }}
							</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Empty State -->
			<div
				v-else
				class="bg-bg-card border-border-default flex flex-col items-center justify-center rounded-3xl border border-dashed px-4 py-20 text-center">
				<div class="bg-bg-muted mb-4 flex h-20 w-20 items-center justify-center rounded-full">
					<CreditCard class="text-text-muted h-10 w-10" />
				</div>
				<h3 class="mb-1 text-xl font-bold">No hay tarjetas de regalo</h3>
				<p class="text-text-muted mb-6 max-w-sm text-sm">
					Emite tarjetas precargadas con saldo para regalar o como saldo a favor en devoluciones.
				</p>
				<button
					class="btn bg-text-primary text-bg-card hover:bg-text-secondary rounded-xl border-none px-8 font-bold"
					@click="openCreateModal">
					Emitir Tarjeta
				</button>
			</div>
		</div>

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

		<!-- Form Modal -->
		<GiftcardFormModal
			ref="modalRef"
			@refresh="queryClient.invalidateQueries({ queryKey: ['giftcards'] })"
			@toast="displayToast" />
	</div>
</template>
