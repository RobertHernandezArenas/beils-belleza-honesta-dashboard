<script setup lang="ts">
import { ref, reactive, watch, nextTick, computed } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { FileText, X, AlertCircle, Save, ShieldAlert, CheckCircle2 } from 'lucide-vue-next'
import { useModalAnimation } from '~/composables/useModalAnimation'
import type { FetchError, Questionnaire } from '~~/shared/types/domain'

const props = defineProps<{
	modelValue: boolean
	clientId: string
	existingQuestionnaire?: Questionnaire | null
}>()

const emit = defineEmits(['update:modelValue', 'close', 'success'])
const queryClient = useQueryClient()

const dialogRef = ref<HTMLDialogElement | null>(null)
const { animateOpen, animateClose } = useModalAnimation()

const healthState = ref('BUENO')
const lastSunExposure = ref('Más de 1 mes')
const observations = ref('')
const error = ref('')

// 20 preguntas normalizadas del documento INNOVA PRO
const questions = reactive([
	{ id: 2, label: '¿Ha recibido anteriormente un tratamiento con LÁSER O IPL?', answer: 'NO', detail: '', critical: false },
	{ id: 3, label: 'Si recibió tratamiento previo, ¿le causó algún efecto secundario?', answer: 'NO', detail: '', critical: false },
	{ id: 4, label: '¿Es usted alérgico a algún medicamento o cosmético?', answer: 'NO', detail: '', critical: false },
	{ id: 5, label: '¿Padece o ha padecido alguna alteración o enfermedad cutánea?', answer: 'NO', detail: '', critical: false },
	{ id: 6, label: '¿Su piel cicatriza con normalidad?', answer: 'SI', detail: '', critical: false },
	{ id: 7, label: '¿Su piel tiende a la aparición de manchas?', answer: 'NO', detail: '', critical: false },
	{ id: 8, label: '¿Sufre o ha sufrido alguna enfermedad cancerígena?', answer: 'NO', detail: '', critical: true },
	{ id: 9, label: '¿Es usted diabético?', answer: 'NO', detail: '', critical: false },
	{ id: 10, label: '¿Es usted epiléptico?', answer: 'NO', detail: '', critical: true },
	{ id: 11, label: '¿Padece usted algún problema circulatorio?', answer: 'NO', detail: '', critical: false },
	{ id: 12, label: '¿Padece usted alguna dolencia cardíaca?', answer: 'NO', detail: '', critical: false },
	{ id: 13, label: '¿Padece usted problemas de tensión arterial?', answer: 'NO', detail: '', critical: false },
	{ id: 14, label: '¿Es usted portador de marcapasos o implante electrónico?', answer: 'NO', detail: '', critical: true },
	{ id: 15, label: '¿Padece usted algún problema hormonal?', answer: 'NO', detail: '', critical: false },
	{ id: 16, label: '¿Padece usted alguna enfermedad relevante?', answer: 'NO', detail: '', critical: false },
	{ id: 17, label: '¿Está usted embarazada o en periodo de lactancia?', answer: 'NO', detail: '', critical: true },
	{ id: 18, label: '¿Toma algún medicamento de forma continuada?', answer: 'NO', detail: '', critical: false },
	{ id: 19, label: '¿Toma alguna sustancia o fármaco fotosensibilizante?', answer: 'NO', detail: '', critical: true }
])

// Contraindications detection
const criticalFlags = computed(() => {
	const flags: string[] = []
	for (const q of questions) {
		if (q.critical && q.answer === 'SI') {
			flags.push(q.label)
		}
	}
	if (questions.find(q => q.id === 6)?.answer === 'NO') {
		flags.push('Cicatrización anómala')
	}
	return flags
})

watch(
	() => props.modelValue,
	newVal => {
		if (newVal) {
			error.value = ''
			if (props.existingQuestionnaire?.data) {
				try {
					const parsed = JSON.parse(props.existingQuestionnaire.data)
					if (parsed.healthState) healthState.value = parsed.healthState
					if (parsed.lastSunExposure) lastSunExposure.value = parsed.lastSunExposure
					if (parsed.observations) observations.value = parsed.observations
					if (Array.isArray(parsed.answers)) {
						parsed.answers.forEach((ans: { id: number; answer: string; detail?: string }) => {
							const target = questions.find(q => q.id === ans.id)
							if (target) {
								target.answer = ans.answer
								target.detail = ans.detail || ''
							}
						})
					}
				} catch {
					// Fallback
				}
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

const { mutate: saveQuestionnaire, isPending } = useMutation({
	mutationFn: async () => {
		const payload = {
			user_id: props.clientId,
			title: 'Cuestionario de Aceptación de SHR - Innova Pro',
			data: {
				completed_at: new Date().toISOString(),
				healthState: healthState.value,
				lastSunExposure: lastSunExposure.value,
				observations: observations.value,
				hasCriticalContraindications: criticalFlags.value.length > 0,
				criticalFlags: criticalFlags.value,
				answers: questions.map(q => ({
					id: q.id,
					question: q.label,
					answer: q.answer,
					detail: q.detail
				}))
			}
		}

		if (props.existingQuestionnaire?.questionnaire_id) {
			return await $fetch(`/api/clients/questionnaires/${props.existingQuestionnaire.questionnaire_id}`, {
				method: 'PUT',
				body: payload
			})
		}

		return await $fetch('/api/clients/questionnaires', {
			method: 'POST',
			body: payload
		})
	},
	onSuccess: () => {
		queryClient.invalidateQueries({ queryKey: ['client', props.clientId] })
		emit('success')
		handleClose()
	},
	onError: (err: FetchError) => {
		error.value = err.data?.statusMessage || 'Error al guardar el cuestionario de salud'
	}
})
</script>

<template>
	<dialog ref="dialogRef" class="modal modal-bottom sm:modal-middle">
		<div class="modal-box bg-bg-card border border-border-default/80 max-w-3xl p-0 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
			
			<!-- HEADER FIJO -->
			<div class="flex items-center justify-between p-6 border-b border-border-subtle bg-bg-card shrink-0">
				<div class="flex items-center gap-3">
					<div class="p-2.5 bg-blue-500/15 text-blue-600 rounded-2xl">
						<FileText class="size-6" />
					</div>
					<div>
						<h3 class="text-text-primary text-lg font-black tracking-tight flex items-center gap-2">
							Cuestionario de Aceptación de SHR (Innova Pro)
						</h3>
						<p class="text-text-muted text-xs font-semibold">Anamnesis médica y evaluación de contraindicaciones de seguridad</p>
					</div>
				</div>
				<button class="btn btn-ghost btn-circle btn-sm text-text-muted hover:text-text-primary" @click="handleClose">
					<X class="size-5" />
				</button>
			</div>

			<!-- CUERPO CON SCROLL INDEPENDIENTE -->
			<div class="p-6 overflow-y-auto flex-1 space-y-6">

			<!-- ALERTA DE RIESGO SI HAY CONTRAINDICACIONES -->
			<div v-if="criticalFlags.length > 0" class="alert alert-error rounded-2xl text-xs font-bold flex items-start gap-3">
				<ShieldAlert class="size-5 shrink-0 text-error-content mt-0.5" />
				<div>
					<p class="font-black">CONTRAINDICACIÓN MÉDICA DETECTADA:</p>
					<ul class="list-disc list-inside mt-1 font-normal opacity-95">
						<li v-for="flag in criticalFlags" :key="flag">{{ flag }}</li>
					</ul>
					<p class="mt-1 text-[11px] font-semibold text-error-content/90">
						* El operador debe solicitar justificante médico antes de realizar la sesión.
					</p>
				</div>
			</div>
			<div v-else class="alert alert-success/15 border border-success/30 rounded-2xl text-xs font-semibold flex items-center gap-2 text-success">
				<CheckCircle2 class="size-4 shrink-0" />
				<span>Sin contraindicaciones críticas registradas. Paciente apto para depilación Láser SHR.</span>
			</div>

			<!-- ERROR ALERT -->
			<div v-if="error" class="alert alert-error text-xs rounded-2xl flex items-center gap-2">
				<AlertCircle class="size-4 shrink-0" />
				<span>{{ error }}</span>
			</div>

			<!-- FORM -->
			<form class="space-y-6" @submit.prevent="saveQuestionnaire()">
				
				<!-- Pregunta 1: Estado de salud -->
				<div class="p-4 bg-bg-muted/20 border border-border-subtle rounded-2xl space-y-2">
					<label class="text-xs font-black uppercase tracking-wider text-text-primary block">
						1. Estado general de salud:
					</label>
					<div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
						<button
							v-for="state in ['EXCELENTE', 'BUENO', 'REGULAR', 'DEFICIENTE']"
							:key="state"
							type="button"
							class="btn btn-sm rounded-xl font-bold text-xs"
							:class="healthState === state ? 'btn-primary' : 'btn-outline border-border-subtle'"
							@click="healthState = state"
						>
							{{ state }}
						</button>
					</div>
				</div>

				<!-- Preguntas 2 a 19 -->
				<div class="space-y-3">
					<span class="text-xs font-black uppercase tracking-wider text-text-muted block">
						Preguntas de Seguridad Médica & Cutánea (2 a 19)
					</span>

					<div
						v-for="q in questions"
						:key="q.id"
						class="p-3.5 bg-bg-card border rounded-2xl space-y-2 transition-colors"
						:class="q.critical && q.answer === 'SI' ? 'border-error/60 bg-error/5' : 'border-border-subtle'"
					>
						<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
							<span class="text-xs font-semibold text-text-primary leading-snug">
								<strong class="text-text-muted mr-1">{{ q.id }}.</strong>
								{{ q.label }}
								<span v-if="q.critical" class="badge badge-error badge-xs font-black ml-1 text-[9px]">CRÍTICO</span>
							</span>

							<!-- Selector SI / NO -->
							<div class="join shrink-0 self-end sm:self-center">
								<button
									type="button"
									class="join-item btn btn-xs px-3 font-bold"
									:class="q.answer === 'NO' ? 'btn-neutral' : 'btn-ghost border-border-subtle'"
									@click="q.answer = 'NO'"
								>
									NO
								</button>
								<button
									type="button"
									class="join-item btn btn-xs px-3 font-bold"
									:class="q.answer === 'SI' ? (q.critical ? 'btn-error' : 'btn-warning') : 'btn-ghost border-border-subtle'"
									@click="q.answer = 'SI'"
								>
									SÍ
								</button>
							</div>
						</div>

						<!-- Detalle si responde SI -->
						<div v-if="q.answer === 'SI'" class="pt-1">
							<input
								v-model="q.detail"
								type="text"
								placeholder="Detallar información relevante..."
								class="input input-bordered input-xs w-full rounded-lg bg-bg-muted/40 text-xs"
							/>
						</div>
					</div>
				</div>

				<!-- Pregunta 20: Exposición Solar -->
				<div class="p-4 bg-bg-muted/20 border border-border-subtle rounded-2xl space-y-2">
					<label class="text-xs font-black uppercase tracking-wider text-text-primary block">
						20. ¿Cuánto tiempo ha transcurrido después de su última exposición solar o rayos U.V.A.?
					</label>
					<div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
						<button
							v-for="time in ['Menos de 72 horas (NO APTO)', 'Entre 3 y 15 días', 'Más de 1 mes']"
							:key="time"
							type="button"
							class="btn btn-sm rounded-xl font-bold text-xs"
							:class="lastSunExposure === time ? (time.includes('NO APTO') ? 'btn-error' : 'btn-primary') : 'btn-outline border-border-subtle'"
							@click="lastSunExposure = time"
						>
							{{ time }}
						</button>
					</div>
				</div>

				<!-- Observaciones Generales -->
				<div class="space-y-1.5">
					<label class="text-xs font-bold text-text-primary uppercase tracking-wider block">
						Observaciones Generales de la Evaluadora
					</label>
					<textarea
						v-model="observations"
						rows="2"
						placeholder="Justificantes médicos aportados, tipo de vello observado, notas clínicas..."
						class="textarea textarea-bordered w-full rounded-xl bg-bg-muted/30 text-xs text-text-primary font-medium"
					></textarea>
				</div>

				</form>
			</div>

			<!-- FOOTER FIJO -->
			<div class="p-4 sm:p-6 border-t border-border-subtle bg-bg-card shrink-0 flex justify-end gap-3">
				<button type="button" class="btn btn-ghost btn-sm rounded-xl font-bold uppercase tracking-wider text-xs" @click="handleClose">
					Cerrar
				</button>
				<button
					type="button"
					class="btn btn-primary btn-sm rounded-xl font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5 text-xs"
					:disabled="isPending"
					@click="saveQuestionnaire()"
				>
					<Save class="size-4" />
					{{ isPending ? 'Guardando...' : 'Guardar Cuestionario' }}
				</button>
			</div>

		</div>
		<form method="dialog" class="modal-backdrop" @click="handleClose">
			<button>close</button>
		</form>
	</dialog>
</template>
