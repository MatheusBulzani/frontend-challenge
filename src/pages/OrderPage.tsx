import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { api, readApiError } from '../api/client.ts'
import { clearPending } from '../realtime/bridge.tsx'
import { Button } from '../components/ui/Button.tsx'
import type { Order } from '../domain/types.ts'
import { PageMeta } from '../ui/PageMeta.tsx'
import { Summary } from './CartPage.tsx'
import { useEffect } from 'react'

export function OrderPage() {
  const { orderId } = useParams({ from: '/pedidos/$orderId' })
  const queryClient = useQueryClient()
  const order = useQuery({
    queryKey: ['order', orderId],
    queryFn: ({ signal }) => api.order(orderId, signal) as Promise<Order>,
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? 2000 : false),
  })

  useEffect(() => {
    if (order.data?.status === 'confirmed' || order.data?.status === 'rejected') {
      clearPending()
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
    }
  }, [order.data?.status, queryClient])

  if (order.isPending) return <p>Carregando pedido…</p>
  if (order.isError) return <p role="alert">{readApiError(order.error).message}</p>
  const current = order.data

  return (
    <article className="mx-auto max-w-2xl">
      <PageMeta title="Pedido — Kurio" description="Estado do pedido e recibo da compra simulada." />
      {current.status === 'pending' ? (
        <div role="status">
          <h1 className="font-display text-4xl">Pedido pendente</h1>
          <p className="mt-3 text-muted">Estamos aguardando a confirmação. Você pode recarregar esta página sem criar outra compra.</p>
          <p className="mt-2 text-sm">Identificador: {current.id}</p>
        </div>
      ) : null}
      {current.status === 'rejected' ? (
        <div role="status">
          <h1 className="font-display text-4xl">Pagamento recusado</h1>
          <p className="mt-3 text-muted">Nenhum recibo foi emitido. Os itens continuam no carrinho.</p>
          <Button asChild className="mt-4"><Link to="/carrinho">Voltar ao carrinho</Link></Button>
        </div>
      ) : null}
      {current.status === 'confirmed' ? (
        <div>
          <h1 className="font-display text-4xl">Seus NFTs agora estão na sua carteira</h1>
          <h2 className="mt-6 font-display text-2xl">Detalhes da transação</h2>
          <p className="mt-3">ID da transação {current.txRef}</p>
          <dl className="mt-3 grid gap-2 text-sm">
            <div className="flex justify-between gap-4"><dt>Data</dt><dd>{new Date(current.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</dd></div>
            <div className="flex justify-between gap-4"><dt>Carteira</dt><dd className="break-all text-right">{current.walletAddress}</dd></div>
          </dl>
          <p className="mt-4 text-sm text-muted">Transação confirmada na Ethereum. A propriedade foi transferida para a carteira conectada.</p>
          <Link to="/explorar/$txRef" params={{ txRef: current.txRef }} className="mt-2 inline-block text-sm text-accent">Ver no Etherscan</Link>
          <ul className="mt-6 grid gap-2">
            {current.snapshot.lines.map((line) => (
              <li key={line.id} className="flex justify-between text-sm">
                <span>{line.nftName} · {line.editionName} × {line.quantity}</span>
                <span>{line.lineTotalEth} ETH</span>
              </li>
            ))}
          </ul>
          <Summary summary={current.snapshot} />
        </div>
      ) : null}
    </article>
  )
}

export function ExplorerPage() {
  const { txRef } = useParams({ from: '/explorar/$txRef' })
  return (
    <article>
      <PageMeta title="Explorador simulado — Kurio" description="Referência de transação simulada, sem consulta a uma rede real." />
      <h1 className="font-display text-4xl">Explorador simulado</h1>
      <p className="mt-4">Referência: {txRef}</p>
      <p className="mt-2 text-muted">Esta tela não consulta blockchain. Ela só mostra a referência gerada na compra.</p>
    </article>
  )
}
