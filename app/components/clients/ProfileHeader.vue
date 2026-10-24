<script setup lang="ts">
import type { ClientProfile, FetchError } from '~~/shared/types/domain'
import {
	Mail,
	Phone,
	Camera,
	MoreVertical,
	CalendarPlus,
	FileSignature,
	FileText,
	ShieldOff,
	AlertCircle,
	Sparkles
} from 'lucide-vue-next'

import ImageCropperModal from '~/components/shared/ImageCropperModal.vue'
import EditableField from '~/components/shared/EditableField.vue'

const props = defineProps({
	client: {
		type: Object as PropType<ClientProfile>,
		required: true,
	},
	isUpdating: {
		type: Boolean,
		default: false,
	},
})



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
	} catch (err) {
		emit('toast', (err as FetchError).data?.statusMessage || 'Error subiendo la imagen', 'error')
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
		return 'bg-text-muted/20 text-text-secondary border-border-strong/40'
	}
	return 'bg-amber-800/10 text-amber-900 border-amber-800/20'
})

const blurActiveElement = () => {
	if (typeof document !== 'undefined') {
		(document.activeElement as HTMLElement)?.blur()
	}
}
</script>

<template>
	<div class="focus-item card bg-bg-card border border-border-default/80 shadow-md relative z-40 overflow-visible rounded-3xl p-4 sm:p-6 lg:p-8 hover:shadow-xl">
		<input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileSelect" >

		<!-- Main Layout Grid -->
		<div class="flex w-full flex-col justify-between gap-5 sm:gap-6 lg:flex-row lg:items-center">
			
			<!-- 1. Identity & Avatar (with mobile action button) -->
			<div class="flex items-start justify-between gap-3 w-full lg:w-auto min-w-0">
				
				<div class="flex items-center gap-3 sm:gap-5 min-w-0 flex-1">
					<!-- Avatar with Apple-like spring hover & tap feedback -->
					<div class="relative shrink-0">
						<div
							class="avatar cursor-pointer group relative overflow-hidden rounded-full ring-4 ring-primary/20 ring-offset-2 sm:ring-offset-4 ring-offset-bg-card transition-transform duration-150 ease-(--motion-ease-out) active:scale-95 shadow-lg size-16 sm:size-20 lg:size-24"
							:style="{ viewTransitionName: `client-avatar-${client.user_id}` }"
							role="button"
							:aria-label="$t('common.edit') + ' ' + $t('users.avatar')"
							@click="triggerAvatarUpload"
						>
							<div v-if="isUploadingAvatar" class="absolute inset-0 z-20 flex items-center justify-center bg-bg-card/80 text-text-primary">
								<span class="loading loading-spinner loading-sm sm:loading-md"/>
							</div>
							<div class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 backdrop-blur-[2px]">
								<Camera class="size-5 sm:size-6 mb-0.5" />
								<span class="text-[8px] sm:text-[9px] font-black uppercase tracking-wider">{{ $t('common.edit') }}</span>
							</div>
							<img v-if="displayAvatar && !avatarError" :src="displayAvatar" class="object-cover size-full" @error="handleAvatarError" >
							<div v-else class="bg-bg-muted text-primary flex size-full items-center justify-center text-xl sm:text-2xl font-black">
								{{ (client.name?.trim() || '').charAt(0) }}{{ (client.surname?.trim() || '').charAt(0) }}
							</div>
						</div>
					</div>

					<!-- Text Information -->
					<div class="space-y-1 min-w-0 flex-1">
						<!-- Shared element: the name travels here from the client list -->
						<div
							class="flex w-fit max-w-full items-center gap-x-1.5 sm:gap-x-2 gap-y-0.5 flex-wrap min-w-0"
							:style="{ viewTransitionName: `client-name-${client.user_id}` }">
							<!-- Name (click to edit) -->
							<div class="w-fit max-w-full">
								<EditableField
									:model-value="client.name?.trim() || ''"
									:is-mutating="isUpdating"
									inline
									placeholder="Nombre..."
									@save="$emit('update', 'name', ($event || '').trim())">
									<template #display="{ value }">
										<span class="text-text-primary text-xl sm:text-2xl lg:text-3xl font-black tracking-tight leading-tight">{{ value }}</span>
									</template>
								</EditableField>
							</div>
							<!-- Surname (click to edit) -->
							<div class="w-fit max-w-full">
								<EditableField
									:model-value="client.surname?.trim() || ''"
									:is-mutating="isUpdating"
									inline
									placeholder="Apellido..."
									@save="$emit('update', 'surname', ($event || '').trim())">
									<template #display="{ value }">
										<span class="text-text-primary text-xl sm:text-2xl lg:text-3xl font-black tracking-tight leading-tight">{{ value || '—' }}</span>
									</template>
								</EditableField>
							</div>
						</div>

						<div class="text-text-muted flex flex-col gap-0.5 sm:gap-1 text-xs font-semibold">
							<!-- Email (click to edit) -->
							<EditableField
								:model-value="client.email"
								type="email"
								:is-mutating="isUpdating"
								placeholder="Correo..."
								@save="$emit('update', 'email', $event)">
								<template #display="{ value }">
									<span class="flex items-center gap-1.5 truncate max-w-[200px] sm:max-w-none">
										<Mail class="size-3.5 text-primary opacity-80 shrink-0" />
										<span class="truncate">{{ value || 'Sin correo' }}</span>
									</span>
								</template>
							</EditableField>
							<!-- Phone (click to edit) -->
							<EditableField
								:model-value="client.phone"
								type="tel"
								:is-mutating="isUpdating"
								placeholder="Teléfono..."
								@save="$emit('update', 'phone', $event)">
								<template #display="{ value }">
									<span class="flex items-center gap-1.5">
										<Phone class="size-3.5 text-primary opacity-80 shrink-0" />
										<span>{{ value || 'Sin teléfono' }}</span>
									</span>
								</template>
							</EditableField>
							<div class="flex items-center gap-2 sm:gap-3 text-[11px] font-medium opacity-70 flex-wrap pt-0.5">
								<span>Registrado: {{ new Date(client.created_at || '').toLocaleDateString() }}</span>
								<span v-if="client.city" class="opacity-60">• {{ client.city }}, {{ client.country || 'España' }}</span>
								<span v-if="client.document_number" class="opacity-60">• Doc: {{ client.document_number }}</span>
							</div>
						</div>
					</div>
				</div>

				<!-- Mobile Actions (kebab menu) in header flow -->
				<div class="lg:hidden shrink-0 self-start">
					<div class="dropdown dropdown-end relative z-50">
						<button
							tabindex="0"
							type="button"
							class="btn btn-ghost btn-circle btn-sm border border-border-default bg-bg-muted/40 hover:bg-bg-muted active:scale-95"
							aria-haspopup="menu"
							:aria-label="$t('users.table.actions')"
						>
							<MoreVertical class="size-4" />
						</button>
						<ul
							tabindex="0"
							class="dropdown-content menu bg-bg-card/95 backdrop-blur-2xl border border-border-default z-50 mt-2 w-60 rounded-2xl p-1.5 shadow-2xl space-y-1"
						>
							<li>
								<a class="py-2.5 font-bold rounded-xl active:bg-primary" @click="$emit('new-booking'); blurActiveElement()">
									<CalendarPlus class="text-primary mr-2 size-4" />
									Nueva Cita
								</a>
							</li>
							<li class="border-t border-border-subtle pt-1">
								<a class="py-2.5 font-bold rounded-xl active:bg-primary" @click="$emit('add-consent'); blurActiveElement()">
									<FileSignature class="text-success mr-2 size-4" />
									{{ $t('catalog.clients.profile.compliance.consents') }}
								</a>
							</li>
							<li>
								<a class="py-2.5 font-bold rounded-xl active:bg-primary" @click="$emit('add-questionnaire'); blurActiveElement()">
									<FileText class="text-info mr-2 size-4" />
									{{ $t('catalog.clients.profile.compliance.questionnaires') }}
								</a>
							</li>
							<li class="border-t border-border-subtle pt-1">
								<a class="py-2.5 font-bold text-error rounded-xl hover:bg-error/10 active:bg-error" @click="$emit('add-revoke'); blurActiveElement()">
									<ShieldOff class="mr-2 size-4" />
									{{ $t('catalog.clients.profile.compliance.revocations') }}
								</a>
							</li>
						</ul>
					</div>
				</div>

			</div>

			<!-- 2. Commitment Level Stat Card (0 - 100) -->
			<div class="stats overflow-visible bg-bg-muted/30 backdrop-blur-md border border-border-default/80 shadow-xs rounded-2xl p-2 w-full lg:w-auto lg:min-w-85 shrink-0">
				<div class="stat overflow-visible p-3 sm:p-3.5 flex items-center justify-between gap-3 sm:gap-4">
					<div class="space-y-1 min-w-0">
						<div class="stat-title text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-text-muted">
							<Sparkles class="size-3.5 text-amber-500 shrink-0" />
							<span class="truncate">Frecuencia & Compromiso</span>
							<div class="tooltip tooltip-left z-50 shrink-0" data-tip="Índice de 0 a 100 calculado a partir de la frecuencia de visitas, total consumido y estado de cumplimientos legales.">
								<AlertCircle class="size-3.5 text-text-muted/60 cursor-help" />
							</div>
						</div>
						<div class="stat-value text-2xl sm:text-3xl font-black text-text-primary flex items-baseline gap-1 tabular-nums">
							<span>{{ engagementScore }}</span>
							<span class="text-xs font-bold text-text-muted">/100</span>
						</div>
						<div class="stat-desc">
							<span 
								class="badge badge-sm font-black text-[10px] uppercase border-none px-2 py-0.5 shadow-xs"
								:class="getTierBadgeStyle"
							>
								Nivel {{ engagementTierLabel }}
							</span>
						</div>
					</div>

					<!-- Radial Progress -->
					<div 
						class="radial-progress text-primary font-black text-xs shrink-0 shadow-xs" 
						:style="`--value:${engagementScore}; --size:3.5rem; --thickness: 5px;`" 
						role="progressbar"
					>
						{{ engagementScore }}%
					</div>
				</div>
			</div>

			<!-- 3. Desktop Actions (kebab menu) -->
			<div class="hidden lg:flex items-center gap-3 shrink-0 self-center">
				<div class="dropdown dropdown-end relative z-50">
					<button
						tabindex="0"
						type="button"
						class="btn btn-ghost btn-circle border border-border-default bg-bg-muted/40 hover:bg-bg-muted transition-transform active:scale-95"
						aria-haspopup="menu"
						:aria-label="$t('users.table.actions')"
					>
						<MoreVertical class="size-5" />
					</button>
					<ul
						tabindex="0"
						class="dropdown-content menu bg-bg-card/95 backdrop-blur-xl border border-border-default z-50 mt-2 w-64 rounded-2xl p-2 shadow-2xl space-y-1"
					>
						<li>
							<a class="py-3 font-bold rounded-xl active:bg-primary" @click="$emit('new-booking'); blurActiveElement()">
								<CalendarPlus class="text-primary mr-2 size-4" />
								Nueva Cita
							</a>
						</li>
						<li class="border-t border-border-subtle pt-1">
							<a class="py-3 font-bold rounded-xl active:bg-primary" @click="$emit('add-consent'); blurActiveElement()">
								<FileSignature class="text-success mr-2 size-4" />
								{{ $t('catalog.clients.profile.compliance.consents') }}
							</a>
						</li>
						<li>
							<a class="py-3 font-bold rounded-xl active:bg-primary" @click="$emit('add-questionnaire'); blurActiveElement()">
								<FileText class="text-info mr-2 size-4" />
								{{ $t('catalog.clients.profile.compliance.questionnaires') }}
							</a>
						</li>
						<li class="border-t border-border-subtle pt-1">
							<a class="py-3 font-bold text-error rounded-xl hover:bg-error/10 active:bg-error" @click="$emit('add-revoke'); blurActiveElement()">
								<ShieldOff class="mr-2 size-4" />
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
