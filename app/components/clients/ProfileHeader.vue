<script setup lang="ts">
import {
	Mail,
	Phone,
	Calendar,
	BadgeCheck,
	Plus,
	TrendingUp,
	CreditCard,
	Camera,
	ChevronDown,
	FileSignature,
	FileText,
	ShieldOff,
	ImageUp,
	AlertCircle,
	Sparkles
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import ImageCropperModal from '~/components/shared/ImageCropperModal.vue'

const props = defineProps({
	client: {
		type: Object as PropType<any>,
		required: true,
	},
	isUpdating: {
		type: Boolean,
		default: false,
	},
})

const { locale } = useI18n()

const emit = defineEmits([
	'update',
	'new-booking',
	'add-consent',
	'add-questionnaire',
	'add-revoke',
	'toast',
])

const avatarError = ref(false)
const isUploadingAvatar = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const handleAvatarError = () => {
	avatarError.value = true
}

const triggerAvatarUpload = () => {
	fileInput.value?.click()
}

const showCropper = ref(false)
const selectedImageSrc = ref('')
const currentFileMeta = ref<{ name: string; type: string } | null>(null)
const avatarTimestamp = ref(Date.now())
const localAvatarPreview = ref<string | null>(null)

const displayAvatar = computed(() => {
	if (localAvatarPreview.value) return localAvatarPreview.value
	if (!props.client?.avatar) return null
	const base = props.client.avatar
	const sep = base.includes('?') ? '&' : '?'
	return `${base}${sep}t=${avatarTimestamp.value}`
})

const handleFileSelect = (e: Event) => {
	const target = e.target as HTMLInputElement
	const file = target.files?.[0]
	if (!file) return

	currentFileMeta.value = { name: file.name, type: file.type }

	const reader = new FileReader()
	reader.onload = e => {
		selectedImageSrc.value = e.target?.result as string
		showCropper.value = true
	}
	reader.readAsDataURL(file)

	if (fileInput.value) fileInput.value.value = ''
}

const uploadCroppedImage = async (blob: Blob) => {
	isUploadingAvatar.value = true
	avatarError.value = false
	try {
		const formData = new FormData()
		formData.append('file', blob, currentFileMeta.value?.name || 'avatar.jpg')
		formData.append('category', 'usuarios')
		formData.append('type', 'clientes')

		const response = await $fetch<{ url: string }>('/api/upload', {
			method: 'POST',
			body: formData,
		})

		if (response.url) {
			if (localAvatarPreview.value) URL.revokeObjectURL(localAvatarPreview.value)
			localAvatarPreview.value = URL.createObjectURL(blob)
			avatarTimestamp.value = Date.now()
			emit('update', 'avatar', response.url)
			emit('toast', 'Avatar actualizado correctamente', 'success')
		}
	} catch (err: any) {
		emit('toast', err.data?.statusMessage || 'Error subiendo la imagen', 'error')
	} finally {
		isUploadingAvatar.value = false
	}
}

const engagementScore = computed(() => props.client.kpis?.engagementScore || 0)
const engagementTier = computed(() => props.client.kpis?.engagementTier || 'BRONZE')
const engagementTierLabel = computed(() => props.client.kpis?.engagementTierLabel || 'Bronce')

const getTierBadgeStyle = computed(() => {
	if (engagementTier.value === 'GOLD_VIP') {
		return 'bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-600/30 text-amber-700 border-amber-500/40'
	}
	if (engagementTier.value === 'SILVER') {
		return 'bg-slate-500/20 text-slate-700 border-slate-400/40'
	}
	return 'bg-amber-800/10 text-amber-900 border-amber-800/20'
})

const getStatusBadgeClass = (status: string) => (status === 'ON' ? 'badge-success' : 'badge-error')
const blurActiveElement = () => {
	if (typeof document !== 'undefined') {
		(document.activeElement as HTMLElement)?.blur()
	}
}
</script>

<template>
	<div class="card bg-bg-card border-border-default shadow-md relative z-40 overflow-visible rounded-3xl p-6 lg:p-8 transition-all duration-300 hover:shadow-xl">
		<input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileSelect" />

		<!-- Main Layout Grid -->
		<div class="flex w-full flex-col justify-between gap-6 lg:flex-row lg:items-center">
			
			<!-- 1. Identity & Avatar -->
			<div class="flex items-center gap-6">
				<!-- DaisyUI Avatar Component with Indicator -->
				<div class="indicator relative">
					<span 
						class="indicator-item badge badge-sm p-2 shadow-md font-black tracking-wider uppercase text-[9px] border-none"
						:class="getStatusBadgeClass(client.status)"
					>
						{{ client.status === 'ON' ? 'ACTIVO' : 'INACTIVO' }}
					</span>
					<div 
						class="avatar cursor-pointer group relative overflow-hidden rounded-full ring-4 ring-primary/20 ring-offset-4 ring-offset-bg-card transition-all duration-300 hover:scale-105 shadow-xl w-20 h-20 lg:w-24 lg:h-24"
						role="button"
						:aria-label="$t('common.edit') + ' ' + $t('users.avatar')"
						@click="triggerAvatarUpload"
					>
						<div v-if="isUploadingAvatar" class="absolute inset-0 z-20 flex items-center justify-center bg-bg-card/80 text-text-primary">
							<span class="loading loading-spinner loading-md"></span>
						</div>
						<div class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 backdrop-blur-[2px]">
							<Camera class="h-6 w-6 mb-0.5" />
							<span class="text-[9px] font-black uppercase tracking-wider">{{ $t('common.edit') }}</span>
						</div>
						<img v-if="displayAvatar && !avatarError" :src="displayAvatar" class="object-cover w-full h-full" @error="handleAvatarError" />
						<div v-else class="bg-bg-muted text-primary flex h-full w-full items-center justify-center text-2xl font-black">
							{{ client.name.charAt(0) }}{{ client.surname?.charAt(0) || '' }}
						</div>
					</div>
				</div>

				<div class="space-y-1.5">
					<div class="flex items-center gap-3 flex-wrap">
						<h1 class="text-text-primary text-2xl lg:text-3xl font-black tracking-tight flex items-center gap-2">
							{{ client.name }} {{ client.surname }}
						</h1>
						<!-- 3-Tier Commitment Badge -->
						<div class="tooltip tooltip-bottom z-50" data-tip="Categoría de cliente según nivel de compromiso: Bronce (0-64 pts), Plata (65-89 pts) u Oro VIP (90-100 pts).">
							<div 
								class="badge border font-black text-[10px] tracking-wider uppercase px-3 py-2 flex items-center gap-1 shadow-xs cursor-help"
								:class="getTierBadgeStyle"
							>
								<Sparkles class="w-3 h-3" />
								<span>Cliente {{ engagementTierLabel }}</span>
							</div>
						</div>
					</div>
					<div class="text-text-muted flex flex-col gap-1 text-xs font-semibold">
						<div class="flex items-center gap-3 flex-wrap">
							<span class="flex items-center gap-1.5"><Mail class="w-3.5 h-3.5 text-primary opacity-80" /> {{ client.email }}</span>
							<span class="opacity-30">•</span>
							<span class="flex items-center gap-1.5"><Phone class="w-3.5 h-3.5 text-primary opacity-80" /> {{ client.phone }}</span>
						</div>
						<div class="flex items-center gap-3 text-[11px] font-medium opacity-70 flex-wrap mt-0.5">
							<span>Registrado: {{ new Date(client.created_at).toLocaleDateString() }}</span>
							<span v-if="client.city" class="opacity-50">• {{ client.city }}, {{ client.country || 'España' }}</span>
							<span v-if="client.document_number" class="opacity-50">• Doc: {{ client.document_number }}</span>
						</div>
					</div>
				</div>
			</div>

			<!-- 2. Commitment Level Stat Card (0 - 100) -->
			<div class="stats overflow-visible bg-bg-muted/30 border border-border-default/80 shadow-xs rounded-2xl p-2 min-w-[280px] sm:min-w-[340px]">
				<div class="stat overflow-visible p-3 flex items-center justify-between gap-4">
					<div class="space-y-1">
						<div class="stat-title text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-text-muted">
							<Sparkles class="w-3.5 h-3.5 text-amber-500" />
							Frecuencia & Compromiso
							<div class="tooltip tooltip-left z-50" data-tip="Índice de 0 a 100 calculado a partir de la frecuencia de visitas, total consumido y estado de cumplimientos legales.">
								<AlertCircle class="w-3.5 h-3.5 text-text-muted/60 cursor-help" />
							</div>
						</div>
						<div class="stat-value text-3xl font-black text-text-primary flex items-baseline gap-1 tabular-nums">
							<span>{{ engagementScore }}</span>
							<span class="text-xs font-bold text-text-muted">/100</span>
						</div>
						<div class="stat-desc">
							<span 
								class="badge badge-sm font-black text-[10px] uppercase border-none px-2 py-1 shadow-xs"
								:class="getTierBadgeStyle"
							>
								Nivel {{ engagementTierLabel }}
							</span>
						</div>
					</div>

					<!-- Radial Progress -->
					<div 
						class="radial-progress text-primary font-black text-xs shrink-0 shadow-xs" 
						:style="`--value:${engagementScore}; --size:3.8rem; --thickness: 6px;`" 
						role="progressbar"
					>
						{{ engagementScore }}%
					</div>
				</div>
			</div>

			<!-- 3. Actions Row -->
			<div class="flex items-center gap-3 shrink-0">
				<button 
					@click="$emit('new-booking')" 
					class="btn btn-primary rounded-2xl px-6 font-black tracking-wide shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-[1.02] transition-all"
				>
					<Plus class="w-4 h-4 mr-1 stroke-[3]" />
					{{ $t('nav.agenda') === 'nav.agenda' ? 'Nueva Cita' : $t('nav.agenda') }}
				</button>
				
				<!-- DaisyUI Dropdown -->
				<div class="dropdown dropdown-end relative z-50">
					<div 
						tabindex="0" 
						role="button" 
						class="btn btn-ghost bg-base-200/80 hover:bg-base-300/80 rounded-2xl px-5 font-bold border border-base-300/60"
						aria-haspopup="menu"
						:aria-label="$t('users.table.actions')"
					>
						{{ $t('users.table.actions') }} 
						<ChevronDown class="ml-1 w-4 h-4 opacity-70" />
					</div>
					<ul 
						tabindex="0" 
						class="dropdown-content menu bg-base-100/95 backdrop-blur-xl border border-base-300/80 z-50 mt-2 w-64 rounded-2xl p-2 shadow-2xl space-y-1"
					>
						<li>
							<a @click="$emit('add-consent'); blurActiveElement()" class="py-3 font-bold rounded-xl active:bg-primary">
								<FileSignature class="text-success mr-2 h-4 w-4" /> 
								{{ $t('catalog.clients.profile.compliance.consents') }}
							</a>
						</li>
						<li>
							<a @click="$emit('add-questionnaire'); blurActiveElement()" class="py-3 font-bold rounded-xl active:bg-primary">
								<FileText class="text-info mr-2 h-4 w-4" /> 
								{{ $t('catalog.clients.profile.compliance.questionnaires') }}
							</a>
						</li>
						<li class="border-t border-base-200/80 pt-1">
							<a @click="$emit('add-revoke'); blurActiveElement()" class="py-3 font-bold text-error rounded-xl hover:bg-error/10 active:bg-error">
								<ShieldOff class="mr-2 h-4 w-4" /> 
								{{ $t('catalog.clients.profile.compliance.revocations') }}
							</a>
						</li>
					</ul>
				</div>
			</div>
		</div>

		<ImageCropperModal v-model="showCropper" :image-src="selectedImageSrc" @crop="uploadCroppedImage" />
	</div>
</template>

<style scoped>
</style>
