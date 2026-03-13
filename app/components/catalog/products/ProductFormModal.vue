<script setup lang="ts">
	import { useQuery } from '@tanstack/vue-query'
	import { ChevronDown, Euro, Check, Plus, Package, ImageIcon, Filter } from 'lucide-vue-next'
	import { useModalAnimation } from '~/composables/useModalAnimation'
	import { useQueryClient } from '@tanstack/vue-query'

	const queryClient = useQueryClient()

	const modalRef = ref<HTMLDialogElement | null>(null)
	const editingProduct = ref<any | null>(null)
	const isSaving = ref(false)
	const { animateOpen, animateClose } = useModalAnimation()

	// Scroll-reactive action bar (Mobile only)
	const isActionBarVisible = ref(true)
	let scrollTimeout: any = null

	const handleScroll = () => {
		// Include tablets and mobile logic
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

	// Dependencies

	const { data: categories } = useQuery({
		queryKey: ['categories'],
		queryFn: () => $fetch<any[]>('/api/catalog/categories'),
	})
	const { data: subcategories } = useQuery({
		queryKey: ['subcategories'],
		queryFn: () => $fetch<any[]>('/api/catalog/subcategories'),
	})
	const { data: tags } = useQuery({ queryKey: ['tags'], queryFn: () => $fetch<any[]>('/api/catalog/tags') })

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

		category_id: '',
		subcategory_id: '',
		tags: [] as string[],
	})

	const newTagName = ref('')
	const newTagColor = ref('#fb923c') // Default brand-like orange
	const isCreatingTag = ref(false)

	const tagColors = [
		{ name: 'Naranja', value: '#fb923c' },
		{ name: 'Rosa', value: '#ec4899' },
		{ name: 'Púrpura', value: '#a855f7' },
		{ name: 'Azul', value: '#3b82f6' },
		{ name: 'Esmeralda', value: '#10b981' },
		{ name: 'Rojo', value: '#ef4444' },
		{ name: 'Gris', value: '#64748b' },
	]

	const filteredSubcategories = computed(() => {
		if (!subcategories.value) return []
		if (!form.category_id) return []
		return subcategories.value.filter((sc: any) => sc.category_id === form.category_id)
	})

	// Helpers for dropdowns (Trend 2026 UI standards)
	const selectOption = (field: keyof typeof form, value: string | number) => {
		;(form[field] as any) = value
		// Reset subcategory if category changes
		if (field === 'category_id') {
			form.subcategory_id = ''
		}

		if (document.activeElement instanceof HTMLElement) {
			document.activeElement.blur()
		}
	}

	const toggleTag = (tagId: string) => {
		const idx = form.tags.indexOf(tagId)
		if (idx === -1) {
			form.tags.push(tagId)
		} else {
			form.tags.splice(idx, 1)
		}
	}

	const handleCreateTag = async () => {
		if (!newTagName.value.trim()) return
		isCreatingTag.value = true
		try {
			const tag: any = await $fetch('/api/catalog/tags', {
				method: 'POST',
				body: { 
					name: newTagName.value.trim(),
					color: newTagColor.value 
				},
			})
			newTagName.value = ''
			queryClient.invalidateQueries({ queryKey: ['tags'] })
			// Auto-select the newly created tag
			if (!form.tags.includes(tag.tag_id)) {
				form.tags.push(tag.tag_id)
			}
			emit('toast', 'Etiqueta creada', 'success')
		} catch (error: any) {
			emit('toast', error.data?.statusMessage || 'Error al crear etiqueta', 'error')
		} finally {
			isCreatingTag.value = false
		}
	}

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

			form.category_id = product.category_id || ''
			form.subcategory_id = product.subcategory_id || ''

			// Map DB tags structurally back to the array form tags requires
			if (product.tags && Array.isArray(product.tags)) {
				// We expect tags structurally as [{ tag_id: 'tagName' }] or [{ tag: { tag_id: 'x' } }] depends on formatting
				form.tags = product.tags.map((t: any) => t.tag_id || t.tag?.tag_id || t)
			} else {
				form.tags = []
			}
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

			form.category_id = ''
			form.subcategory_id = ''
			form.tags = []
			newTagName.value = ''
			newTagColor.value = '#fb923c'
		}
		animateOpen(modalRef.value, { staggerChildren: true })
	}

	const closeModal = () => {
		animateClose(modalRef.value)
	}

	const saveProduct = async () => {
		isSaving.value = true
		try {
			// Basic formatting
			const payload = {
				...form,
				price: Number(form.price),
				tax_rate: Number(form.tax_rate),
				stock: Number(form.stock),
				min_stock: Number(form.min_stock),
			}

			if (editingProduct.value) {
				await $fetch(`/api/catalog/products/${editingProduct.value.product_id}`, {
					method: 'PUT',
					body: payload,
				})
				emit('toast', 'Producto actualizado exitosamente', 'success')
			} else {
				await $fetch(`/api/catalog/products`, {
					method: 'POST',
					body: payload,
				})
				emit('toast', 'Producto creado exitosamente', 'success')
			}
			emit('refresh')
			closeModal()
		} catch (error: any) {
			console.error('Error saving product:', error)
			emit('toast', error.data?.statusMessage || 'Error al guardar el producto', 'error')
		} finally {
			isSaving.value = false
		}
	}

	defineExpose({ showModal })
</script>

<template>
	<dialog ref="modalRef" class="modal modal-bottom sm:modal-middle">
		<div
			class="modal-box bg-bg-app border-border-default m-0 max-h-[96dvh] w-full max-w-4xl border p-0 shadow-2xl transition-all sm:m-4 sm:max-h-[90dvh] sm:rounded-4xl rounded-t-[2.5rem]">
			
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
					class="grid grid-cols-1 gap-8 md:grid-cols-2">
					<!-- Left Column: Core Details -->
					<div class="flex flex-col gap-6">
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
					</div>

					<!-- Right Column: Settings & Pricing -->
					<div class="flex flex-col gap-6">
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

						<!-- Section: Classification -->
						<div class="space-y-6 rounded-3xl bg-white/40 p-5 ring-1 ring-border-subtle/30 shadow-xs">
							<div class="flex items-center gap-2 border-b border-border-subtle/20 pb-4">
								<div class="bg-amber-500/10 text-amber-600 flex h-7 w-7 items-center justify-center rounded-lg">
									<Filter class="h-4 w-4" />
								</div>
								<h4 class="text-text-primary text-[10px] font-black uppercase tracking-widest">Clasificación</h4>
							</div>

							<div class="space-y-4">
								<div class="grid grid-cols-2 gap-4">
									<div class="form-control">
										<label class="label pb-1">
											<span class="label-text text-text-secondary text-[10px] font-black tracking-widest uppercase">Categoría</span>
										</label>
										<select
											v-model="form.category_id"
											@change="form.subcategory_id = ''"
											class="select bg-white/60 border-border-default focus:bg-white focus:ring-amber-500/10 hover:bg-white h-11 w-full rounded-xl text-sm font-bold shadow-xs transition-all">
											<option value="">Ninguna</option>
											<option v-for="c in categories" :key="c.category_id" :value="c.category_id">
												{{ c.name }}
											</option>
										</select>
									</div>
									<div class="form-control" v-if="filteredSubcategories && filteredSubcategories.length > 0">
										<label class="label pb-1">
											<span class="label-text text-text-secondary text-[10px] font-black tracking-widest uppercase">Subcat.</span>
										</label>
										<select
											v-model="form.subcategory_id"
											class="select bg-white/60 border-border-default focus:bg-white focus:ring-amber-500/10 hover:bg-white h-11 w-full rounded-xl text-sm font-bold shadow-xs transition-all">
											<option value="">Ninguna</option>
											<option
												v-for="sc in filteredSubcategories"
												:key="sc.subcategory_id"
												:value="sc.subcategory_id">
												{{ sc.name }}
											</option>
										</select>
									</div>
								</div>

								<div class="form-control">
									<label class="label pb-2">
										<span class="label-text text-text-secondary text-[10px] font-black tracking-widest uppercase">Etiquetas</span>
									</label>
									<div class="custom-scrollbar flex max-h-32 flex-wrap gap-2 overflow-y-auto pr-2">
										<button
											v-for="tag in tags"
											:key="tag.tag_id"
											type="button"
											@click="toggleTag(tag.tag_id)"
											class="badge badge-lg h-8 gap-1.5 rounded-lg border-none px-3 text-[10px] font-black tracking-widest uppercase transition-all hover:scale-105 active:scale-95"
											:class="form.tags.includes(tag.tag_id) ? 'text-white shadow-md' : 'bg-white/60 text-text-muted border border-border-default'"
											:style="form.tags.includes(tag.tag_id) ? { backgroundColor: tag.color || '#a855f7' } : {}">
											<Check v-if="form.tags.includes(tag.tag_id)" class="h-3 w-3" />
											{{ tag.name }}
										</button>
									</div>
									
									<!-- Quick Create Minimalist -->
									<div class="mt-4 flex flex-col gap-3 rounded-2xl bg-primary/5 p-4 border border-primary/10">
										<div class="flex items-center justify-between">
											<span class="text-[9px] font-black uppercase tracking-widest text-primary/70">Nueva Etiqueta</span>
											<div class="flex gap-1">
												<button 
													v-for="color in tagColors" 
													:key="color.value"
													type="button"
													@click="newTagColor = color.value"
													class="h-3 w-3 rounded-full transition-transform hover:scale-125"
													:class="newTagColor === color.value ? 'ring-2 ring-primary ring-offset-2 ring-offset-bg-app' : ''"
													:style="{ backgroundColor: color.value }"
												></button>
											</div>
										</div>
										<div class="flex gap-2">
											<input
												v-model="newTagName"
												type="text"
												placeholder="..."
												class="input bg-white/80 border-none h-8 w-full min-w-0 flex-1 rounded-lg px-3 text-xs font-bold transition-all focus:ring-2 focus:ring-primary/20" />
											<button
												type="button"
												@click="handleCreateTag"
												:disabled="isCreatingTag || !newTagName.trim()"
												class="btn btn-primary btn-xs h-8 rounded-lg border-none px-4 font-black uppercase tracking-widest">
												<Plus v-if="!isCreatingTag" class="h-3 w-3" />
												<span v-else class="loading loading-spinner loading-xs"></span>
												<span>OK</span>
											</button>
										</div>
									</div>
								</div>
							</div>
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
