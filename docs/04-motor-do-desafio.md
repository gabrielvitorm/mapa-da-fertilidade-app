# 04 — Motor do desafio (7 dias)

## O que o desafio é

Um **roteiro de conteúdo em formato de aula**, segmentado por nível de
fertilidade, navegado em passos (um `ChallengeMessage` por vez, com botões
Voltar/Próximo). A planilha original tem o formato
`Dia | Ordem | TipoAcao | Conteudo_Texto | Conteudo_Link_Midia | Delay_ms` —
cada linha vira um passo, na ordem. O `Delay_ms` era usado pra simular o
ritmo "digitando..." do WhatsApp da versão anterior (chat automático); a UI
atual não lê mais esse campo — ele continua no schema e nos seeds só por
não valer o retrabalho de remover de conteúdo já validado pela expert (ver
`docs/superpowers/specs/2026-07-09-desafio-formato-aula-design.md`).

As três trilhas estão parseadas e prontas para seed em `seeds/`:
`desafio-track-baixa.json` (Semente), `desafio-track-moderada.json` (Raízes) e
`desafio-track-alta.json` (Floração) — 8 dias cada, 160 mensagens no total.

## Segmentação por nível (importante)

A planilha lida é a trilha **BAIXA** ("Nível SEMENTE"). O conteúdo do desafio
muda conforme o `nivelGlobal` do assessment da usuária. Logo:

- `ChallengeTrack` existe **uma por nível**: `BAIXA`, `MODERADA`, `ALTA`.
- Quando o webhook concede o entitlement `CHALLENGE`, a trilha é resolvida pelo
  nível e gravada em `entitlement.metadata.track`.

> **Conteúdo completo:** as três trilhas (BAIXA/MODERADA/ALTA) já estão nos
> seeds. Mídia compartilhada entre trilhas está marcada com `duplicado` no
> manifesto — suba uma vez e reaproveite a key no R2.

## Modelo

```
ChallengeTrack
  id, level (BAIXA|MODERADA|ALTA), codename, title, defaultCooldownHours
ChallengeDay
  id, trackId, dayNumber (0..7), isOnboarding, cooldownHours?
ChallengeMessage
  id, dayId, ordem, tipo (TEXTO|AUDIO|IMAGEM|VIDEO), texto?, mediaKey?, delayMs
```

`mediaKey` é o caminho no R2 (ex.: `desafio/baixa/dia1/6.jpg`), não o link do
Drive. Ver "Mídia" abaixo.

## Reprodução em formato de aula (stepper)

No app, o dia mostra um passo (`ChallengeMessage`) por vez — texto como
parágrafo, áudio/imagem/vídeo em destaque — navegado por botões
Voltar/Próximo controlados pela usuária (sem delay automático). Pode voltar
e avançar livremente entre passos já vistos; só revela um passo novo por
vez. Detalhes de implementação:
`docs/superpowers/specs/2026-07-09-desafio-formato-aula-design.md`.

- Persiste até onde a usuária já avançou no dia (`lastSeenOrdem`, o índice
  do passo mais avançado alcançado) pra ela poder sair e voltar sem
  reiniciar do zero.
- A mensagem "ASSISTA A AULA N" de cada dia é `tipo = VIDEO`, com o título
  como legenda e `mediaKey` apontando para `videos/aulaN.mp4`. O Dia 0 abre
  com o vídeo de boas-vindas (`videos/boas-vindas.mp4`). As 7 aulas + boas-
  vindas são **compartilhadas entre as 3 trilhas** (mesmos vídeos) — ver
  `seeds/aulas-manifesto.csv`.

## Gating híbrido (a trava de avanço)

Regra: **o Dia N+1 abre quando o Dia N está concluído E já passou o cooldown.**

```ts
function isDayUnlocked(day: number, progress, track): boolean {
  if (day === 0) return true;                       // onboarding sempre aberto
  if (day === 1) return true;                       // dia 1 abre ao ativar
  const prev = progress.dayCompletions[day - 1];
  if (!prev?.completedAt) return false;             // anterior não concluído
  const cooldownH = track.cooldownHours ?? track.defaultCooldownHours;
  const elapsedH = (Date.now() - prev.completedAt) / 36e5;
  return elapsedH >= cooldownH;                      // cooldown cumprido
}
```

- **Concluir o dia** = ação leve "Concluí o dia" → grava `completedAt`. Essa é a
  única coisa exigida pra avançar.
- `defaultCooldownHours` sugerido: ~20h (deixa "1 por dia" sem exigir 24h
  cravadas — a usuária que fez ontem à noite consegue hoje de manhã). Ajustável
  por trilha/dia. Confirmar valor com a expert.

## Devolutiva (obrigatório ter, opcional usar)

A funcionalidade **existe sempre**; preencher é **opcional** e **não trava** o
avanço. Só texto — não há opção de áudio/foto.

```
Devolutiva
  id, userId, dayNumber, texto, createdAt
```

- Em cada dia há um espaço "Como foi seu desafio hoje?" onde a usuária pode
  (sem obrigação) escrever um texto livre.
- Concluir o dia e enviar devolutiva são **ações independentes**: dá pra
  concluir sem devolutiva, e a devolutiva não é um checkbox de avanço.
- A expert visualiza as devolutivas depois (tela de acompanhamento — fora do MVP
  se quiser, mas o dado já fica gravado).

## Mídia (Drive → R2)

As 20 mídias da trilha Baixa estão hoje em links do Google Drive. Migrar pro R2:

1. `seeds/midia-manifesto.csv` lista `driveId` → `r2Key` de cada arquivo.
2. Script de migração: baixa do Drive (via API/conector) e sobe no bucket R2 com
   a `r2Key` indicada.
3. No banco, `ChallengeMessage.mediaKey` aponta pra `r2Key`; o app serve via
   URL do R2 (ou domínio próprio no Cloudflare).
4. Áudios provavelmente são `.mp3`/`.ogg`; imagens `.jpg`/`.png`. Confirme as
   extensões reais ao baixar e ajuste as `r2Key` do manifesto.

> Não sirva mídia direto do Google Drive em produção (rate limit, links
> instáveis, sem controle de cache). R2 + Cloudflare resolve isso.

## Ativação do desafio

Quando o webhook concede `CHALLENGE`:
1. Resolve a trilha pelo nível.
2. Cria `ChallengeProgress` (`currentDay = 0`, sem conclusões).
3. App abre no Dia 0 (onboarding) e libera o Dia 1.
