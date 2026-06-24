<h1 align="center">
  <span>Crash Game 🎮</span>
</h1>

<p align="center">
  <img alt="design do projeto" width="800px" src="./image.png" />
</p>

---

## Visão Geral 📖

Um **Crash Game** é um jogo de cassino multiplayer em tempo real: um multiplicador sobe a partir de `1.00x` e pode "crashar" a qualquer momento. Jogadores apostam antes da rodada e precisam sacar (cash out) antes do crash para garantir os ganhos — caso contrário, perdem a aposta.

---

## Regras do Jogo 🎲

1. **Fase de Apostas** — Janela configurável (ex: 10s) para apostar. Cada jogador pode fazer apenas **uma aposta por rodada**.
2. **Início da Rodada** — O multiplicador começa em `1.00x` e sobe continuamente.
3. **Cash Out** — O jogador pode sacar a qualquer momento durante a rodada. Pagamento = `aposta × multiplicador atual`. Após sacar, não pode reentrar.
4. **Crash** — O multiplicador para em um ponto pré-determinado. Quem não sacou perde a aposta.
5. **Fim da Rodada** — Resultados revelados, saldos atualizados, nova fase de apostas começa.

**Restrições:**

- Aposta mínima: `1.00` / Máxima: `1.000,00`
- Saldo insuficiente → aposta rejeitada
- Sem aposta na rodada → não pode sacar
- Rodada ativa → não pode apostar (apenas na fase de apostas)

---

## Setup e Execução ⚙️

### Pré-requisitos

- Bun `1.3+`
- Docker e Docker Compose
- Portas livres: `3000`, `4001`, `4002`, `5432`, `5672`, `8000`, `8080`, `15672`

### Execução com Docker Compose

O caminho principal de avaliação é o Docker Compose. Ele sobe PostgreSQL, RabbitMQ, Keycloak, Kong, Game Service, Wallet Service e Frontend sem passos manuais.

As migrations Prisma são executadas automaticamente no startup dos containers `games` e `wallets` usando `prisma migrate deploy`.

```bash
bun install
bun run docker:up
```

Depois abra:

| Item        | URL                                                        |
| ----------- | ---------------------------------------------------------- |
| Frontend    | `http://localhost:3000`                                    |
| API Gateway | `http://localhost:8000`                                    |
| Keycloak    | `http://localhost:8080` (`admin` / `admin`)                |
| RabbitMQ UI | `http://localhost:15672` (`admin` / `admin`)               |

Usuário de teste:

| Campo   | Player 1    | Player 2    |
| ------- | ----------- | ----------- |
| Login   | `player`    | `player2`   |
| Senha   | `player123` | `player123` |

Carteiras novas no ambiente Docker de avaliação recebem saldo demo real de `100000`
centavos (`R$ 1.000,00`). Esse seed é feito pelo Wallet Service somente quando
`WALLETS_DEMO_INITIAL_CREDIT_ENABLED=true`; desative essa flag fora do fluxo demo.

No Docker, o login OIDC usa `http://localhost:8080` no navegador e
`http://keycloak:8080` internamente entre containers. Isso evita passos manuais de
DNS/hosts e mantém o fluxo de avaliação em `http://localhost:3000`.

> Observação: o Keycloak importa `docker/keycloak/realm-export.json` no bootstrap.
> Se alterar usuários/clients depois que o container já subiu, recrie o serviço ou
> aplique a mudança via Admin Console/`kcadm`.

### Fluxo manual de avaliação

1. Acesse `http://localhost:3000`.
2. Clique em `Entrar` e autentique com Keycloak.
3. Se a wallet ainda não existir, clique em `Criar carteira`.
4. Aguarde a fase `BETTING`.
5. Faça uma aposta entre `R$ 1,00` e `R$ 1.000,00`.
6. Durante `RUNNING`, faça `Cash Out` antes do crash.
7. Confira saldo, lista de apostas ao vivo e histórico.
8. Após o crash, confira o painel `Provably fair`; ele revela a seed e recalcula o crash no browser.

### Execução local sem Docker para as apps

Também é possível rodar as aplicações localmente usando Postgres, RabbitMQ, Keycloak e Kong do Docker:

```bash
bun install
docker compose up postgres rabbitmq keycloak kong
```

Em outro terminal, configure os `.env` a partir dos exemplos:

```bash
cp frontend/.env.example frontend/.env
cp services/games/.env.example services/games/.env
cp services/wallets/.env.example services/wallets/.env
```

Para rodar fora do Docker, use as URLs localhost indicadas nos `.env.example`:

- `DATABASE_URL=postgresql://admin:admin@localhost:5432/games` no Games Service
- `DATABASE_URL=postgresql://admin:admin@localhost:5432/wallets` no Wallet Service
- `RABBITMQ_URL=amqp://admin:admin@localhost:5672`
- `NEXT_PUBLIC_GAMES_API_BASE_URL=http://localhost:4001`
- `NEXT_PUBLIC_WALLETS_API_BASE_URL=http://localhost:4002`
- `NEXT_PUBLIC_WS_BASE_URL=http://localhost:4001`

Depois rode:

```bash
cd services/games && bun run dev
cd services/wallets && bun run dev
cd frontend && bun run dev
```

### Comandos de qualidade

```bash
bun run contracts:typecheck
bun run games:test:all
bun run wallets:test:all
bun run frontend:typecheck
bun run frontend:build
cd frontend && bun run test:e2e
```

Para o Playwright, na primeira execução da máquina:

```bash
cd frontend
bunx playwright install chromium
```

---

## Arquitetura 🏗️

O projeto é um monorepo Bun com serviços separados por responsabilidade:

| Camada | Responsabilidade |
| ------ | ---------------- |
| `frontend` | Next.js App Router, autenticação NextAuth/Keycloak, UI em tempo real e verificação provably fair no browser |
| `services/games` | Regras do Crash Game, engine automática de rodadas, apostas, cashout, histórico e WebSocket |
| `services/wallets` | Carteiras, saldo, débitos de aposta e créditos de cashout |
| `packages/contracts` | Contratos compartilhados entre serviços |
| `docker/kong` | API Gateway DB-less para HTTP e WebSocket |
| `docker/keycloak` | Realm importado com client público e usuários demo |

### Fluxo principal

1. O jogador autentica via Keycloak no frontend.
2. O frontend envia o JWT para Games/Wallets.
3. Os guards dos serviços validam issuer, audience e JWKS do Keycloak.
4. O Wallet Service cria a carteira e mantém o saldo persistido.
5. O Games Service abre rodadas automaticamente:
   - `BETTING`: aceita uma aposta por jogador.
   - `RUNNING`: publica ticks do multiplicador por Socket.IO.
   - `CRASHED`: revela o crash point.
   - `SETTLED`: marca apostas pendentes como perdidas e libera a próxima rodada.
6. O Games Service comunica débitos/créditos ao Wallet Service via RabbitMQ.
7. O frontend consome HTTP para dados paginados e Socket.IO para estado ao vivo.

### Decisões de arquitetura

- **Serviços separados para Games e Wallets**: o domínio de saldo fica isolado do domínio da rodada. Isso reduz acoplamento e facilita auditar operações financeiras.
- **RabbitMQ para operações de carteira**: aposta e cashout passam por mensagens request/reply, preservando a fronteira entre serviços e evitando acesso direto ao banco da carteira pelo Games Service.
- **PostgreSQL separado por database**: `games` e `wallets` usam bancos lógicos distintos no mesmo container para simplificar a avaliação sem misturar tabelas.
- **Kong como gateway**: fornece uma entrada única em `localhost:8000` para APIs e WebSocket, aproximando o setup local de uma topologia real.
- **Keycloak como IdP real**: evita autenticação mockada no fluxo principal e permite testar JWT, issuer interno/externo e JWKS.
- **Engine automática dentro do Games Service**: simplifica o desafio e mantém a regra de rodada perto do domínio. A engine é configurável por env.
- **Provably fair com commit/reveal**: antes do resultado o frontend recebe `serverSeedHash`; depois do crash recebe a `serverSeed` e recalcula o resultado localmente.
- **NextAuth no frontend**: mantém sessão HTTP/browser integrada ao Next.js e separa issuer público (`localhost`) do issuer interno (`keycloak`) no Docker.
- **Playwright smoke test**: cobre o carregamento básico do login sem depender de Keycloak, reduzindo flakiness no teste e2e inicial.

### Provably fair

Cada rodada gera:

- `serverSeed`: segredo revelado após o crash.
- `serverSeedHash`: `SHA-256(serverSeed)`, exibido antes do resultado como compromisso.
- `clientSeed`: o ID da rodada.
- `nonce`: número da rodada.

O crash é recalculado com:

```txt
HMAC_SHA256(serverSeed, `${clientSeed}:${nonce}`)
```

O painel de histórico mostra o commit SHA-256, a seed revelada, a mensagem HMAC,
o HMAC calculado, o crash oficial e o valor recalculado no browser.

---

## Trade-offs e Limitações ⚖️

- **Consistência financeira**: o fluxo usa RabbitMQ request/reply e operação idempotente por `operationId`, mas não implementa saga/outbox transacional completa entre Games e Wallets. Em produção, eu adicionaria outbox, retries persistentes e reconciliação.
- **Engine em memória/processo**: a engine automática roda dentro de uma instância do Games Service. Isso é simples para o desafio, mas em produção exigiria lock distribuído, leader election ou scheduler externo para múltiplas réplicas.
- **Demo credit configurável**: carteiras novas recebem saldo demo para facilitar avaliação. Isso é protegido por flag e deve ficar desligado em ambientes reais.
- **Keycloak import no bootstrap**: o realm export facilita o setup, mas mudanças no JSON não atualizam um container já inicializado. Para alterações, recrie o serviço/volume ou use Admin API.
- **Crash cap de 5.00x**: o teto reduz o tempo de rodada e melhora a UX do desafio. O valor é configurável via `GAMES_MAX_CRASH_MULTIPLIER_BPS`.
- **Settlement delay curto**: o delay entre crash e próxima rodada é env-driven. A configuração atual privilegia testes rápidos, não necessariamente pacing ideal de produto.
- **WebSocket sem replay**: eventos ao vivo não são persistidos para replay. O frontend refaz queries HTTP em mudanças importantes para corrigir estado após reconnect/cache.
- **Frontend e2e inicial é smoke**: o teste Playwright valida login page e credenciais demo. Fluxos autenticados completos podem ser adicionados com storage state ou automação do Keycloak.
- **Kong DB-less**: ótimo para avaliação local e config versionada; em produção, uma estratégia com deploy controlado/observabilidade mais robusta seria desejável.
