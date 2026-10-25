<script setup lang="ts">
import type { ClientPackage, ClientPackageShare, ClientDTO, FetchError, PersonRef } from '~~/shared/types/domain'
import { Share2, Search, UserPlus, X } from 'lucide-vue-next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'

const props = defineProps<{
	clientId: string
	clientName: string
}>()

const emit = defineEmits<{ (e: 'toast', message: string, type: 'success' | 'error'): void }>()

const queryClient = useQueryClient()
const isOpen = ref(false)
const pkg = ref<ClientPackage | null>(null)
const beneficiaries = ref<PersonRef[]>([])
const selected = ref<PersonRef[]>([])
const isClientFormOpen = ref(false)
const errorMessage = ref('')

// Search registered clients (debounced) — the owner and current beneficiaries are excluded
const searchInput = ref('')
const searchTerm = useDebouncedRef('', 300)
watch(searchInput, value => (searchTerm.value = value.trim()))

const { data: searchResults, isFetching: isSearching } = useQuery({
	queryKey: ['clients-share-search', searchTerm],
	queryFn: () =>
		$fetch<{ data: ClientDTO[] }>('/api/clients', { query: { search: searchTerm.value, limit: 8, status: 'ON' } }),
	enabled: computed(() => isOpen.value && searchTerm.value.length >= 2),
})

const takenIds = computed(
	() => new Set([props.clientId, ...beneficiaries.value.map(b => b.user_id), ...selected.value.map(s => s.user_id)]),
)
const candidates = computed(() => (searchResults.value?.data ?? []).filter(c => !takenIds.value.has(c.user_id)))

const toPerson = (c: Pick<ClientDTO, 'user_id' | 'name' | 'surname'> & { avatar?: string | null }): PersonRef => ({
	user_id: c.user_id,
	name: c.name,
	surname: c.surname,
	avatar: c.avatar ?? null,
})

const select = (c: ClientDTO) => {
	selected.value.push(toPerson(c))
	searchInput.value = ''
}
const unselect = (id: string) => (selected.value = selected.value.filter(s => s.user_id !== id))

const onClientCreated = (saved?: ClientDTO) => {
	if (saved?.user_id && !takenIds.value.has(saved.user_id)) selected.value.push(toPerson(saved))
}

const refreshClient = () => {
	queryClient.invalidateQueries({ queryKey: ['client', props.clientId] })
	queryClient.invalidateQueries({ queryKey: ['client-packages-agenda'] })
}

const apiError = (err: FetchError, fallback: string) => err.data?.statusMessage || fallback

const { mutate: share, isPending: isSharing } = useMutation({
	mutationFn: () =>
		$fetch<ClientPackageShare[]>(`/api/clients/${props.clientId}/packages/${pkg.value!.client_package_id}/shares`, {
			method: 'POST',
			body: { user_ids: selected.value.map(s => s.user_id) },
		}),
	onSuccess: shares => {
		const count = selected.value.length
		beneficiaries.value = shares.filter(s => s.user).map(s => s.user as PersonRef)
		selected.value = []
		refreshClient()
		emit('toast', count === 1 ? 'Bono compartido' : `Bono compartido con ${count} personas`, 'success')
	},
	onError: (err: FetchError) => (errorMessage.value = apiError(err, 'No se pudo compartir el bono')),
})

const removingId = ref<string | null>(null)
const { mutate: revoke } = useMutation({
	mutationFn: (userId: string) =>
		$fetch(`/api/clients/${props.clientId}/packages/${pkg.value!.client_package_id}/shares/${userId}`, { method: 'DELETE' }),
	onMutate: userId => (removingId.value = userId),
	onSuccess: (_res, userId) => {
		beneficiaries.value = beneficiaries.value.filter(b => b.user_id !== userId)
		refreshClient()
	},
	onError: (err: FetchError) => (errorMessage.value = apiError(err, 'No se pudo quitar el acceso')),
	onSettled: () => (removingId.value = null),
})

const fullName = (p: PersonRef) => `${p.name} ${p.surname || ''}`.trim()
const initials = (p: PersonRef) => `${p.name?.charAt(0) || ''}${p.surname?.charAt(0) || ''}`

const openModal = (clientPackage: ClientPackage) => {
	pkg.value = clientPackage
	beneficiaries.value = (clientPackage.shares ?? []).filter(s => s.user).map(s => s.user as PersonRef)
	selected.value = []
	searchInput.value = ''
	errorMessage.value = ''
	isOpen.value = true
}

const closeModal = () => (isOpen.value = false)

defineExpose({ openModal, closeModal })
</script>

<template>
	<div v-if="isOpen && pkg" class="modal modal-open z-1000 backdrop-blur-sm bg-black/40" @click.self="closeModal">
		<div class="modal-box max-w-lg bg-bg-card border border-border-default rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-5">
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-border-default pb-4">
				<div class="flex items-center gap-3">
					<div class="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
						<Share2 class="size-5" />
					</div>
					<div>
						<h3 class="text-lg font-black text-text-primary uppercase tracking-wide">Compartir Bono</h3>
						<p class="text-xs text-text-muted">
							<span class="font-bold text-text-primary">{{ pkg.package?.name || 'Bono' }}</span> de {{ clientName }}
							· {{ pkg.remaining_sessions }} sesiones en común
						</p>
					</div>
				</div>
				<button type="button" class="btn btn-sm btn-ghost btn-circle text-text-muted hover:text-text-primary" aria-label="Cerrar" @click="closeModal">
					<X class="size-5" />
				</button>
			</div>

			<!-- Current beneficiaries -->
			<section class="space-y-2">
				<p class="text-[10px] font-black uppercase tracking-wider text-text-muted">Con acceso ({{ beneficiaries.length }})</p>
				<p v-if="beneficiaries.length === 0" class="text-xs text-text-muted">
					Todavía no se compartió con nadie. Quien tenga acceso consume de las mismas sesiones.
				</p>
				<ul v-else class="motion-stagger space-y-1.5">
					<li
						v-for="b in beneficiaries"
						:key="b.user_id"
						class="flex items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-bg-muted/20 px-3 py-2"
					>
						<span class="flex items-center gap-2.5 min-w-0">
							<span class="size-8 shrink-0 rounded-full bg-primary/10 text-primary text-[11px] font-black flex items-center justify-center overflow-hidden">
								<img v-if="b.avatar" :src="b.avatar" alt="" class="size-full object-cover" >
								<template v-else>{{ initials(b) }}</template>
							</span>
							<span class="truncate text-sm font-bold text-text-primary">{{ fullName(b) }}</span>
						</span>
						<button
							type="button"
							class="cta btn btn-ghost btn-xs rounded-xl font-bold text-error/80 hover:text-error hover:bg-error/10 border border-border-subtle"
							:disabled="removingId === b.user_id"
							@click="revoke(b.user_id)"
						>
							<span class="cta-swap" :data-busy="removingId === b.user_id || undefined">
								<span :aria-hidden="removingId === b.user_id">Quitar</span>
								<span :aria-hidden="removingId !== b.user_id"><span class="loading loading-spinner loading-xs" /></span>
							</span>
						</button>
					</li>
				</ul>
			</section>

			<!-- Add people -->
			<section class="space-y-2.5">
				<p class="text-[10px] font-black uppercase tracking-wider text-text-muted">Añadir personas</p>

				<div v-if="selected.length" class="flex flex-wrap gap-1.5">
					<span
						v-for="s in selected"
						:key="s.user_id"
						class="motion-pop inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary pl-3 pr-1 py-1 text-xs font-bold"
					>
						{{ fullName(s) }}
						<button type="button" class="btn btn-ghost btn-circle btn-xs size-5 min-h-0" :aria-label="`Quitar ${fullName(s)}`" @click="unselect(s.user_id)">
							<X class="size-3" />
						</button>
					</span>
				</div>

				<label class="input input-sm w-full rounded-xl bg-bg-card border-border-default flex items-center gap-2">
					<Search class="size-4 text-text-muted shrink-0" />
					<input v-model="searchInput" type="search" class="grow" placeholder="Buscar cliente por nombre, email o teléfono…" >
					<span v-if="isSearching" class="loading loading-spinner loading-xs text-text-muted" />
				</label>

				<ul v-if="candidates.length" class="motion-stagger max-h-56 overflow-y-auto rounded-2xl border border-border-subtle divide-y divide-border-subtle">
					<li v-for="c in candidates" :key="c.user_id">
						<button type="button" class="w-full px-3 py-2 text-left hover:bg-bg-muted/40 transition-colors" @click="select(c)">
							<span class="block truncate text-sm font-bold text-text-primary">{{ c.name }} {{ c.surname }}</span>
							<span class="block truncate text-[11px] text-text-muted">{{ c.email }} · {{ c.phone }}</span>
						</button>
					</li>
				</ul>
				<p v-else-if="searchTerm.length >= 2 && !isSearching" class="text-xs text-text-muted">
					Sin resultados para «{{ searchTerm }}».
				</p>

				<button type="button" class="cta btn btn-ghost btn-xs rounded-xl font-bold text-primary gap-1.5" @click="isClientFormOpen = true">
					<UserPlus class="cta-icon size-3.5" />
					¿No está registrada? Crear cliente
				</button>
			</section>

			<p v-if="errorMessage" class="rounded-xl bg-error/10 px-3 py-2 text-xs font-bold text-error">{{ errorMessage }}</p>

			<!-- Actions -->
			<div class="flex items-center justify-end gap-3 border-t border-border-default pt-4">
				<button type="button" class="btn btn-ghost rounded-xl text-xs uppercase font-bold" @click="closeModal">Cerrar</button>
				<button
					type="button"
					class="cta btn btn-primary rounded-xl font-black uppercase text-xs shadow-sm"
					:disabled="selected.length === 0 || isSharing"
					@click="errorMessage = ''; share()"
				>
					<span class="cta-swap" :data-busy="isSharing || undefined">
						<span :aria-hidden="isSharing">Compartir{{ selected.length ? ` con ${selected.length}` : '' }}</span>
						<span :aria-hidden="!isSharing"><span class="loading loading-spinner loading-sm" />Compartiendo…</span>
					</span>
				</button>
			</div>
		</div>

		<LazyClientsClientFormModal v-if="isClientFormOpen" v-model="isClientFormOpen" @success="onClientCreated" />
	</div>
</template>
