

type SyncEvent = {
  type: 'REFRESH_CLIENT' | 'REFRESH_BOOKINGS' | 'REFRESH_SALES'
  clientId?: string
  payload?: unknown
}

let sharedChannel: BroadcastChannel | null = null

const getChannel = () => {
  if (typeof window === 'undefined') return null
  if (!sharedChannel) {
    sharedChannel = new BroadcastChannel('beils-sync-channel')
  }
  return sharedChannel
}

export const useSync = () => {
  const emitSync = (event: SyncEvent) => {
    const channel = getChannel()
    if (channel) {
      channel.postMessage(JSON.parse(JSON.stringify(event)))
    }
  }

  const onSync = (callback: (event: SyncEvent) => void) => {
    const channel = getChannel()
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
