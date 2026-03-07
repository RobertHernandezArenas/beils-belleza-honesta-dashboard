<script setup lang="ts">
	import { ref, computed } from 'vue'
	import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
	import { Ticket, Plus, Search, MoreVertical, Edit2, Trash2, Percent } from 'lucide-vue-next'
	import CouponFormModal from '~/components/marketing/CouponFormModal.vue'

	definePageMeta({ layout: 'default' })
	useHead({ title: 'Cupones de Descuento | Marketing' })

	const queryClient = useQueryClient()
	const searchQuery = ref('')
	const modalRef = ref<InstanceType<typeof CouponFormModal> | null>(null)
	const toastMessage = ref('')
	const toastType = ref<'success' | 'error'>('success')
	const showToast = ref(false)

	const queryParams = computed(() => {
		const params: Record<string, string> = {}
		if (searchQuery.value) params.search = searchQuery.value
		return params
	})

	const { data: coupons, isPending } = useQuery({
		queryKey: ['coupons', queryParams],
		queryFn: () => $fetch('/api/marketing/coupons', { query: queryParams.value }),
	})

	const { mutate: deleteCoupon } = useMutation({
		mutationFn: (id: string) => $fetch(`/api/marketing/coupons/${id}`, { method: 'DELETE' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['coupons'] })
			displayToast('Cupón eliminado exitosamente', 'success')
		},
		onError: (error: any) => {
			displayToast(error.data?.statusMessage || 'Error al eliminar el cupón', 'error')
		},
	})

	const openCreateModal = () => {
		modalRef.value?.showModal(null)
	}

	const openEditModal = (coupon: any) => {
		modalRef.value?.showModal(coupon)
	}

	const confirmDelete = (id: string) => {
		if (confirm('¿Estás seguro de que deseas eliminar este cupón?')) {
			deleteCoupon(id)
		}
	}

	const displayToast = (message: string, type: 'success' | 'error') => {
		toastMessage.value = message
		toastType.value = type
		showToast.value = true
		setTimeout(() => (showToast.value = false), 3000)
	}

	const formatValue = (type: string, value: number) => {
		if (type === 'percentage') return `${value}%`
		return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value)
	}

	

	
</script>

<template>
	<div class="bg-bg-app text-text-secondary min-h-screen w-full p-4 lg:p-8">
		<div class="mx-auto max-w-7xl">
			<!-- Header -->
			<div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div class="flex items-center gap-3">
					<div class="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-2xl">
						<Ticket class="h-6 w-6" />
					</div>
					<div>
						<h1 class="text-2xl font-bold tracking-tight">Cupones</h1>
						<p class="text-text-muted text-sm font-medium">Gestiona descuentos y promociones</p>
					</div>
				</div>

				<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
					<div class="relative w-full sm:w-64">
						<Search class="text-text-muted absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2" />
						<input
							v-model="searchQuery"
							type="text"
							placeholder="Buscar código..."
							class="input bg-bg-card border-border-default focus:border-border-strong focus:ring-border-subtle h-12 w-full rounded-2xl pl-10 text-sm shadow-sm transition-[border-color,box-shadow]" />
					</div>
					<button
						class="btn bg-text-primary text-bg-card hover:bg-text-secondary h-12 rounded-2xl border-none px-6 font-bold shadow-sm"
						@click="openCreateModal">
						<Plus class="h-5 w-5" />
						Nuevo Cupón
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
				v-else-if="coupons && coupons.length > 0"
				class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				<div
					v-for="coupon in coupons"
					:key="coupon.coupon_id"
					class="group bg-bg-card border-border-default hover:border-border-strong relative flex flex-col justify-between rounded-3xl border p-6 shadow-sm transition-colors transition-transform duration-300 hover:shadow-md">
					<div class="mb-4">
						<div class="mb-2 flex items-start justify-between">
							<div class="flex flex-col">
								<span
									class="badge badge-sm mb-1 w-fit font-bold tracking-wider uppercase"
									:class="
										coupon.status === 'activo'
											? 'badge-success text-white'
											: 'badge-ghost text-text-muted'
									">
									{{ coupon.status }}
								</span>
								<div class="text-primary flex items-center gap-1">
									<Percent class="h-4 w-4" />
									<h3 class="text-xl font-black tracking-widest uppercase">{{ coupon.code }}</h3>
								</div>
							</div>

							<!-- Menu dropdown -->
							<div class="dropdown dropdown-end">
								<button tabindex="0" class="btn btn-ghost btn-sm btn-circle text-text-muted -mr-2">
									<MoreVertical class="h-4 w-4" />
								</button>
								<ul
									tabindex="0"
									class="dropdown-content menu bg-bg-card text-text-secondary border-border-default z-10 mt-1 w-40 rounded-xl border p-2 shadow-lg">
									<li>
										<a @click="openEditModal(coupon)" class="hover:bg-bg-muted font-medium">
											<Edit2 class="h-4 w-4" />
											Editar
										</a>
									</li>
									<li>
										<a
											@click="confirmDelete(coupon.coupon_id)"
											class="text-error hover:bg-error/10 font-medium">
											<Trash2 class="h-4 w-4" />
											Eliminar
										</a>
									</li>
								</ul>
							</div>
						</div>

						<p class="text-text-muted line-clamp-2 text-sm font-medium">
							{{ coupon.description || 'Sin descripción' }}
						</p>
					</div>

					<div class="border-border-default mt-auto flex flex-col gap-2 border-t pt-4">
						<div class="flex items-center justify-between text-sm">
							<span class="text-text-muted font-medium">Descuento:</span>
							<span class="font-bold tabular-nums">
								{{ formatValue(coupon.discount_type, coupon.discount_value) }}
							</span>
						</div>
						<div v-if="coupon.min_purchase" class="flex items-center justify-between text-sm">
							<span class="text-text-muted font-medium">Compra mín:</span>
							<span class="font-bold tabular-nums">{{ formatCurrency(coupon.min_purchase) }}</span>
						</div>
						<div class="flex items-center justify-between text-sm">
							<span class="text-text-muted font-medium">Validez:</span>
							<span
								class="text-xs font-bold tabular-nums"
								:class="{
									'text-error': coupon.valid_until && new Date(coupon.valid_until) < new Date(),
								}">
								{{ formatDate(coupon.valid_until) }}
							</span>
						</div>
						<div class="flex items-center justify-between text-sm">
							<span class="text-text-muted font-medium">Usos:</span>
							<span class="font-bold tabular-nums">
								{{ coupon.current_uses }} / {{ coupon.max_uses ? coupon.max_uses : '∞' }}
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
					<Ticket class="text-text-muted h-10 w-10" />
				</div>
				<h3 class="mb-1 text-xl font-bold">No hay cupones registrados</h3>
				<p class="text-text-muted mb-6 max-w-sm text-sm">
					Crea cupones de descuento para fidelizar a tus clientes o lanzar promociones especiales.
				</p>
				<button
					class="btn bg-text-primary text-bg-card hover:bg-text-secondary rounded-xl border-none px-8 font-bold"
					@click="openCreateModal">
					Crear Cupón
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
		<CouponFormModal
			ref="modalRef"
			@refresh="queryClient.invalidateQueries({ queryKey: ['coupons'] })"
			@toast="displayToast" />
	</div>
</template>
