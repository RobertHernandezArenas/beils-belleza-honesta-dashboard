<script setup lang="ts">
import { ref, reactive, watch, nextTick, computed } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import {
	ShieldCheck, X, AlertCircle, Save, CheckSquare, Ban, FileSignature,
	Printer, MessageCircle, Mail
} from 'lucide-vue-next'
import { useModalAnimation } from '~/composables/useModalAnimation'
import SignaturePad from '~/components/shared/SignaturePad.vue'
import AuthorizationUploader from '~/components/shared/AuthorizationUploader.vue'
import FilePreviewModal from '~/components/shared/FilePreviewModal.vue'
import type { FetchError, Consent, ClientProfile } from '~~/shared/types/domain'

const props = defineProps<{
	modelValue: boolean
	client: ClientProfile
	existingConsent?: Consent | null
}>()

const emit = defineEmits(['update:modelValue', 'close', 'success', 'open-dossier'])
const queryClient = useQueryClient()

const dialogRef = ref<HTMLDialogElement | null>(null)
const signaturePadRef = ref<InstanceType<typeof SignaturePad> | null>(null)
const { animateOpen, animateClose } = useModalAnimation()

const isRevokeMode = ref(false)
const revokeReason = ref('')
const error = ref('')

const isMinor = ref(false)
const guardianName = ref('')
const guardianDni = ref('')
const authorizationFileUrl = ref<string | null>(null)

// Preview modal for authorization document
const previewUrl = ref<string | null>(null)
const isPreviewModalOpen = ref(false)

const officialObjectives = [
	'Reducción de arrugas y líneas de expresión',
	'Mejora del aspecto de bolsas y ojeras',
	'Efecto lifting antiedad',
	'Redefinición del óvalo facial',
	'Modelación de la silueta',
	'Anticelulitis, antiestrías, antiflacidez',
	'Acción tensora del pecho',
	'Bienestar general',
	'Tratamiento capilar',
	'Formación'
]

const form = reactive({
	selectedObjectives: [] as string[],
	professionalName: 'Especialista Beils',
	signedDate: new Date().toISOString().split('T')[0],
	notes: ''
})

const isSigned = computed(() => props.existingConsent?.status === 'SIGNED')
const isRevoked = computed(() => props.existingConsent?.status === 'REVOKED')

watch(
	() => props.modelValue,
	newVal => {
		if (newVal) {
			error.value = ''
			isRevokeMode.value = false
			revokeReason.value = ''
			form.signedDate = props.existingConsent?.signed_date
				? new Date(props.existingConsent.signed_date).toISOString().split('T')[0]
				: new Date().toISOString().split('T')[0]
			form.notes = props.existingConsent?.notes || ''

			// Parse stored objectives
			if (props.existingConsent?.notes) {
				try {
					const parsed = JSON.parse(props.existingConsent.notes)
					if (Array.isArray(parsed.objectives)) {
						form.selectedObjectives = parsed.objectives
					}
					if (parsed.isMinor) {
						isMinor.value = true
						guardianName.value = parsed.guardianName || ''
						guardianDni.value = parsed.guardianDni || ''
						authorizationFileUrl.value = parsed.authorizationFileUrl || null
					} else {
						isMinor.value = false
						authorizationFileUrl.value = null
					}
					if (parsed.professional) form.professionalName = parsed.professional
				} catch {
					isMinor.value = false
				}
			} else {
				form.selectedObjectives = ['Efecto lifting antiedad', 'Redefinición del óvalo facial']
			}

			nextTick(() => {
				animateOpen(dialogRef.value, { staggerChildren: true })
			})
		} else if (dialogRef.value?.open) {
			animateClose(dialogRef.value)
		}
	}
)

const handleClose = () => {
	emit('update:modelValue', false)
	emit('close')
}

const handlePreviewAuth = (url: string) => {
	previewUrl.value = url
	isPreviewModalOpen.value = true
}

const toggleObjective = (obj: string) => {
	const idx = form.selectedObjectives.indexOf(obj)
	if (idx > -1) {
		form.selectedObjectives.splice(idx, 1)
	} else {
		form.selectedObjectives.push(obj)
	}
}

// 1. Guardar o firmar consentimiento Indiba
const { mutate: saveConsent, isPending: isSaving } = useMutation({
	mutationFn: async (signNow: boolean = false) => {
		const signatureData = signaturePadRef.value?.getSignature() || props.existingConsent?.signature_data || null

		if (signNow && !signatureData) {
			throw new Error('Por favor, firme en el recuadro antes de confirmar el consentimiento.')
		}

		if (isMinor.value && (!guardianName.value?.trim() || !guardianDni.value?.trim())) {
			throw new Error('Para clientes menores de edad, es obligatorio indicar nombre y DNI del tutor/a legal.')
		}

		const payload = {
			user_id: props.client.user_id,
			consent_type: 'INDIBA',
			status: signNow ? 'SIGNED' : (props.existingConsent?.status || 'UNSIGNED'),
			signed_date: form.signedDate,
			signature_data: signatureData,
			notes: JSON.stringify({
				treatment: 'INDIBA_DEEP_BEAUTY_448KHZ',
				objectives: form.selectedObjectives,
				professional: form.professionalName,
				isMinor: isMinor.value,
				guardianName: isMinor.value ? guardianName.value : undefined,
				guardianDni: isMinor.value ? guardianDni.value : undefined,
				authorizationFileUrl: isMinor.value ? authorizationFileUrl.value : undefined,
				updated_at: new Date().toISOString()
			})
		}

		return await $fetch('/api/clients/consents', {
			method: 'POST',
			body: payload
		})
	},
	onSuccess: () => {
		queryClient.invalidateQueries({ queryKey: ['client', props.client.user_id] })
		emit('success')
		handleClose()
	},
	onError: (err: any) => {
		error.value = err?.data?.statusMessage || err.message || 'Error al guardar consentimiento'
	}
})

// 2. Revocar consentimiento formalmente (Punto 5 del PDF)
const { mutate: revokeConsent, isPending: isRevoking } = useMutation({
	mutationFn: async () => {
		await $fetch('/api/clients/consents', {
			method: 'POST',
			body: {
				user_id: props.client.user_id,
				consent_type: 'INDIBA',
				status: 'REVOKED',
				signed_date: new Date().toISOString().split('T')[0],
				notes: JSON.stringify({
					status: 'REVOKED',
					reason: revokeReason.value || 'Revocación voluntaria',
					revoked_at: new Date().toISOString()
				})
			}
		})

		return await $fetch('/api/clients/revokes', {
			method: 'POST',
			body: {
				user_id: props.client.user_id,
				reason: `Revocación formal consentimiento INDIBA: ${revokeReason.value || 'A petición del cliente'}`,
				date_revoked: new Date().toISOString()
			}
		})
	},
	onSuccess: () => {
		queryClient.invalidateQueries({ queryKey: ['client', props.client.user_id] })
		emit('success')
		handleClose()
	},
	onError: (err: FetchError) => {
		error.value = err.data?.statusMessage || 'Error al revocar el consentimiento'
	}
})

// Envíos rápidos
const handleWhatsApp = () => {
	const phone = props.client.phone?.replace(/[^0-9]/g, '') || ''
	const clientName = `${props.client.name} ${props.client.surname || ''}`.trim()
	const message = `Hola ${clientName}, te adjuntamos la confirmación de tu consentimiento para Indiba Deep Beauty en Beils Belleza Honesta.`
	const encoded = encodeURIComponent(message)
	const url = phone
		? `https://api.whatsapp.com/send?phone=${phone}&text=${encoded}`
		: `https://api.whatsapp.com/send?text=${encoded}`
	window.open(url, '_blank')
}

const handleEmail = () => {
	const email = props.client.email || ''
	const clientName = `${props.client.name} ${props.client.surname || ''}`.trim()
	const subject = encodeURIComponent('Consentimiento Informado: Indiba Deep Beauty - Beils')
	const body = encodeURIComponent(
		`Estimado/a ${clientName},\n\nLe confirmamos el registro y firma de su consentimiento para el tratamiento de radiofrecuencia Indiba Deep Beauty en Beils Belleza Honesta.\n\nAtentamente,\nBeils Belleza Honesta`
	)
	window.location.href = `mailto:${email}?subject=${subject}&body=${body}`
}
</script>

<template>
	<dialog ref="dialogRef" class="modal modal-bottom sm:modal-middle z-[6000]">
		<div class="modal-box bg-bg-card border border-border-default/80 max-w-3xl p-0 rounded-3xl shadow-2xl flex flex-col max-h-[94dvh] overflow-hidden">
			
			<!-- HEADER FIJO -->
			<div class="flex items-center justify-between p-4 sm:p-6 border-b border-border-subtle bg-bg-card shrink-0">
				<div class="flex items-center gap-3">
					<div class="p-2.5 bg-primary/15 text-primary rounded-2xl">
						<ShieldCheck class="w-6 h-6" />
					</div>
					<div>
						<h3 class="text-text-primary text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
							Consentimiento Informado: Indiba® Deep Beauty
							<span
								class="badge badge-sm font-black uppercase text-[10px]"
								:class="isRevoked ? 'badge-error' : (isSigned ? 'badge-success' : 'badge-warning')"
							>
								{{ isRevoked ? 'REVOCADO' : (isSigned ? 'FIRMADO' : 'PENDIENTE') }}
							</span>
						</h3>
						<p class="text-text-muted text-xs font-semibold">Radiofrecuencia Monopolar Capacitiva/Resistiva 448 kHz</p>
					</div>
				</div>
				<button class="btn btn-ghost btn-circle btn-sm text-text-muted hover:text-text-primary" @click="handleClose">
					<X class="w-5 h-5" />
				</button>
			</div>

			<!-- CUERPO CON SCROLL INDEPENDIENTE -->
			<div class="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
				
				<!-- ERROR ALERT -->
				<div v-if="error" class="alert alert-error text-xs rounded-2xl flex items-center gap-2">
					<AlertCircle class="w-4 h-4 shrink-0" />
					<span>{{ error }}</span>
				</div>

				<!-- BARRA DE ACCIÓN RÁPIDA: IMPRIMIR, WHATSAPP, EMAIL -->
				<div class="p-3 bg-bg-muted/20 border border-border-subtle rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
					<span class="font-bold text-text-primary text-[11px] uppercase tracking-wider">
						Opciones de Expediente:
					</span>
					<div class="flex items-center gap-1.5">
						<button
							type="button"
							class="btn btn-ghost btn-xs text-text-primary hover:bg-bg-muted gap-1 font-bold rounded-lg"
							@click="$emit('open-dossier', 'INDIBA')"
						>
							<Printer class="w-3.5 h-3.5 text-primary" />
							Imprimir / PDF
						</button>
						<button
							type="button"
							class="btn btn-ghost btn-xs text-success hover:bg-success/10 gap-1 font-bold rounded-lg"
							@click="handleWhatsApp"
						>
							<MessageCircle class="w-3.5 h-3.5" />
							WhatsApp
						</button>
						<button
							type="button"
							class="btn btn-ghost btn-xs text-text-muted hover:text-text-primary gap-1 font-bold rounded-lg"
							@click="handleEmail"
						>
							<Mail class="w-3.5 h-3.5" />
							Email
						</button>
					</div>
				</div>

				<!-- VISTA DE REVOCACIÓN -->
				<div v-if="isRevokeMode" class="p-5 bg-error/10 border border-error/30 rounded-2xl space-y-4">
					<div class="flex items-center gap-2 text-error font-black text-sm uppercase">
						<Ban class="w-5 h-5" />
						<span>Revocación Formal del Consentimiento (Punto 5 del Documento)</span>
					</div>
					<p class="text-xs text-text-muted">
						El cliente declara: <em>"REVOCO el consentimiento prestado en la fecha y no deseo proseguir con el tratamiento, que doy con esta fecha por finalizado."</em>
					</p>
					<div class="space-y-1.5">
						<label class="text-[11px] font-bold text-text-primary uppercase">Motivo de la Revocación (opcional):</label>
						<textarea
							v-model="revokeReason"
							rows="2"
							placeholder="Ej: Decisión personal, mudanza, finalización de ciclo..."
							class="textarea textarea-bordered w-full rounded-xl bg-bg-card text-xs font-medium"
						></textarea>
					</div>
					<div class="flex justify-end gap-2 pt-2">
						<button type="button" class="btn btn-ghost btn-xs font-bold" @click="isRevokeMode = false">
							Cancelar
						</button>
						<button
							type="button"
							class="btn btn-error btn-xs rounded-xl font-bold uppercase tracking-wider"
							:disabled="isRevoking"
							@click="revokeConsent()"
						>
							{{ isRevoking ? 'Revocando...' : 'Confirmar Revocación Definitiva' }}
						</button>
					</div>
				</div>

				<!-- CUERPO PRINCIPAL -->
				<template v-else>
					<!-- 1. DECLARACIÓN Y DATOS DE LA PACIENTE -->
					<div class="p-4 bg-bg-muted/20 border border-border-subtle rounded-2xl space-y-2 text-xs">
						<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-text-primary">
							<span>Paciente: <strong class="font-black">{{ client.name }} {{ client.surname }}</strong></span>
							<span>DNI/NIE: <strong class="font-mono font-bold">{{ client.document_number || 'No especificado' }}</strong></span>
						</div>
						<p class="text-text-muted text-[11px] leading-relaxed pt-1">
							Declaro haber recibido explicaciones claras y comprensibles sobre la tecnología de Radiofrecuencia 448 kHz, sus beneficios de remodelación/lifting y la sensación normal de calor e hipertermia transitoria sin afección tisular.
						</p>
					</div>

					<!-- 2. OBJETIVOS ESTÉTICOS ACORDADOS (Punto 4 del PDF) -->
					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<span class="text-xs font-black uppercase tracking-wider text-text-primary flex items-center gap-1.5">
								<CheckSquare class="w-4 h-4 text-primary" />
								Objetivos del Tratamiento Acordados (Marcar Casilla)
							</span>
							<span class="text-[11px] font-bold text-text-muted">
								{{ form.selectedObjectives.length }} seleccionados
							</span>
						</div>

						<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
							<div
								v-for="obj in officialObjectives"
								:key="obj"
								class="flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all"
								:class="form.selectedObjectives.includes(obj) ? 'bg-primary/10 border-primary/40 text-text-primary font-bold' : 'bg-bg-card border-border-subtle text-text-muted hover:border-primary/20'"
								@click="toggleObjective(obj)"
							>
								<input
									type="checkbox"
									:checked="form.selectedObjectives.includes(obj)"
									class="checkbox checkbox-primary checkbox-xs rounded"
								/>
								<span class="text-xs">{{ obj }}</span>
							</div>
						</div>
					</div>

					<!-- 3. AUTORIZACIÓN PARA MENORES DE EDAD (SI APLICA) -->
					<div class="p-4 bg-bg-muted/20 border border-border-subtle rounded-2xl space-y-4">
						<label class="flex items-center gap-2 cursor-pointer select-none">
							<input
								v-model="isMinor"
								type="checkbox"
								class="checkbox checkbox-primary checkbox-sm rounded-lg"
							/>
							<span class="text-xs font-bold text-text-primary">
								El cliente es menor de edad (requiere autorización de tutor legal)
							</span>
						</label>

						<div v-if="isMinor" class="space-y-4 pt-2 border-t border-border-subtle">
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<div class="space-y-1">
									<label class="text-[11px] font-bold text-text-primary uppercase">Nombre del Tutor/a</label>
									<input
										v-model="guardianName"
										type="text"
										placeholder="Nombre completo del tutor"
										class="input input-bordered input-sm w-full rounded-xl bg-bg-card text-xs font-medium"
									/>
								</div>
								<div class="space-y-1">
									<label class="text-[11px] font-bold text-text-primary uppercase">DNI/NIE del Tutor/a</label>
									<input
										v-model="guardianDni"
										type="text"
										placeholder="DNI o NIE"
										class="input input-bordered input-sm w-full rounded-xl bg-bg-card text-xs font-mono font-medium"
									/>
								</div>
							</div>

							<!-- ZONA DE CARGA DE ARCHIVO DE AUTORIZACIÓN -->
							<AuthorizationUploader
								v-model="authorizationFileUrl"
								title="Adjuntar Documento Firmado de Autorización de Tutor"
								description="Arrastrá o seleccioná el archivo PDF o imagen firmado por el tutor legal."
								:disabled="isSigned"
								@preview="handlePreviewAuth"
							/>
						</div>
					</div>

					<!-- 4. PROFESIONAL Y FECHA -->
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border-subtle">
						<div class="space-y-1.5">
							<label class="text-[11px] font-bold text-text-primary uppercase block">Profesional que Aplica</label>
							<input
								v-model="form.professionalName"
								type="text"
								class="input input-bordered input-sm w-full rounded-xl bg-bg-muted/30 text-xs font-semibold"
							/>
						</div>

						<div class="space-y-1.5">
							<label class="text-[11px] font-bold text-text-primary uppercase block">Fecha de Consentimiento</label>
							<input
								v-model="form.signedDate"
								type="date"
								class="input input-bordered input-sm w-full rounded-xl bg-bg-muted/30 text-xs font-semibold"
							/>
						</div>
					</div>

					<!-- 5. RECUADRO DE FIRMA DIGITAL (CANVAS TABLET/TOUCH/PC) -->
					<div class="p-4 bg-bg-card border border-border-default rounded-2xl space-y-3">
						<SignaturePad
							ref="signaturePadRef"
							:initial-signature="existingConsent?.signature_data"
							:disabled="isSigned"
							:height="170"
						/>
					</div>

					<!-- 6. CLÁUSULA RGPD / LOPD -->
					<div class="p-3 bg-bg-muted/10 border border-border-subtle rounded-xl text-[10px] text-text-muted leading-relaxed">
						<strong>Información de Protección de Datos (RGPD 2016/679 - LOPDGDD 3/2018):</strong>
						Los datos de salud y contacto serán tratados con la exclusiva finalidad de gestionar el tratamiento estético bajo estricta confidencialidad médica y deber de secreto.
					</div>
				</template>

			</div>

			<!-- FOOTER FIJO -->
			<div class="p-4 sm:p-6 border-t border-border-subtle bg-bg-card shrink-0 flex flex-col sm:flex-row justify-between items-center gap-3">
				<div>
					<button
						v-if="isSigned && !isRevokeMode"
						type="button"
						class="btn btn-ghost btn-xs text-error hover:bg-error/10 font-bold uppercase tracking-wider"
						@click="isRevokeMode = true"
					>
						<Ban class="w-3.5 h-3.5 mr-1" />
						Revocar Consentimiento
					</button>
				</div>

				<div class="flex items-center gap-2 w-full sm:w-auto justify-end">
					<button
						type="button"
						class="btn btn-ghost btn-sm rounded-xl font-bold uppercase tracking-wider text-xs"
						@click="handleClose"
					>
						Cerrar
					</button>

					<button
						v-if="!isSigned && !isRevokeMode"
						type="button"
						class="btn btn-success btn-sm rounded-xl font-bold uppercase tracking-wider shadow-sm text-xs flex items-center gap-1.5"
						:disabled="isSaving || form.selectedObjectives.length === 0"
						@click="saveConsent(true)"
					>
						<FileSignature class="w-4 h-4" />
						Firmar Consentimiento
					</button>

					<button
						v-else-if="isSigned && !isRevokeMode"
						type="button"
						class="btn btn-primary btn-sm rounded-xl font-bold uppercase tracking-wider shadow-sm text-xs flex items-center gap-1.5"
						:disabled="isSaving"
						@click="saveConsent(false)"
					>
						<Save class="w-4 h-4" />
						Guardar Cambios
					</button>
				</div>
			</div>

		</div>

		<form method="dialog" class="modal-backdrop" @click="handleClose">
			<button>close</button>
		</form>

		<!-- PREVISUALIZADOR DE ARCHIVO DE AUTORIZACIÓN -->
		<FilePreviewModal
			v-model="isPreviewModalOpen"
			:file-url="previewUrl"
			title="Documento de Autorización de Menor (Tutor/a)"
		/>
	</dialog>
</template>
