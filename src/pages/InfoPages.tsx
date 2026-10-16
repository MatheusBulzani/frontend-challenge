import { useParams } from '@tanstack/react-router'
import { api } from '../api/client.ts'
import { Button } from '../components/ui/Button.tsx'
import { SCENARIOS, type ScenarioId } from '../domain/scenarios.ts'
import { PageMeta } from '../ui/PageMeta.tsx'
import { pushNotice } from '../ui/notices.ts'

export function ScenariosPage() {
  const current = localStorage.getItem('kurio.scenario') ?? 'default'
  function select(id: ScenarioId) {
    localStorage.setItem('kurio.scenario', id)
    window.location.reload()
  }
  return (
    <div>
      <PageMeta title="Simulação — Kurio" description="Troca a resposta do mock: lentidão, erro e tempo real." />
      <h1 className="font-display text-4xl">Simulação</h1>
      <p className="mt-3 max-w-2xl text-muted">Troca a resposta do mock. Cenário atual: {current}.</p>
      <ul className="mt-6 grid gap-3">
        {SCENARIOS.map((scenario) => (
          <li key={scenario.id} className="rounded-2xl border border-line p-4">
            <h2 className="font-semibold">{scenario.title}</h2>
            <p className="text-sm text-muted">{scenario.detail}</p>
            <Button className="mt-3" size="sm" variant={current === scenario.id ? 'primary' : 'ghost'} onClick={() => select(scenario.id)}>
              Usar {scenario.id}
            </Button>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button variant="ghost" onClick={() => api.bumpPrice().then(() => pushNotice('Evento nft.updated enviado.')).catch(() => pushNotice('O evento não saiu.'))}>Disparar mudança de preço</Button>
        <Button
          variant="danger"
          onClick={() => {
            localStorage.setItem('kurio.boot', JSON.stringify({ reset: true, scenario: 'default' }))
            window.location.reload()
          }}
        >
          Resetar dados
        </Button>
      </div>
      <p className="mt-4 text-sm text-muted">Cupom válido: LANCAMENTO10. Cupom expirado: EXPIROU. Qualquer outro código é inválido.</p>
    </div>
  )
}

const topics: Record<string, string> = {
  criadores: 'O diretório de criadores não faz parte desta entrega.',
  agenda: 'A agenda de lançamentos não faz parte desta entrega.',
  ajuda: 'A central de ajuda não faz parte desta entrega.',
  compra: 'O passo a passo editorial não faz parte desta entrega. A compra em si está no catálogo.',
  seguranca: 'A página institucional de segurança não faz parte desta entrega.',
  politica: 'A política de mercado não faz parte desta entrega.',
}

export function OutOfScopePage() {
  const { topic } = useParams({ from: '/fora/$topic' })
  return (
    <article>
      <PageMeta title="Fora do escopo — Kurio" description="Esta área não faz parte do marketplace entregue." />
      <h1 className="font-display text-4xl">Área indisponível</h1>
      <p className="mt-4 max-w-xl" role="status">{topics[topic] ?? 'Esta ação não faz parte do marketplace.'}</p>
    </article>
  )
}

export function NotFoundPage() {
  return (
    <article>
      <h1 className="font-display text-4xl">Página não encontrada</h1>
      <p className="mt-3 text-muted">O endereço não corresponde a nenhuma tela do marketplace.</p>
    </article>
  )
}
