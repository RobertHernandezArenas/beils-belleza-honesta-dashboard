<script setup lang="ts">
import { ref, reactive, watch, nextTick } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { z } from 'zod'
import { Plus, X, AlertCircle, Save, Sparkles } from 'lucide-vue-next'
import { useModalAnimation } from '~/composables/useModalAnimation'
import AppSelect from '~/components/ui/AppSelect.vue'
import type { TreatmentType, FetchError } from '~~/shared/types/domain'

const props = defineProps<{
	modelValue: boolean
	clientId: string
	treatmentType: TreatmentType
}>()

const emit = defineEmits(['update:modelValue', 'close', 'success'])
const queryClient = useQueryClient()

const dialogRef = ref<HTMLDialogElement | null>(null)
const { animateOpen, animateClose } = useModalAnimation()

const form = reactive({
	zone_name: '',
	phototype: 'III',
	hair_thickness: 'Medio',
	hair_color: 'Castaño',
	hair_density: 'Media',
	notes: ''
})

const error = ref('')

const quickZonesLaser = [
	'Axilas',
	'Piernas completas',
	'Medias piernas',
	'Ingles brasileñas',
	'Ingles completas',
	'Espalda completa',
	'Pecho y abdomen',
	'Brazos',
	'Labio superior / Facial'
]

const quickZonesIndiba = [
	'Facial & Cuello',
	'Abdomen & Flancos',
	'Glúteos & Cartucheras',
	'Piernas & Celulitis',
	'Brazos / Reafirmante',
	'Espalda / Descontracturante'
]

const phototypeOptions = [
	{ value: 'I', label: 'Tipo I: Muy blanca, siempre se quema, no broncea' },
	{ value: 'II', label: 'Tipo II: Blanca, a veces se quema, broncea con dificultad' },
	{ value: 'III', label: 'Tipo III: Blanca, rara vez se quema, broncea fácil' },
	{ value: 'IV', label: 'Tipo IV: Morena, casi nunca se quema, broncea muy fácil' },
	{ value: 'V', label: 'Tipo V: Oscura, se broncea con muchísima facilidad' }
]

const thicknessOptions = [
	{ value: 'Fino', label: 'Fino' },
	{ value: 'Medio', label: 'Medio' },
	{ value: 'Grueso', label: 'Grueso' }
]

const colorOptions = [
	{ value: 'Rubio', label: 'Rubio' },
	{ value: 'Pelirrojo', label: 'Pelirrojo' },
	{ value: 'Claro', label: 'Claro' },
	{ value: 'Castaño', label: 'Castaño' },
	{ value: 'Negro', label: 'Negro' }
]

const densityOptions = [
	{ value: 'Baja', label: 'Baja' },
	{ value: 'Media', label: 'Media' },
	{ value: 'Alta', label: 'Alta' }
]

watch(
	() => props.modelValue,
	newVal => {
		if (newVal) {
			form.zone_name = ''
			form.phototype = 'III'
			form.hair_thickness = 'Medio'
			form.hair_color = 'Castaño'
			form.hair_density = 'Media'
			form.notes = ''
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

const zoneSchema = z.object({
	zone_name: z.string().min(2, 'El nombre de la zona es obligatorio')
})

const { mutate: createZone, isPending } = useMutation({
	mutationFn: async () => {
		zoneSchema.parse({ zone_name: form.zone_name })
		return await $fetch('/api/treatments/zones', {
			method: 'POST',
			body: {
				user_id: props.clientId,
				treatment_type: props.treatmentType,
				zone_name: form.zone_name,
				phototype: props.treatmentType === 'LASER_SHR' ? form.phototype : null,
				hair_thickness: props.treatmentType === 'LASER_SHR' ? form.hair_thickness : null,
				hair_color: props.treatmentType === 'LASER_SHR' ? form.hair_color : null,
				hair_density: props.treatmentType === 'LASER_SHR' ? form.hair_density : null,
				notes: form.notes || null
			}
		})
	},
	onSuccess: () => {
		queryClient.invalidateQueries({ queryKey: ['client', props.clientId] })
		emit('success')
		handleClose()
	},
	onError: (err: FetchError) => {
		error.value = err.data?.statusMessage || 'Error al guardar la zona de tratamiento'
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
							Nueva Zona de Tratamiento
							<span class="badge badge-sm font-black uppercase" :class="treatmentType === 'LASER_SHR' ? 'badge-primary' : 'badge-secondary'">
								{{ treatmentType === 'LASER_SHR' ? 'Láser SHR' : 'Indiba' }}
							</span>
						</h3>
						<p class="text-text-muted text-xs font-semibold">Configuración de diagnóstico base y parámetros iniciales</p>
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
			<form class="space-y-4" @submit.prevent="createZone()">
				
				<!-- Nombre de Zona -->
				<div class="space-y-2">
					<label class="text-xs font-bold text-text-primary uppercase tracking-wider block">
						Nombre de la Zona *
					</label>
					<input
						v-model="form.zone_name"
						type="text"
						placeholder="Ej: Piernas completas, Axilas, Facial..."
						class="input input-bordered w-full rounded-xl bg-bg-muted/30 text-text-primary text-sm font-medium focus:input-primary"
						required
					/>
					
					<!-- Quick chips -->
					<div class="flex flex-wrap gap-1.5 pt-1">
						<span class="text-[10px] text-text-muted font-bold self-center mr-1">Sugerencias:</span>
						<button
							v-for="sug in (treatmentType === 'LASER_SHR' ? quickZonesLaser : quickZonesIndiba)"
							:key="sug"
							type="button"
							class="badge badge-outline badge-sm text-[10px] hover:badge-primary cursor-pointer transition-colors"
							:class="form.zone_name === sug ? 'badge-primary' : ''"
							@click="form.zone_name = sug"
						>
							{{ sug }}
						</button>
					</div>
				</div>

				<!-- ESPECÍFICO LÁSER SHR: FOTOTIPO Y PELO -->
				<div v-if="treatmentType === 'LASER_SHR'" class="space-y-4 pt-2 border-t border-border-subtle">
					
					<!-- Fototipo -->
					<div class="space-y-1.5">
						<label class="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
							<Sparkles class="w-3.5 h-3.5 text-primary" />
							Fototipo Cutáneo (Fitzpatrick)
						</label>
						<AppSelect
							v-model="form.phototype"
							:options="phototypeOptions"
							size="sm"
						/>
					</div>

					<!-- Características del Pelo (Grid 3 cols) -->
					<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
						<div class="space-y-1.5">
							<label class="text-[11px] font-bold text-text-muted uppercase">Grosor</label>
							<AppSelect
								v-model="form.hair_thickness"
								:options="thicknessOptions"
								size="sm"
							/>
						</div>

						<div class="space-y-1.5">
							<label class="text-[11px] font-bold text-text-muted uppercase">Color</label>
							<AppSelect
								v-model="form.hair_color"
								:options="colorOptions"
								size="sm"
							/>
						</div>

						<div class="space-y-1.5">
							<label class="text-[11px] font-bold text-text-muted uppercase">Densidad</label>
							<AppSelect
								v-model="form.hair_density"
								:options="densityOptions"
								size="sm"
							/>
						</div>
					</div>

				</div>

				<!-- Notas adicionales -->
				<div class="space-y-1.5 pt-2">
					<label class="text-xs font-bold text-text-primary uppercase tracking-wider block">
						Notas o Antecedentes de la Zona
					</label>
					<textarea
						v-model="form.notes"
						rows="2"
						placeholder="Tatuajes cercanos, lunares a proteger, cicatrices..."
						class="textarea textarea-bordered w-full rounded-xl bg-bg-muted/30 text-text-primary text-xs font-medium focus:textarea-primary"
					></textarea>
				</div>

				<!-- ACTIONS -->
				<div class="modal-action border-t border-border-subtle pt-4 flex justify-end gap-3">
					<button type="button" class="btn btn-ghost btn-sm rounded-xl font-bold uppercase tracking-wider" @click="handleClose">
						Cancelar
					</button>
					<button
						type="submit"
						class="btn btn-primary btn-sm rounded-xl font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5"
						:disabled="isPending || !form.zone_name"
					>
						<Save class="w-4 h-4" />
						{{ isPending ? 'Guardando...' : 'Crear Zona' }}
					</button>
				</div>

			</form>
		</div>
		<form method="dialog" class="modal-backdrop" @click="handleClose">
			<button>close</button>
		</form>
	</dialog>
</template>
