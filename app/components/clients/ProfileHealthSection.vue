<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ClientProfile, Questionnaire, Consent, TreatmentZoneDTO, TreatmentType } from '~~/shared/types/domain'
import {
	Activity, Zap, ShieldCheck, AlertCircle, CheckCircle2, Plus, ChevronRight,
	FileText, Sparkles, Trash2, Calendar, ShieldAlert, Ban, CheckSquare,
	Printer, Lock, MessageCircle, Mail
} from 'lucide-vue-next'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import NewTreatmentZoneModal from './NewTreatmentZoneModal.vue'
import NewTreatmentSessionModal from './NewTreatmentSessionModal.vue'
import AnamnesisQuestionsModal from './AnamnesisQuestionsModal.vue'
import IndibaAnamnesisModal from './IndibaAnamnesisModal.vue'
import IndibaConsentModal from './IndibaConsentModal.vue'
import LaserConsentModal from './LaserConsentModal.vue'
import LgpdConsentModal from './LgpdConsentModal.vue'
import ClinicalDossierModal from './ClinicalDossierModal.vue'

const props = defineProps<{
	client: ClientProfile
}>()

const emit = defineEmits(['add-consent', 'add-questionnaire'])
const queryClient = useQueryClient()

// Active Treatment Tab: LASER_SHR | INDIBA
const activeTreatment = ref<TreatmentType>('LASER_SHR')

// Selected Zone for New Session
const selectedZoneForSession = ref<TreatmentZoneDTO | null>(null)

// Modal States
const isNewZoneModalOpen = ref(false)
const isNewSessionModalOpen = ref(false)
const isAnamnesisModalOpen = ref(false)
const isLaserConsentModalOpen = ref(false)
const isIndibaAnamnesisModalOpen = ref(false)
const isIndibaConsentModalOpen = ref(false)
const isLgpdConsentModalOpen = ref(false)
const isDossierModalOpen = ref(false)
const dossierTreatmentType = ref<TreatmentType | 'LGPD'>('LASER_SHR')

// 1. Cuestionarios y Consentimientos vinculados
const laserQuestionnaire = computed(() => {
	if (!props.client.questionnaires) return null
	return (props.client.questionnaires || []).find((q: Questionnaire) =>
		q.title?.toLowerCase().includes('shr') ||
		q.title?.toLowerCase().includes('láser') ||
		q.title?.toLowerCase().includes('laser') ||
		q.title?.toLowerCase().includes('depilación')
	)
})

const indibaQuestionnaire = computed(() => {
	if (!props.client.questionnaires) return null
	return (props.client.questionnaires || []).find((q: Questionnaire) =>
		q.title?.toLowerCase().includes('indiba') ||
		q.title?.toLowerCase().includes('radiofrecuencia')
	)
})

const currentQuestionnaire = computed(() => {
	return activeTreatment.value === 'LASER_SHR' ? laserQuestionnaire.value : indibaQuestionnaire.value
})

const questionnaireData = computed(() => {
	if (!currentQuestionnaire.value?.data) return null
	try {
		return typeof currentQuestionnaire.value.data === 'string'
			? JSON.parse(currentQuestionnaire.value.data)
			: currentQuestionnaire.value.data
	} catch {
		return null
	}
})

// Consentimientos específicos
const laserConsent = computed(() => {
	if (!props.client.consents) return null
	return (props.client.consents || []).find((c: Consent) =>
		c.consent_type === 'LASER_INNOVA_PRO_SHR' || c.consent_type?.toLowerCase().includes('laser')
	)
})

const indibaConsent = computed(() => {
	if (!props.client.consents) return null
	return (props.client.consents || []).find((c: Consent) =>
		c.consent_type === 'INDIBA' || c.consent_type?.toLowerCase().includes('indiba')
	)
})

const lgpdConsent = computed(() => {
	if (!props.client.consents) return null
	return (props.client.consents || []).find((c: Consent) =>
		c.consent_type === 'LGPD' || c.consent_type?.toLowerCase().includes('lgpd') || c.consent_type?.toLowerCase().includes('rgpd')
	)
})

const currentConsent = computed(() => {
	return activeTreatment.value === 'LASER_SHR' ? laserConsent.value : indibaConsent.value
})

const indibaConsentData = computed(() => {
	if (!indibaConsent.value?.notes) return null
	try {
		return JSON.parse(indibaConsent.value.notes)
	} catch {
		return null
	}
})

// 2. Zonas de tratamiento activas filtradas por tipo de tratamiento
const activeZones = computed<TreatmentZoneDTO[]>(() => {
	if (!props.client.treatment_zones) return []
	return props.client.treatment_zones.filter(z => z.treatment_type === activeTreatment.value)
})

// Acciones para modales
const openNewZoneModal = () => {
	isNewZoneModalOpen.value = true
}

const openNewSessionModal = (zone: TreatmentZoneDTO) => {
	selectedZoneForSession.value = zone
	isNewSessionModalOpen.value = true
}

const handleOpenAnamnesis = () => {
	if (activeTreatment.value === 'LASER_SHR') {
		isAnamnesisModalOpen.value = true
	} else {
		isIndibaAnamnesisModalOpen.value = true
	}
}

const handleOpenConsent = () => {
	if (activeTreatment.value === 'LASER_SHR') {
		isLaserConsentModalOpen.value = true
	} else {
		isIndibaConsentModalOpen.value = true
	}
}

const openDossier = (type?: TreatmentType | 'LGPD') => {
	dossierTreatmentType.value = type || activeTreatment.value
	isDossierModalOpen.value = true
}

// Eliminar sesión
const { mutate: deleteSession } = useMutation({
	mutationFn: async (sessionId: string) => {
		return await $fetch(`/api/treatments/sessions/${sessionId}`, { method: 'DELETE' })
	},
	onSuccess: () => {
		queryClient.invalidateQueries({ queryKey: ['client', props.client.user_id] })
	}
})

// Eliminar zona
const { mutate: deleteZone } = useMutation({
	mutationFn: async (zoneId: string) => {
		return await $fetch(`/api/treatments/zones/${zoneId}`, { method: 'DELETE' })
	},
	onSuccess: () => {
		queryClient.invalidateQueries({ queryKey: ['client', props.client.user_id] })
	}
})
</script>

<template>
	<div class="space-y-8 transition-all duration-300">
		
		<!-- HEADER & SELECTOR DE TECNOLOGÍA -->
		<div class="card bg-bg-card border border-border-default/80 shadow-md rounded-3xl p-5 sm:p-6 lg:p-8 space-y-6">
			
			<div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border-subtle pb-6">
				<div class="flex items-center gap-3.5">
					<div class="p-3 sm:p-3.5 bg-primary/15 text-primary rounded-2xl shrink-0">
						<Activity class="size-6 sm:w-7 sm:h-7" />
					</div>
					<div>
						<h3 class="text-text-primary text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
							Ficha Técnica & Cuaderno de Tratamientos
							<div class="tooltip tooltip-right z-50" data-tip="Seguimiento clínico, diagnóstico dérmico, consentimiento y parámetros sesión a sesión para aparatología.">
								<AlertCircle class="size-4 text-text-muted/60 cursor-help" />
							</div>
						</h3>
						<p class="text-text-muted text-xs font-semibold">
							Documentación clínica individualizada para Innova Pro SHR, Indiba® Deep Beauty y RGPD
						</p>
					</div>
				</div>

				<div class="flex flex-wrap items-center gap-3">
					<!-- BOTÓN DE IMPRESIÓN COMPLETA -->
					<button
						type="button"
						class="btn btn-outline btn-sm rounded-xl font-bold uppercase tracking-wider text-xs gap-1.5 shadow-xs"
						@click="openDossier()"
					>
						<Printer class="size-4 text-primary" />
						Imprimir Expediente
					</button>

					<!-- TABS SWITCHER -->
					<div class="join bg-bg-muted/40 p-1 rounded-2xl border border-border-subtle self-start lg:self-auto">
						<button
							type="button"
							class="join-item btn btn-sm rounded-xl font-black text-xs gap-2 transition-all"
							:class="activeTreatment === 'LASER_SHR' ? 'btn-primary shadow-sm' : 'btn-ghost text-text-muted hover:text-text-primary'"
							@click="activeTreatment = 'LASER_SHR'"
						>
							<ShieldCheck class="size-4" />
							Láser SHR
						</button>

						<button
							type="button"
							class="join-item btn btn-sm rounded-xl font-black text-xs gap-2 transition-all"
							:class="activeTreatment === 'INDIBA' ? 'btn-primary shadow-sm' : 'btn-ghost text-text-muted hover:text-text-primary'"
							@click="activeTreatment = 'INDIBA'"
						>
							<Zap class="size-4 text-amber-500" />
							Indiba (448 kHz)
						</button>
					</div>
				</div>
			</div>

			<!-- BLOQUE 1: COMPLIANCE LEGAL & SEGURIDAD MÉDICA (3 COLUMNAS RESPONSIVE) -->
			<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
				
				<!-- 1. Cuestionario de Salud / Anamnesis -->
				<div class="p-5 bg-bg-muted/20 border border-border-subtle rounded-3xl space-y-4 flex flex-col justify-between">
					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2.5">
								<div class="p-2 rounded-xl" :class="activeTreatment === 'LASER_SHR' ? 'bg-blue-500/15 text-blue-600' : 'bg-amber-500/15 text-amber-600'">
									<FileText class="size-5" />
								</div>
								<div>
									<h4 class="text-xs font-black uppercase tracking-wider text-text-primary">
										{{ activeTreatment === 'LASER_SHR' ? 'Cuestionario SHR (20 Puntos)' : 'Checklist Indiba (9 Puntos)' }}
									</h4>
									<span class="text-[11px] text-text-muted font-medium">
										{{ activeTreatment === 'LASER_SHR' ? 'Fotosensibilidad y salud' : 'Contraindicaciones y precauciones' }}
									</span>
								</div>
							</div>

							<span
								class="badge badge-sm font-black uppercase px-2.5 py-1 text-[10px]"
								:class="currentQuestionnaire ? 'badge-success text-success-content' : 'badge-warning text-warning-content'"
							>
								{{ currentQuestionnaire ? 'COMPLETADO' : 'PENDIENTE' }}
							</span>
						</div>

						<!-- Alertas médicas -->
						<div v-if="activeTreatment === 'LASER_SHR' && questionnaireData?.hasCriticalContraindications" class="alert alert-error text-xs p-3 rounded-2xl flex items-center gap-2 font-bold">
							<ShieldAlert class="size-4 shrink-0" />
							<span>Contraindicación: Justificante obligatorio.</span>
						</div>
						<div v-else-if="activeTreatment === 'INDIBA' && questionnaireData?.hasAbsoluteContraindication" class="alert alert-error text-xs p-3 rounded-2xl flex items-center gap-2 font-bold">
							<ShieldAlert class="size-4 shrink-0" />
							<span>TRATAMIENTO CONTRAINDICADO (NO APTO).</span>
						</div>
						<div v-else class="text-xs text-text-muted space-y-1">
							<div class="flex justify-between py-1 border-b border-border-subtle/50">
								<span class="font-medium">Estado de aptitud:</span>
								<strong class="text-text-primary">
									{{ activeTreatment === 'LASER_SHR' ? (questionnaireData?.healthState || 'No evaluado') : (questionnaireData?.status || 'No evaluado') }}
								</strong>
							</div>
							<div v-if="activeTreatment === 'LASER_SHR'" class="flex justify-between py-1 border-b border-border-subtle/50">
								<span class="font-medium">Última exposición solar:</span>
								<strong class="text-text-primary">{{ questionnaireData?.lastSunExposure || 'No registrada' }}</strong>
							</div>
							<div v-else class="flex justify-between py-1 border-b border-border-subtle/50">
								<span class="font-medium">Evaluación oncológica:</span>
								<strong class="text-text-primary capitalize">{{ questionnaireData?.oncologyState || 'Sin registrar' }}</strong>
							</div>
						</div>
					</div>

					<button
						type="button"
						class="btn btn-outline btn-sm w-full rounded-xl font-bold uppercase tracking-wider text-xs"
						@click="handleOpenAnamnesis"
					>
						{{ currentQuestionnaire ? 'Revisar Cuestionario' : 'Rellenar Cuestionario' }}
					</button>
				</div>

				<!-- 2. Consentimiento Informado del Tratamiento Activo -->
				<div class="p-5 bg-bg-muted/20 border border-border-subtle rounded-3xl space-y-4 flex flex-col justify-between">
					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2.5">
								<div class="p-2 rounded-xl bg-emerald-500/15 text-emerald-600">
									<ShieldCheck class="size-5" />
								</div>
								<div>
									<h4 class="text-xs font-black uppercase tracking-wider text-text-primary">
										Consentimiento: {{ activeTreatment === 'LASER_SHR' ? 'Láser SHR' : 'Indiba' }}
									</h4>
									<span class="text-[11px] text-text-muted font-medium">
										{{ activeTreatment === 'LASER_SHR' ? 'Innova Pro Diodo' : 'Deep Beauty 448 kHz' }}
									</span>
								</div>
							</div>

							<span
								class="badge badge-sm font-black uppercase px-2.5 py-1 text-[10px]"
								:class="currentConsent?.status === 'REVOKED' ? 'badge-error text-error-content' : (currentConsent?.status === 'SIGNED' ? 'badge-success text-success-content' : 'badge-warning text-warning-content')"
							>
								{{ currentConsent?.status === 'REVOKED' ? 'REVOCADO' : (currentConsent?.status === 'SIGNED' ? 'FIRMADO' : 'PENDIENTE') }}
							</span>
						</div>

						<div class="text-xs text-text-muted space-y-1">
							<div class="flex justify-between py-1 border-b border-border-subtle/50">
								<span class="font-medium">Fecha de firma:</span>
								<strong class="text-text-primary">
									{{ currentConsent?.signed_date ? new Date(currentConsent.signed_date).toLocaleDateString() : 'Sin firmar' }}
								</strong>
							</div>
							<div v-if="currentConsent?.signature_data" class="flex items-center justify-between py-1 border-b border-border-subtle/50">
								<span class="font-medium">Firma digital:</span>
								<div class="flex items-center gap-1.5 bg-white border border-border-subtle rounded-lg px-2 py-0.5 shadow-xs">
									<img :src="currentConsent.signature_data" alt="Firma" class="h-5 w-auto max-w-20 object-contain" />
									<span class="text-[10px] text-success font-black">PNG</span>
								</div>
							</div>
							<div v-if="activeTreatment === 'INDIBA' && indibaConsentData?.objectives?.length" class="flex justify-between py-1 border-b border-border-subtle/50">
								<span class="font-medium">Objetivos:</span>
								<strong class="text-primary font-bold">{{ indibaConsentData.objectives.length }} acordados</strong>
							</div>
						</div>
					</div>

					<div class="space-y-2">
						<button
							type="button"
							class="btn btn-outline btn-sm w-full rounded-xl font-bold uppercase tracking-wider text-xs"
							@click="handleOpenConsent"
						>
							{{ currentConsent ? 'Ver / Gestionar Consentimiento' : 'Emitir para Firma' }}
						</button>
						<button
							v-if="currentConsent?.status === 'SIGNED'"
							type="button"
							class="btn btn-ghost btn-xs w-full text-primary gap-1 font-bold rounded-lg"
							@click="openDossier(activeTreatment)"
						>
							<Printer class="size-3.5" />
							Ver Expediente Imprimible
						</button>
					</div>
				</div>

				<!-- 3. Consentimiento de Protección de Datos (RGPD / LGPD) -->
				<div class="p-5 bg-bg-muted/20 border border-border-subtle rounded-3xl space-y-4 flex flex-col justify-between">
					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2.5">
								<div class="p-2 rounded-xl bg-purple-500/15 text-purple-600">
									<Lock class="size-5" />
								</div>
								<div>
									<h4 class="text-xs font-black uppercase tracking-wider text-text-primary">
										Protección de Datos (RGPD / LGPD)
									</h4>
									<span class="text-[11px] text-text-muted font-medium">
										LOPDGDD 3/2018 y Reg. (UE) 2016/679
									</span>
								</div>
							</div>

							<span
								class="badge badge-sm font-black uppercase px-2.5 py-1 text-[10px]"
								:class="lgpdConsent?.status === 'REVOKED' ? 'badge-error text-error-content' : (lgpdConsent?.status === 'SIGNED' ? 'badge-success text-success-content' : 'badge-warning text-warning-content')"
							>
								{{ lgpdConsent?.status === 'REVOKED' ? 'REVOCADO' : (lgpdConsent?.status === 'SIGNED' ? 'FIRMADO' : 'PENDIENTE') }}
							</span>
						</div>

						<div class="text-xs text-text-muted space-y-1">
							<div class="flex justify-between py-1 border-b border-border-subtle/50">
								<span class="font-medium">Fecha de firma:</span>
								<strong class="text-text-primary">
									{{ lgpdConsent?.signed_date ? new Date(lgpdConsent.signed_date).toLocaleDateString() : 'Sin firmar' }}
								</strong>
							</div>
							<div v-if="lgpdConsent?.signature_data" class="flex items-center justify-between py-1 border-b border-border-subtle/50">
								<span class="font-medium">Firma digital:</span>
								<div class="flex items-center gap-1.5 bg-white border border-border-subtle rounded-lg px-2 py-0.5 shadow-xs">
									<img :src="lgpdConsent.signature_data" alt="Firma" class="h-5 w-auto max-w-20 object-contain" />
									<span class="text-[10px] text-success font-black">PNG</span>
								</div>
							</div>
							<p class="text-[11px] text-text-muted/80 leading-tight pt-1">
								Garantiza el tratamiento médico-estético y el ejercicio de derechos ARCO.
							</p>
						</div>
					</div>

					<div class="space-y-2">
						<button
							type="button"
							class="btn btn-outline btn-sm w-full rounded-xl font-bold uppercase tracking-wider text-xs"
							@click="isLgpdConsentModalOpen = true"
						>
							{{ lgpdConsent ? 'Ver / Gestionar RGPD' : 'Emitir Consentimiento RGPD' }}
						</button>
						<button
							v-if="lgpdConsent?.status === 'SIGNED'"
							type="button"
							class="btn btn-ghost btn-xs w-full text-primary gap-1 font-bold rounded-lg"
							@click="openDossier('LGPD')"
						>
							<Printer class="size-3.5" />
							Ver Expediente RGPD
						</button>
					</div>
				</div>

			</div>

			<!-- BLOQUE 2: ZONAS Y SEGUIMIENTO DE TRATAMIENTO -->
			<div class="space-y-6 pt-4 border-t border-border-subtle">
				
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
					<div>
						<h4 class="text-lg font-black tracking-tight text-text-primary flex items-center gap-2">
							Fichas de Tratamiento por Zona
							<span class="badge badge-neutral badge-sm font-bold">{{ activeZones.length }} activas</span>
						</h4>
						<p class="text-text-muted text-xs font-medium">
							Historial de sesiones, fluencias/parámetros y evolución clínica por área anatómica
						</p>
					</div>

					<button
						type="button"
						class="btn btn-primary btn-sm rounded-xl font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5 self-start sm:self-auto"
						@click="openNewZoneModal"
					>
						<Plus class="size-4" />
						Añadir Nueva Zona
					</button>
				</div>

				<!-- SI NO HAY ZONAS DADAS DE ALTA -->
				<div v-if="activeZones.length === 0" class="text-center py-12 px-4 bg-bg-muted/10 border-2 border-dashed border-border-subtle rounded-3xl space-y-3">
					<div class="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
						<Sparkles class="size-6" />
					</div>
					<h5 class="text-sm font-black text-text-primary">No hay zonas registradas para {{ activeTreatment === 'LASER_SHR' ? 'Láser SHR' : 'Indiba' }}</h5>
					<p class="text-xs text-text-muted max-w-md mx-auto">
						Agregá las zonas anatómicas del cliente (ej: {{ activeTreatment === 'LASER_SHR' ? 'Axilas, Piernas completas, Facial' : 'Facial & Cuello, Abdomen, Glúteos' }}) para iniciar la bitácora de sesiones.
					</p>
					<button
						type="button"
						class="btn btn-primary btn-sm rounded-xl font-bold uppercase tracking-wider mt-2"
						@click="openNewZoneModal"
					>
						<Plus class="size-4 mr-1" />
						Configurar Primera Zona
					</button>
				</div>

				<!-- LISTADO DE ZONAS CON SUS TABLAS DE SESIONES (COMO EL PDF FÍSICO) -->
				<div v-else class="space-y-8">
					<div
						v-for="(zone, zIdx) in activeZones"
						:key="zone.zone_id"
						class="border border-border-subtle bg-bg-muted/15 rounded-3xl p-4 sm:p-6 space-y-5 shadow-xs"
					>
						<!-- Encabezado de la Zona -->
						<div class="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border-subtle pb-4">
							<div>
								<div class="flex items-center gap-2">
									<span class="badge badge-primary font-black uppercase text-[11px] px-2.5">
										ZONA {{ zIdx + 1 }}
									</span>
									<h5 class="text-base font-black text-text-primary tracking-tight">
										{{ zone.zone_name }}
									</h5>
								</div>

								<!-- Atributos diagnósticos -->
								<div class="flex flex-wrap gap-2 pt-2 text-[11px] font-semibold text-text-muted">
									<span v-if="zone.phototype" class="badge badge-outline badge-sm">
										Fototipo: <strong class="text-text-primary ml-1">{{ zone.phototype }}</strong>
									</span>
									<span v-if="zone.hair_thickness" class="badge badge-outline badge-sm">
										Grosor: <strong class="text-text-primary ml-1">{{ zone.hair_thickness }}</strong>
									</span>
									<span v-if="zone.hair_color" class="badge badge-outline badge-sm">
										Color: <strong class="text-text-primary ml-1">{{ zone.hair_color }}</strong>
									</span>
									<span v-if="zone.hair_density" class="badge badge-outline badge-sm">
										Densidad: <strong class="text-text-primary ml-1">{{ zone.hair_density }}</strong>
									</span>
									<span v-if="zone.notes" class="text-text-muted/80 italic self-center">
										Notas: {{ zone.notes }}
									</span>
								</div>
							</div>

							<!-- Botones de acción de la zona -->
							<div class="flex items-center gap-2 shrink-0">
								<button
									type="button"
									class="btn btn-primary btn-sm rounded-xl font-bold uppercase tracking-wider text-xs flex items-center gap-1.5"
									@click="openNewSessionModal(zone)"
								>
									<Plus class="size-3.5" />
									Registrar Sesión
								</button>
								<button
									type="button"
									class="btn btn-ghost btn-circle btn-sm text-text-muted hover:text-error"
									title="Eliminar Zona"
									@click="deleteZone(zone.zone_id)"
								>
									<Trash2 class="size-4" />
								</button>
							</div>
						</div>

						<!-- TABLA DE SESIONES -->
						<div class="overflow-x-auto">
							<table class="table table-sm w-full text-xs">
								<thead>
									<tr class="text-text-muted uppercase text-[10px] font-black border-b border-border-subtle">
										<th class="w-20 text-center">Nº Sesión</th>
										<th class="w-28">Fecha</th>
										<th class="min-w-45">Parámetros Técnicos</th>
										<th class="min-w-55">Observaciones & Reacción</th>
										<th class="w-36">Bono Vinculado</th>
										<th class="w-12 text-center"></th>
									</tr>
								</thead>
								<tbody>
									<tr v-if="!zone.sessions?.length">
										<td colspan="6" class="text-center py-6 text-text-muted font-medium italic">
											Sin sesiones registradas en esta zona todavía. Hacé clic en "Registrar Sesión" para asentar la primera aplicación.
										</td>
									</tr>

									<tr
										v-for="sess in zone.sessions"
										:key="sess.session_id"
										class="border-b border-border-subtle/60 hover:bg-bg-card/50 transition-colors"
									>
										<!-- Nº Sesión -->
										<td class="text-center font-black text-text-primary">
											<span class="badge badge-neutral font-mono font-bold text-xs">
												#{{ sess.session_number }}
											</span>
										</td>

										<!-- Fecha -->
										<td class="font-semibold text-text-primary whitespace-nowrap">
											<div class="flex items-center gap-1.5">
												<Calendar class="size-3.5 text-text-muted" />
												{{ new Date(sess.session_date).toLocaleDateString() }}
											</div>
										</td>

										<!-- Parámetros Técnicos -->
										<td>
											<span class="badge badge-primary/10 text-primary border border-primary/20 font-mono font-bold text-xs px-2.5 py-1">
												{{ sess.parameters }}
											</span>
										</td>

										<!-- Observaciones y Reacción -->
										<td>
											<div class="space-y-0.5">
												<span v-if="sess.skin_reaction" class="text-[11px] font-bold text-text-primary block">
													{{ sess.skin_reaction }}
												</span>
												<p v-if="sess.observations" class="text-text-muted text-[11px]">
													{{ sess.observations }}
												</p>
											</div>
										</td>

										<!-- Bono / Paquete Vinculado -->
										<td>
											<span v-if="sess.client_package?.package?.name" class="badge badge-neutral text-[10px] font-bold">
												{{ sess.client_package.package.name }}
											</span>
											<span v-else class="text-text-muted text-[10px] italic">
												Individual / Suelta
											</span>
										</td>

										<!-- Acciones -->
										<td class="text-center">
											<button
												type="button"
												class="btn btn-ghost btn-circle btn-xs text-text-muted hover:text-error"
												title="Eliminar sesión"
												@click="deleteSession(sess.session_id)"
											>
												<Trash2 class="size-3.5" />
											</button>
										</td>
									</tr>
								</tbody>
							</table>
						</div>

					</div>
				</div>

			</div>

		</div>

		<!-- MODALES INTEGRADOS -->
		<NewTreatmentZoneModal
			v-model="isNewZoneModalOpen"
			:client-id="client.user_id"
			:treatment-type="activeTreatment"
		/>

		<NewTreatmentSessionModal
			v-model="isNewSessionModalOpen"
			:client-id="client.user_id"
			:zone="selectedZoneForSession"
			:client-packages="client.client_packages"
		/>

		<!-- Cuestionario Láser SHR Innova Pro -->
		<AnamnesisQuestionsModal
			v-model="isAnamnesisModalOpen"
			:client-id="client.user_id"
			:existing-questionnaire="laserQuestionnaire"
		/>

		<!-- Cuestionario Indiba Deep Beauty (9 Puntos) -->
		<IndibaAnamnesisModal
			v-model="isIndibaAnamnesisModalOpen"
			:client-id="client.user_id"
			:existing-questionnaire="indibaQuestionnaire"
		/>

		<!-- Consentimiento Informado Oficial Indiba (10 Objetivos + Revocación) -->
		<IndibaConsentModal
			v-model="isIndibaConsentModalOpen"
			:client="client"
			:existing-consent="indibaConsent"
			@open-dossier="openDossier"
		/>

		<!-- Consentimiento Informado Oficial Láser SHR (Innova Pro + Firma Canvas) -->
		<LaserConsentModal
			v-model="isLaserConsentModalOpen"
			:client="client"
			:existing-consent="laserConsent"
			@open-dossier="openDossier"
		/>

		<!-- Consentimiento de Protección de Datos (RGPD / LGPD) -->
		<LgpdConsentModal
			v-model="isLgpdConsentModalOpen"
			:client="client"
			:existing-consent="lgpdConsent"
			@open-dossier="openDossier"
		/>

		<!-- Modal de Expediente Unificado Imprimible (A4, PDF, WhatsApp, Email) -->
		<ClinicalDossierModal
			v-model="isDossierModalOpen"
			:client="client"
			:treatment-type="dossierTreatmentType"
			:questionnaire="dossierTreatmentType === 'LASER_SHR' ? laserQuestionnaire : (dossierTreatmentType === 'INDIBA' ? indibaQuestionnaire : null)"
			:consent="dossierTreatmentType === 'LASER_SHR' ? laserConsent : (dossierTreatmentType === 'INDIBA' ? indibaConsent : lgpdConsent)"
		/>

	</div>
</template>

<style scoped>
</style>
