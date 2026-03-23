<script setup lang="ts">
	import { ref, computed } from 'vue'
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
	} from 'lucide-vue-next'
	import EditableField from '~/components/shared/EditableField.vue'
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

		// Use FileReader to create data URL for cropper
		const reader = new FileReader()
		reader.onload = e => {
			selectedImageSrc.value = e.target?.result as string
			showCropper.value = true
		}
		reader.readAsDataURL(file)

		// reset input so the same file can be selected again
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

			const response = await $fetch<{ url: string }>('/api/multimedia/upload', {
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

	// Calculated Stats
	const totalBookings = computed(() => props.client.client_bookings?.length || 0)
	const totalSpent = computed(() => {
		return props.client.debts?.reduce((acc: number, d: any) => acc + d.amount, 0) || 0
	})

	const getStatusClass = (status: string) => (status === 'ON' ? 'border-success' : 'border-error')
	const getStatusBadge = (status: string) => (status === 'ON' ? 'badge-success' : 'badge-error')
</script>

<template>
	<div class="glass-header relative z-30 overflow-visible rounded-3xl p-6 shadow-sm lg:p-8 3xl:p-12 transition-all duration-500">
		<!-- Decorative background elements wrapper to prevent x-overflow -->
		<div class="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-3xl">
			<div class="bg-primary/5 absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl"></div>
			<div class="bg-secondary/5 absolute -bottom-24 -left-24 h-64 w-64 rounded-full blur-3xl"></div>
		</div>

			<!-- Stats/Score & Actions Row -->
			<div class="flex w-full flex-col justify-between gap-6 md:flex-row md:items-center xl:flex-nowrap">
				<!-- 1. Identity -->
				<div class="flex items-center gap-6">
					<div class="relative shrink-0">
						<div
							class="group relative aspect-square w-24 cursor-pointer overflow-hidden rounded-full border-4 shadow-md transition-transform hover:scale-105"
							:class="getStatusClass(client.status)"
							@click="triggerAvatarUpload">
							<div v-if="isUploadingAvatar" class="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 text-white">
								<span class="loading loading-spinner"></span>
							</div>
							<div class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
								<Camera class="mb-1 h-8 w-8" />
								<span class="text-[9px] font-bold tracking-wider uppercase">{{ $t('common.edit') }}</span>
							</div>
							<img v-if="displayAvatar && !avatarError" :src="displayAvatar" class="h-full w-full object-cover" @error="handleAvatarError" />
							<div v-else class="bg-bg-muted text-text-muted flex h-full w-full items-center justify-center text-3xl font-bold">
								{{ client.name.charAt(0) }}{{ client.surname?.charAt(0) || '' }}
							</div>
						</div>
						<div class="absolute right-1 bottom-1 h-6 w-6 rounded-full border-4 border-white shadow-sm" :class="client.status === 'ON' ? 'bg-success' : 'bg-error'"></div>
					</div>

					<div class="space-y-1">
						<div class="flex items-center gap-2">
							<h1 class="text-text-primary text-3xl font-bold tracking-tight">{{ client.name }} {{ client.surname }}</h1>
							<div 
							class="badge badge-sm font-black uppercase text-[10px]"
							:class="client.status === 'ON' ? 'badge-success' : 'badge-error'"
						>
							{{ client.status === 'ON' ? $t('users.constants.status.ON') : $t('users.constants.status.OFF') }}
						</div>
						</div>
						<div class="text-text-muted flex flex-col gap-0.5 text-xs font-bold leading-relaxed">
							<span>{{ client.email }} • {{ client.phone }}</span>
							<span>{{ $t('catalog.clients.profile.kpis.registered') }}: {{ new Date(client.created_at).toLocaleDateString() }}</span>
						</div>
					</div>
				</div>

				<!-- 2. Engagement Score Card -->
				<div class="bg-white/10 border-white/20 backdrop-blur-md rounded-3xl border p-4 flex items-center gap-5 shadow-xl min-w-[320px]">
					<div class="relative flex items-center justify-center">
						<div class="w-12 h-12 rounded-full bg-success animate-pulse blur-sm absolute opacity-30"></div>
						<div class="w-10 h-10 rounded-full bg-success flex items-center justify-center border-2 border-white/50 shadow-[0_0_15px_rgba(34,197,94,0.5)]">
							<div class="w-4 h-4 rounded-full bg-white/40"></div>
						</div>
					</div>
					<div class="flex-1">
						<div class="flex items-center gap-2 mb-0.5">
							<span class="text-text-primary text-sm font-bold opacity-70">{{ $t('catalog.clients.profile.kpis.engagement') }}</span>
							<AlertCircle class="w-3.5 h-3.5 text-text-muted cursor-help" />
						</div>
						<div class="flex items-baseline gap-2">
							<span class="text-text-primary text-4xl font-black italic">92</span>
							<span class="text-text-muted text-xl font-bold">/100</span>
							<span class="badge bg-success/10 text-success border-none font-black text-[10px] ml-2 uppercase">{{ $t('catalog.clients.profile.kpis.loyaltyHigh') }}</span>
						</div>
						<p class="text-text-muted text-[10px] font-bold mt-1 max-w-[200px] leading-tight italic">{{ $t('catalog.clients.profile.kpis.vipStatus') }}</p>
					</div>
				</div>

				<!-- 3. Actions -->
				<div class="flex items-center gap-3">
					<button @click="$emit('new-booking')" class="btn bg-[#5D5CDE] hover:bg-[#4B4ABF] text-white border-none rounded-xl px-6 font-bold h-12">
						{{ $t('nav.agenda') === 'nav.agenda' ? 'Nueva Cita' : $t('nav.agenda') }}
					</button>
					<div class="dropdown dropdown-end">
						<div tabindex="0" role="button" class="btn btn-ghost bg-bg-muted/50 hover:bg-bg-muted h-12 rounded-xl px-6 font-bold">
							{{ $t('users.table.actions') }} <ChevronDown class="ml-1 w-4 h-4 opacity-70" />
						</div>
						<ul tabindex="0" class="dropdown-content menu bg-bg-card border-border-subtle z-50 mt-2 w-56 rounded-2xl border p-2 shadow-xl">
							<li><a @click="$emit('add-consent')" class="py-3 font-bold"><FileSignature class="text-success mr-2 h-4 w-4" /> {{ $t('catalog.clients.profile.compliance.consents') }}</a></li>
							<li><a @click="$emit('add-questionnaire')" class="py-3 font-bold"><FileText class="text-info mr-2 h-4 w-4" /> {{ $t('catalog.clients.profile.compliance.questionnaires') }}</a></li>
							<li><a @click="$emit('add-revoke')" class="hover:bg-bg-muted text-error py-3 font-bold"><ShieldOff class="mr-2 h-4 w-4" /> {{ $t('catalog.clients.profile.compliance.revocations') }}</a></li>
						</ul>
					</div>
				</div>
			</div>

		<ImageCropperModal v-model="showCropper" :image-src="selectedImageSrc" @crop="uploadCroppedImage" />
	</div>
</template>

<style scoped>
	.glass-header {
		border: 1px solid rgba(255, 255, 255, 0.3);
	}
</style>
