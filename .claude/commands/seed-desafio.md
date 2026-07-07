---
description: Popula o banco com uma trilha do desafio a partir de seeds/desafio-track-*.json
argument-hint: [baixa|moderada|alta]
---

Popule a trilha `$1` no banco a partir de `seeds/desafio-track-$1.json`.

Passos:
1. Leia `.claude/skills/roteiro-desafio/SKILL.md` e o JSON da trilha.
2. Faça upsert de ChallengeTrack, ChallengeDay e ChallengeMessage (idempotente
   por (trackId, dayNumber, ordem)).
3. Use `mediaKey` como referência de mídia (R2), não o Drive.
4. Reporte quantos dias/mensagens foram inseridos ou atualizados.
