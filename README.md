# Kurio

Loja de NFTs no browser. Catálogo, carrinho, pagamento simulado e conta. Os dados saem do MSW; não há chain nem extensão de carteira.

Precisa de Node.js 22, npm 11 e Chrome se for rodar o Lighthouse.

```bash
npm install
npx playwright install chromium
npm run dev
```

Abre em http://localhost:5173. O worker de mock sobe antes da interface. Recarregar uma rota profunda funciona: o Vite devolve o `index.html` e o estado está no `localStorage`.

## Variáveis de ambiente

| Variável | Padrão | Efeito |
| --- | --- | --- |
| `VITE_ENABLE_MOCKS` | `true` | Liga o MSW e o Socket.IO simulado. `false` desliga os dois; sem um backend real a aplicação não carrega dados. |

O arquivo `.env.example` documenta o valor. O build de demonstração deve manter os mocks ligados.

## Contas de teste

A senha fica só como SHA-256.

| Colecionador | E-mail | Senha | O que já vem |
| --- | --- | --- | --- |
| Ana Ribeiro | `ana@kurio.test` | `colecao123` | Carrinho com Emerald Ape #042 e Violet Nomad #314, favorito no Emerald, duas carteiras desconectadas |
| Bruno Lima | `bruno@kurio.test` | `carteira123` | Carrinho vazio e uma carteira Solana |

Cupom válido: `LANCAMENTO10` (10%). Cupom expirado: `EXPIROU`. Qualquer outro código é inválido.

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Desenvolvimento com mocks |
| `npm run typecheck` | Verificação TypeScript |
| `npm run lint` | oxlint |
| `npm run build` | Build de produção |
| `npm run preview` | Serve o build em http://127.0.0.1:4183 |
| `npm run test:e2e` | Playwright em Chromium, desktop, tablet e mobile |
| `npm run lighthouse` | Três medições de início e detalhe, mobile e desktop |

O relatório HTML do Playwright fica em `playwright-report/`. Traces são gravados quando um teste falha. A mediana do Lighthouse fica em `lighthouse/summary.json` e os relatórios em `lighthouse/reports/`.

## Falhas reproduzíveis

A página `/cenarios` não está no rodapé. Abra o endereço direto. Cada botão grava o cenário e recarrega. "Resetar dados" apaga o banco local e a sessão. "Disparar mudança de preço" manda `nft.updated` pelo socket.

Para trocar o cenário no console e recarregar:

```js
localStorage.setItem('kurio.scenario', 'price-changed')
location.reload()
```

Para zerar o banco no próximo carregamento:

```js
localStorage.setItem('kurio.boot', JSON.stringify({ reset: true, scenario: 'default' }))
location.reload()
```

| Cenário | Como reproduzir a falha |
| --- | --- |
| `default` | Compra passa por pendente e confirma em cerca de 700 ms |
| `empty` | O catálogo responde sucesso com zero itens |
| `slow` | Consultas levam cerca de 1,4 s e os skeletons aparecem |
| `out-of-order` | A listagem alterna atraso longo e curto; a tela fica com a busca mais recente |
| `offline` | As chamadas de API caem como rede. A página de cenários continua local |
| `http-500` | O catálogo mostra "O catálogo não carregou." e o botão "Buscar outra vez" |
| `session-expired` | A próxima chamada autenticada responde 401 e volta ao login, guardando o endereço |
| `unauthorized` | A mutation responde 403 e o favorito otimista volta ao estado anterior |
| `register-conflict` | O cadastro responde 409 mesmo com e-mail novo |
| `invalid-coupon` / `expired-coupon` | Qualquer cupom é recusado |
| `price-changed` | A primeira cotação muda o preço, emite `nft.updated` e bloqueia a confirmação até uma cotação nova |
| `sold-out` | A confirmação encontra a edição sem estoque e não cria pedido |
| `order-timeout` | A primeira resposta do pedido estoura 8 s; a mesma chave de idempotência recupera o pedido |
| `payment-rejected` | O pedido termina recusado e o carrinho permanece |
| `order-hold` | O pedido fica pendente até `POST /api/dev/resolve` |
| `wallet-rejected` | A simulação de conectar a carteira é recusada |

Rotas só do mock:

- `POST /api/dev/reset`
- `POST /api/dev/bump` com `{ "nftId": "nft_emerald" }`
- `POST /api/dev/resolve` com `{ "orderId": "ord_...", "status": "confirmed" }`
- `POST /api/dev/emit` com `{ "event": "nft.updated", "payload": { ... } }`

Para ver a compra inteira, entre com a Ana, conecte a carteira em `/pagamento`, revise e confirme. O recibo só aparece com o pedido confirmado. `/explorar/...` é um explorador simulado.

`price-changed` trava a confirmação até "Atualizar cotação". `payment-rejected` devolve o carrinho. `sold-out` não cria pedido. `order-timeout` responde de novo com a mesma chave. `order-hold` continua pendente depois do reload. `unauthorized` desfaz o favorito. `session-expired` manda de volta ao login e guarda o endereço. Um `order.updated` do Bruno não mexe no pedido da Ana.

Criadores, Aprenda, ajuda e o formulário de alertas abrem uma página que diz que aquilo ficou de fora.

Contratos, sessão, carrinho e o socket estão em `ARCHITECTURE.md`.

## Auditoria Lighthouse

Três execuções em 15/10/2026, Lighthouse 13.5.0, build de produção em `http://127.0.0.1:4183`, cenário padrão. A mediana é o valor do meio. Relatórios em `lighthouse/reports/` e o resumo em `lighthouse/summary.json`.

| Página | Perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início | mobile | 75 | 97 | 100 | 100 | 3,9 s | 0 | 444 ms |
| Detalhe | mobile | 85 | 100 | 100 | 100 | 3,6 s | 0 | 260 ms |
| Início | desktop | 99 | 97 | 100 | 100 | 0,9 s | 0,014 | 10 ms |
| Detalhe | desktop | 99 | 100 | 100 | 100 | 0,9 s | 0,006 | 20 ms |

Acessibilidade (≥ 95), boas práticas (≥ 95) e SEO (≥ 90) ficam nas metas. No desktop a performance também fica acima de 90. No celular a mediana fica em 75 na home e 85 no detalhe. O CLS do detalhe foi a zero depois de reservar a proporção 640×853 do retrato; o que puxa a nota é o tempo de thread principal, que na home variou de 340 ms a 630 ms entre as três execuções. O LCP da home continua o título, atrasado pelo JavaScript do MSW, que precisa carregar antes da primeira pintura para interceptar as chamadas. A home perde o critério de alvo de toque no botão Favoritar, que tem 20 px de altura.
