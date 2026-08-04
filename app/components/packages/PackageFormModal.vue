<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { Package, Plus, Trash2, X, Sparkles, Box, Scissors, Clock } from 'lucide-vue-next'
import AppSelect from '~/components/ui/AppSelect.vue'

const emit = defineEmits(['saved'])

const isOpen = ref(false)
const isEditing = ref(false)
const editingId = ref<string | null>(null)

const form = reactive({
	name: '',
	description: '',
	type: 'INDIVIDUAL' as 'INDIVIDUAL' | 'MIXTO',
	price: 0,
	total_sessions: 6,
	service_id: '',
	items: [] as Array<{
		item_type: 'SERVICE' | 'PRODUCT'
		item_id: string
		name: string
		quantity: number
		duration: number
	}>
})

// Fetch Services & Products for item selection
const { data: services } = useQuery<any[]>({
	queryKey: ['services-catalog'],
	queryFn: () => $fetch('/api/services')
})

const { data: products } = useQuery<any[]>({
	queryKey: ['products-catalog'],
	queryFn: () => $fetch('/api/catalog/products')
})

// Options for the themed AppSelect dropdowns
const serviceOptions = computed(() => [
	{ value: '', label: 'Selecciona servicio...' },
	...(services.value || []).map((s: any) => ({
		value: s.service_id,
		label: `${s.name} (${s.duration || 45} min)`,
	})),
])
const productOptions = computed(() => [
	{ value: '', label: 'Seleccionar Producto...' },
	...(products.value || []).map((p: any) => ({ value: p.product_id, label: p.name })),
])

const onCatalogServiceSelect = (value: string | number) => {
	form.service_id = String(value)
	const svc = (services.value || []).find((s: any) => s.service_id === value)
	if (svc) {
		form.items = [
			{
				item_type: 'SERVICE',
				item_id: svc.service_id,
				name: svc.name,
				quantity: form.total_sessions,
				duration: svc.duration || 45,
			},
		]
	}
}

const queryClient = useQueryClient()

const { mutate: savePackage, isPending: isSaving } = useMutation({
	mutationFn: async () => {
		if (isEditing.value && editingId.value) {
			return await $fetch(`/api/packages/${editingId.value}`, {
				method: 'PUT',
				body: form
			})
		} else {
			return await $fetch('/api/packages', {
				method: 'POST',
				body: form
			})
		}
	},
	onSuccess: () => {
		queryClient.invalidateQueries({ queryKey: ['packages'] })
		emit('saved')
		closeModal()
	}
})

const openModal = (packageData: any = null) => {
	if (packageData) {
		isEditing.value = true
		editingId.value = packageData.package_id
		form.name = packageData.name || ''
		form.description = packageData.description || ''
		form.type = packageData.type || 'INDIVIDUAL'
		form.price = Number(packageData.price || 0)
		form.total_sessions = Number(packageData.total_sessions || 1)
		form.service_id = packageData.service_id || ''
		form.items = (packageData.items || []).map((it: any) => ({
			item_type: it.item_type || 'SERVICE',
			item_id: it.item_id || '',
			name: it.name || '',
			quantity: Number(it.quantity || 1),
			duration: Number(it.duration || 30)
		}))
	} else {
		isEditing.value = false
		editingId.value = null
		form.name = ''
		form.description = ''
		form.type = 'INDIVIDUAL'
		form.price = 100
		form.total_sessions = 5
		form.service_id = ''
		form.items = []
	}
	isOpen.value = true
}

const closeModal = () => {
	isOpen.value = false
}

// Add Item Row
const addItemRow = (type: 'SERVICE' | 'PRODUCT') => {
	form.items.push({
		item_type: type,
		item_id: '',
		name: '',
		quantity: 1,
		duration: type === 'SERVICE' ? 45 : 0
	})
}

const removeItemRow = (index: number) => {
	form.items.splice(index, 1)
}

const onServiceSelect = (index: number, serviceId: string) => {
	const item = form.items[index]
	const svc = (services.value || []).find((s: any) => s.service_id === serviceId)
	if (!item || !svc) return
	item.item_id = svc.service_id
	item.name = svc.name
	item.duration = svc.duration || 45
}

const onProductSelect = (index: number, productId: string) => {
	const item = form.items[index]
	const prd = (products.value || []).find((p: any) => p.product_id === productId)
	if (!item || !prd) return
	item.item_id = prd.product_id
	item.name = prd.name
	item.duration = 0
}

// Recalculate total_sessions automatically when items change in MIXTO (Only SERVICE items count as sessions!)
watch(() => form.items, () => {
	if (form.type === 'MIXTO') {
		form.total_sessions = form.items
			.filter(item => item.item_type === 'SERVICE')
			.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
	}
}, { deep: true })

defineExpose({ openModal, closeModal })
</script>

<template>
	<div v-if="isOpen" class="modal modal-open z-[1000] backdrop-blur-sm bg-black/40">
		<div class="modal-box max-w-2xl bg-bg-card border border-border-default rounded-3xl p-6 shadow-2xl relative">
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-border-default pb-4">
				<div class="flex items-center gap-3">
					<div class="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black">
						<Package class="h-5 w-5" />
					</div>
					<div>
						<h3 class="text-lg font-black text-text-primary uppercase tracking-wide">
							{{ isEditing ? 'Editar Paquete / Bono' : 'Crear Nuevo Paquete / Bono' }}
						</h3>
						<p class="text-xs text-text-muted">Define la plantilla de bono en el catálogo del salón</p>
					</div>
				</div>
				<button class="btn btn-sm btn-ghost btn-circle text-text-muted hover:text-text-primary" @click="closeModal">
					<X class="h-4 w-4" />
				</button>
			</div>

			<!-- Body -->
			<form class="mt-4 space-y-4" @submit.prevent="() => savePackage()">
				<!-- Name & Price -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label class="block text-xs font-bold uppercase text-text-muted mb-1">Nombre del Bono / Paquete</label>
						<input
							v-model="form.name"
							type="text"
							required
							placeholder="Ej: Bono Indiba 6 Sesiones"
							class="input input-bordered w-full rounded-xl bg-bg-muted text-text-primary font-medium"
						>
					</div>
					<div>
						<label class="block text-xs font-bold uppercase text-text-muted mb-1">Precio (€)</label>
						<input
							v-model.number="form.price"
							type="number"
							step="0.01"
							required
							min="0"
							placeholder="250.00"
							class="input input-bordered w-full rounded-xl bg-bg-muted text-text-primary font-mono font-bold"
						>
					</div>
				</div>

				<!-- Type selector: INDIVIDUAL vs MIXTO -->
				<div>
					<label class="block text-xs font-bold uppercase text-text-muted mb-1">Tipo de Bono</label>
					<div class="grid grid-cols-2 gap-3">
						<button
							type="button"
							class="flex items-center justify-center gap-2 p-3 rounded-2xl border transition-all text-xs font-black uppercase"
							:class="form.type === 'INDIVIDUAL' ? 'border-primary bg-primary/10 text-primary shadow-xs' : 'border-border-default text-text-muted bg-bg-muted/50 hover:bg-bg-muted'"
							@click="form.type = 'INDIVIDUAL'">
							<Scissors class="h-4 w-4" />
							Bono Individual (1 Tratamiento)
						</button>
						<button
							type="button"
							class="flex items-center justify-center gap-2 p-3 rounded-2xl border transition-all text-xs font-black uppercase"
							:class="form.type === 'MIXTO' ? 'border-amber-500 bg-amber-500/10 text-amber-600 shadow-xs' : 'border-border-default text-text-muted bg-bg-muted/50 hover:bg-bg-muted'"
							@click="form.type = 'MIXTO'">
							<Sparkles class="h-4 w-4" />
							Bono Mixto (Tratamientos + Productos)
						</button>
					</div>
				</div>

				<!-- Description -->
				<div>
					<label class="block text-xs font-bold uppercase text-text-muted mb-1">Descripción</label>
					<textarea
						v-model="form.description"
						rows="2"
						placeholder="Ej: Incluye 6 sesiones de Indiba Corporal de 45 minutos."
						class="textarea textarea-bordered w-full rounded-xl bg-bg-muted text-text-primary text-xs"
					/>
				</div>

				<!-- Individual Package Settings -->
				<div v-if="form.type === 'INDIVIDUAL'" class="p-4 rounded-2xl bg-bg-muted/40 border border-border-default space-y-3">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label class="block text-xs font-bold uppercase text-text-muted mb-1">Total de Sesiones</label>
							<input
								v-model.number="form.total_sessions"
								type="number"
								min="1"
								required
								class="input input-bordered w-full rounded-xl bg-bg-card text-text-primary font-mono font-bold"
							>
						</div>
						<div>
							<label class="block text-xs font-bold uppercase text-text-muted mb-1">Servicio del Catálogo</label>
							<AppSelect
								:model-value="form.service_id"
								aria-label="Servicio del catálogo"
								placeholder="Selecciona servicio..."
								:options="serviceOptions"
								@update:model-value="onCatalogServiceSelect" />
						</div>
					</div>
				</div>

				<!-- Mixto Package Items Builder -->
				<div v-else class="p-4 rounded-2xl bg-bg-muted/40 border border-border-default space-y-3">
					<div class="flex items-center justify-between">
						<span class="text-xs font-black uppercase text-text-primary tracking-wider">Desglose de Tratamientos y Productos</span>
						<div class="flex gap-2">
							<button type="button" class="btn btn-xs bg-primary/10 text-primary border-none rounded-lg font-bold" @click="addItemRow('SERVICE')">
								+ Servicio
							</button>
							<button type="button" class="btn btn-xs bg-amber-500/10 text-amber-600 border-none rounded-lg font-bold" @click="addItemRow('PRODUCT')">
								+ Producto
							</button>
						</div>
					</div>

					<div v-if="form.items.length === 0" class="text-center py-4 text-xs text-text-muted border border-dashed border-border-default rounded-xl">
						Agrega al menos un servicio o producto al paquete mixto.
					</div>

					<div v-for="(item, idx) in form.items" :key="idx" class="flex items-center gap-2 bg-bg-card p-2.5 rounded-xl border border-border-default">
						<!-- Icon -->
						<div class="shrink-0">
							<Scissors v-if="item.item_type === 'SERVICE'" class="h-4 w-4 text-primary" />
							<Box v-else class="h-4 w-4 text-amber-500" />
						</div>

						<!-- Selector -->
						<div class="flex-1 min-w-0">
							<AppSelect
								v-if="item.item_type === 'SERVICE'"
								:model-value="item.item_id"
								size="sm"
								aria-label="Seleccionar servicio"
								placeholder="Seleccionar Servicio..."
								:options="serviceOptions"
								@update:model-value="(v) => onServiceSelect(idx, String(v))" />
							<AppSelect
								v-else
								:model-value="item.item_id"
								size="sm"
								aria-label="Seleccionar producto"
								placeholder="Seleccionar Producto..."
								:options="productOptions"
								@update:model-value="(v) => onProductSelect(idx, String(v))" />
						</div>

						<!-- Quantity -->
						<div class="w-20 shrink-0">
							<input
								v-model.number="item.quantity"
								type="number"
								min="1"
								class="input input-sm input-bordered w-full rounded-lg text-center font-mono font-bold text-xs"
								placeholder="Cant"
							>
						</div>

						<!-- Delete Button -->
						<button type="button" class="btn btn-sm btn-ghost btn-circle text-rose-500" @click="removeItemRow(idx)">
							<Trash2 class="h-3.5 w-3.5" />
						</button>
					</div>
				</div>

				<!-- Actions -->
				<div class="flex items-center justify-end gap-3 pt-4 border-t border-border-default">
					<button type="button" class="btn btn-ghost rounded-xl text-xs uppercase font-bold" @click="closeModal">
						Cancelar
					</button>
					<button type="submit" class="btn btn-primary rounded-xl font-black uppercase text-xs shadow-md" :disabled="isSaving">
						<span v-if="isSaving" class="loading loading-spinner"/>
						<span v-else>{{ isEditing ? 'Guardar Cambios' : 'Crear Paquete' }}</span>
					</button>
				</div>
			</form>
		</div>
	</div>
</template>
