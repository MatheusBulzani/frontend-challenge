import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { api, isTimeout, readApiError } from '../api/client.ts'
import { clearOrderKey, clearPending, readPending, rememberOrderKey, rememberPending } from '../realtime/bridge.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Field, Input, Select, Textarea } from '../components/ui/Field.tsx'
import { Skeleton } from '../components/ui/Skeleton.tsx'
import { NETWORKS, type CartLine, type NetworkId, type Order, type PriceSummary, type PublicUser, type Quote, type Wallet } from '../domain/types.ts'
import { fieldErrors, validateEmail, validateName } from '../domain/validators.ts'
import { PageMeta } from '../ui/PageMeta.tsx'
import { pushNotice } from '../ui/notices.ts'
import { Summary } from './CartPage.tsx'

type CartResponse = { items: CartLine[]; summary: PriceSummary }

const PROVIDERS = ['WalletConnect', 'MetaMask', 'Coinbase Wallet'] as const

function providerAddress(network: NetworkId, provider: string) {
  const slug = provider.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (network === 'solana') {
    const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    return Array.from({ length: 44 }, (_, index) => alphabet[(slug.charCodeAt(index % slug.length) + index * 7) % alphabet.length]).join('')
  }
  const hex = Array.from({ length: 40 }, (_, index) => ((slug.charCodeAt(index % slug.length) + index) % 16).toString(16)).join('')
  return `0x${hex}`
}

export function CheckoutPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const profile = useQuery({ queryKey: ['profile'], queryFn: ({ signal }) => api.profile(signal) as Promise<PublicUser> })
  const wallets = useQuery({ queryKey: ['wallets'], queryFn: ({ signal }) => api.wallets(signal) as Promise<{ items: Wallet[] }> })
  const cart = useQuery({ queryKey: ['cart'], queryFn: ({ signal }) => api.cart('ethereum', signal) as Promise<CartResponse> })
  const [network, setNetwork] = useState<NetworkId>('ethereum')
  const [walletId, setWalletId] = useState('')
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [reviewing, setReviewing] = useState(false)
  const [orderError, setOrderError] = useState('')
  const pendingId = readPending()

  useEffect(() => {
    if (!profile.data) return
    setName(profile.data.name)
    setDisplayName(profile.data.displayName)
    setEmail(profile.data.email)
  }, [profile.data])

  useEffect(() => {
    const first = wallets.data?.items[0]
    if (first && !walletId) {
      setWalletId(first.id)
      setNetwork(first.network)
    }
  }, [wallets.data, walletId])

  const quote = useQuery({
    queryKey: ['quote', network, cart.data?.items.map((item) => `${item.id}:${item.quantity}:${item.version}`).join('|')],
    queryFn: () => api.quote(network) as Promise<Quote>,
    enabled: Boolean(cart.data && cart.data.items.length > 0),
    retry: false,
  })

  const stale = Boolean(
    quote.data && cart.data?.items.some((item) => item.version > (quote.data?.versions[item.nftId] ?? 0)),
  )

  const connect = useMutation({
    mutationFn: (id: string) => api.connectWallet(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wallets'] }),
    onError: (error) => pushNotice(readApiError(error).message),
  })
  const useProvider = useMutation({
    mutationFn: async (provider: string) => {
      const items = wallets.data?.items ?? []
      const existing = items.find((item) => item.label === provider && item.network === network)
      const created = existing ?? (await api.createWallet({
        role: items.some((item) => item.role === 'primary') ? 'secondary' : 'primary',
        label: provider,
        address: providerAddress(network, provider),
        network,
      }) as Wallet)
      return (await api.connectWallet(created.id)) as Wallet
    },
    onSuccess: (wallet) => {
      queryClient.setQueryData<{ items: Wallet[] }>(['wallets'], (current) => {
        const items = current?.items ?? []
        const next = items.some((item) => item.id === wallet.id)
          ? items.map((item) => (item.id === wallet.id ? wallet : item))
          : [...items, wallet]
        return { items: next }
      })
      setWalletId(wallet.id)
      setNetwork(wallet.network)
      setReviewing(false)
      setErrors((current) => {
        const next = { ...current }
        delete next.walletId
        return next
      })
      void queryClient.invalidateQueries({ queryKey: ['wallets'] })
    },
    onError: (error) => pushNotice(readApiError(error).message),
  })
  const disconnect = useMutation({
    mutationFn: (id: string) => api.disconnectWallet(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wallets'] }),
  })

  const place = useMutation({
    mutationFn: async () => {
      if (!quote.data) throw new Error('Sem cotação')
      const key = rememberOrderKey(quote.data.id)
      const body = { quoteId: quote.data.id, walletId, network }
      try {
        return (await api.createOrder(body, key)) as Order
      } catch (error) {
        if (!isTimeout(error)) throw error
        pushNotice('A resposta atrasou. Recuperando o mesmo pedido.')
        return (await api.createOrder(body, key)) as Order
      }
    },
    onSuccess: async (order) => {
      rememberPending(order.id)
      await queryClient.invalidateQueries({ queryKey: ['order', order.id] })
      if (order.status === 'rejected') {
        setOrderError('O pagamento foi recusado. Os itens continuam no carrinho.')
        clearOrderKey()
        return
      }
      if (order.status === 'confirmed') {
        clearOrderKey()
        clearPending()
        await queryClient.invalidateQueries({ queryKey: ['cart'] })
        void navigate({ to: '/pedidos/$orderId', params: { orderId: order.id } })
        return
      }
      void navigate({ to: '/pedidos/$orderId', params: { orderId: order.id } })
    },
    onError: (error) => {
      const parsed = readApiError(error)
      setOrderError(parsed.message)
      if (parsed.code === 'QUOTE_STALE' || parsed.code === 'EDITION_SOLD_OUT') {
        setReviewing(false)
        void queryClient.invalidateQueries({ queryKey: ['cart'] })
        void queryClient.invalidateQueries({ queryKey: ['quote'] })
      }
    },
  })

  const wallet = wallets.data?.items.find((item) => item.id === walletId)
  const quoteError = quote.error ? readApiError(quote.error) : null

  function review() {
    const details = fieldErrors([
      ['name', validateName(name, 'O nome')],
      ['displayName', validateName(displayName, 'O nome de exibição')],
      ['email', validateEmail(email)],
      ['walletId', walletId ? null : 'Selecione uma carteira.'],
    ])
    setErrors(details ?? {})
    if (details) return
    setReviewing(true)
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <PageMeta title="Pagamento com carteira — Kurio" description="Revise colecionador, carteira, rede e o total antes de confirmar." />
      <section>
        <h1 className="font-display text-4xl">Pagamento com carteira</h1>
        {pendingId ? (
          <p className="mt-3 text-sm" role="status">
            Há um pedido pendente. <a className="underline" href={`/pedidos/${pendingId}`}>Acompanhar {pendingId}</a>
          </p>
        ) : null}
        <div className="mt-6 grid gap-4">
          <Field label="Nome do colecionador" htmlFor="nome" error={errors.name}>
            <Input id="nome" value={name} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'nome-error' : undefined} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Nome de exibição" htmlFor="exibicao" error={errors.displayName}>
            <Input id="exibicao" value={displayName} aria-invalid={Boolean(errors.displayName)} aria-describedby={errors.displayName ? 'exibicao-error' : undefined} onChange={(event) => setDisplayName(event.target.value)} />
          </Field>
          <Field label="E-mail" htmlFor="email" error={errors.email}>
            <Input id="email" type="email" value={email} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <Field label="Carteira" htmlFor="carteira" error={errors.walletId}>
            <Select id="carteira" value={walletId} aria-invalid={Boolean(errors.walletId)} aria-describedby={errors.walletId ? 'carteira-error' : undefined} onChange={(event) => { setWalletId(event.target.value); setReviewing(false) }}>
              <option value="">Selecione uma carteira</option>
              {wallets.data?.items.map((item) => (
                <option key={item.id} value={item.id}>{item.label} · {item.role === 'primary' ? 'principal' : 'secundária'}</option>
              ))}
            </Select>
          </Field>
          {wallets.data && wallets.data.items.length === 0 ? (
            <p className="text-sm text-muted">
              Esta conta ainda não tem carteira. Conecte uma abaixo ou <Link to="/carteiras" className="underline">adicione em Carteiras</Link>.
            </p>
          ) : null}
          <Field label="Rede" htmlFor="rede">
            <Select id="rede" value={network} onChange={(event) => { setNetwork(event.target.value as NetworkId); setReviewing(false) }}>
              {NETWORKS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </Select>
          </Field>
          <div>
            <h2 className="text-sm font-semibold">Carteira e rede</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {wallets.data?.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-pressed={item.id === walletId}
                    className="w-full rounded-2xl border border-line p-4 text-left"
                    onClick={() => { setWalletId(item.id); setNetwork(item.network); setReviewing(false) }}
                  >
                    <span className="block font-semibold">{item.address.slice(0, 6)}…{item.address.slice(-4)}</span>
                    <span className="mt-1 block text-sm text-muted">{NETWORKS.find((entry) => entry.id === item.network)?.label} — {item.role === 'primary' ? 'Principal' : 'Reserva'}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-muted">Usar outra carteira?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {PROVIDERS.map((provider) => (
                <Button key={provider} variant="ghost" size="sm" disabled={useProvider.isPending || connect.isPending} onClick={() => useProvider.mutate(provider)}>{provider}</Button>
              ))}
            </div>
          </div>
          <Field label="Observação do colecionador (opcional)" htmlFor="obs">
            <Textarea id="obs" value={note} onChange={(event) => setNote(event.target.value)} />
          </Field>
          {wallet ? (
            <p className="text-sm" role="status">
              {wallet.connected ? 'Carteira conectada.' : 'Carteira desconectada.'} {wallet.address}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" disabled={!walletId || connect.isPending} onClick={() => connect.mutate(walletId)}>Conectar carteira</Button>
            <Button variant="ghost" disabled={!walletId} onClick={() => disconnect.mutate(walletId)}>Desconectar</Button>
          </div>
        </div>
      </section>
      <aside className="h-fit rounded-2xl border border-line bg-panel p-5">
        <h2 className="font-display text-2xl">Revisão</h2>
        {quote.isPending ? <Skeleton data-testid="cart-skeleton" className="mt-4 h-28" /> : null}
        {quote.data && !stale ? <Summary summary={quote.data.summary} /> : null}
        {stale || quoteError?.code === 'QUOTE_STALE' ? (
          <p role="status" data-testid="quote-stale" className="mt-3 text-sm text-accent">
            A cotação mudou. Atualize os valores antes de confirmar.
          </p>
        ) : null}
        {quoteError && quoteError.code !== 'QUOTE_STALE' ? <p role="alert" className="mt-3 text-sm text-danger">{quoteError.message}</p> : null}
        {orderError ? <p role="alert" className="mt-3 text-sm text-danger">{orderError}</p> : null}
        <Button className="mt-4 w-full" variant="ghost" onClick={() => void quote.refetch()} disabled={quote.isFetching}>Atualizar cotação</Button>
        {!reviewing ? (
          <Button className="mt-3 w-full" onClick={review} disabled={stale || !quote.data}>Revisar pedido</Button>
        ) : (
          <div className="mt-4 grid gap-2 text-sm">
            <p>{displayName} · {name}</p>
            <p>{email}</p>
            {note ? <p>Obs.: {note}</p> : null}
            <Button
              onClick={async () => {
                if (profile.data && (profile.data.name !== name || profile.data.email !== email || profile.data.displayName !== displayName)) {
                  await api.updateProfile({ name, displayName, email })
                }
                place.mutate()
              }}
              disabled={stale || !quote.data || !wallet?.connected || place.isPending}
            >
              {place.isPending ? 'Enviando…' : 'Confirmar compra'}
            </Button>
          </div>
        )}
      </aside>
    </div>
  )
}
