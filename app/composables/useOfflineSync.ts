import Dexie, { type Table } from 'dexie'


export interface SyncAction {
	id?: number
	url: string
	method: string
	body: any
	timestamp: number
}

class OfflineDB extends Dexie {
	syncQueue!: Table<SyncAction>

	constructor() {
		super('BeilsOfflineDB')
		this.version(1).stores({
			syncQueue: '++id, url, timestamp',
		})
	}
}

const db = new OfflineDB()

export const useOfflineSync = () => {
	const isOnline = ref(true)
	const isSyncing = ref(false)

	const updateOnlineStatus = () => {
		isOnline.value = navigator.onLine
		if (isOnline.value) {
			processSyncQueue()
		}
	}

	const addToQueue = async (url: string, method: string, body: any) => {
		await db.syncQueue.add({
			url,
			method,
			body,
			timestamp: Date.now(),
		})
		if (isOnline.value) {
			processSyncQueue()
		}
	}

	const processSyncQueue = async () => {
		if (isSyncing.value) return
		isSyncing.value = true

		try {
			const queue = await db.syncQueue.toArray()
			for (const action of queue) {
				try {
					await $fetch(action.url, {
						method: action.method as any,
						body: action.body,
					})
					await db.syncQueue.delete(action.id!)
				} catch (err) {
					console.error('Failed to sync action:', action, err)
					// If it's a permanent error, maybe delete? 
					// For now, keep it in queue to retry
				}
			}
		} finally {
			isSyncing.value = false
		}
	}

	onMounted(() => {
		window.addEventListener('online', updateOnlineStatus)
		window.addEventListener('offline', updateOnlineStatus)
		updateOnlineStatus()
	})

	onUnmounted(() => {
		window.removeEventListener('online', updateOnlineStatus)
		window.removeEventListener('offline', updateOnlineStatus)
	})

	return {
		isOnline,
		isSyncing,
		addToQueue,
		processSyncQueue,
	}
}
