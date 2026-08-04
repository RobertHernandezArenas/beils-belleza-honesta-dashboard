<script setup lang="ts">
import {
	Activity, Zap, ShieldCheck, AlertCircle, CheckCircle2, Plus, ChevronRight
} from 'lucide-vue-next'

const props = defineProps({
	client: { type: Object as PropType<any>, required: true }
})

const emit = defineEmits(['add-consent', 'add-questionnaire'])

// Indiba questionnaire check
const indibaQuestionnaire = computed(() => {
	if (!props.client.questionnaires) return null
	return props.client.questionnaires.find((q: any) => 
		q.title?.toLowerCase().includes('indiba') || q.title?.toLowerCase().includes('radiofrecuencia')
	)
})

// Laser questionnaire check
const laserQuestionnaire = computed(() => {
	if (!props.client.questionnaires) return null
	return props.client.questionnaires.find((q: any) => 
		q.title?.toLowerCase().includes('láser') || q.title?.toLowerCase().includes('laser') || q.title?.toLowerCase().includes('depilación')
	)
})

const indibaContraindications = [
	{ label: 'Marcapasos o implantes electrónicos', safe: true },
	{ label: 'Embarazo o lactancia', safe: true },
	{ label: 'Tromboflebitis o procesos infecciosos', safe: true },
	{ label: 'Prótesis metálicas en zona tratada', safe: true }
]

const laserContraindications = [
	{ label: 'Fototipo de piel (Fitzpatrick)', value: 'Tipo III' },
	{ label: 'Medicamentos fotosensibilizantes', safe: true },
	{ label: 'Exposición solar intensa (últimos 15 días)', safe: true },
	{ label: 'Piel bronceada o autobronceador', safe: true }
]
</script>

<template>
	<div class="space-y-8 transition-all duration-300">
		
		<!-- HEADER & COMPLIANCE SUMMARY -->
		<div class="card bg-bg-card border border-border-default/80 shadow-md rounded-3xl p-6 lg:p-8 space-y-6">
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-4">
				<div class="flex items-center gap-3">
					<div class="p-3 bg-primary/15 text-primary rounded-2xl">
						<Activity class="w-6 h-6" />
					</div>
					<div>
						<h3 class="text-text-primary text-xl font-black tracking-tight flex items-center gap-2">
							Salud Estética & Cuestionarios Médicos
							<div class="tooltip tooltip-right z-50" data-tip="Módulo de evaluación de contraindicaciones y requisitos de seguridad previa a la realización de tratamientos aparatológicos.">
								<AlertCircle class="w-4 h-4 text-text-muted/60 cursor-help" />
							</div>
						</h3>
						<p class="text-text-muted text-xs font-semibold">Evaluación de aptitud para tratamientos Indiba y Depilación Láser Diodo</p>
					</div>
				</div>

				<div class="flex items-center gap-3">
					<button class="btn btn-neutral btn-sm rounded-xl font-bold uppercase tracking-wider shadow-xs" @click="$emit('add-questionnaire')">
						<Plus class="w-4 h-4 mr-1" />
						Nuevo Cuestionario
					</button>
				</div>
			</div>

			<!-- CARDS DE SALUD: INDIBA & LÁSER -->
			<div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
				
				<!-- INDIBA EVALUATION CARD -->
				<div class="bg-bg-muted/20 border border-border-subtle rounded-3xl p-6 space-y-5 hover:border-primary/40 transition-all shadow-xs">
					<div class="flex items-center justify-between border-b border-border-subtle pb-3">
						<div class="flex items-center gap-2.5">
							<div class="p-2 bg-amber-500/15 text-amber-600 rounded-xl">
								<Zap class="w-5 h-5" />
							</div>
							<div>
								<h4 class="text-text-primary text-sm font-black uppercase tracking-wider flex items-center gap-1.5">
									Cuestionario Indiba® Deep Care
									<div class="tooltip tooltip-bottom z-50" data-tip="Formulario técnico que verifica la ausencia de marcapasos, implantes metálicos o gestación para aplicar radiofrecuencia corporal/facial.">
										<AlertCircle class="w-3.5 h-3.5 text-text-muted/60 cursor-help" />
									</div>
								</h4>
								<span class="text-[10px] text-text-muted font-bold">Radiofrecuencia Celular Pro</span>
							</div>
						</div>

						<span 
							class="badge badge-sm font-black uppercase border-none px-2.5 py-1"
							:class="indibaQuestionnaire ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'"
						>
							{{ indibaQuestionnaire ? 'COMPLETADO' : 'PENDIENTE' }}
						</span>
					</div>

					<!-- Checklist de Contraindicaciones Indiba -->
					<div class="space-y-2">
						<span class="text-[10px] font-black uppercase tracking-widest text-text-muted">Criterios de Seguridad Médica</span>
						<div class="space-y-1.5">
							<div v-for="(item, idx) in indibaContraindications" :key="idx" class="flex items-center justify-between text-xs bg-bg-card p-3 rounded-xl border border-border-subtle">
								<span class="font-semibold text-text-primary">{{ item.label }}</span>
								<div class="flex items-center gap-1.5 text-success font-bold text-[10px]">
									<CheckCircle2 class="w-3.5 h-3.5" />
									<span>Apto / Sin Riesgo</span>
								</div>
							</div>
						</div>
					</div>

					<div class="pt-2 flex items-center justify-between text-xs text-text-muted font-medium border-t border-border-subtle">
						<span>Última revisión: {{ indibaQuestionnaire ? new Date(indibaQuestionnaire.created_at).toLocaleDateString() : 'No realizada' }}</span>
						<button class="btn btn-ghost btn-xs font-bold text-primary" @click="$emit('add-questionnaire')">
							Ver Detalles <ChevronRight class="w-3.5 h-3.5" />
						</button>
					</div>
				</div>

				<!-- LÁSER EVALUATION CARD -->
				<div class="bg-bg-muted/20 border border-border-subtle rounded-3xl p-6 space-y-5 hover:border-primary/40 transition-all shadow-xs">
					<div class="flex items-center justify-between border-b border-border-subtle pb-3">
						<div class="flex items-center gap-2.5">
							<div class="p-2 bg-blue-500/15 text-blue-600 rounded-xl">
								<ShieldCheck class="w-5 h-5" />
							</div>
							<div>
								<h4 class="text-text-primary text-sm font-black uppercase tracking-wider flex items-center gap-1.5">
									Cuestionario Depilación Láser
									<div class="tooltip tooltip-bottom z-50" data-tip="Formulario de diagnóstico del fototipo cutáneo y fotosensibilidad previo al tratamiento de depilación de diodo.">
										<AlertCircle class="w-3.5 h-3.5 text-text-muted/60 cursor-help" />
									</div>
								</h4>
								<span class="text-[10px] text-text-muted font-bold">Láser de Diodo de Alta Potencia</span>
							</div>
						</div>

						<span 
							class="badge badge-sm font-black uppercase border-none px-2.5 py-1"
							:class="laserQuestionnaire ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'"
						>
							{{ laserQuestionnaire ? 'COMPLETADO' : 'PENDIENTE' }}
						</span>
					</div>

					<!-- Checklist de Contraindicaciones Láser -->
					<div class="space-y-2">
						<span class="text-[10px] font-black uppercase tracking-widest text-text-muted">Parámetros Fototipo & Piel</span>
						<div class="space-y-1.5">
							<div v-for="(item, idx) in laserContraindications" :key="idx" class="flex items-center justify-between text-xs bg-bg-card p-3 rounded-xl border border-border-subtle">
								<span class="font-semibold text-text-primary">{{ item.label }}</span>
								<div v-if="item.value" class="badge badge-neutral font-mono font-bold text-[10px]">
									{{ item.value }}
								</div>
								<div v-else class="flex items-center gap-1.5 text-success font-bold text-[10px]">
									<CheckCircle2 class="w-3.5 h-3.5" />
									<span>Sin Contraindicación</span>
								</div>
							</div>
						</div>
					</div>

					<div class="pt-2 flex items-center justify-between text-xs text-text-muted font-medium border-t border-border-subtle">
						<span>Última revisión: {{ laserQuestionnaire ? new Date(laserQuestionnaire.created_at).toLocaleDateString() : 'No realizada' }}</span>
						<button class="btn btn-ghost btn-xs font-bold text-primary" @click="$emit('add-questionnaire')">
							Ver Detalles <ChevronRight class="w-3.5 h-3.5" />
						</button>
					</div>
				</div>

			</div>
		</div>

	</div>
</template>

<style scoped>
</style>
