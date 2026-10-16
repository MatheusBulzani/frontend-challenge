import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { useState } from 'react'
import { api, readApiError } from '../api/client.ts'
import { useFavorites, useFavoriteToggle } from '../api/favorites.ts'
import { NftPortrait } from '../components/nft/NftPortrait.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Field, Input, Select } from '../components/ui/Field.tsx'
import { Skeleton } from '../components/ui/Skeleton.tsx'
import type { Nft, NftListResponse } from '../domain/types.ts'
import { PageMeta } from '../ui/PageMeta.tsx'
import { defaultCatalogSearch } from '../domain/search.ts'
import { pushNotice } from '../ui/notices.ts'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'

export function NftPage() {
  const { nftId } = useParams({ from: '/nfts/$nftId' })
  const nft = useQuery({
    queryKey: ['nft', nftId],
    queryFn: ({ signal }) => api.nft(nftId, signal) as Promise<Nft>,
  })

  if (nft.isPending) {
    return (
      <div data-testid="detail-skeleton" className="grid gap-8 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Skeleton className="aspect-[640/853] w-full" />
        <Skeleton className="h-96" />
      </div>
    )
  }
  if (nft.isError) {
    const error = readApiError(nft.error)
    return (
      <div role="alert" className="rounded-2xl border border-line p-8">
        <h1 className="font-display text-3xl">{error.code === 'NOT_FOUND' ? 'NFT não encontrado' : 'Falha ao carregar'}</h1>
        <p className="mt-2 text-muted">{error.message}</p>
        <Button className="mt-4" variant="ghost" onClick={() => void nft.refetch()}>Recarregar</Button>
      </div>
    )
  }
  return <Detail nft={nft.data} />
}

function Detail({ nft }: { nft: Nft }) {
  const [editionId, setEditionId] = useState(nft.editions[0]?.id ?? '')
  const edition = nft.editions.find((item) => item.id === editionId) ?? nft.editions[0]
  const [quantity, setQuantity] = useState(1)
  const favorites = useFavorites()
  const toggle = useFavoriteToggle()
  const active = favorites.data?.nftIds.includes(nft.id) ?? false
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const buy = useMutation({
    mutationFn: () => api.addItem({ nftId: nft.id, editionId: edition?.id ?? '', quantity }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cart'] })
      void navigate({ to: '/carrinho' })
    },
    onError: (error) => pushNotice(readApiError(error).message),
  })
  const limit = edition && quantity > edition.available

  return (
    <article className="grid min-w-0 gap-8 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <PageMeta title={`${nft.name} — Kurio`} description={nft.description} />
      <div>
        <NftPortrait seed={nft.imageSeed} label={nft.name} className="w-full" />
        <ul className="mt-3 flex gap-2">
          {nft.editions.map((item) => (
            <li key={item.id}>
              <button type="button" aria-label={item.name} aria-pressed={item.id === edition?.id} onClick={() => setEditionId(item.id)}>
                <NftPortrait seed={`${nft.imageSeed}-${item.id}`} label="" className="h-16 w-14" />
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-sm text-muted">{nft.collection}</p>
        <h1 className="font-display text-4xl">{nft.name}</h1>
        <p className="mt-2 text-2xl text-accent">{edition?.priceEth} ETH</p>
        <p className="mt-2 text-sm text-muted">4.8 (19)</p>
        <h2 className="mt-4 text-sm font-semibold">Sobre este NFT</h2>
        <p className="mt-2 text-muted">{nft.description}</p>
        <dl className="mt-4 grid gap-1 text-sm">
          <div className="flex gap-2"><dt className="text-muted">Coleção:</dt><dd>{nft.collection}</dd></div>
          {nft.id === 'nft_emerald' ? <div className="flex gap-2"><dt className="text-muted">Atributos:</dt><dd>Óculos, Esmeralda, Raro</dd></div> : null}
          <div className="flex gap-2"><dt className="text-muted">Contrato:</dt><dd>0x7A42...19E8 · Contrato inteligente ERC-721 verificado.</dd></div>
          <div className="flex gap-2"><dt className="text-muted">Direitos autorais:</dt><dd>5% nas vendas secundárias</dd></div>
        </dl>
        <p className="mt-4 text-sm">Criador: {nft.creator.name}</p>
        <p className="text-sm text-muted">Rede: {nft.network} · versão {nft.version}</p>
        <p className="text-sm text-muted">19 avaliações de colecionadores</p>
        <div className="mt-6 grid gap-4">
          <Field label="Edição" htmlFor="edicao">
            <Select id="edicao" value={edition?.id} onChange={(event) => setEditionId(event.target.value)}>
              {nft.editions.map((item) => (
                <option key={item.id} value={item.id} disabled={item.available < 1}>
                  {item.name} · {item.available < 1 ? 'esgotada' : `${item.available} disponíveis`}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Quantidade" htmlFor="quantidade" error={limit ? `Máximo disponível: ${edition?.available ?? 0}.` : undefined}>
            <Input
              id="quantidade"
              type="number"
              min={1}
              max={edition?.available || 1}
              value={quantity}
              aria-invalid={limit}
              aria-describedby={limit ? 'quantidade-error' : undefined}
              onChange={(event) => setQuantity(Number(event.target.value))}
            />
          </Field>
          <div className="flex flex-wrap gap-3">
            <Button disabled={!edition || edition.available < 1 || limit || buy.isPending} onClick={() => buy.mutate()}>
              Comprar NFT
            </Button>
            <Button variant="ghost" aria-pressed={active} onClick={() => toggle.mutate({ nftId: nft.id, active })}>
              {active ? 'Remover favorito' : 'Favoritar'}
            </Button>
          </div>
          {edition && edition.available < 1 ? <p role="status">Esta edição está indisponível.</p> : null}
        </div>
        <p className="mt-8 text-sm"><Link to="/" search={defaultCatalogSearch}>Voltar ao catálogo</Link></p>
        <Related category={nft.category} currentId={nft.id} />
      </div>
    </article>
  )
}

function Related({ category, currentId }: { category: string; currentId: string }) {
  const related = useQuery({
    queryKey: ['nfts', 'related', category],
    queryFn: ({ signal }) =>
      api.listNfts({ ...defaultCatalogSearch, category, page: 1 }, signal) as Promise<NftListResponse>,
  })
  const items = (related.data?.items ?? []).filter((item) => item.id !== currentId).slice(0, 3)
  if (items.length === 0) return null
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl">Mais desta coleção</h2>
      <ul className="mt-4 grid min-w-0 gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <li key={item.id}>
            <Link to="/nfts/$nftId" params={{ nftId: item.id }} className="block rounded-2xl border border-line p-3">
              <NftPortrait seed={item.imageSeed} label={item.name} className="h-28 w-full" />
              <span className="mt-2 block font-semibold">{item.name}</span>
              <span className="text-sm text-accent">{item.priceEth} ETH</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
