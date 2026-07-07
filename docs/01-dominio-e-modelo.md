# 01 — Domínio e modelo de dados

## Entidades

### User
A conta da usuária. Criada/ativada quando um pagamento casa com um lead.
- `id`, `email` (único), `nome`, `cpf`, `celular`
- `createdAt`
- Auth: sem senha. Sessão por magic link.

### Assessment
O resultado do quiz. **Pode existir sem `userId`** (lead anônimo) e ser adotado
depois pelo webhook de pagamento.
- `id`
- `userId` (nullable até a adoção)
- `source` — `TYPEBOT` | `APP_NATIVE`
- `leadEmail`, `leadCpf`, `leadNome`, `leadCelular` — usados para casar a compra
- `answers` (JSON) — respostas cruas do quiz
- `pillarScores` (JSON) — score por pilar (13 chaves)
- `scoreTotal`, `resultadoFinal` (0–100), `nivelGlobal` — `BAIXA` | `MODERADA` | `ALTA`
- `createdAt`
- Regra: o app **recalcula** o score a partir de `answers` (fonte da verdade é
  o motor do app, não o Typebot). Ver `02-motor-de-score.md`.

### Product
Catálogo do que se vende. Mapeia 1:1 com produtos da Kiwify/Hotmart.
- `id`, `slug` (`acesso-relatorio`, `desafio-7-dias`, `bump-xyz`)
- `nome`, `priceCents`
- `kind` — `APP_ACCESS` | `CHALLENGE` | `ORDER_BUMP`
- `platform` — `KIWIFY` | `HOTMART`
- `platformProductId`, `checkoutUrl`
- `grants` (JSON) — o que conceder ao pagar (ex.: `{ "entitlement": "REPORT" }`,
  `{ "entitlement": "CHALLENGE", "trackByLevel": true }`)

### Order
Uma compra registrada a partir de um webhook.
- `id`, `userId`, `productId`
- `platform`, `platformTransactionId` (único — chave de idempotência)
- `status` — `PAID` | `REFUNDED` | `CHARGEBACK`
- `amountCents`, `rawPayload` (JSON), `createdAt`

### Entitlement
O direito de acesso. **É o que o app consulta para liberar conteúdo.**
- `id`, `userId`, `productId`
- `type` — `REPORT` | `CHALLENGE` | `BUMP`
- `status` — `ACTIVE` | `REVOKED`
- `metadata` (JSON) — ex.: trilha do desafio resolvida pelo nível
- `grantedAt`, `revokedAt`
- Concedido pelo webhook (status `PAID`), revogado em refund/chargeback.

### Challenge / ChallengeTrack / ChallengeDay / ChallengeMessage
A estrutura de conteúdo do desafio. Detalhe em `04-motor-do-desafio.md`.
- `ChallengeTrack` — uma trilha por nível (`BAIXA`/`MODERADA`/`ALTA`).
- `ChallengeDay` — dia 0 (onboarding) a 7. Carrega `cooldownHours`.
- `ChallengeMessage` — `ordem`, `tipo` (`TEXTO`/`AUDIO`/`IMAGEM`/`VIDEO`),
  `texto`, `mediaUrl`, `delayMs`.

### ChallengeProgress
O avanço da usuária na trilha.
- `id`, `userId`, `trackId`
- `currentDay`
- `dayCompletions` (JSON) — `{ "1": { completedAt }, "2": { ... } }`

### Devolutiva
A resposta opcional da usuária a um dia. **Existe sempre; é opcional preencher.**
- `id`, `userId`, `dayNumber`
- `tipo` — `TEXTO` | `AUDIO` | `FOTO`
- `conteudo` (texto) ou `mediaUrl`
- `createdAt`
- Não trava o avanço. A expert pode visualizar depois.

## Ciclo de vida do entitlement (o coração)

```
Quiz (Typebot ou nativo)
   └─ cria Assessment (userId = null, leadEmail = X)
Checkout na plataforma (R$ 49,90)
   └─ webhook PAID, transação T1, comprador email X
        ├─ acha/cria User por email X
        ├─ adota o Assessment órfão (seta userId)
        ├─ cria Order (T1, idempotente)
        └─ concede Entitlement REPORT (ACTIVE)
App: usuária entra por magic link → relatório liberado (tem entitlement REPORT)
App: oferta desafio → checkout (R$ 197,90)
   └─ webhook PAID, transação T2
        ├─ cria Order (T2)
        └─ concede Entitlement CHALLENGE; metadata.track = trilha do nível dela
Refund/chargeback em T1 ou T2
   └─ webhook → Order.status atualizado → Entitlement.status = REVOKED
```

## Diagrama (ERD)

Renderize com mermaid `erDiagram`. Relações principais:
- `User ||--o{ Assessment` (após adoção)
- `User ||--o{ Order`
- `User ||--o{ Entitlement`
- `Product ||--o{ Order`
- `Product ||--o{ Entitlement`
- `ChallengeTrack ||--o{ ChallengeDay`
- `ChallengeDay ||--o{ ChallengeMessage`
- `User ||--o{ ChallengeProgress`
- `User ||--o{ Devolutiva`

## Notas de implementação

- O casamento compra↔lead é por **e-mail** (primário) com **CPF** como
  desempate. Normalize ambos (lowercase/trim e-mail; só dígitos no CPF).
- Um lead pode gerar vários `Assessment` (refez o quiz). Na adoção, ligue o mais
  recente; mantenha os demais para histórico.
- Nunca confie no payload do webhook para preço/produto: resolva `Product` pelo
  `platformProductId` do seu catálogo.
