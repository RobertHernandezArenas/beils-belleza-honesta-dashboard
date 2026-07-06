<script setup lang="ts">
	import { useMutation, useQueryClient } from '@tanstack/vue-query'
	import { Euro, Package, ImageIcon } from 'lucide-vue-next'
	import { useModalAnimation } from '~/composables/useModalAnimation'

	const modalRef = ref<HTMLDialogElement | null>(null)
	const editingProduct = ref<any | null>(null)
	const isSaving = ref(false)
	const queryClient = useQueryClient()
	const { animateOpen, animateClose } = useModalAnimation()

	// Scroll-reactive action bar (Mobile only)
	const isActionBarVisible = ref(true)
	let scrollTimeout: any = null

	const handleScroll = () => {
		if (window.innerWidth >= 1024) return
		
		if (isActionBarVisible.value) {
			isActionBarVisible.value = false
		}
		
		if (scrollTimeout) clearTimeout(scrollTimeout)
		scrollTimeout = setTimeout(() => {
			isActionBarVisible.value = true
		}, 600)
	}

	const emit = defineEmits(['refresh', 'toast'])

	const form = reactive({
		name: '',
		description: '',
		sku: '',
		barcode: '',
		price: 0,
		tax_rate: 21,
		stock: 0,
		min_stock: 0,
		image_url: '',
		status: 'activo',
	})

	const showModal = (product: any | null) => {
		editingProduct.value = product
		if (product) {
			form.name = product.name || ''
			form.description = product.description || ''
			form.sku = product.sku || ''
			form.barcode = product.barcode || ''
			form.price = product.price || 0
			form.tax_rate = product.tax_rate || 21
			form.stock = product.stock || 0
			form.min_stock = product.min_stock || 0
			form.image_url = product.image_url || ''
			form.status = product.status || 'activo'
		} else {
			form.name = ''
			form.description = ''
			form.sku = ''
			form.barcode = ''
			form.price = 0
			form.tax_rate = 21
			form.stock = 0
			form.min_stock = 0
			form.image_url = ''
			form.status = 'activo'
		}
		animateOpen(modalRef.value, { staggerChildren: true })
	}

	const closeModal = () => {
		animateClose(modalRef.value)
	}

	const { mutate: performSave } = useMutation({
		mutationFn: async (payload: any) => {
			if (editingProduct.value) {
				return await $fetch(`/api/catalog/products/${editingProduct.value.product_id}`, {
					method: 'PUT',
					body: payload,
				})
			} else {
				return await $fetch(`/api/catalog/products`, {
					method: 'POST',
					body: payload,
				})
			}
		},
		onSuccess: () => {
			emit('toast', editingProduct.value ? 'Producto actualizado exitosamente' : 'Producto creado exitosamente', 'success')
			queryClient.invalidateQueries({ queryKey: ['products'] })
			queryClient.invalidateQueries({ queryKey: ['products-tpv'] })
			emit('refresh')
			closeModal()
		},
		onError: (error: any) => {
			console.error('Error saving product:', error)
			emit('toast', error.data?.statusMessage || 'Error al guardar el producto', 'error')
		},
		onSettled: () => {
			isSaving.value = false
		},
	})

	const saveProduct = async () => {
		isSaving.value = true
		const payload = {
			...form,
			price: Number(form.price),
			tax_rate: Number(form.tax_rate),
			stock: Number(form.stock),
			min_stock: Number(form.min_stock),
		}
		performSave(payload)
	}

	defineExpose({ showModal })
</script>

<template>
	<dialog ref="modalRef" class="modal modal-bottom sm:modal-middle">
		<div
			class="modal-box bg-bg-app border-border-default m-0 max-h-[96dvh] w-full max-w-2xl border p-0 shadow-2xl transition-all sm:m-4 sm:max-h-[90dvh] sm:rounded-4xl rounded-t-[2.5rem]">
			
			<!-- Bottom Sheet Handle (Mobile Only) -->
			<div 
				class="flex w-full items-center justify-center pt-3 pb-3 sm:hidden cursor-pointer active:scale-95 transition-transform"
				@click="closeModal">
				<div class="bg-border-default h-1.5 w-12 rounded-full opacity-40 hover:opacity-60 transition-opacity"></div>
			</div>

			<!-- Modal Header -->
			<div
				class="bg-bg-app/80 border-border-subtle sticky top-0 z-20 flex items-center justify-between border-b px-6 py-4 backdrop-blur-md sm:px-8 sm:py-5">
				<div>
					<h3 class="text-lg font-bold tracking-tight sm:text-xl">
						{{ editingProduct ? 'Editar Producto' : 'Nuevo Producto' }}
					</h3>
					<p class="text-text-muted hidden text-xs font-medium sm:block">Completa los detalles del producto para el catálogo</p>
				</div>
				<button
					type="button"
					class="btn btn-sm btn-circle btn-ghost text-text-light hover:bg-bg-hover hover:text-text-secondary"
					@click="closeModal">
					✕
				</button>
			</div>

			<!-- Form Scrollable content -->
			<div 
				class="custom-scrollbar max-h-[calc(96dvh-150px)] sm:max-h-[calc(90dvh-140px)] overflow-y-auto px-6 py-6 sm:px-8 scroll-smooth"
				@scroll.passive="handleScroll">
				<form
					id="productForm"
					@submit.prevent="saveProduct"
					class="flex flex-col gap-6">
					
					<!-- Section: Basic Info -->
					<div class="space-y-6 rounded-3xl bg-white/40 p-5 ring-1 ring-border-subtle/30 shadow-xs">
						<div class="flex items-center justify-between border-b border-border-subtle/20 pb-4">
							<div class="flex items-center gap-2">
								<div class="bg-primary/10 text-primary flex h-7 w-7 items-center justify-center rounded-lg">
									<Package class="h-4 w-4" />
								</div>
								<h4 class="text-text-primary text-[10px] font-black uppercase tracking-widest">Información Básica</h4>
							</div>
							<div class="form-control flex-row items-center gap-2">
								<span class="text-[10px] font-black uppercase tracking-widest opacity-60">Status</span>
								<input
									type="checkbox"
									class="toggle toggle-success toggle-xs"
									:checked="form.status === 'activo'"
									@change="form.status = form.status === 'activo' ? 'inactivo' : 'activo'" />
							</div>
						</div>

						<div class="space-y-4">
							<div class="form-control">
								<label class="label pb-1">
									<span class="label-text text-text-secondary text-[10px] font-black tracking-widest uppercase">
										Nombre del Producto *
									</span>
								</label>
								<input
									v-model="form.name"
									type="text"
									required
									class="input bg-white/60 border-border-default focus:bg-white focus:ring-primary/20 hover:bg-white h-11 w-full rounded-xl px-4 text-sm font-bold shadow-xs transition-all" />
							</div>

							<div class="grid grid-cols-2 gap-4">
								<div class="form-control">
									<label class="label pb-1">
										<span class="label-text text-text-secondary text-[10px] font-black tracking-widest uppercase">SKU</span>
									</label>
									<input
										v-model="form.sku"
										type="text"
										placeholder="P-001"
										class="input bg-white/60 border-border-default focus:bg-white focus:ring-primary/20 hover:bg-white h-11 w-full rounded-xl px-4 text-sm font-bold shadow-xs transition-all" />
								</div>
								<div class="form-control">
									<label class="label pb-1">
										<span class="label-text text-text-secondary text-[10px] font-black tracking-widest uppercase">EAN</span>
									</label>
									<input
										v-model="form.barcode"
										type="text"
										class="input bg-white/60 border-border-default focus:bg-white focus:ring-primary/20 hover:bg-white h-11 w-full rounded-xl px-4 text-sm font-bold shadow-xs transition-all" />
								</div>
							</div>

							<div class="form-control">
								<label class="label pb-1">
									<span class="label-text text-text-secondary text-[10px] font-black tracking-widest uppercase">Descripción</span>
								</label>
								<textarea
									v-model="form.description"
									rows="3"
									class="textarea bg-white/60 border-border-default focus:bg-white focus:ring-primary/20 hover:bg-white custom-scrollbar w-full rounded-xl px-4 py-3 text-sm font-bold shadow-xs transition-all"></textarea>
							</div>
						</div>
					</div>

					<!-- Section: Inventory & Pricing -->
					<div class="space-y-6 rounded-3xl bg-white/40 p-5 ring-1 ring-border-subtle/30 shadow-xs">
						<div class="flex items-center gap-2 border-b border-border-subtle/20 pb-4">
							<div class="bg-emerald-500/10 text-emerald-600 flex h-7 w-7 items-center justify-center rounded-lg">
								<Euro class="h-4 w-4" />
							</div>
							<h4 class="text-text-primary text-[10px] font-black uppercase tracking-widest">Precios y Stock</h4>
						</div>

						<div class="space-y-5">
							<div class="grid grid-cols-2 gap-4">
								<div class="form-control">
									<label class="label pb-1">
										<span class="label-text text-text-secondary text-[10px] font-black tracking-widest uppercase">PVP *</span>
									</label>
									<div class="relative">
										<Euro class="text-text-muted absolute top-1/2 left-3.5 h-3.5 w-3.5 -translate-y-1/2" />
										<input
											v-model="form.price"
											type="number"
											step="0.01"
											class="input bg-white/60 border-border-default focus:bg-white focus:ring-emerald-500/10 hover:bg-white h-11 w-full rounded-xl pl-9 text-sm font-black tabular-nums shadow-xs transition-all" />
									</div>
								</div>
								<div class="form-control">
									<label class="label pb-1">
										<span class="label-text text-text-secondary text-[10px] font-black tracking-widest uppercase">IVA %</span>
									</label>
									<input
										v-model="form.tax_rate"
										type="number"
										class="input bg-white/60 border-border-default focus:bg-white focus:ring-emerald-500/10 hover:bg-white h-11 w-full rounded-xl px-4 text-sm font-black tabular-nums shadow-xs transition-all" />
								</div>
							</div>

							<div class="grid grid-cols-2 gap-4">
								<div class="form-control">
									<label class="label pb-1">
										<span class="label-text text-text-secondary text-[10px] font-black tracking-widest uppercase">Stock</span>
									</label>
									<input
										v-model="form.stock"
										type="number"
										class="input bg-white/60 border-border-default focus:bg-white focus:ring-emerald-500/10 hover:bg-white h-11 w-full rounded-xl px-4 text-sm font-black tabular-nums shadow-xs transition-all" />
								</div>
								<div class="form-control">
									<label class="label pb-1">
										<span class="label-text text-text-secondary text-[10px] font-black tracking-widest uppercase">S. Mínimo</span>
									</label>
									<input
										v-model="form.min_stock"
										type="number"
										class="input bg-white/60 border-border-default focus:bg-white focus:ring-emerald-500/10 hover:bg-white h-11 w-full rounded-xl px-4 text-sm font-black tabular-nums shadow-xs transition-all" />
								</div>
							</div>
						</div>
					</div>

					<!-- Section: Media -->
					<div class="space-y-5 rounded-3xl bg-white/40 p-5 ring-1 ring-border-subtle/30 shadow-xs">
						<div class="flex items-center gap-2 border-b border-border-subtle/20 pb-4">
							<div class="bg-indigo-500/10 text-indigo-600 flex h-7 w-7 items-center justify-center rounded-lg">
								<ImageIcon class="h-4 w-4" />
							</div>
							<h4 class="text-text-primary text-[10px] font-black uppercase tracking-widest">Multimedia</h4>
						</div>
						<div class="form-control">
							<label class="label pb-1">
								<span class="label-text text-text-secondary text-[10px] font-black tracking-widest uppercase">URL imagen</span>
							</label>
							<input
								v-model="form.image_url"
								type="url"
								placeholder="https://..."
								class="input bg-white/60 border-border-default focus:bg-white focus:ring-primary/20 hover:bg-white h-11 w-full rounded-xl px-4 text-sm font-bold shadow-xs transition-all" />
						</div>
					</div>

				</form>
			</div>

			<!-- Footer / Action Bar -->
			<div
				class="bg-bg-app/90 border-border-subtle sticky bottom-0 z-20 flex justify-end gap-3 border-t px-6 py-4 backdrop-blur-xl sm:px-8 sm:py-5 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)] transition-all duration-500 ease-in-out"
				:class="[isActionBarVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none']">
				<button
					type="button"
					class="btn btn-ghost text-text-muted hover:bg-bg-hover hover:text-text-secondary h-11 rounded-xl px-6 sm:h-12 sm:px-8"
					@click="closeModal">
					{{ $t('common.cancel') }}
				</button>
				<button
					type="submit"
					form="productForm"
					class="btn text-bg-card hover:bg-text-secondary/80 bg-text-secondary h-11 rounded-xl border-none px-8 font-bold shadow-md sm:h-12 sm:px-10"
					:disabled="isSaving">
					<span v-if="isSaving" class="loading loading-spinner"></span>
					{{ editingProduct ? $t('common.save') : 'Crear Producto' }}
				</button>
			</div>
		</div>
		<form method="dialog" class="modal-backdrop bg-text-secondary/40 backdrop-blur-sm">
			<button>close</button>
		</form>
	</dialog>
</template>
