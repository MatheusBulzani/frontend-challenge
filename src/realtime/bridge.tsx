import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { io, type Socket } from 'socket.io-client'
import { api } from '../api/client.ts'
import { authStorage } from '../auth/storage.ts'
import type { CartLine, Nft, NftListResponse, Order } from '../domain/types.ts'
import { pushNotice } from '../ui/notices.ts'

type NftUpdated = {
  eventId: string
  resourceId: string
  version: number
  priceEth: string
  available: number
  editionId: string
}

type OrderUpdated = {
  eventId: string
  resourceId: string
  version: number
  userId: string
  status: Order['status']
}

const versions = new Map<string, number>()
const seenEvents = new Set<string>()

function accept(eventId: string, resourceId: string, version: number) {
  if (seenEvents.has(eventId)) return false
  seenEvents.add(eventId)
  const current = versions.get(resourceId) ?? 0
  if (version <= current) return false
  versions.set(resourceId, version)
  return true
}

function patchNft(queryClient: ReturnType<typeof useQueryClient>, event: NftUpdated) {
  queryClient.setQueriesData<NftListResponse>({ queryKey: ['nfts'] }, (current) => {
    if (!current) return current
    return {
      ...current,
      items: current.items.map((item) =>
        item.id === event.resourceId
          ? { ...item, priceEth: event.priceEth, available: event.available, version: event.version }
          : item,
      ),
    }
  })
  queryClient.setQueriesData<Nft>({ queryKey: ['nft', event.resourceId] }, (current) => {
    if (!current) return current
    return {
      ...current,
      version: event.version,
      editions: current.editions.map((edition) =>
        edition.id === event.editionId ? { ...edition, priceEth: event.priceEth, available: event.available } : edition,
      ),
    }
  })
  queryClient.setQueriesData<{ items: CartLine[] }>({ queryKey: ['cart'] }, (current) => {
    if (!current) return current
    return {
      ...current,
      items: current.items.map((item) =>
        item.nftId === event.resourceId
          ? { ...item, unitPriceEth: event.priceEth, available: event.available, version: event.version }
          : item,
      ),
    }
  })
}

export function RealtimeBridge({ userId }: { userId: string | null }) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const socket: Socket = io(window.location.origin, {
      path: '/realtime',
      transports: ['websocket'],
      timeout: 4000,
      reconnection: true,
    })

    const onNft = (event: NftUpdated) => {
      if (!accept(event.eventId, event.resourceId, event.version)) return
      patchNft(queryClient, event)
      pushNotice('Preço ou disponibilidade atualizados. Revise a cotação antes de confirmar.')
      void queryClient.invalidateQueries({ queryKey: ['quote'] })
    }

    const onOrder = (event: OrderUpdated) => {
      if (!userId || event.userId !== userId) return
      if (!accept(event.eventId, event.resourceId, event.version)) return
      queryClient.setQueryData<Order>(['order', event.resourceId], (current) =>
        current ? { ...current, status: event.status, version: event.version } : current,
      )
      void queryClient.invalidateQueries({ queryKey: ['order', event.resourceId] })
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
      if (event.status === 'confirmed') pushNotice('Pedido confirmado.')
      if (event.status === 'rejected') pushNotice('O pagamento foi recusado. Seus itens continuam no carrinho.')
    }

    const onConnect = () => {
      document.documentElement.dataset.realtime = 'open'
      void queryClient.invalidateQueries({ queryKey: ['nfts'] })
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
      void queryClient.invalidateQueries({ queryKey: ['order'] })
    }

    socket.on('nft.updated', onNft)
    socket.on('order.updated', onOrder)
    socket.on('connect', onConnect)
    socket.on('connect_error', (error) => {
      document.documentElement.dataset.realtime = `error:${error.message}`
    })

    return () => {
      socket.off('nft.updated', onNft)
      socket.off('order.updated', onOrder)
      socket.off('connect', onConnect)
      socket.disconnect()
    }
  }, [queryClient, userId])

  return null
}

export function rememberOrderKey(quoteId: string) {
  const raw = localStorage.getItem('kurio.idempotency')
  if (raw) {
    try {
      const saved = JSON.parse(raw) as { quoteId: string; key: string }
      if (saved.quoteId === quoteId) return saved.key
    } catch {
      localStorage.removeItem('kurio.idempotency')
    }
  }
  const key = crypto.randomUUID()
  localStorage.setItem('kurio.idempotency', JSON.stringify({ quoteId, key }))
  return key
}

export function clearOrderKey() {
  localStorage.removeItem('kurio.idempotency')
}

export function rememberPending(orderId: string) {
  localStorage.setItem('kurio.pendingOrder', orderId)
}

export function readPending() {
  return localStorage.getItem('kurio.pendingOrder')
}

export function clearPending() {
  localStorage.removeItem('kurio.pendingOrder')
}

export async function loginAndMerge(email: string, password: string) {
  const guestId = authStorage.getGuestId()
  const result = await api.login(email, password)
  authStorage.setToken(result.token)
  await api.mergeCart(guestId)
  authStorage.clearGuest()
  return result
}
