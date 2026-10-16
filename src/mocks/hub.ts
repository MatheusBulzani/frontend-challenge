type Emitter = (event: string, payload: unknown) => void

const emitters = new Set<Emitter>()

export function registerEmitter(emit: Emitter) {
  emitters.add(emit)
  return () => {
    emitters.delete(emit)
  }
}

export function broadcast(event: string, payload: unknown) {
  for (const emit of emitters) {
    try {
      emit(event, payload)
    } catch {
      emitters.delete(emit)
    }
  }
}
