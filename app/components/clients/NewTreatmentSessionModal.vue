<script setup lang="ts">
import { ref, reactive, watch, nextTick, computed } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { Plus, X, AlertCircle, Save, Calendar, CheckSquare } from 'lucide-vue-next'
import { useModalAnimation } from '~/composables/useModalAnimation'
import AppSelect from '~/components/ui/AppSelect.vue'
import type { TreatmentZoneDTO, ClientPackage, FetchError } from '~~/shared/types/domain'

const props = defineProps<{
	modelValue: boolean
	clientId: string
	zone: TreatmentZoneDTO | null
	clientPackages?: ClientPackage[]
	suggestedSessionNumber?: number
}>()

const emit = defineEmits(['update:modelValue', 'close', 'success'])
const queryClient = useQueryClient()

const dialogRef = ref<HTMLDialogElement | null>(null)
const { animateOpen, animateClose } = useModalAnimation()

const todayStr = new Date().toISOString().split('T')[0]

// Form state
const form = reactive({
	session_number: 1,
	session_date: todayStr,
	// Laser fields
	laser_joules: 14,
	laser_ms: 25,
	laser_hz: 10,
	// Indiba fields
	indiba_mode: 'BOTH' as 'CAP' | 'RES' | 'BOTH',
	indiba_cap_power: 45,
	indiba_res_power: 50,
	indiba_duration: 30,
	// Free parameters override if needed
	custom_parameters: '',
	use_custom_parameters: false,
	// Clinical observations
	skin_reaction: 'Eritema leve normal',
	observations: '',
	// Package link
	client_package_id: '',
	decrement_package: false
})

const error = ref('')

const skinReactions = [
	'Sin reacción / Tolerancia excelente',
	'Eritema leve normal (resolución < 2h)',
	'Enrojecimiento moderado esperado',
	'Piel sensible / Ajuste de fluencia',
	'Otra alteración (detallar en observaciones)'
]

const skinReactionOptions = computed(() =>
	skinReactions.map(r => ({ value: r, label: r }))
)

const indibaModeOptions = [
	{ value: 'BOTH', label: 'CAP + RES' },
	{ value: 'CAP', label: 'Solo CAP' },
	{ value: 'RES', label: 'Solo RES' }
]

const packageOptions = computed(() => [
	{ value: '', label: '-- Sin vincular a bono --' },
	...availablePackages.value.map(pkg => ({
		value: pkg.client_package_id,
		label: `${pkg.package?.name || 'Bono'} (${pkg.remaining_sessions} restantes de ${pkg.total_sessions})`
	}))
])

// Computed formatted parameters
const computedParameters = computed(() => {
	if (form.use_custom_parameters && form.custom_parameters.trim()) {
		return form.custom_parameters.trim()
	}
	if (props.zone?.treatment_type === 'LASER_SHR') {
		return `${form.laser_joules} J/cm² | ${form.laser_ms} ms | ${form.laser_hz} Hz`
	}
	// Indiba
	if (form.indiba_mode === 'CAP') {
		return `CAP: ${form.indiba_cap_power}% (${form.indiba_duration} min)`
	}
	if (form.indiba_mode === 'RES') {
		return `RES: ${form.indiba_res_power}% (${form.indiba_duration} min)`
	}
	return `CAP: ${form.indiba_cap_power}% + RES: ${form.indiba_res_power}% (${form.indiba_duration} min)`
})

// Filter packages that match treatment type or active
const availablePackages = computed(() => {
	if (!props.clientPackages?.length) return []
	return props.clientPackages.filter(p => p.remaining_sessions > 0)
})

watch(
	() => props.modelValue,
	newVal => {
		if (newVal) {
			form.session_number = props.suggestedSessionNumber || ((props.zone?.sessions?.length || 0) + 1)
			form.session_date = new Date().toISOString().split('T')[0]
			form.laser_joules = 14
			form.laser_ms = 25
			form.laser_hz = 10
			form.indiba_mode = 'BOTH'
			form.indiba_cap_power = 45
			form.indiba_res_power = 50
			form.indiba_duration = 30
			form.custom_parameters = ''
			form.use_custom_parameters = false
			form.skin_reaction = 'Eritema leve normal'
			form.observations = ''
			form.client_package_id = availablePackages.value[0]?.client_package_id || ''
			form.decrement_package = !!form.client_package_id
			error.value = ''
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

const { mutate: createSession, isPending } = useMutation({
	mutationFn: async () => {
		if (!props.zone?.zone_id) throw new Error('Zona requerida')
		return await $fetch('/api/treatments/sessions', {
			method: 'POST',
			body: {
				zone_id: props.zone.zone_id,
				client_id: props.clientId,
				session_number: form.session_number,
				session_date: form.session_date,
				parameters: computedParameters.value,
				skin_reaction: form.skin_reaction,
				observations: form.observations || null,
				client_package_id: form.client_package_id || null,
				decrement_package: form.decrement_package
			}
		})
	},
	onSuccess: () => {
		queryClient.invalidateQueries({ queryKey: ['client', props.clientId] })
		emit('success')
		handleClose()
	},
	onError: (err: FetchError) => {
		error.value = err.data?.statusMessage || 'Error al registrar la sesión de tratamiento'
	}
})
</script>

<template>
	<dialog ref="dialogRef" class="modal modal-bottom sm:modal-middle">
		<div class="modal-box bg-bg-card border border-border-default/80 max-w-xl p-6 sm:p-8 rounded-3xl shadow-2xl space-y-6">
			
			<!-- HEADER -->
			<div class="flex items-center justify-between border-b border-border-subtle pb-4">
				<div class="flex items-center gap-3">
					<div class="p-2.5 bg-primary/15 text-primary rounded-2xl">
						<Plus class="w-6 h-6" />
					</div>
					<div>
						<h3 class="text-text-primary text-lg font-black tracking-tight flex items-center gap-2">
							Registrar Sesión de Tratamiento
							<span class="badge badge-sm font-black uppercase badge-primary">
								{{ zone?.treatment_type === 'LASER_SHR' ? 'Láser SHR' : 'Indiba' }}
							</span>
						</h3>
						<p class="text-text-muted text-xs font-semibold">
							Zona: <strong class="text-text-primary">{{ zone?.zone_name }}</strong>
							<span v-if="zone?.phototype" class="ml-2">| Fototipo: {{ zone.phototype }}</span>
						</p>
					</div>
				</div>
				<button class="btn btn-ghost btn-circle btn-sm text-text-muted hover:text-text-primary" @click="handleClose">
					<X class="w-5 h-5" />
				</button>
			</div>

			<!-- ERROR ALERT -->
			<div v-if="error" class="alert alert-error text-xs rounded-2xl flex items-center gap-2">
				<AlertCircle class="w-4 h-4 shrink-0" />
				<span>{{ error }}</span>
			</div>

			<!-- FORM -->
			<form class="space-y-4" @submit.prevent="createSession()">
				
				<!-- Nº Sesión y Fecha -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div class="space-y-1.5">
						<label class="text-[11px] font-bold text-text-primary uppercase tracking-wider block">
							Nº de Sesión *
						</label>
						<input
							v-model.number="form.session_number"
							type="number"
							min="1"
							class="input input-bordered input-sm w-full rounded-xl bg-bg-muted/30 text-text-primary font-bold text-center"
							required
						/>
					</div>

					<div class="space-y-1.5">
						<label class="text-[11px] font-bold text-text-primary uppercase tracking-wider block">
							Fecha de la Sesión *
						</label>
						<div class="relative">
							<input
								v-model="form.session_date"
								type="date"
								class="input input-bordered input-sm w-full rounded-xl bg-bg-muted/30 text-text-primary font-medium pl-9"
								required
							/>
							<Calendar class="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
						</div>
					</div>
				</div>

				<!-- PARÁMETROS TÉCNICOS SEGÚN TECNOLOGÍA -->
				<div class="p-4 bg-bg-muted/20 border border-border-subtle rounded-2xl space-y-3">
					<div class="flex items-center justify-between">
						<span class="text-xs font-black uppercase tracking-wider text-text-primary">
							Parámetros Técnicos Aplicados
						</span>
						<label class="cursor-pointer label p-0 gap-2">
							<span class="label-text text-[11px] text-text-muted font-bold">Manual</span>
							<input v-model="form.use_custom_parameters" type="checkbox" class="toggle toggle-primary toggle-xs" />
						</label>
					</div>

					<!-- Si usa modo manual -->
					<div v-if="form.use_custom_parameters" class="space-y-1">
						<input
							v-model="form.custom_parameters"
							type="text"
							placeholder="Ej: 16 J/cm², 20ms, 12Hz, doble pasada"
							class="input input-bordered input-sm w-full rounded-xl bg-bg-card text-xs font-medium"
							required
						/>
					</div>

					<!-- Parámetros específicos Láser SHR -->
					<div v-else-if="zone?.treatment_type === 'LASER_SHR'" class="grid grid-cols-3 gap-2">
						<div class="space-y-1">
							<label class="text-[10px] font-black uppercase text-text-muted block">Fluencia (J/cm²)</label>
							<input
								v-model.number="form.laser_joules"
								type="number"
								min="1"
								step="0.5"
								class="input input-bordered input-sm w-full rounded-xl bg-bg-card text-xs font-bold text-center"
							/>
						</div>
						<div class="space-y-1">
							<label class="text-[10px] font-black uppercase text-text-muted block">Pulso (ms)</label>
							<input
								v-model.number="form.laser_ms"
								type="number"
								min="1"
								class="input input-bordered input-sm w-full rounded-xl bg-bg-card text-xs font-bold text-center"
							/>
						</div>
						<div class="space-y-1">
							<label class="text-[10px] font-black uppercase text-text-muted block">Frecuencia (Hz)</label>
							<input
								v-model.number="form.laser_hz"
								type="number"
								min="1"
								class="input input-bordered input-sm w-full rounded-xl bg-bg-card text-xs font-bold text-center"
							/>
						</div>
					</div>

					<!-- Parámetros específicos Indiba Deep Care -->
					<div v-else class="space-y-3">
						<div class="grid grid-cols-3 gap-2">
							<div class="space-y-1">
								<label class="text-[10px] font-black uppercase text-text-muted block">Modo</label>
								<AppSelect v-model="form.indiba_mode" :options="indibaModeOptions" size="sm" />
							</div>
							<div class="space-y-1">
								<label class="text-[10px] font-black uppercase text-text-muted block">Potencia CAP (%)</label>
								<input
									v-model.number="form.indiba_cap_power"
									type="number"
									min="0"
									max="100"
									class="input input-bordered input-sm w-full rounded-xl bg-bg-card text-xs font-bold text-center"
								/>
							</div>
							<div class="space-y-1">
								<label class="text-[10px] font-black uppercase text-text-muted block">Potencia RES (%)</label>
								<input
									v-model.number="form.indiba_res_power"
									type="number"
									min="0"
									max="100"
									class="input input-bordered input-sm w-full rounded-xl bg-bg-card text-xs font-bold text-center"
								/>
							</div>
						</div>
					</div>

					<!-- Preview del parámetro a guardar -->
					<div class="text-[11px] font-mono text-primary font-bold bg-primary/10 px-3 py-1.5 rounded-xl flex items-center justify-between">
						<span>Registro final:</span>
						<span>{{ computedParameters }}</span>
					</div>
				</div>

				<!-- Reacción Dérmica & Observaciones -->
				<div class="space-y-3">
					<div class="space-y-1.5">
						<label class="text-[11px] font-bold text-text-primary uppercase tracking-wider block">
							Reacción Dérmica / Tolerancia
						</label>
						<AppSelect
							v-model="form.skin_reaction"
							:options="skinReactionOptions"
							size="sm"
						/>
					</div>

					<div class="space-y-1.5">
						<label class="text-[11px] font-bold text-text-primary uppercase tracking-wider block">
							Observaciones / Incidencias
						</label>
						<textarea
							v-model="form.observations"
							rows="2"
							placeholder="Sensación del paciente, aplicación de aloe vera, recomendaciones..."
							class="textarea textarea-bordered w-full rounded-xl bg-bg-muted/30 text-text-primary text-xs font-medium"
						></textarea>
					</div>
				</div>

				<!-- VINCULACIÓN CON BONO / PAQUETE DEL CLIENTE -->
				<div v-if="availablePackages.length > 0" class="p-4 bg-primary/5 border border-primary/20 rounded-2xl space-y-2.5">
					<label class="text-xs font-black uppercase tracking-wider text-text-primary flex items-center gap-1.5">
						<CheckSquare class="w-3.5 h-3.5 text-primary" />
						Vincular a Bono / Paquete Contratado
					</label>
					<div class="flex flex-col sm:flex-row items-center gap-3">
						<div class="flex-1 w-full">
							<AppSelect
								v-model="form.client_package_id"
								:options="packageOptions"
								size="sm"
							/>
						</div>
						
						<label v-if="form.client_package_id" class="cursor-pointer label p-0 gap-2 shrink-0">
							<input v-model="form.decrement_package" type="checkbox" class="checkbox checkbox-primary checkbox-sm rounded-lg" />
							<span class="label-text text-xs font-bold text-text-primary">Descontar 1 sesión</span>
						</label>
					</div>
				</div>

				<!-- ACTIONS -->
				<div class="modal-action border-t border-border-subtle pt-4 flex justify-end gap-3">
					<button type="button" class="btn btn-ghost btn-sm rounded-xl font-bold uppercase tracking-wider" @click="handleClose">
						Cancelar
					</button>
					<button
						type="submit"
						class="btn btn-primary btn-sm rounded-xl font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5"
						:disabled="isPending"
					>
						<Save class="w-4 h-4" />
						{{ isPending ? 'Guardando...' : 'Registrar Sesión' }}
					</button>
				</div>

			</form>
		</div>
		<form method="dialog" class="modal-backdrop" @click="handleClose">
			<button>close</button>
		</form>
	</dialog>
</template>
