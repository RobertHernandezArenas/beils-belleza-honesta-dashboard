

type SyncEvent = {
  type: 'REFRESH_CLIENT' | 'REFRESH_BOOKINGS' | 'REFRESH_SALES'
  clientId?: string
  payload?: any
}

export const useSync = () => {
  const channel = typeof window !== 'undefined' ? new BroadcastChannel('beils-sync-channel') : null

  const emitSync = (event: SyncEvent) => {
    if (channel) {
      channel.postMessage(JSON.parse(JSON.stringify(event)))
    }
  }

  const onSync = (callback: (event: SyncEvent) => void) => {
    if (!channel) return

    const handler = (e: MessageEvent) => {
      callback(e.data)
    }

    onMounted(() => {
      channel.addEventListener('message', handler)
    })

    onUnmounted(() => {
      channel.removeEventListener('message', handler)
    })
  }

  return {
    emitSync,
    onSync
  }
}
