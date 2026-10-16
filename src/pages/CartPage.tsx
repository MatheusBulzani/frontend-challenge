import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { api, readApiError } from '../api/client.ts'
import { useAuthToken } from '../auth/storage.ts'
import { NftPortrait } from '../components/nft/NftPortrait.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Field, Input } from '../components/ui/Field.tsx'
import { Skeleton } from '../components/ui/Skeleton.tsx'
import type { CartLine, NftSummary, PriceSummary } from '../domain/types.ts'
import { PageMeta } from '../ui/PageMeta.tsx'
import { pushNotice } from '../ui/notices.ts'
import { useState } from 'react'

type CartResponse = { items: CartLine[]; coupon: string | null; summary: PriceSummary }

export function CartPage() {
  const token = useAuthToken()
  const queryClient = useQueryClient()
  const cart = useQuery({
    queryKey: ['cart', token ?? 'guest'],
    queryFn: ({ signal }) => api.cart('ethereum', signal) as Promise<CartResponse>,
  })
  const highlights = useQuery({
    queryKey: ['highlights'],
    queryFn: ({ signal }) => api.highlights(signal) as Promise<{ items: NftSummary[] }>,
  })
  const [coupon, setCoupon] = useState('')
  const [couponError, setCouponError] = useState('')

  function refresh() {
    return queryClient.invalidateQueries({ queryKey: ['cart'] })
  }

  const update = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) => api.updateItem(id, quantity),
    onSuccess: () => refresh(),
    onError: (error) => pushNotice(readApiError(error).message),
  })
  const remove = useMutation({
    mutationFn: (id: string) => api.removeItem(id),
    onSuccess: () => refresh(),
    onError: (error) => pushNotice(readApiError(error).message),
  })
  const apply = useMutation({
    mutationFn: () => api.applyCoupon(coupon),
    onSuccess: async () => {
      setCouponError('')
      await refresh()
    },
    onError: (error) => setCouponError(readApiError(error).details?.coupon ?? readApiError(error).message),
  })
  const clearCoupon = useMutation({
    mutationFn: () => api.removeCoupon(),
    onSuccess: () => refresh(),
  })

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <PageMeta title="Carrinho de NFTs — Kurio" description="Revise quantidades, código promocional e o resumo em ETH." />
      <section>
        <h1 className="font-display text-4xl">Carrinho de NFTs</h1>
        {cart.isPending ? (
          <div data-testid="cart-skeleton" className="mt-6 grid gap-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : null}
        {cart.isError ? (
          <div role="alert" className="mt-6">
            <p>{readApiError(cart.error).message}</p>
            <Button className="mt-3" variant="ghost" onClick={() => void cart.refetch()}>Atualizar carrinho</Button>
          </div>
        ) : null}
        {cart.data && cart.data.items.length === 0 ? <p className="mt-6 text-muted">Seu carrinho está vazio.</p> : null}
        <ul className="mt-6 grid gap-4">
          {cart.data?.items.map((item) => (
            <li key={item.id} className="grid grid-cols-[4.5rem_1fr] gap-4 rounded-2xl border border-line p-3">
              <NftPortrait seed={item.imageSeed} label={item.nftName} className="h-20 w-16" />
              <div>
                <h2 className="font-semibold">{item.nftName}</h2>
                <p className="text-sm text-muted">{item.editionName} · {item.unitPriceEth} ETH</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label htmlFor={`qty-${item.id}`} className="text-sm">Quantidade</label>
                  <Input
                    id={`qty-${item.id}`}
                    className="w-20"
                    type="number"
                    min={1}
                    max={item.available}
                    value={item.quantity}
                    onChange={(event) => update.mutate({ id: item.id, quantity: Number(event.target.value) })}
                  />
                  <Button variant="ghost" size="sm" onClick={() => remove.mutate(item.id)}>Remover</Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {highlights.data && highlights.data.items.length > 0 ? (
          <section className="mt-8">
            <h2 className="font-display text-2xl">Colecionadores também viram</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-3">
              {highlights.data.items.map((item) => (
                <li key={item.id}>
                  <Link to="/nfts/$nftId" params={{ nftId: item.id }} className="block rounded-2xl border border-line p-3">
                    <NftPortrait seed={item.imageSeed} label={item.name} className="h-24 w-full" />
                    <span className="mt-2 block text-sm font-semibold">{item.name}</span>
                    <span className="text-sm text-accent">{item.priceEth} ETH</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </section>
      <aside className="h-fit rounded-2xl border border-line bg-panel p-5" aria-label="Resumo do carrinho">
        <h2 className="font-display text-2xl">Resumo</h2>
        {cart.isPending ? <Skeleton className="mt-4 h-24" /> : null}
        {cart.data ? <Summary summary={cart.data.summary} /> : null}
        <form
          className="mt-4 grid gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            apply.mutate()
          }}
        >
          <p className="text-sm text-muted">Tem um código promocional? Aplique aqui</p>
          <Field label="Código promocional" htmlFor="cupom" error={couponError}>
            <Input id="cupom" placeholder="Digite o código promocional..." value={coupon} aria-invalid={Boolean(couponError)} aria-describedby={couponError ? 'cupom-error' : undefined} onChange={(event) => setCoupon(event.target.value)} />
          </Field>
          <Button type="submit" variant="ghost" size="sm">Aplicar</Button>
          {cart.data?.coupon ? <Button type="button" variant="ghost" size="sm" onClick={() => clearCoupon.mutate()}>Remover {cart.data.coupon}</Button> : null}
        </form>
        <Button asChild className="mt-4 w-full"><Link to="/pagamento">Conectar e finalizar</Link></Button>
      </aside>
    </div>
  )
}

export function Summary({ summary }: { summary: PriceSummary }) {
  return (
    <dl className="mt-4 grid gap-2 text-sm">
      <div className="flex justify-between"><dt>Subtotal</dt><dd>{summary.subtotalEth} ETH</dd></div>
      <div className="flex justify-between"><dt>Desconto do lançamento</dt><dd>{summary.discountEth} ETH</dd></div>
      <div className="flex justify-between"><dt>Taxa de rede</dt><dd>{summary.feeEth} ETH</dd></div>
      <div className="flex justify-between text-base font-semibold"><dt>Total</dt><dd>{summary.totalEth} ETH</dd></div>
    </dl>
  )
}
