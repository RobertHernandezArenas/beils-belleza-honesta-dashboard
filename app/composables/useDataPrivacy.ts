import { ref } from 'vue'

export function useDataPrivacy() {
	// Local cache for revealed documents in this component/session
	const revealedDocs = ref<Record<string, string>>({})
	const revealedLoading = ref<Record<string, boolean>>({})

	/**
	 * Toggles document visibility. If hidden, fetches the full document from the server.
	 * @param id entity ID
	 * @param currentMaskedValue currently displayed (likely masked) value
	 */
	const toggleDocumentVisibility = async (id: string, currentMaskedValue: string) => {
		// If already revealed, we just "forget" it from local cache (hide it)
		if (revealedDocs.value[id]) {
			delete revealedDocs.value[id]
			return
		}

		// Otherwise, fetch from server with ?reveal=true
		revealedLoading.value[id] = true
		try {
			const res: any = await $fetch(`/api/clients/${id}`, {
				query: { reveal: 'true' },
			})

			if (res && res.document_number) {
				revealedDocs.value[id] = res.document_number
			}
		} catch (error) {
			console.error('Error revealing document:', error)
		} finally {
			revealedLoading.value[id] = false
		}
	}

	return {
		revealedDocs,
		revealedLoading,
		toggleDocumentVisibility,
	}
}
