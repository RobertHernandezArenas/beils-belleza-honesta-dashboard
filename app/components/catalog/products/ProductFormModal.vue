<script setup lang="ts">
	import { useQuery } from '@tanstack/vue-query'
	import { ChevronDown, Euro, Check, Plus } from 'lucide-vue-next'
	import { useModalAnimation } from '~/composables/useModalAnimation'
	import { useQueryClient } from '@tanstack/vue-query'

	const queryClient = useQueryClient()

	const modalRef = ref<HTMLDialogElement | null>(null)
	const editingProduct = ref<any | null>(null)
	const isSaving = ref(false)
	const { animateOpen, animateClose } = useModalAnimation()

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
	<dialog ref="modalRef" class="modal">
		<div
			class="modal-box bg-bg-card text-text-secondary relative w-11/12 max-w-4xl overflow-hidden rounded-4xl p-0 shadow-xl">
			<!-- Modal Header -->
			<div
				class="bg-bg-muted/30 border-border-default sticky top-0 z-20 flex items-center justify-between border-b px-8 py-5 backdrop-blur-md">
				<h3 class="text-xl font-bold tracking-tight">
					{{ editingProduct ? 'Editar Producto' : 'Nuevo Producto' }}
				</h3>
				<button
					type="button"
					class="btn btn-sm btn-circle btn-ghost text-text-light hover:bg-bg-hover hover:text-text-secondary"
					@click="closeModal">
					✕
				</button>
			</div>

			<!-- Form Scrollable content -->
			<div class="custom-scrollbar max-h-[70vh] overflow-y-auto px-8 py-6">
				<form
					id="productForm"
					@submit.prevent="saveProduct"
					class="grid grid-cols-1 gap-8 md:grid-cols-2">
					<!-- Left Column: Core Details -->
					<div class="flex flex-col gap-5">
						<!-- Status Toggle Header basically -->
						<div class="col-span-2 flex items-center justify-between">
							<h4 class="text-text-muted text-sm font-bold tracking-wider uppercase">
								Información General
							</h4>
							<div class="form-control flex-row items-center gap-3">
								<span class="label-text text-xs font-bold tracking-wider uppercase">Publicado</span>
								<input
									type="checkbox"
									class="toggle toggle-success toggle-sm"
									:checked="form.status === 'activo'"
									@change="form.status = form.status === 'activo' ? 'inactivo' : 'activo'" />
							</div>
						</div>

						<div class="form-control">
							<label class="label pb-1" for="prod-name">
								<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
									Nombre del Producto *
								</span>
							</label>
							<input
								id="prod-name"
								v-model="form.name"
								type="text"
								required
								class="input bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover h-11 w-full rounded-xl px-4 text-sm font-medium shadow-sm transition-colors duration-300 focus:shadow-md focus:ring-4 focus-visible:outline-none" />
						</div>

						<div class="grid grid-cols-2 gap-4">
							<div class="form-control">
								<label class="label pb-1" for="prod-sku">
									<span
										class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
										SKU
									</span>
								</label>
								<input
									id="prod-sku"
									v-model="form.sku"
									type="text"
									placeholder="Ej. PRD-001"
									class="input bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover h-11 w-full rounded-xl px-4 text-sm font-medium shadow-sm transition-colors duration-300 focus:shadow-md focus:ring-4 focus-visible:outline-none" />
							</div>
							<div class="form-control">
								<label class="label pb-1" for="prod-barcode">
									<span
										class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
										EAN / Código
									</span>
								</label>
								<input
									id="prod-barcode"
									v-model="form.barcode"
									type="text"
									placeholder="Código de barras"
									class="input bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover h-11 w-full rounded-xl px-4 text-sm font-medium shadow-sm transition-colors duration-300 focus:shadow-md focus:ring-4 focus-visible:outline-none" />
							</div>
						</div>

						<div class="form-control">
							<label class="label pb-1" for="prod-desc">
								<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
									Descripción
								</span>
							</label>
							<textarea
								id="prod-desc"
								v-model="form.description"
								rows="4"
								class="textarea bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover custom-scrollbar w-full rounded-xl px-4 py-3 text-sm font-medium shadow-sm transition-colors duration-300 focus:shadow-md focus:ring-4 focus-visible:outline-none"></textarea>
						</div>

						<div class="form-control">
							<label class="label pb-1" for="prod-img">
								<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
									URL de Imagen
								</span>
							</label>
							<input
								id="prod-img"
								v-model="form.image_url"
								type="url"
								placeholder="https://"
								class="input bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover h-11 w-full rounded-xl px-4 text-sm font-medium shadow-sm transition-colors duration-300 focus:shadow-md focus:ring-4 focus-visible:outline-none" />
						</div>
					</div>

					<!-- Right Column: Settings & Pricing -->
					<div class="flex flex-col gap-5">
						<!-- Categorization -->
						<h4 class="text-text-muted mt-2 text-sm font-bold tracking-wider uppercase md:mt-0">
							Organización
						</h4>

						<div class="grid grid-cols-2 gap-4">

							<div class="form-control">
								<label class="label pb-1">
									<span
										class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
										Categoría
									</span>
								</label>
								<select
									v-model="form.category_id"
									@change="form.subcategory_id = ''"
									class="select bg-bg-muted border-border-default hover:bg-bg-hover focus:bg-bg-card h-11 w-full rounded-xl text-sm font-medium shadow-sm transition-colors">
									<option value="">Ninguna</option>
									<option v-for="c in categories" :key="c.category_id" :value="c.category_id">
										{{ c.name }}
									</option>
								</select>
							</div>
						</div>

						<div class="form-control" v-if="filteredSubcategories && filteredSubcategories.length > 0">
							<label class="label pb-1">
								<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
									Subcategoría
								</span>
							</label>
							<select
								v-model="form.subcategory_id"
								class="select bg-bg-muted border-border-default hover:bg-bg-hover focus:bg-bg-card h-11 w-full rounded-xl text-sm font-medium shadow-sm transition-colors">
								<option value="">Ninguna</option>
								<option
									v-for="sc in filteredSubcategories"
									:key="sc.subcategory_id"
									:value="sc.subcategory_id">
									{{ sc.name }}
								</option>
							</select>
						</div>

						<div class="form-control">
							<label class="label pb-2">
								<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
									Etiquetas
								</span>
							</label>
							<div class="custom-scrollbar flex max-h-32 flex-wrap gap-2 overflow-y-auto pr-2">
								<button
									v-for="tag in tags"
									:key="tag.tag_id"
									type="button"
									@click="toggleTag(tag.tag_id)"
									class="badge badge-lg h-9 gap-1 rounded-lg border px-3 text-xs font-bold tracking-wider uppercase transition-colors"
									:class="
										form.tags.includes(tag.tag_id)
											? 'border-transparent text-white shadow-md'
											: 'bg-bg-card text-text-muted border-border-default hover:border-border-strong'
									"
									:style="form.tags.includes(tag.tag_id) ? { backgroundColor: tag.color || '#a855f7' } : {}">
									<Check v-if="form.tags.includes(tag.tag_id)" class="h-3 w-3" />
									{{ tag.name }}
								</button>
								<span v-if="!tags || tags.length === 0" class="text-text-light text-xs italic">
									No hay etiquetas disponibles
								</span>
							</div>

							<!-- Quick Create Tag -->
							<div class="mt-4 flex flex-col gap-3 rounded-2xl bg-bg-muted/30 p-4 border border-border-default/50">
								<div class="flex items-center justify-between gap-3">
									<label class="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Nueva Etiqueta</label>
									<div class="flex gap-1.5 pr-1">
										<button 
											v-for="color in tagColors" 
											:key="color.value"
											type="button"
											@click="newTagColor = color.value"
											class="h-4 w-4 rounded-full border border-white/20 transition-transform hover:scale-125"
											:class="newTagColor === color.value ? 'ring-2 ring-primary ring-offset-2 ring-offset-bg-card' : ''"
											:style="{ backgroundColor: color.value }"
											:title="color.name"
										></button>
									</div>
								</div>

								<div class="flex items-center gap-2">
									<input
										v-model="newTagName"
										type="text"
										placeholder="Nombre de la etiqueta..."
										@keydown.enter.prevent="handleCreateTag"
										class="input bg-bg-card border-border-default h-10 w-full min-w-0 flex-1 rounded-xl px-4 text-sm font-medium transition-all focus:ring-2 focus:ring-primary/20 focus-visible:outline-none" />
									
									<button
										type="button"
										@click="handleCreateTag"
										:disabled="isCreatingTag || !newTagName.trim()"
										class="group relative flex h-10 items-center gap-2 overflow-hidden rounded-xl bg-text-primary px-5 text-bg-card transition-all hover:scale-[1.02] hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:hover:scale-100">
										<!-- Glass finish effect -->
										<div class="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div>
										
										<Plus v-if="!isCreatingTag" class="h-4 w-4" />
										<span v-else class="loading loading-spinner loading-xs"></span>
										<span class="text-xs font-black uppercase tracking-widest">Añadir</span>
									</button>
								</div>
							</div>
						</div>

						<div class="divider my-0"></div>

						<!-- Pricing & Inventory -->
						<h4 class="text-text-muted text-sm font-bold tracking-wider uppercase">
							Precios e Inventario
						</h4>

						<div class="grid grid-cols-2 gap-4">
							<div class="form-control relative">
								<label class="label pb-1">
									<span
										class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
										PVP *
									</span>
								</label>
								<div class="relative">
									<Euro class="text-text-muted absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
									<input
										v-model="form.price"
										type="number"
										step="0.01"
										min="0"
										required
										class="input bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover h-11 w-full rounded-xl pl-9 text-sm font-medium shadow-sm transition-colors focus:shadow-md" />
								</div>
							</div>
							<div class="form-control relative">
								<label class="label pb-1">
									<span
										class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
										Impuesto (%) *
									</span>
								</label>
								<input
									v-model="form.tax_rate"
									type="number"
									step="0.1"
									min="0"
									required
									class="input bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover h-11 w-full rounded-xl px-4 text-sm font-medium shadow-sm transition-colors focus:shadow-md" />
							</div>
						</div>

						<div class="grid grid-cols-2 gap-4">
							<div class="form-control">
								<label class="label pb-1">
									<span
										class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
										Stock Actual *
									</span>
								</label>
								<input
									v-model="form.stock"
									type="number"
									min="0"
									required
									class="input bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover h-11 w-full rounded-xl px-4 text-sm font-bold tabular-nums shadow-sm transition-colors focus:shadow-md" />
							</div>
							<div class="form-control">
								<label class="label pb-1">
									<span
										class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
										Stock Mínimo (Alerta)
									</span>
								</label>
								<input
									v-model="form.min_stock"
									type="number"
									min="0"
									class="input bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover h-11 w-full rounded-xl px-4 text-sm font-medium shadow-sm transition-colors focus:shadow-md" />
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
					class="btn btn-ghost text-text-muted hover:bg-bg-hover hover:text-text-secondary h-12 rounded-xl px-8"
					@click="closeModal">
					{{ $t('common.cancel') }}
				</button>
				<button
					type="submit"
					form="productForm"
					class="btn text-bg-card hover:bg-text-secondary/80 bg-text-secondary h-12 rounded-xl border-none px-10 font-bold shadow-md"
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
