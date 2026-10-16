export const SCENARIOS = [
  {
    id: 'default',
    title: 'Padrão',
    detail: 'Compra confirmada depois de um instante, com o pedido passando por pendente.',
  },
  {
    id: 'empty',
    title: 'Catálogo vazio',
    detail: 'A listagem responde com sucesso e zero itens.',
  },
  {
    id: 'slow',
    title: 'Rede lenta',
    detail: 'As consultas demoram cerca de 1,4s para os skeletons aparecerem.',
  },
  {
    id: 'out-of-order',
    title: 'Respostas fora de ordem',
    detail: 'Consultas alternam atraso longo e curto. A interface fica com a resposta mais recente.',
  },
  {
    id: 'offline',
    title: 'Sem conexão',
    detail: 'As chamadas de API falham como queda de rede. A troca de cenário continua local.',
  },
  {
    id: 'http-500',
    title: 'Falha HTTP 500',
    detail: 'O serviço responde erro transitório, exceto nos controles de demonstração.',
  },
  {
    id: 'session-expired',
    title: 'Sessão expirada',
    detail: 'Qualquer chamada autenticada responde 401 e devolve você ao login.',
  },
  {
    id: 'unauthorized',
    title: 'Sem permissão',
    detail: 'Mutações autenticadas respondem 403. A interface desfaz a atualização otimista.',
  },
  {
    id: 'register-conflict',
    title: 'Conflito de cadastro',
    detail: 'O cadastro responde 409 mesmo com um e-mail novo.',
  },
  {
    id: 'invalid-coupon',
    title: 'Cupom inválido',
    detail: 'Qualquer cupom, inclusive LANCAMENTO10, é recusado como inexistente.',
  },
  {
    id: 'expired-coupon',
    title: 'Cupom expirado',
    detail: 'Qualquer cupom é recusado como expirado.',
  },
  {
    id: 'price-changed',
    title: 'Preço alterado',
    detail: 'A primeira cotação aumenta o preço, emite nft.updated e exige nova confirmação.',
  },
  {
    id: 'sold-out',
    title: 'Edição esgotada',
    detail: 'A confirmação encontra a edição sem estoque e não cria pedido.',
  },
  {
    id: 'order-timeout',
    title: 'Timeout do pedido',
    detail: 'O pedido é criado, a primeira resposta estoura o tempo e a mesma chave o recupera.',
  },
  {
    id: 'payment-confirmed',
    title: 'Pagamento confirmado',
    detail: 'O pedido pendente é confirmado pelo evento order.updated.',
  },
  {
    id: 'payment-rejected',
    title: 'Pagamento recusado',
    detail: 'O pedido termina recusado. O carrinho permanece.',
  },
  {
    id: 'order-hold',
    title: 'Pedido parado',
    detail: 'O pedido fica pendente até um controle de demonstração resolvê-lo.',
  },
  {
    id: 'wallet-rejected',
    title: 'Carteira recusada',
    detail: 'A simulação de conexão da carteira é recusada.',
  },
] as const

export type ScenarioId = (typeof SCENARIOS)[number]['id']

export function isScenario(value: string | null): value is ScenarioId {
  return SCENARIOS.some((item) => item.id === value)
}
