<script setup lang="ts">
	import { ref, reactive, computed } from 'vue'
	import { useQuery } from '@tanstack/vue-query'
	import { Search, Plus, Trash2, PackageSearch, Scissors, Package } from 'lucide-vue-next'

	const modalRef = ref<HTMLDialogElement | null>(null)
	const editingPack = ref<any | null>(null)
	const isSaving = ref(false)

	const emit = defineEmits(['refresh', 'toast'])

	const form = reactive({
		name: '',
		description: '',
		code: '',
		price: 0,
		tax_rate: 21,
		status: 'activo',
		image_url: '',
		products: [] as any[],
		services: [] as any[],
	})

	const productSearch = ref('')
	const serviceSearch = ref('')

	// Fetch available products
	const { data: availableProducts } = useQuery({
		queryKey: ['products-for-pack'],
		queryFn: () => $fetch('/api/catalog/products'),
	})

	// Fetch available services
	const { data: availableServices } = useQuery({
		queryKey: ['services-for-pack'],
		queryFn: () => $fetch('/api/services'),
	})

	const filteredProducts = computed(() => {
		if (!availableProducts.value) return []
		return availableProducts.value.filter(
			(p: any) =>
				p.name.toLowerCase().includes(productSearch.value.toLowerCase()) &&
				!form.products.some(fp => fp.product_id === p.product_id),
		)
	})

	const filteredServices = computed(() => {
		if (!availableServices.value) return []
		return availableServices.value.filter(
			(s: any) =>
				s.name.toLowerCase().includes(serviceSearch.value.toLowerCase()) &&
				!form.services.some(fs => fs.service_id === s.service_id),
		)
	})

	const addProductToPack = (product: any) => {
		form.products.push({
			product_id: product.product_id,
			name: product.name,
			price: product.price,
			quantity: 1,
		})
		productSearch.value = ''
	}

	const addServiceToPack = (service: any) => {
		form.services.push({
			service_id: service.service_id,
			name: service.name,
			price: service.price,
			quantity: 1,
		})
		serviceSearch.value = ''
	}

	const removeProduct = (id: string) => {
		form.products = form.products.filter(p => p.product_id !== id)
	}

	const removeService = (id: string) => {
		form.services = form.services.filter(s => s.service_id !== id)
	}

	const calculatedBasePrice = computed(() => {
		const productTotal = form.products.reduce((acc, p) => acc + p.price * p.quantity, 0)
		const serviceTotal = form.services.reduce((acc, s) => acc + s.price * s.quantity, 0)
		return productTotal + serviceTotal
	})

	const showModal = (pack: any | null) => {
		editingPack.value = pack
		if (pack) {
			form.name = pack.name || ''
			form.description = pack.description || ''
			form.code = pack.code || ''
			form.price = pack.price || 0
			form.tax_rate = pack.tax_rate || 21
			form.status = pack.status || 'activo'
			form.image_url = pack.image_url || ''

			// Map existing relations for the UI
			form.products = (pack.products || []).map((p: any) => ({
				product_id: p.product_id,
				name: p.product?.name,
				price: p.product?.price || 0,
				quantity: p.quantity,
			}))

			form.services = (pack.services || []).map((s: any) => ({
				service_id: s.service_id,
				name: s.service?.name,
				price: s.service?.price || 0,
				quantity: s.quantity,
			}))
		} else {
			// Reset
			form.name = ''
			form.description = ''
			form.code = ''
			form.price = 0
			form.tax_rate = 21
			form.status = 'activo'
			form.image_url = ''
			form.products = []
			form.services = []
		}
		modalRef.value?.showModal()
	}

	const closeModal = () => {
		modalRef.value?.close()
	}

	const savePack = async () => {
		if (form.products.length === 0 && form.services.length === 0) {
			emit('toast', 'El pack debe contener al menos un producto o servicio', 'error')
			return
		}

		isSaving.value = true
		try {
			const payload = {
				...form,
				price: Number(form.price),
				tax_rate: Number(form.tax_rate),
			}

			if (editingPack.value) {
				await $fetch(`/api/catalog/packs/${editingPack.value.pack_id}`, {
					method: 'PUT',
					body: payload,
				})
				emit('toast', 'Pack actualizado', 'success')
			} else {
				await $fetch(`/api/catalog/packs`, {
					method: 'POST',
					body: payload,
				})
				emit('toast', 'Pack creado exitosamente', 'success')
			}
			emit('refresh')
			closeModal()
		} catch (error: any) {
			console.error('Error saving pack:', error)
			emit('toast', error.data?.statusMessage || 'Error al guardar el pack', 'error')
		} finally {
			isSaving.value = false
		}
	}

	defineExpose({ showModal })
</script>

<template>
	<dialog ref="modalRef" class="modal">
		<div
			class="modal-box bg-bg-card text-text-secondary relative w-11/12 max-w-4xl overflow-hidden rounded-4xl p-0 shadow-xl">
			<!-- Header -->
			<div
				class="bg-bg-muted/30 border-border-default sticky top-0 z-20 flex items-center justify-between border-b px-8 py-5 backdrop-blur-md">
				<h3 class="flex items-center gap-2 text-xl font-bold tracking-tight">
					<PackageSearch class="text-primary h-5 w-5" />
					{{ editingPack ? 'Editar Pack Promocional' : 'Nuevo Pack Promocional' }}
				</h3>
				<button
					type="button"
					class="btn btn-sm btn-circle btn-ghost text-text-light hover:bg-text-primary"
					@click="closeModal">
					✕
				</button>
			</div>

			<!-- Body -->
			<div class="custom-scrollbar max-h-[75vh] overflow-y-auto px-8 py-6">
				<form id="packForm" @submit.prevent="savePack" class="flex flex-col gap-6">
					<!-- Header Info -->
					<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
						<div class="flex flex-col gap-5 lg:col-span-2">
							<div class="form-control">
								<label class="label pb-1" for="pack-name">
									<span
										class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
										Nombre del Pack *
									</span>
								</label>
								<input
									id="pack-name"
									v-model="form.name"
									type="text"
									required
									class="input bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover h-11 w-full rounded-xl px-4 text-sm font-medium shadow-sm transition-all focus:shadow-md focus:outline-none" />
							</div>

							<div class="grid grid-cols-1 gap-5 md:grid-cols-2">
								<div class="form-control">
									<label class="label pb-1" for="pack-code">
										<span
											class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
											Código Interno
										</span>
									</label>
									<input
										id="pack-code"
										v-model="form.code"
										type="text"
										placeholder="PACK-01"
										class="input bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover h-11 w-full rounded-xl px-4 text-sm font-medium shadow-sm transition-all focus:shadow-md focus:outline-none" />
								</div>

								<div class="form-control">
									<label class="label pb-1">
										<span
											class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
											Estado
										</span>
									</label>
									<div
										class="bg-bg-muted border-border-default flex h-11 items-center gap-3 rounded-xl border px-4">
										<span class="text-sm font-bold">
											{{ form.status === 'activo' ? 'Activo' : 'Inactivo' }}
										</span>
										<input
											type="checkbox"
											class="toggle toggle-success toggle-sm ml-auto"
											:checked="form.status === 'activo'"
											@change="form.status = form.status === 'activo' ? 'inactivo' : 'activo'" />
									</div>
								</div>
							</div>

							<div class="form-control">
								<label class="label pb-1" for="pack-desc">
									<span
										class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
										Descripción
									</span>
								</label>
								<textarea
									id="pack-desc"
									v-model="form.description"
									rows="2"
									class="textarea bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover custom-scrollbar w-full rounded-xl px-4 py-3 text-sm font-medium shadow-sm transition-all focus:shadow-md focus:outline-none"></textarea>
							</div>
						</div>

						<div class="flex flex-col gap-5">
							<div class="form-control">
								<label class="label pb-1">
									<span
										class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
										Imagen del Pack
									</span>
								</label>
								<div
									class="bg-bg-muted border-border-default hover:border-text-primary relative flex h-36 w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed transition-all">
									<img
										v-if="form.image_url"
										:src="form.image_url"
										class="h-full w-full object-cover mix-blend-multiply" />
									<div v-else class="text-text-muted flex flex-col items-center gap-2">
										<PackageSearch class="h-8 w-8 opacity-50" />
										<span class="text-xs font-bold tracking-wider uppercase">URL de Imagen</span>
									</div>
									<div
										class="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
										<span
											class="rounded-lg bg-black/50 px-3 py-1 text-xs font-bold text-white uppercase backdrop-blur-sm">
											Cambiar
										</span>
									</div>
								</div>
								<input
									v-model="form.image_url"
									type="url"
									placeholder="https://..."
									class="input bg-bg-muted border-border-default focus:bg-bg-card mt-2 h-10 w-full rounded-xl px-3 text-xs" />
							</div>

							<div class="bg-primary/5 border-primary/20 mt-auto rounded-2xl border p-4">
								<span class="text-text-muted mb-1 block text-xs font-bold tracking-wider uppercase">
									Valor Venta Normal
								</span>
								<p
									class="text-text-primary mb-3 text-xl leading-none font-bold tabular-nums line-through opacity-70">
									{{ calculatedBasePrice.toFixed(2) }} €
								</p>

								<div class="form-control">
									<label class="label pb-1" for="pack-price">
										<span
											class="label-text text-primary text-xs font-bold tracking-wider uppercase">
											Precio del Pack (OFERTA) *
										</span>
									</label>
									<input
										id="pack-price"
										v-model="form.price"
										type="number"
										step="0.01"
										min="0"
										required
										class="input bg-bg-card border-primary/30 focus:border-primary text-primary h-12 w-full rounded-xl px-4 text-base font-bold tabular-nums shadow-sm transition-all focus:shadow-md focus:outline-none" />
								</div>
							</div>
						</div>
					</div>

					<!-- Advanced Relations (Products & Services Configuration) -->
					<div class="divider my-2 opacity-50"></div>

					<div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
						<!-- Services Config -->
						<div class="flex flex-col gap-4">
							<h4
								class="text-text-muted flex items-center gap-2 text-sm font-bold tracking-wider uppercase">
								<Scissors class="h-4 w-4" />
								Servicios Incluidos
							</h4>

							<div class="relative">
								<Search class="text-text-muted absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
								<input
									v-model="serviceSearch"
									type="text"
									placeholder="Buscar servicio para añadir..."
									class="input bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 h-10 w-full rounded-xl pr-4 pl-9 text-sm font-medium" />

								<ul
									v-if="serviceSearch && filteredServices.length > 0"
									class="border-border-default bg-bg-card custom-scrollbar absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border p-1 shadow-lg">
									<li v-for="s in filteredServices" :key="s.service_id">
										<button
											type="button"
											@click="addServiceToPack(s)"
											class="hover:bg-bg-muted flex w-full items-center justify-between rounded-lg px-3 py-2 text-left">
											<span class="text-sm font-medium">{{ s.name }}</span>
											<span class="text-text-muted text-xs font-bold">{{ s.price }} €</span>
										</button>
									</li>
								</ul>
							</div>

							<div
								class="bg-bg-card border-border-default flex flex-col overflow-hidden rounded-2xl border">
								<div
									v-if="form.services.length === 0"
									class="text-text-muted p-6 text-center text-sm">
									No has añadido servicios al pack.
								</div>
								<div
									v-for="s in form.services"
									:key="s.service_id"
									class="border-border-default flex items-center justify-between border-b p-3 last:border-b-0">
									<div class="flex flex-col">
										<span class="text-sm font-bold">{{ s.name }}</span>
										<span class="text-text-muted text-xs">{{ s.price }} € c/u</span>
									</div>
									<div class="flex items-center gap-3">
										<input
											type="number"
											v-model="s.quantity"
											min="1"
											class="input input-sm bg-bg-muted border-border-default w-16 rounded-lg text-center font-bold tabular-nums" />
										<button
											type="button"
											@click="removeService(s.service_id)"
											class="btn btn-ghost btn-xs btn-circle text-error hover:bg-error/10">
											<Trash2 class="h-4 w-4" />
										</button>
									</div>
								</div>
							</div>
						</div>

						<!-- Products Config -->
						<div class="flex flex-col gap-4">
							<h4
								class="text-text-muted flex items-center gap-2 text-sm font-bold tracking-wider uppercase">
								<Package class="h-4 w-4" />
								Productos Incluidos
							</h4>

							<div class="relative">
								<Search class="text-text-muted absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
								<input
									v-model="productSearch"
									type="text"
									placeholder="Buscar producto para añadir..."
									class="input bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 h-10 w-full rounded-xl pr-4 pl-9 text-sm font-medium" />

								<ul
									v-if="productSearch && filteredProducts.length > 0"
									class="border-border-default bg-bg-card custom-scrollbar absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border p-1 shadow-lg">
									<li v-for="p in filteredProducts" :key="p.product_id">
										<button
											type="button"
											@click="addProductToPack(p)"
											class="hover:bg-bg-muted flex w-full items-center justify-between rounded-lg px-3 py-2 text-left">
											<span class="text-sm font-medium">{{ p.name }}</span>
											<span class="text-text-muted text-xs font-bold">{{ p.price }} €</span>
										</button>
									</li>
								</ul>
							</div>

							<div
								class="bg-bg-card border-border-default flex flex-col overflow-hidden rounded-2xl border">
								<div
									v-if="form.products.length === 0"
									class="text-text-muted p-6 text-center text-sm">
									No has añadido productos al pack.
								</div>
								<div
									v-for="p in form.products"
									:key="p.product_id"
									class="border-border-default flex items-center justify-between border-b p-3 last:border-b-0">
									<div class="flex flex-col">
										<span class="text-sm font-bold">{{ p.name }}</span>
										<span class="text-text-muted text-xs">{{ p.price }} € c/u</span>
									</div>
									<div class="flex items-center gap-3">
										<input
											type="number"
											v-model="p.quantity"
											min="1"
											class="input input-sm bg-bg-muted border-border-default w-16 rounded-lg text-center font-bold tabular-nums" />
										<button
											type="button"
											@click="removeProduct(p.product_id)"
											class="btn btn-ghost btn-xs btn-circle text-error hover:bg-error/10">
											<Trash2 class="h-4 w-4" />
										</button>
									</div>
								</div>
							</div>
						</div>
					</div>
				</form>
			</div>

			<!-- Footer -->
			<div
				class="bg-bg-muted/30 border-border-default sticky bottom-0 z-20 flex justify-end gap-3 border-t px-8 py-5 backdrop-blur-md">
				<button
					type="button"
					class="btn btn-ghost text-text-muted hover:bg-bg-hover h-12 rounded-xl px-6"
					@click="closeModal">
					Cancelar
				</button>
				<button
					type="submit"
					form="packForm"
					class="btn text-bg-card hover:bg-text-secondary/80 bg-text-secondary h-12 rounded-xl border-none px-8 font-bold shadow-md"
					:disabled="isSaving">
					<span v-if="isSaving" class="loading loading-spinner"></span>
					{{ editingPack ? 'Guardar Cambios' : 'Crear Pack' }}
				</button>
			</div>
		</div>
		<form method="dialog" class="modal-backdrop bg-text-secondary/40 backdrop-blur-sm">
			<button>close</button>
		</form>
	</dialog>
</template>
