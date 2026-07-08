# Fase 7 - Docker + Deploy Design

## Objetivo

Preparar o app Next.js para rodar em container no EasyPanel com uma imagem de
producao enxuta, healthcheck HTTP e documentacao operacional suficiente para o
deploy manual inicial.

Esta fase nao implementa GitHub Actions, DNS, Cloudflare, registry externo nem
configuracao real do painel. Esses pontos continuam como proximas etapas porque
dependem de decisoes fora do repositorio.

## Escopo

Incluido:

- `Dockerfile` multi-stage para build e runtime do app.
- `.dockerignore` para reduzir contexto de build e evitar levar arquivos locais.
- `next.config.ts` configurado para output standalone.
- Rota `GET /api/health` para healthcheck do EasyPanel.
- Documentacao local atualizada em `docs/05-infra-e-deploy.md`.
- Validacao local com lint, testes TypeScript avulsos, build Next e build Docker.

Fora de escopo:

- Pipeline GitHub Actions.
- Push de imagem para registry.
- Deploy automatico no EasyPanel.
- Alteracao em DNS, Cloudflare ou R2.
- Compose de producao com app + Postgres.
- Leitura ou alteracao de valores reais de `.env`.

## Arquitetura

A imagem usa build multi-stage com Node 20 Alpine:

1. `deps`: instala dependencias a partir de `package-lock.json`.
2. `builder`: copia o codigo, roda `prisma generate` e `npm run build`.
3. `runner`: copia apenas os artefatos standalone do Next, assets publicos,
   static files e arquivos Prisma necessarios para `migrate deploy`.

O container inicia com um entrypoint pequeno que executa:

```powershell
npx prisma migrate deploy
node server.js
```

No container o comando real fica em shell POSIX porque a imagem roda Linux
Alpine, mas a documentacao do projeto continua usando PowerShell para comandos
executados no Windows local.

## Healthcheck

`GET /api/health` retorna JSON simples e status 200 quando o processo Next esta
respondendo:

```json
{
  "status": "ok",
  "service": "mapa-fertilidade-app"
}
```

O healthcheck nao consulta o banco nesta fase. Motivo: no EasyPanel, durante boot
ou restart, o Postgres pode ficar temporariamente indisponivel enquanto o app
ainda esta subindo. Se o healthcheck depender do banco, um atraso transitorio
pode causar restart loop e piorar a recuperacao. Validacao profunda de banco
pode ser adicionada depois em uma rota operacional separada, protegida se
necessario.

## Variaveis De Ambiente

A documentacao deve listar as variaveis por categoria, sem valores:

- Banco: `DATABASE_URL`.
- Sessao/auth: `SESSION_SECRET`.
- Ingestao Typebot: `INGEST_TOKEN`.
- Pagamentos: `KIWIFY_WEBHOOK_SECRET`.
- Midia publica: `NEXT_PUBLIC_R2_PUBLIC_BASE_URL`.
- Demo: `DEMO_MODE` somente quando o ambiente for demonstracao controlada.

Variaveis usadas apenas por scripts de migracao de midia para R2 nao precisam
estar no runtime do app container, exceto se algum fluxo runtime passar a usar
SDK do R2 futuramente.

## Comportamento Operacional

- O EasyPanel deve apontar o healthcheck para `/api/health`.
- O container deve expor `PORT=3000`.
- Migrations Prisma rodam no startup com `prisma migrate deploy`.
- Seeds nao rodam automaticamente em producao.
- Falha de migration deve derrubar o startup do container; isso e preferivel a
  subir uma versao incompativel com o schema.

## Riscos E Trade-offs

- Rodar migration no startup simplifica o deploy manual inicial, mas exige
  cuidado se houver multiplas replicas no futuro. Para escala horizontal, mover
  migrations para job separado.
- Healthcheck sem banco reduz risco de restart loop, mas nao detecta falha de
  conectividade com Postgres. Essa validacao pode entrar depois como readiness
  ou endpoint operacional separado.
- Build Docker pode exigir rede para baixar camadas base e dependencias quando
  cache local nao estiver quente.

## Validacao Esperada

Antes de fechar a fase:

```powershell
npx.cmd tsx src\lib\scoring.test.ts
npx.cmd tsx src\lib\scoring-answers.test.ts
npx.cmd tsx src\lib\report-assembly.test.ts
npm run lint
npm run build
docker compose build
```

Se `docker compose build` nao for aplicavel porque o compose continua contendo
apenas Postgres, usar `docker build -t mapa-fertilidade-app:local .`.

## Resultado Esperado

Ao final, o repositorio tera tudo que o EasyPanel precisa para construir e rodar
o app como container a partir do codigo: Dockerfile, artefatos standalone,
migration deploy no startup, healthcheck HTTP e documentacao de configuracao.
