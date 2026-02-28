<template>
	<div class="relative overflow-hidden rounded-[2rem] bg-[#ffffff] p-1 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
		<!-- Glow interno del contenedor -->
		<div
			class="pointer-events-none absolute inset-0 z-0 bg-linear-to-b from-[#fbfaf9] to-transparent"></div>

		<div class="relative z-10 w-full overflow-hidden overflow-x-auto rounded-[1.75rem]">
			<table class="table w-full border-collapse">
				<thead class="bg-[#f4f1ee]">
					<tr
						class="border-b border-transparent text-xs font-medium tracking-wider text-[#666666] uppercase">
						<th class="px-6 py-5">{{ $t('users.table.user') }}</th>
						<th class="px-6 py-5">{{ $t('users.table.role') }}</th>
						<th class="px-6 py-5">{{ $t('users.table.status') }}</th>
						<th class="px-6 py-5 text-right">{{ $t('users.table.actions') }}</th>
					</tr>
				</thead>
				<tbody v-if="pending" class="min-h-[400px]">
					<tr v-for="i in 5" :key="i" class="border-b border-transparent/60">
						<td class="px-6 py-4">
							<div class="skeleton h-12 w-48 rounded bg-[#f2f0eb]"></div>
						</td>
						<td class="px-6 py-4">
							<div class="skeleton h-6 w-24 rounded bg-[#f2f0eb]"></div>
						</td>
						<td class="px-6 py-4">
							<div class="skeleton h-6 w-20 rounded bg-[#f2f0eb]"></div>
						</td>
						<td class="px-6 py-4 text-right">
							<div class="skeleton ml-auto h-8 w-32 rounded bg-[#f2f0eb]"></div>
						</td>
					</tr>
				</tbody>
				<tbody v-else class="min-h-[400px]">
					<tr
						v-for="user in users"
						:key="user.user_id"
						class="cursor-pointer transition-colors hover:bg-[#fbfaf9]"
						@click="$emit('edit', user)">
						<td class="px-6 py-4">
							<div class="flex items-center gap-4">
								<div class="avatar">
									<div
										class="ring-offset-base-100 w-12 rounded-full ring ring-[#dbd2c6] ring-offset-2">
										<img
											:src="user.avatar || ''"
											alt="Avatar"
											width="48"
											height="48"
											class="object-cover brightness-110 saturate-0" />
									</div>
								</div>
								<div>
									<div class="text-base font-bold text-[#404040]">
										{{ user.name }} {{ user.surname }}
									</div>
									<div class="text-xs font-semibold tracking-wider text-[#8c8c8c]">
										{{ user.email }}
									</div>
								</div>
							</div>
						</td>
						<td class="px-6 py-4">
							<div class="flex items-center gap-2">
								<ShieldCheck v-if="user.role === 'ADMIN'" class="h-4 w-4 text-[#404040]" />
								<User v-else class="h-4 w-4 text-[#8c8c8c]" />
								<span class="text-sm font-bold text-[#666666]">
									{{ $t('users.constants.roles.' + user.role) }}
								</span>
							</div>
						</td>
						<td class="px-6 py-4">
							<div
								class="badge badge-lg gap-1.5 rounded-full border text-xs font-medium tracking-wide uppercase shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
								:class="
									user.status === 'ON'
										? 'border-green-300 bg-green-100 text-green-700'
										: 'border-transparent bg-[#fbfaf9] text-[#8c8c8c]'
								">
								<div
									class="h-1.5 w-1.5 rounded-full"
									:class="
										user.status === 'ON' ? 'animate-pulse bg-green-500' : 'bg-[#bababa]'
									"></div>
								{{ $t('users.constants.status.' + user.status) }}
							</div>
						</td>
						<td class="px-6 py-4 text-right">
							<div class="flex items-center justify-end gap-2">
								<!-- Toggle Activar/Desactivar -->
								<div
									class="tooltip tooltip-left"
									:data-tip="
										user.status === 'ON'
											? $t('users.messages.statusOff')
											: $t('users.messages.statusOn')
									">
									<button
										class="btn btn-circle btn-sm btn-ghost hover:bg-[#f2f0eb]"
										:aria-label="
											user.status === 'ON'
												? $t('users.messages.statusOff')
												: $t('users.messages.statusOn')
										"
										@click.stop="$emit('toggle-status', user)">
										<ToggleRight v-if="user.status === 'ON'" class="h-5 w-5 text-green-600" />
										<ToggleLeft v-else class="h-5 w-5 text-[#8c8c8c]" />
									</button>
								</div>

								<!-- Editar -->
								<div class="tooltip tooltip-left" :data-tip="$t('users.form.editTitle')">
									<button
										class="btn btn-circle btn-sm btn-ghost hover:bg-[#f2f0eb]"
										:aria-label="$t('users.form.editTitle')"
										@click.stop="$emit('edit', user)">
										<Pencil class="h-4 w-4 text-[#666666]" />
									</button>
								</div>

								<!-- Eliminar -->
								<div class="tooltip tooltip-left tooltip-error" :data-tip="$t('users.delete.title')">
									<button
										class="btn btn-circle btn-sm btn-ghost hover:bg-red-100"
										:aria-label="$t('users.delete.title')"
										@click.stop="$emit('delete', user)">
										<Trash2 class="h-4 w-4 text-red-600" />
									</button>
								</div>
							</div>
						</td>
					</tr>

					<!-- Filas vacías para mantener la altura cuando hay menos de 5 usuarios -->
					<tr
						v-if="users.length > 0 && users.length < itemsPerPage"
						v-for="i in itemsPerPage - users.length"
						:key="`empty-${i}`"
						class="pointer-events-none h-[81px] border-b border-transparent">
						<td class="px-6 py-4"></td>
						<td class="px-6 py-4"></td>
						<td class="px-6 py-4"></td>
						<td class="px-6 py-4"></td>
					</tr>
				</tbody>
			</table>

			<!-- Empty State -->
			<div
				v-if="!pending && users.length === 0"
				class="flex min-h-[400px] flex-col items-center justify-center py-16 text-center">
				<div class="mb-4 rounded-full bg-[#fbfaf9] p-6 ring-1 ring-[#dbd2c6]">
					<Users class="h-12 w-12 text-[#bababa]" />
				</div>
				<h3 class="text-xl font-bold text-[#404040]">{{ $t('users.table.empty') }}</h3>
			</div>
		</div>

		<!-- Pagination Footer -->
		<UiAppPagination
			v-if="!pending && totalItems > itemsPerPage"
			:total-items="totalItems"
			:items-per-page="itemsPerPage"
			:model-value="currentPage"
			@update:model-value="$emit('update:currentPage', $event)" />
	</div>
</template>

<script setup lang="ts">
	import { ShieldCheck, User, ToggleLeft, ToggleRight, Pencil, Trash2, Users } from 'lucide-vue-next'

	defineProps<{
		users: any[]
		pending: boolean
		totalItems: number
		itemsPerPage: number
		currentPage: number
	}>()

	defineEmits(['edit', 'delete', 'toggle-status', 'update:currentPage'])
</script>
