---
name: roteiro-desafio
description: Use ao criar, alterar ou popular o conteúdo do desafio de 7 dias (trilhas Baixa/Moderada/Alta), ao escrever o player estilo WhatsApp, ou ao migrar mídia do Drive para o R2. Explica como o roteiro das planilhas mapeia para o modelo ChallengeTrack/Day/Message.
---

# Roteiro do desafio (7 dias)

## De onde vem o conteúdo

O desafio é um **roteiro de mensagens sequenciadas tipo WhatsApp**, uma trilha
por nível de fertilidade. As planilhas de origem usam formato "wide": cada aba
(`Saudação e Dia 0`, `Dia 1`...`Dia 7`) tem uma linha de rótulos de slot
(`Audio 1`, `Mensagem 1`, `Imagem 1`...), uma linha de conteúdo e uma linha de
delays em ms. A **ordem das colunas é a ordem das mensagens**.

Isso já foi parseado para JSON pronto de seed em `seeds/`:
- `desafio-track-baixa.json` (Nível Semente)
- `desafio-track-moderada.json` (Nível Raízes)
- `desafio-track-alta.json` (Nível Floração)

## Schema de destino

```
ChallengeTrack  { id, level (BAIXA|MODERADA|ALTA), codename, title, defaultCooldownHours }
ChallengeDay    { id, trackId, dayNumber (0..7), isOnboarding }
ChallengeMessage{ id, dayId, ordem, tipo (TEXTO|AUDIO|IMAGEM|VIDEO), texto?, mediaKey?, delayMs }
```

Formato de cada mensagem no seed:
```json
{ "ordem": 7, "tipo": "AUDIO", "delayMs": 104561,
  "mediaSourceDriveId": "1L9XAig-...", "mediaKey": "desafio/baixa/dia1/7.mp3" }
```
`mediaSourceDriveId` é só referência de origem (migração). Em produção o app usa
`mediaKey` (caminho no R2). `delayMs` é o tempo antes de revelar a próxima
mensagem (recria o ritmo do WhatsApp).

## Regras ao trabalhar aqui

- **Não sirva mídia do Google Drive em produção.** Migre para o R2 usando
  `seeds/midia-manifesto.csv` (coluna `r2Key` = destino). A coluna `duplicado`
  marca IDs repetidos entre trilhas — suba o arquivo uma vez e reaproveite a key.
- O player deve **persistir o índice da última `ordem` vista** por dia, para a
  usuária sair e voltar sem reiniciar. Na volta, não re-aplique os delays já
  consumidos.
- As aulas são `tipo = VIDEO` (1 por dia, dias 1–7) + boas-vindas no Dia 0.
  São vídeos **compartilhados** entre as 3 trilhas (`videos/aulaN.mp4`,
  `videos/boas-vindas.mp4`). Migração via `seeds/aulas-manifesto.csv`.
- Ao adicionar/editar conteúdo, edite o JSON de seed e rode o seed de novo — não
  hardcode texto em componentes.

## Gating (resumo)

Dia N+1 abre quando o Dia N está concluído E passou o cooldown
(`defaultCooldownHours`, ~20h). Concluir = ação "Concluí o dia". A **devolutiva**
(texto/áudio/foto) é opcional e não trava. Detalhe em `docs/04-motor-do-desafio.md`.
