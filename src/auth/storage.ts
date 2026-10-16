import { useSyncExternalStore } from 'react'

const TOKEN_KEY = 'kurio.token'
const GUEST_KEY = 'kurio.guest'
const listeners = new Set<() => void>()

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null) {
  try {
    if (value) localStorage.setItem(key, value)
    else localStorage.removeItem(key)
  } catch {
    /* Ambiente sem storage: a sessão fica só em memória. */
  }
}

let token = read(TOKEN_KEY)

function emit() {
  for (const listener of listeners) listener()
}

export const authStorage = {
  getToken: () => token,
  setToken: (value: string | null) => {
    token = value
    write(TOKEN_KEY, value)
    emit()
  },
  subscribe: (listener: () => void) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  getGuestId: () => {
    const current = read(GUEST_KEY)
    if (current) return current
    const created = crypto.randomUUID()
    write(GUEST_KEY, created)
    return created
  },
  clearGuest() {
    write(GUEST_KEY, null)
  },
}

export function useAuthToken() {
  return useSyncExternalStore(authStorage.subscribe, authStorage.getToken, authStorage.getToken)
}
