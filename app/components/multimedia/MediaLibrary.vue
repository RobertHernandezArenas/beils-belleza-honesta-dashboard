<script setup lang="ts">

import { Upload, Image as ImageIcon, Video, FileText, Search, X, Check } from 'lucide-vue-next'

const categories = [
	{ id: 'imagenes', label: 'Imágenes', icon: ImageIcon },
	{ id: 'videos', label: 'Videos', icon: Video },
	{ id: 'archivos', label: 'Archivos', icon: FileText },
]

const subcategories: Record<string, any[]> = {
	imagenes: [
		{ id: 'productos', label: 'Productos' },
		{ id: 'servicios', label: 'Servicios' },
		{ id: 'usuarios/clientes', label: 'Clientes' },
		{ id: 'usuarios/admin', label: 'Admin' },
	],
	videos: [],
	archivos: [],
}

const selectedCategory = ref('imagenes')
const selectedSubcategory = ref('productos')
const files = ref<any[]>([])
const isLoading = ref(false)
const isUploading = ref(false)
const uploadProgress = ref(0)
const searchQuery = ref('')

const fetchFiles = async () => {
	isLoading.value = true
	try {
		const data = await $fetch('/api/multimedia/list', {
			query: {
				category: selectedCategory.value,
				type: selectedSubcategory.value,
			},
		})
		files.value = data as any[]
	} catch (err) {
		console.error('Error fetching files:', err)
	} finally {
		isLoading.value = false
	}
}

const handleFileUpload = async (event: Event) => {
	const target = event.target as HTMLInputElement
	if (!target.files?.length) return

	isUploading.value = true
	uploadProgress.value = 10
	
	const file = target.files[0]
	if (!file) return

	const formData = new FormData()
	formData.append('file', file)
	formData.append('category', selectedCategory.value)
	formData.append('type', selectedSubcategory.value)

	try {
		await $fetch('/api/multimedia/upload', {
			method: 'POST',
			body: formData,
		})
		uploadProgress.value = 100
		setTimeout(() => {
			isUploading.value = false
			uploadProgress.value = 0
			fetchFiles()
		}, 500)
	} catch (err) {
		console.error('Upload failed:', err)
		isUploading.value = false
	}
}

const selectCategory = (id: string) => {
	selectedCategory.value = id
	selectedSubcategory.value = subcategories[id]?.[0]?.id || ''
	fetchFiles()
}

const selectSubcategory = (id: string) => {
	selectedSubcategory.value = id
	fetchFiles()
}

onMounted(() => {
	fetchFiles()
})

const formatSize = (bytes: number) => {
	if (bytes === 0) return '0 B'
	const k = 1024
	const sizes = ['B', 'KB', 'MB', 'GB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
</script>

<template>
	<div class="bg-bg-card border-border-default h-full w-full overflow-hidden rounded-3xl border shadow-sm backdrop-blur-xl">
		<!-- Header -->
		<div class="border-border-default flex items-center justify-between border-b p-6">
			<div class="flex items-center gap-3">
				<div class="bg-primary/10 rounded-xl p-2.5 text-primary">
					<Upload class="h-6 w-6" />
				</div>
				<div>
					<h2 class="text-text-secondary text-xl font-bold">Librería Multimedia</h2>
					<p class="text-text-muted text-sm">Gestiona tus imágenes, videos y archivos</p>
				</div>
			</div>
			
			<div class="flex items-center gap-3">
				<div class="relative hidden sm:block">
					<Search class="text-text-muted absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
					<input 
						v-model="searchQuery"
						type="text" 
						placeholder="Buscar archivos..."
						class="bg-bg-muted border-border-default text-text-secondary w-64 rounded-full border py-2 pr-4 pl-10 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
					/>
				</div>
				
				<label class="btn btn-primary btn-md rounded-full px-6 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
					<Upload class="mr-2 h-4 w-4" />
					Subir Archivo
					<input type="file" class="hidden" @change="handleFileUpload" />
				</label>
			</div>
		</div>

		<!-- Toolbar -->
		<div class="bg-bg-muted/30 flex flex-wrap items-center gap-6 px-6 py-4 sm:flex-nowrap">
			<!-- Categories -->
			<div class="flex items-center gap-2">
				<button 
					v-for="cat in categories" 
					:key="cat.id"
					@click="selectCategory(cat.id)"
					class="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all"
					:class="selectedCategory === cat.id ? 'bg-primary text-primary-content shadow-md' : 'hover:bg-bg-card border-border-default text-text-muted border bg-white/50'"
				>
					<component :is="cat.icon" class="h-4 w-4" />
					{{ cat.label }}
				</button>
			</div>

			<div v-if="subcategories[selectedCategory]?.length" class="bg-border-default hidden h-6 w-px sm:block"></div>

			<!-- Subcategories -->
			<div v-if="subcategories[selectedCategory]?.length" class="flex flex-wrap items-center gap-2">
				<button 
					v-for="sub in subcategories[selectedCategory]" 
					:key="sub.id"
					@click="selectSubcategory(sub.id)"
					class="rounded-full px-4 py-1.5 text-xs font-bold tracking-wider uppercase transition-all"
					:class="selectedSubcategory === sub.id ? 'bg-text-secondary text-bg-card' : 'text-text-muted hover:text-text-secondary hover:bg-bg-card'"
				>
					{{ sub.label }}
				</button>
			</div>
		</div>

		<!-- Content -->
		<div class="relative flex-1 overflow-y-auto p-6" style="min-height: 400px;">
			<!-- Uploading Overlay -->
			<div v-if="isUploading" class="bg-bg-card/80 absolute inset-0 z-20 flex flex-col items-center justify-center backdrop-blur-md">
				<div class="w-64 text-center">
					<p class="text-text-secondary mb-4 text-lg font-bold">Subiendo y optimizando...</p>
					<div class="bg-bg-muted h-3 w-full overflow-hidden rounded-full border border-white/20 shadow-inner">
						<div 
							class="bg-linear-to-r from-primary to-yellow-400 h-full transition-all duration-300"
							:style="{ width: `${uploadProgress}%` }"
						></div>
					</div>
					<p class="text-text-muted mt-2 text-xs">{{ uploadProgress }}% Completado</p>
				</div>
			</div>

			<div v-if="isLoading" class="flex h-64 w-full items-center justify-center">
				<span class="loading loading-spinner text-primary loading-lg"></span>
			</div>

			<div v-else-if="files.length === 0" class="flex h-64 flex-col items-center justify-center text-center">
				<div class="bg-bg-muted mb-4 flex h-20 w-20 items-center justify-center rounded-3xl opacity-50">
					<ImageIcon class="text-text-muted h-10 w-10" />
				</div>
				<h3 class="text-text-secondary text-lg font-bold">No hay archivos en esta carpeta</h3>
				<p class="text-text-muted max-w-xs text-sm">Sube tu primer archivo o intenta cambiar de categoría para ver contenido.</p>
			</div>

			<!-- Grid -->
			<div v-else class="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
				<div 
					v-for="file in files" 
					:key="file.name"
					class="group border-border-default bg-bg-muted relative aspect-square overflow-hidden rounded-2xl border transition-all hover:scale-[1.03] hover:shadow-xl active:scale-95"
				>
					<template v-if="selectedCategory === 'imagenes'">
						<img :src="file.url" class="h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-60" :alt="file.name" />
					</template>
					<template v-else-if="selectedCategory === 'videos'">
						<div class="flex h-full w-full flex-col items-center justify-center p-4">
							<Video class="text-text-muted h-10 w-10" />
						</div>
					</template>
					<template v-else>
						<div class="flex h-full w-full flex-col items-center justify-center p-4">
							<FileText class="text-text-muted h-10 w-10" />
						</div>
					</template>

					<!-- Info Overlay -->
					<div class="bg-linear-to-t from-black/80 to-transparent absolute inset-0 flex flex-col justify-end p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
						<p class="mb-0.5 truncate text-[10px] font-bold text-white uppercase">{{ file.name }}</p>
						<p class="text-[9px] text-white/70">{{ formatSize(file.size) }}</p>
					</div>

					<!-- Selection Badge (WordPress style) -->
					<div class="absolute top-2 right-2 flex scale-0 items-center justify-center rounded-full bg-primary p-1 text-primary-content shadow-lg transition-transform duration-200 group-hover:scale-100">
						<Check class="h-3 w-3" />
					</div>
				</div>
			</div>
		</div>

		<!-- Footer Stats -->
		<div class="bg-bg-muted/50 border-border-default flex items-center justify-between border-t px-6 py-3">
			<p class="text-text-muted text-xs font-medium">Mostrando {{ files.length }} archivos</p>
			<div class="flex items-center gap-1">
				<div class="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
				<p class="text-[10px] font-bold tracking-widest text-green-600 uppercase">Todo optimizado</p>
			</div>
		</div>
	</div>
</template>

<style scoped>
.btn-primary {
	--btn-color: var(--color-primary);
	background: linear-gradient(135deg, #FFFF00 0%, #E6E600 100%);
	color: #000;
	border: none;
}
.btn-primary:hover {
	background: linear-gradient(135deg, #E6E600 0%, #CCCC00 100%);
}
</style>
