<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { Search, User as UserIcon, Trash2, FileCheck } from 'lucide-vue-next'

const props = defineProps<{
	modelValue: string | null // Client ID
	selectedClient: any | null
	disabled?: boolean
	placeholder?: string
	error?: string
}>()

const emit = defineEmits(['update:modelValue', 'update:selectedClient', 'clear-error'])

const clientSearch = ref('')

// Fetch clients
const { data: clientsResponse } = useQuery<any>({
	queryKey: ['clients-list-autocomplete'],
	queryFn: () => $fetch('/api/clients', { query: { limit: 1000 } }),
})

const clients = computed(() => (clientsResponse.value as any)?.data || [])

const filteredClients = computed(() => {
	if (!clients.value.length || !clientSearch.value) return []
	const q = clientSearch.value.toLowerCase()
	return clients.value
		.filter(
			(c: any) =>
				c.name.toLowerCase().includes(q) ||
				c.surname.toLowerCase().includes(q) ||
				c.phone?.includes(q) ||
				c.document_number?.toLowerCase().includes(q),
		)
		.slice(0, 5)
})

const selectClient = (client: any) => {
	emit('update:modelValue', client.user_id)
	emit('update:selectedClient', client)
	clientSearch.value = ''
	emit('clear-error')
}

const removeClient = () => {
	emit('update:modelValue', null)
	emit('update:selectedClient', null)
	clientSearch.value = ''
}
</script>

<template>
	<div class="form-control">
		<label class="label">
			<span class="label-text text-text-secondary text-xs font-bold tracking-wider uppercase">
				Cliente *
			</span>
		</label>
		
		<div class="relative w-full">
			<div v-if="!selectedClient" class="relative">
				<Search class="text-text-muted absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2" />
				<input
					v-model="clientSearch"
					type="text"
					:disabled="disabled"
					:placeholder="placeholder || 'Buscar por nombre, teléfono o DNI...'"
					class="input bg-bg-muted hover:bg-bg-card focus:bg-bg-card focus:border-border-subtle focus:ring-border-subtle/30 text-text-primary placeholder:text-text-muted/50 h-12 w-full rounded-xl border-transparent pl-12 font-medium shadow-inner transition-colors focus:ring-4"
					:class="{ 'border-error focus:border-error focus:ring-error/20': error }"
				/>
				
				<!-- Suggestions Dropdown -->
				<ul
					v-if="clientSearch && filteredClients.length > 0"
					class="bg-bg-card border-border-default absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border shadow-2xl">
					<li v-for="c in filteredClients" :key="c.user_id">
						<button
							type="button"
							@click="selectClient(c)"
							class="hover:bg-bg-muted border-border-default/50 flex w-full items-center justify-between border-b p-4 text-left transition-colors last:border-0">
							<div class="flex flex-col">
								<span class="text-text-primary text-sm font-bold">{{ c.name }} {{ c.surname }}</span>
								<span class="text-text-muted text-xs">{{ c.phone }} — {{ c.document_number }}</span>
							</div>
							<FileCheck class="text-primary h-4 w-4" />
						</button>
					</li>
				</ul>
			</div>

			<div
				v-else
				class="bg-bg-card border-border-default flex items-center justify-between rounded-xl border p-3 pl-4 shadow-sm group transition-all"
				:class="{ 'bg-primary/5 border-primary/20': disabled }">
				<div class="flex items-center gap-3">
					<div
						class="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-full">
						<UserIcon class="h-5 w-5" />
					</div>
					<div class="flex flex-col">
						<span class="text-text-primary text-sm leading-none font-bold">
							{{ selectedClient.name }} {{ selectedClient.surname }}
						</span>
						<span class="text-text-muted mt-1 text-[10px] font-bold tracking-wider uppercase">
							{{ selectedClient.document_number || 'Sin documento' }}
						</span>
					</div>
				</div>
				<button
					v-if="!disabled"
					type="button"
					@click="removeClient"
					class="btn btn-ghost btn-circle btn-sm text-text-muted hover:bg-error/10 hover:text-error">
					<Trash2 class="h-4 w-4" />
				</button>
			</div>
		</div>
		
		<span v-if="error" class="text-error mt-1.5 ml-1 text-xs font-bold">
			{{ error }}
		</span>
	</div>
</template>

<style scoped>
/* Scoped styles to help Vite identify this as a Vue SFC with styles if needed */
</style>
