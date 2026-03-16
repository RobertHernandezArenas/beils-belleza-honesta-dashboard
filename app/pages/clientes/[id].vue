<script setup lang="ts">
	import { useQuery } from '@tanstack/vue-query'
	import { useRoute } from 'vue-router'
	import {
		ArrowLeft,
		User,
		Phone,
		Mail,
		MapPin,
		Calendar,
		FileText,
		FileSignature,
		AlertCircle,
		CalendarDays,
		ExternalLink,
		XCircle,
		Eye,
		EyeOff,
	} from 'lucide-vue-next'
	import { useI18n } from 'vue-i18n'
	import { useDataPrivacy } from '~/composables/useDataPrivacy'

	definePageMeta({ layout: 'default' })
	const { t, locale } = useI18n()
	const route = useRoute()
	const clientId = route.params.id as string

	const currentTab = ref('info') // info, consents, questionnaires, bookings

	const {
		data: client,
		isPending,
		error,
	} = useQuery<any, any>({
		queryKey: ['client', clientId],
		queryFn: () => $fetch(`/api/clients/${clientId}`),
	})

	useHead({
		title: computed(() =>
			client.value ? `${client.value.name} ${client.value.surname} | Perfil CRM` : 'Cargando Cliente...',
		),
	})

	const formatDate = (dateStr: string) => {
		if (!dateStr) return 'N/A'
		return new Intl.DateTimeFormat(locale.value, {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
		}).format(new Date(dateStr))
	}

	const formatDateTime = (dateStr: string) => {
		if (!dateStr) return 'N/A'
		return new Intl.DateTimeFormat(locale.value, {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		}).format(new Date(dateStr))
	}

	const getStatusBadge = (status: string) => {
		return status === 'ON' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
	}

	// Privacidad de documentos
	const { revealedDocs, revealedLoading, toggleDocumentVisibility } = useDataPrivacy()
</script>

<template>
	<div class="bg-bg-app min-h-screen w-full p-4 font-sans lg:p-10">
		<div class="mx-auto max-w-[1200px]">
			<div class="mb-8 flex items-center gap-4">
				<NuxtLink
					to="/clientes"
					class="btn btn-circle btn-ghost bg-bg-card hover:bg-bg-muted border-border-subtle hover:border-text-secondary border shadow-sm transition-colors">
					<ArrowLeft class="text-text-primary h-5 w-5" />
				</NuxtLink>
				<div>
					<h1 class="text-text-primary flex items-center gap-3 text-3xl font-medium tracking-tight">
						Perfil del Cliente
						<div
							v-if="client"
							class="rounded-full px-3 py-1 text-xs font-bold uppercase"
							:class="getStatusBadge(client.status)">
							{{ client.status }}
						</div>
					</h1>
				</div>
			</div>

			<div v-if="isPending" class="animate-pulse space-y-6">
				<div class="bg-bg-card h-40 w-full rounded-3xl"></div>
				<div class="bg-bg-card mt-6 h-96 w-full rounded-3xl"></div>
			</div>

			<div
				v-else-if="error"
				class="bg-error/10 text-error flex flex-col items-center justify-center rounded-3xl p-10 text-center">
				<AlertCircle class="mb-4 h-12 w-12" />
				<p class="text-lg font-bold">Error al cargar el perfil</p>
				<p class="mt-2 text-sm opacity-80">
					{{ error.statusMessage || 'No hemos podido cargar los datos de este cliente.' }}
				</p>
			</div>

			<div v-else-if="client" class="space-y-6">
				<!-- User Profile Header -->
				<div
					class="bg-bg-card border-border-subtle flex flex-col items-start gap-6 rounded-3xl border p-6 shadow-sm md:flex-row md:items-center lg:p-8">
					<div
						class="bg-primary/10 text-primary border-primary/20 flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl border">
						<span class="text-4xl font-bold tracking-tight">
							{{ client.name.charAt(0) }}{{ client.surname.charAt(0) }}
						</span>
					</div>

					<div class="flex-1">
						<h2 class="text-text-primary text-2xl font-bold">{{ client.name }} {{ client.surname }}</h2>
						<div class="text-text-secondary mt-2 flex flex-wrap gap-4 text-sm font-medium">
							<span class="flex items-center gap-1.5">
								<Mail class="h-4 w-4" />
								{{ client.email || 'Sin correo' }}
							</span>
							<span class="flex items-center gap-1.5">
								<Phone class="h-4 w-4" />
								{{ client.phone || 'Sin teléfono' }}
							</span>
							<div class="flex items-center gap-1.5">
								<FileText class="h-4 w-4" />
								<span>
									{{ client.document_type }}:
									{{ revealedDocs[client.user_id] || client.document_number || 'N/A' }}
								</span>
								<button
									class="text-text-muted hover:text-primary ml-1 transition-colors disabled:opacity-50"
									role="button"
									:aria-label="revealedDocs[client.user_id] ? 'Ocultar' : 'Mostrar'"
									:disabled="revealedLoading[client.user_id]"
									@click="toggleDocumentVisibility(client.user_id, client.document_number)">
									<span
										v-if="revealedLoading[client.user_id]"
										class="loading loading-spinner loading-xs h-3 w-3"></span>
									<component
										v-else
										:is="revealedDocs[client.user_id] ? EyeOff : Eye"
										class="h-3.5 w-3.5" />
								</button>
							</div>
						</div>
					</div>
				</div>

				<!-- Tabs & Content Area -->
				<div class="bg-bg-card border-border-subtle overflow-hidden rounded-3xl border shadow-sm">
					<div class="border-border-subtle bg-bg-muted/30 flex overflow-x-auto border-b">
						<button
							class="flex items-center gap-2 border-b-2 px-6 py-4 text-sm font-bold whitespace-nowrap transition-colors"
							:class="
								currentTab === 'info'
									? 'border-primary text-primary bg-bg-card'
									: 'text-text-secondary hover:text-text-primary hover:bg-bg-card/50 border-transparent'
							"
							@click="currentTab = 'info'">
							<User class="h-4 w-4" />
							Información Personal
						</button>
						<button
							class="flex items-center gap-2 border-b-2 px-6 py-4 text-sm font-bold whitespace-nowrap transition-colors"
							:class="
								currentTab === 'consents'
									? 'border-primary text-primary bg-bg-card'
									: 'text-text-secondary hover:text-text-primary hover:bg-bg-card/50 border-transparent'
							"
							@click="currentTab = 'consents'">
							<FileSignature class="h-4 w-4" />
							Consentimientos ({{ client.consents?.length || 0 }})
						</button>
						<button
							class="flex items-center gap-2 border-b-2 px-6 py-4 text-sm font-bold whitespace-nowrap transition-colors"
							:class="
								currentTab === 'questionnaires'
									? 'border-primary text-primary bg-bg-card'
									: 'text-text-secondary hover:text-text-primary hover:bg-bg-card/50 border-transparent'
							"
							@click="currentTab = 'questionnaires'">
							<FileText class="h-4 w-4" />
							Cuestionarios ({{ client.questionnaires?.length || 0 }})
						</button>
						<button
							class="flex items-center gap-2 border-b-2 px-6 py-4 text-sm font-bold whitespace-nowrap transition-colors"
							:class="
								currentTab === 'bookings'
									? 'border-primary text-primary bg-bg-card'
									: 'text-text-secondary hover:text-text-primary hover:bg-bg-card/50 border-transparent'
							"
							@click="currentTab = 'bookings'">
							<CalendarDays class="h-4 w-4" />
							Historial de Citas
						</button>
					</div>

					<div class="min-h-[400px] p-6 lg:p-8">
						<!-- INFO TAB -->
						<div v-if="currentTab === 'info'" class="grid grid-cols-1 gap-8 md:grid-cols-2">
							<div class="space-y-6">
								<div>
									<h3 class="text-text-primary mb-4 flex items-center gap-2 font-bold">
										<MapPin class="text-primary h-5 w-5" />
										Ubicación
									</h3>
									<div class="bg-bg-muted space-y-3 rounded-2xl p-4">
										<div class="border-border-default flex justify-between border-b pb-2">
											<span class="text-text-muted text-sm font-medium">Dirección</span>
											<span class="text-text-primary text-sm font-bold">
												{{ client.address || 'N/A' }}
											</span>
										</div>
										<div class="border-border-default flex justify-between border-b pb-2">
											<span class="text-text-muted text-sm font-medium">Ciudad</span>
											<span class="text-text-primary text-sm font-bold">
												{{ client.city || 'N/A' }}
											</span>
										</div>
										<div class="border-border-default flex justify-between border-b pb-2">
											<span class="text-text-muted text-sm font-medium">Código Postal</span>
											<span class="text-text-primary text-sm font-bold">
												{{ client.postal_code || 'N/A' }}
											</span>
										</div>
										<div class="flex justify-between">
											<span class="text-text-muted text-sm font-medium">País</span>
											<span class="text-text-primary text-sm font-bold">
												{{ client.country || 'N/A' }}
											</span>
										</div>
									</div>
								</div>
							</div>
							<div class="space-y-6">
								<div>
									<h3 class="text-text-primary mb-4 flex items-center gap-2 font-bold">
										<Calendar class="text-primary h-5 w-5" />
										Datos Demográficos
									</h3>
									<div class="bg-bg-muted space-y-3 rounded-2xl p-4">
										<div class="border-border-default flex justify-between border-b pb-2">
											<span class="text-text-muted text-sm font-medium">Fecha Nacimiento</span>
											<span class="text-text-primary text-sm font-bold">
												{{ formatDate(client.birth_date) }}
											</span>
										</div>
										<div class="border-border-default flex justify-between border-b pb-2">
											<span class="text-text-muted text-sm font-medium">Género</span>
											<span class="text-text-primary text-sm font-bold capitalize">
												{{ client.gender || 'N/A' }}
											</span>
										</div>
										<div class="flex justify-between">
											<span class="text-text-muted text-sm font-medium">Registrado el</span>
											<span class="text-text-primary text-sm font-bold">
												{{ formatDate(client.created_at) }}
											</span>
										</div>
									</div>
								</div>
							</div>
						</div>

						<!-- CONSENTS TAB -->
						<div v-else-if="currentTab === 'consents'" class="space-y-4">
							<div
								v-if="client.consents?.length > 0"
								class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
								<div
									v-for="consent in client.consents"
									:key="consent.consent_id"
									class="bg-bg-muted border-border-subtle flex flex-col justify-between rounded-2xl border p-5">
									<div>
										<div class="mb-2 flex items-start justify-between">
											<div class="bg-success/10 text-success rounded-xl p-2">
												<FileSignature class="h-5 w-5" />
											</div>
											<span
												class="bg-bg-card border-border-subtle rounded-md border px-2 py-1 text-xs font-bold uppercase shadow-sm">
												{{ consent.status }}
											</span>
										</div>
										<p class="text-text-primary mt-3 truncate text-sm font-bold">
											{{ consent.document_url.split('/').pop() || 'Documento Firmado' }}
										</p>
										<p class="text-text-muted mt-1 text-xs font-medium">
											Firmado: {{ formatDateTime(consent.signed_date) }}
										</p>
									</div>
									<div class="border-border-default mt-4 flex justify-end border-t pt-4">
										<a
											:href="consent.document_url"
											target="_blank"
											class="text-primary hover:text-text-primary flex items-center gap-1 text-xs font-bold transition-colors">
											Ver Archivo
											<ExternalLink class="h-3 w-3" />
										</a>
									</div>
								</div>
							</div>
							<div v-else class="py-12 text-center">
								<FileSignature class="text-text-muted mx-auto mb-3 h-10 w-10 opacity-50" />
								<p class="text-text-primary font-bold">Sin consentimientos</p>
								<p class="text-text-muted mt-1 text-sm">
									Este cliente no ha firmado documentos todavía.
								</p>
							</div>
						</div>

						<!-- QUESTIONNAIRES TAB -->
						<div v-else-if="currentTab === 'questionnaires'" class="space-y-4">
							<div
								v-if="client.questionnaires?.length > 0"
								class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
								<div
									v-for="q in client.questionnaires"
									:key="q.questionnaire_id"
									class="bg-bg-muted border-border-subtle rounded-2xl border p-5">
									<div class="bg-primary/10 text-primary mb-3 w-max rounded-xl p-2">
										<FileText class="h-5 w-5" />
									</div>
									<h4 class="text-text-primary text-sm font-bold">{{ q.title }}</h4>
									<p class="text-text-muted mt-1 text-xs font-medium">
										Completado: {{ formatDate(q.created_at) }}
									</p>
									<button
										class="btn btn-sm bg-bg-card hover:bg-border-subtle border-border-subtle text-text-secondary mt-4 w-full rounded-xl text-xs font-bold">
										Ver Respuestas
									</button>
								</div>
							</div>
							<div v-else class="py-12 text-center">
								<FileText class="text-text-muted mx-auto mb-3 h-10 w-10 opacity-50" />
								<p class="text-text-primary font-bold">Sin cuestionarios</p>
								<p class="text-text-muted mt-1 text-sm">
									No hay cuestionarios de salud o estética registrados.
								</p>
							</div>
						</div>

						<!-- BOOKINGS TAB -->
						<div v-else-if="currentTab === 'bookings'" class="space-y-4">
							<div class="border-border-subtle w-full overflow-x-auto rounded-2xl border">
								<table v-if="client.client_bookings?.length > 0" class="table w-full text-sm">
									<thead class="bg-bg-card text-text-secondary border-border-subtle border-b">
										<tr>
											<th class="font-bold">Fecha y Hora</th>
											<th class="font-bold">Servicio/Pack</th>
											<th class="font-bold">Estado</th>
										</tr>
									</thead>
									<tbody>
										<tr
											v-for="booking in client.client_bookings"
											:key="booking.booking_id"
											class="border-border-default hover:bg-bg-muted/50 border-b transition-colors">
											<td class="text-text-primary font-medium">
												{{ formatDate(booking.booking_date) }}
												<span class="text-text-muted ml-1">{{ booking.start_time }}</span>
											</td>
											<td class="text-text-secondary font-medium capitalize">
												{{ booking.item_type }}
											</td>
											<td>
												<span
													class="rounded-md px-2 py-1 text-xs font-bold"
													:class="{
														'bg-warning/10 text-warning': booking.status === 'pending',
														'bg-success/10 text-success': booking.status === 'completed',
														'bg-primary/10 text-primary': booking.status === 'confirmed',
														'bg-error/10 text-error':
															booking.status === 'cancelled' || booking.status === 'no_show',
													}">
													{{ booking.status }}
												</span>
											</td>
										</tr>
									</tbody>
								</table>
								<div v-else class="bg-bg-muted py-12 text-center">
									<CalendarDays class="text-text-muted mx-auto mb-3 h-10 w-10 opacity-50" />
									<p class="text-text-primary font-bold">Sin historial de citas</p>
									<p class="text-text-muted mt-1 text-sm">
										Este cliente es nuevo o nunca ha agendado.
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
