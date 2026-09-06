<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import {
	Printer, MessageCircle, Mail, X, ShieldCheck, Activity,
	FileText, CheckCircle2, AlertTriangle, Download, Sparkles
} from 'lucide-vue-next'
import { useModalAnimation } from '~/composables/useModalAnimation'
import type { ClientProfile, Questionnaire, Consent, TreatmentType } from '~~/shared/types/domain'

const props = defineProps<{
	modelValue: boolean
	client: ClientProfile
	treatmentType: TreatmentType | 'LGPD'
	questionnaire?: Questionnaire | null
	consent?: Consent | null
}>()

const emit = defineEmits(['update:modelValue', 'close'])

const dialogRef = ref<HTMLDialogElement | null>(null)
const { animateOpen, animateClose } = useModalAnimation()

watch(
	() => props.modelValue,
	newVal => {
		if (newVal) {
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

// Parsed Questionnaire Data
const questionnaireData = computed(() => {
	if (!props.questionnaire?.data) return null
	try {
		return typeof props.questionnaire.data === 'string'
			? JSON.parse(props.questionnaire.data)
			: props.questionnaire.data
	} catch {
		return null
	}
})

// Parsed Consent Data
const consentData = computed(() => {
	if (!props.consent?.notes) return null
	try {
		return JSON.parse(props.consent.notes)
	} catch {
		return null
	}
})

const treatmentLabel = computed(() => {
	if (props.treatmentType === 'LASER_SHR') return 'Láser Diodo SHR (Innova Pro)'
	if (props.treatmentType === 'INDIBA') return 'Radiofrecuencia 448 kHz (Indiba® Deep Beauty)'
	return 'Protección de Datos Personales (RGPD / LGPD)'
})

// 1. Imprimir / Guardar como PDF
const handlePrint = () => {
	window.print()
}

// 2. Enviar por WhatsApp
const handleWhatsApp = () => {
	const phone = props.client.phone?.replace(/[^0-9]/g, '') || ''
	const clientName = `${props.client.name} ${props.client.surname || ''}`.trim()
	const dateStr = props.consent?.signed_date
		? new Date(props.consent.signed_date).toLocaleDateString()
		: new Date().toLocaleDateString()

	const message = `Hola ${clientName}, te hacemos entrega de la copia de tu expediente de ${treatmentLabel.value} con fecha ${dateStr} firmado en Beils Belleza Honesta. Podés consultarnos cualquier duda en cualquier momento.`
	const encoded = encodeURIComponent(message)

	const url = phone
		? `https://api.whatsapp.com/send?phone=${phone}&text=${encoded}`
		: `https://api.whatsapp.com/send?text=${encoded}`

	window.open(url, '_blank')
}

// 3. Enviar por Email
const handleEmail = () => {
	const email = props.client.email || ''
	const clientName = `${props.client.name} ${props.client.surname || ''}`.trim()
	const subject = encodeURIComponent(`Expediente y Consentimiento Firmado: ${treatmentLabel.value} - Beils`)
	const body = encodeURIComponent(
		`Estimado/a ${clientName},\n\nAdjuntamos la confirmación de su expediente de tratamiento y consentimiento legal para ${treatmentLabel.value}, registrado y firmado digitalmente en Beils Belleza Honesta.\n\nAtentamente,\nEquipo de Beils Belleza Honesta`
	)
	window.location.href = `mailto:${email}?subject=${subject}&body=${body}`
}
</script>

<template>
	<dialog ref="dialogRef" class="modal modal-bottom sm:modal-middle z-6500">
		<div class="modal-box bg-bg-card border border-border-default/80 max-w-4xl w-full p-0 rounded-3xl shadow-2xl flex flex-col max-h-[95dvh] overflow-hidden">
			
			<!-- BARRA SUPERIOR DE ACCIONES (SE OCULTA AL IMPRIMIR) -->
			<div class="no-print p-4 sm:p-5 border-b border-border-subtle bg-bg-card flex flex-wrap items-center justify-between gap-3 shrink-0">
				<div class="flex items-center gap-2.5">
					<div class="p-2 bg-primary/15 text-primary rounded-xl">
						<FileText class="size-5" />
					</div>
					<div>
						<h3 class="text-text-primary text-sm sm:text-base font-black tracking-tight">
							Expediente Clínico & Consentimiento Imprimible
						</h3>
						<p class="text-text-muted text-[11px] font-semibold">
							{{ treatmentLabel }}
						</p>
					</div>
				</div>

				<div class="flex flex-wrap items-center gap-2">
					<!-- Imprimir / PDF -->
					<button
						type="button"
						class="btn btn-primary btn-sm rounded-xl font-bold uppercase tracking-wider text-xs gap-1.5 shadow-sm"
						@click="handlePrint"
					>
						<Printer class="size-4" />
						Imprimir / PDF
					</button>

					<!-- WhatsApp -->
					<button
						type="button"
						class="btn btn-success btn-sm rounded-xl font-bold uppercase tracking-wider text-xs gap-1.5 shadow-sm text-white"
						@click="handleWhatsApp"
					>
						<MessageCircle class="size-4" />
						WhatsApp
					</button>

					<!-- Email -->
					<button
						type="button"
						class="btn btn-neutral btn-sm rounded-xl font-bold uppercase tracking-wider text-xs gap-1.5 shadow-sm"
						@click="handleEmail"
					>
						<Mail class="size-4" />
						Email
					</button>

					<button
						class="btn btn-ghost btn-circle btn-sm text-text-muted hover:text-text-primary ml-1"
						@click="handleClose"
					>
						<X class="size-5" />
					</button>
				</div>
			</div>

			<!-- CUERPO IMPRIMIBLE (DOCUMENTO A4) -->
			<div class="flex-1 overflow-y-auto p-6 sm:p-10 bg-white text-gray-900 text-xs leading-relaxed space-y-6" id="printable-dossier">
				
				<!-- ENCABEZADO MÉDICO FORMAL -->
				<div class="border-b-2 border-gray-900 pb-4 flex items-start justify-between">
					<div>
						<h1 class="text-xl sm:text-2xl font-black tracking-tight uppercase text-gray-900">
							BEILS BELLEZA HONESTA
						</h1>
						<p class="text-[11px] text-gray-600 font-semibold">
							Centro de Estética Avanzada & Salud Dérmica
						</p>
						<p class="text-[10px] text-gray-500">
							Expediente Clínico Oficial y Consentimiento Legal Informado
						</p>
					</div>
					<div class="text-right">
						<span class="inline-block px-2.5 py-1 bg-gray-100 border border-gray-300 rounded-lg text-[10px] font-black uppercase text-gray-800">
							{{ treatmentLabel }}
						</span>
						<p class="text-[10px] text-gray-500 mt-1">
							Fecha de Emisión: <strong>{{ new Date().toLocaleDateString() }}</strong>
						</p>
					</div>
				</div>

				<!-- 1. DATOS DEL PACIENTE -->
				<div class="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-2">
					<h2 class="text-xs font-black uppercase tracking-wider text-gray-900 border-b border-gray-200 pb-1">
						1. Datos de Identificación del Paciente
					</h2>
					<div class="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-4 text-[11px]">
						<div>
							<span class="text-gray-500 block">Nombre y Apellidos:</span>
							<strong class="text-gray-900 text-xs">{{ client.name }} {{ client.surname }}</strong>
						</div>
						<div>
							<span class="text-gray-500 block">DNI / NIE:</span>
							<strong class="text-gray-900 font-mono">{{ client.document_number || 'No especificado' }}</strong>
						</div>
						<div>
							<span class="text-gray-500 block">Teléfono de Contacto:</span>
							<strong class="text-gray-900">{{ client.phone || 'No registrado' }}</strong>
						</div>
						<div>
							<span class="text-gray-500 block">Correo Electrónico:</span>
							<strong class="text-gray-900">{{ client.email || 'No registrado' }}</strong>
						</div>
						<div>
							<span class="text-gray-500 block">Fecha de Nacimiento:</span>
							<strong class="text-gray-900">{{ (client.birth_date || client.date_of_birth) ? new Date(client.birth_date || client.date_of_birth!).toLocaleDateString() : 'No indicada' }}</strong>
						</div>
						<div>
							<span class="text-gray-500 block">Estado del Consentimiento:</span>
							<span
								class="inline-block px-2 py-0.5 rounded font-black text-[10px]"
								:class="consent?.status === 'SIGNED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'"
							>
								{{ consent?.status === 'SIGNED' ? 'FIRMADO Y VIGENTE' : 'PENDIENTE DE FIRMA' }}
							</span>
						</div>
					</div>
				</div>

				<!-- 2. ANAMNESIS & CUESTIONARIO DE SALUD (SI APLICA) -->
				<div v-if="questionnaireData" class="border border-gray-200 rounded-xl p-4 space-y-3">
					<h2 class="text-xs font-black uppercase tracking-wider text-gray-900 border-b border-gray-200 pb-1">
						2. Cuestionario de Salud & Anamnesis de Seguridad
					</h2>

					<!-- Para Láser SHR -->
					<div v-if="treatmentType === 'LASER_SHR'" class="space-y-2">
						<div class="flex justify-between text-[11px] py-1 border-b border-gray-100">
							<span>Estado de salud general declarado:</span>
							<strong>{{ questionnaireData.healthState || 'No evaluado' }}</strong>
						</div>
						<div class="flex justify-between text-[11px] py-1 border-b border-gray-100">
							<span>Última exposición solar o rayos UVA:</span>
							<strong>{{ questionnaireData.lastSunExposure || 'No registrada' }}</strong>
						</div>
						
						<!-- Respuestas detalladas -->
						<div v-if="questionnaireData.answers?.length" class="pt-2">
							<span class="text-[10px] font-bold text-gray-500 uppercase block mb-1">
								Respuestas Registradas a Preguntas Médicas:
							</span>
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10px]">
								<div
									v-for="ans in questionnaireData.answers.slice(0, 10)"
									:key="ans.id"
									class="flex justify-between p-1 bg-gray-50 rounded border border-gray-100"
								>
									<span class="truncate pr-2">{{ ans.id }}. {{ ans.question }}</span>
									<strong :class="ans.answer === 'SI' ? 'text-red-600' : 'text-gray-700'">{{ ans.answer }}</strong>
								</div>
							</div>
						</div>
					</div>

					<!-- Para Indiba -->
					<div v-else-if="treatmentType === 'INDIBA'" class="space-y-2">
						<div class="flex justify-between text-[11px] py-1 border-b border-gray-100">
							<span>Evaluación de Aptitud:</span>
							<strong :class="questionnaireData.status === 'APTO' ? 'text-emerald-700' : 'text-amber-700'">
								{{ questionnaireData.status || 'No evaluada' }}
							</strong>
						</div>
						<div class="flex justify-between text-[11px] py-1 border-b border-gray-100">
							<span>Antecedentes Oncológicos:</span>
							<strong class="capitalize">{{ questionnaireData.oncologyState || 'Sin antecedentes' }}</strong>
						</div>
						<div class="text-[10px] text-gray-600 italic">
							* Se descarta marcapasos, embarazo y tromboflebitis conforme al protocolo de radiofrecuencia 448 kHz.
						</div>
					</div>
				</div>

				<!-- 3. CLÁUSULAS DEL CONSENTIMIENTO INFORMADO -->
				<div class="border border-gray-200 rounded-xl p-4 space-y-2 text-[11px] text-gray-700">
					<h2 class="text-xs font-black uppercase tracking-wider text-gray-900 border-b border-gray-200 pb-1">
						3. Declaración de Consentimiento y Compromisos
					</h2>

					<!-- Objetivos Indiba si existen -->
					<div v-if="treatmentType === 'INDIBA' && consentData?.objectives?.length" class="py-1">
						<span class="font-bold text-gray-900 block mb-1">Objetivos Acordados del Tratamiento:</span>
						<div class="flex flex-wrap gap-1.5">
							<span
								v-for="obj in consentData.objectives"
								:key="obj"
								class="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded-md text-[10px] font-semibold text-gray-800"
							>
								✓ {{ obj }}
							</span>
						</div>
					</div>

					<!-- Compromisos Láser -->
					<div v-if="treatmentType === 'LASER_SHR'" class="space-y-1 text-[10px]">
						<p>• El/la paciente se compromete expresamente a <strong>no exponerse al sol ni a rayos UVA 72 horas antes y después</strong> de cada sesión.</p>
						<p>• No arrancará el vello de raíz (cera o pinzas) durante el tratamiento, limitándose al rasurado con cuchilla.</p>
						<p>• Portará en todo momento las gafas de protección ocular obligatorias proporcionadas por el centro.</p>
					</div>

					<!-- RGPD / LGPD -->
					<p class="text-[9px] text-gray-500 pt-1 leading-normal">
						Conforme al RGPD (UE) 2016/679 y la LOPDGDD 3/2018, los datos recabados serán tratados con la exclusiva finalidad de prestar el servicio estético y velar por la seguridad sanitaria del paciente.
					</p>
				</div>

				<!-- 4. MENORES DE EDAD (SI APLICA) -->
				<div v-if="consentData?.isMinor" class="border border-amber-300 bg-amber-50/50 rounded-xl p-3 text-[11px] space-y-1">
					<h3 class="font-black uppercase text-amber-900 text-xs">
						Autorización de Tutor/a Legal (Menor de Edad)
					</h3>
					<div class="grid grid-cols-2 gap-2">
						<div>
							<span class="text-gray-600 block text-[10px]">Nombre del Tutor/a:</span>
							<strong class="text-gray-900">{{ consentData.guardianName }}</strong>
						</div>
						<div>
							<span class="text-gray-600 block text-[10px]">DNI / NIE del Tutor/a:</span>
							<strong class="text-gray-900 font-mono">{{ consentData.guardianDni }}</strong>
						</div>
					</div>
					<p v-if="consentData.authorizationFileUrl" class="text-[10px] text-emerald-700 font-semibold pt-1">
						✓ Documento adjunto de autorización validado y archivado.
					</p>
				</div>

				<!-- 5. FIRMA DIGITAL DEL PACIENTE Y DEL PROFESIONAL -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-300">
					
					<!-- Profesional -->
					<div class="border border-gray-200 rounded-xl p-3 bg-gray-50/40 space-y-2">
						<span class="text-[10px] font-bold text-gray-500 uppercase block">
							Profesional Aplicador/a
						</span>
						<p class="text-xs font-bold text-gray-900">
							{{ consentData?.professional || 'Especialista Beils' }}
						</p>
						<p class="text-[10px] text-gray-500">
							Fecha: {{ consent?.signed_date ? new Date(consent.signed_date).toLocaleDateString() : new Date().toLocaleDateString() }}
						</p>
						<div class="h-16 flex items-end">
							<span class="text-[9px] text-gray-400 italic">Sello del Centro / Firma Profesional</span>
						</div>
					</div>

					<!-- Firma del Paciente / Tutor -->
					<div class="border border-gray-300 rounded-xl p-3 bg-white space-y-2">
						<div class="flex items-center justify-between">
							<span class="text-[10px] font-bold text-gray-700 uppercase block">
								Firma Digital de {{ consentData?.isMinor ? 'el/la Tutor/a' : 'el/la Paciente' }}
							</span>
							<span v-if="consent?.signature_data" class="text-[9px] font-bold text-emerald-600">
								✓ Autenticada
							</span>
						</div>

						<div class="h-20 flex items-center justify-center border border-dashed border-gray-200 rounded-lg p-1 bg-white">
							<img
								v-if="consent?.signature_data"
								:src="consent.signature_data"
								alt="Firma del cliente"
								class="max-h-16 w-auto object-contain"
							/>
							<span v-else class="text-[10px] text-gray-400 italic">
								Documento pendiente de firma digital
							</span>
						</div>

						<p class="text-[9px] text-gray-500 text-center">
							Firmado electrónicamente conforme al Reglamento eIDAS (UE) 910/2014
						</p>
					</div>

				</div>

			</div>

			<!-- FOOTER ACCIONES -->
			<div class="no-print p-4 border-t border-border-subtle bg-bg-card shrink-0 flex justify-end gap-2">
				<button
					type="button"
					class="btn btn-ghost btn-sm rounded-xl font-bold uppercase tracking-wider text-xs"
					@click="handleClose"
				>
					Cerrar
				</button>
				<button
					type="button"
					class="btn btn-primary btn-sm rounded-xl font-bold uppercase tracking-wider text-xs gap-1.5 shadow-sm"
					@click="handlePrint"
				>
					<Printer class="size-4" />
					Imprimir / Guardar PDF
				</button>
			</div>

		</div>
		<form method="dialog" class="modal-backdrop" @click="handleClose">
			<button>close</button>
		</form>
	</dialog>
</template>

<style>
/* REGLAS ESTRICTAS DE IMPRESIÓN A4 */
@media print {
	/* Ocultar elementos de UI no imprimibles */
	.no-print,
	header,
	nav,
	aside,
	.modal-backdrop,
	.app-sidebar,
	.app-header {
		display: none !important;
	}

	body,
	html {
		background: #ffffff !important;
		color: #000000 !important;
		margin: 0 !important;
		padding: 0 !important;
	}

	dialog[open].modal {
		display: block !important;
		position: static !important;
		width: 100% !important;
		max-width: 100% !important;
		box-shadow: none !important;
		border: none !important;
		background: transparent !important;
	}

	.modal-box {
		max-width: 100% !important;
		max-height: 100% !important;
		overflow: visible !important;
		box-shadow: none !important;
		border: none !important;
		padding: 0 !important;
	}

	#printable-dossier {
		width: 100% !important;
		max-width: 100% !important;
		padding: 0 !important;
		overflow: visible !important;
		color: #111827 !important;
		background: #ffffff !important;
	}

	@page {
		size: A4 portrait;
		margin: 15mm;
	}
}
</style>
