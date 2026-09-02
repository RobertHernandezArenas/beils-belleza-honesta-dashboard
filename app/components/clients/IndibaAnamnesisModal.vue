<script setup lang="ts">
import { ref, reactive, watch, nextTick, computed } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { Zap, X, AlertCircle, Save, ShieldAlert, CheckCircle2 } from 'lucide-vue-next'
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

const oncologyState = ref<'curado' | 'tumor_activo' | 'tratamiento' | 'ninguno'>('ninguno')
const observations = ref('')
const error = ref('')

// 1. Contraindicaciones Absolutas (Sección 3.1 Documento Oficial)
const absoluteContraindications = reactive([
	{ key: 'pacemaker', label: 'Marcapasos u otro tipo de implantes electrónicos', checked: false },
	{ key: 'pregnancy', label: 'Embarazo', checked: false },
	{ key: 'thrombophlebitis', label: 'Tromboflebitis', checked: false }
])

// 2. Precauciones Médicas (Sección 3.2 Documento Oficial)
const precautions = reactive([
	{ key: 'infection', label: 'Infección activa en el área a tratar (no tratar zona afectada)', checked: false },
	{ key: 'anticoagulants', label: 'Medicación anticoagulante en curso', checked: false },
	{ key: 'pediatric', label: 'Tratamiento en población pediátrica', checked: false },
	{ key: 'altered_sensitivity', label: 'Sensibilidad térmica o cognición alterada', checked: false },
	{ key: 'skin_lesions', label: 'Heridas, quemaduras o piel no intacta en la zona', checked: false }
])

const isNoApto = computed(() => {
	return absoluteContraindications.some(c => c.checked)
})

const hasPrecautions = computed(() => {
	return precautions.some(p => p.checked) || oncologyState.value === 'tumor_activo' || oncologyState.value === 'tratamiento'
})

watch(
	() => props.modelValue,
	newVal => {
		if (newVal) {
			error.value = ''
			if (props.existingQuestionnaire?.data) {
				try {
					const parsed = JSON.parse(props.existingQuestionnaire.data)
					if (parsed.oncologyState) oncologyState.value = parsed.oncologyState
					if (parsed.observations) observations.value = parsed.observations
					if (parsed.absoluteContraindications) {
						absoluteContraindications.forEach(c => {
							c.checked = !!parsed.absoluteContraindications[c.key]
						})
					}
					if (parsed.precautions) {
						precautions.forEach(p => {
							p.checked = !!parsed.precautions[p.key]
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
		const absoluteMap: Record<string, boolean> = {}
		absoluteContraindications.forEach(c => (absoluteMap[c.key] = c.checked))

		const precautionsMap: Record<string, boolean> = {}
		precautions.forEach(p => (precautionsMap[p.key] = p.checked))

		const payload = {
			user_id: props.clientId,
			title: 'Cuestionario de Contraindicaciones - Indiba Deep Beauty',
			data: {
				completed_at: new Date().toISOString(),
				status: isNoApto.value ? 'NO_APTO' : (hasPrecautions.value ? 'PRECAUCION' : 'APTO'),
				oncologyState: oncologyState.value,
				absoluteContraindications: absoluteMap,
				precautions: precautionsMap,
				hasAbsoluteContraindication: isNoApto.value,
				hasPrecautions: hasPrecautions.value,
				observations: observations.value
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
		error.value = err.data?.statusMessage || 'Error al guardar la evaluación de Indiba'
	}
})
</script>

<template>
	<dialog ref="dialogRef" class="modal modal-bottom sm:modal-middle">
		<div class="modal-box bg-bg-card border border-border-default/80 max-w-2xl p-0 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
			
			<!-- HEADER FIJO -->
			<div class="flex items-center justify-between p-6 border-b border-border-subtle bg-bg-card shrink-0">
				<div class="flex items-center gap-3">
					<div class="p-2.5 bg-amber-500/15 text-amber-600 rounded-2xl">
						<Zap class="w-6 h-6" />
					</div>
					<div>
						<h3 class="text-text-primary text-lg font-black tracking-tight flex items-center gap-2">
							Checklist de Seguridad Médica: Indiba® Deep Beauty
						</h3>
						<p class="text-text-muted text-xs font-semibold">Radiofrecuencia Monopolar Capacitiva/Resistiva (448 kHz)</p>
					</div>
				</div>
				<button class="btn btn-ghost btn-circle btn-sm text-text-muted hover:text-text-primary" @click="handleClose">
					<X class="w-5 h-5" />
				</button>
			</div>

			<!-- CUERPO CON SCROLL INDEPENDIENTE (NUNCA SE SOLAPA CON EL HEADER) -->
			<div class="p-6 overflow-y-auto flex-1 space-y-6">
				
				<!-- STATUS BANNER -->
				<div v-if="isNoApto" class="alert alert-error text-xs rounded-2xl font-bold flex items-start gap-2.5">
					<ShieldAlert class="w-5 h-5 shrink-0 text-error-content mt-0.5" />
					<div>
						<p class="font-black">TRATAMIENTO CONTRAINDICADO (NO APTO)</p>
						<p class="font-normal opacity-90 mt-0.5">
							El paciente presenta una contraindicación absoluta (marcapasos, gestación o tromboflebitis). No se debe aplicar radiofrecuencia.
						</p>
					</div>
				</div>
				<div v-else-if="hasPrecautions" class="alert alert-warning text-xs rounded-2xl font-bold flex items-start gap-2.5 text-warning-content">
					<AlertCircle class="w-5 h-5 shrink-0 mt-0.5" />
					<div>
						<p class="font-black">PRECAUCIONES CLÍNICAS REQUERIDAS</p>
						<p class="font-normal opacity-90 mt-0.5">
							Aplicar a menor potencia, palpar temperatura con frecuencia y verificar ausencia de lesiones dérmicas en la zona.
						</p>
					</div>
				</div>
				<div v-else class="alert alert-success/15 border border-success/30 rounded-2xl text-xs font-semibold flex items-center gap-2 text-success">
					<CheckCircle2 class="w-4 h-4 shrink-0" />
					<span>Paciente APTO. Sin contraindicaciones ni precauciones para radiofrecuencia 448 kHz.</span>
				</div>

				<!-- ERROR ALERT -->
				<div v-if="error" class="alert alert-error text-xs rounded-2xl flex items-center gap-2">
					<AlertCircle class="w-4 h-4 shrink-0" />
					<span>{{ error }}</span>
				</div>

				<!-- 3.1 CONTRAINDICACIONES ABSOLUTAS -->
				<div class="p-4 bg-error/5 border border-error/20 rounded-2xl space-y-3">
					<span class="text-xs font-black uppercase tracking-wider text-error block">
						3.1 Contraindicaciones Absolutas (Descartar antes de tratar)
					</span>

					<div class="space-y-2.5">
						<label
							v-for="item in absoluteContraindications"
							:key="item.key"
							class="flex items-center gap-3 p-3 bg-bg-card border border-border-subtle rounded-xl cursor-pointer hover:border-error/40 transition-colors"
						>
							<input
								v-model="item.checked"
								type="checkbox"
								class="checkbox checkbox-error checkbox-sm rounded-lg"
							/>
							<span class="text-xs font-bold text-text-primary">{{ item.label }}</span>
						</label>
					</div>
				</div>

				<!-- 3.2 PRECAUCIONES -->
				<div class="p-4 bg-bg-muted/20 border border-border-subtle rounded-2xl space-y-4">
					<span class="text-xs font-black uppercase tracking-wider text-text-primary block">
						3.2 Precauciones & Antecedentes Clínicos
					</span>

					<!-- Estado Oncológico -->
					<div class="space-y-2">
						<label class="text-[11px] font-bold text-text-muted uppercase block">
							Paciente con Antecedentes Oncológicos:
						</label>
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
							<button
								type="button"
								class="btn btn-xs rounded-lg font-bold text-[11px]"
								:class="oncologyState === 'ninguno' ? 'btn-primary' : 'btn-outline border-border-subtle'"
								@click="oncologyState = 'ninguno'"
							>
								Sin antecedentes
							</button>
							<button
								type="button"
								class="btn btn-xs rounded-lg font-bold text-[11px]"
								:class="oncologyState === 'curado' ? 'btn-primary' : 'btn-outline border-border-subtle'"
								@click="oncologyState = 'curado'"
							>
								Curado (Puede tratarse)
							</button>
							<button
								type="button"
								class="btn btn-xs rounded-lg font-bold text-[11px]"
								:class="oncologyState === 'tumor_activo' ? 'btn-warning text-warning-content' : 'btn-outline border-border-subtle'"
								@click="oncologyState = 'tumor_activo'"
							>
								Tumor activo (Evitar zona y ganglios)
							</button>
							<button
								type="button"
								class="btn btn-xs rounded-lg font-bold text-[11px]"
								:class="oncologyState === 'tratamiento' ? 'btn-warning text-warning-content' : 'btn-outline border-border-subtle'"
								@click="oncologyState = 'tratamiento'"
							>
								En tratamiento (Consultar oncólogo)
							</button>
						</div>
					</div>

					<!-- Lista de precauciones -->
					<div class="space-y-2 pt-1">
						<label
							v-for="item in precautions"
							:key="item.key"
							class="flex items-center gap-3 p-2.5 bg-bg-card border border-border-subtle rounded-xl cursor-pointer hover:border-primary/40 transition-colors"
						>
							<input
								v-model="item.checked"
								type="checkbox"
								class="checkbox checkbox-warning checkbox-sm rounded-lg"
							/>
							<span class="text-xs font-semibold text-text-primary">{{ item.label }}</span>
						</label>
					</div>
				</div>

				<!-- Observaciones -->
				<div class="space-y-1.5">
					<label class="text-xs font-bold text-text-primary uppercase tracking-wider block">
						Observaciones / Medidas de Seguridad Adoptadas
					</label>
					<textarea
						v-model="observations"
						rows="2"
						placeholder="Zonas excluidas, potencia reducida, informes médicos revisados..."
						class="textarea textarea-bordered w-full rounded-xl bg-bg-muted/30 text-xs text-text-primary font-medium"
					></textarea>
				</div>

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
					<Save class="w-4 h-4" />
					{{ isPending ? 'Guardando...' : 'Guardar Checklist' }}
				</button>
			</div>

		</div>
		<form method="dialog" class="modal-backdrop" @click="handleClose">
			<button>close</button>
		</form>
	</dialog>
</template>
