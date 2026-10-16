import { useSyncExternalStore } from 'react'

export type Notice = { id: string; message: string }

let notices: Notice[] = []
const listeners = new Set<() => void>()
const recent = new Set<string>()

function emit() {
  for (const listener of listeners) listener()
}

export function pushNotice(message: string) {
  if (recent.has(message)) return
  recent.add(message)
  window.setTimeout(() => recent.delete(message), 1500)
  const notice = { id: crypto.randomUUID(), message }
  notices = [...notices, notice].slice(-3)
  emit()
  window.setTimeout(() => {
    notices = notices.filter((item) => item.id !== notice.id)
    emit()
  }, 5000)
}

export function useNotices() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => notices,
    () => notices,
  )
}
