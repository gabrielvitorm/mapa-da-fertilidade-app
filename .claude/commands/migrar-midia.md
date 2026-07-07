---
description: Gera/roda o script de migração de mídia do Google Drive para o R2 usando o manifesto
---

Implemente um script (`scripts/migrate-media.ts`) que:
1. Lê `seeds/midia-manifesto.csv` (colunas driveId, r2Key, duplicado).
2. Para cada linha com `duplicado = nao`, baixa o arquivo do Drive e sobe no R2
   na key indicada (`r2Key`). Pula as marcadas como duplicado (já subidas).
3. Confirma a extensão real do arquivo ao baixar e corrige a key se necessário.
4. É idempotente: se a key já existe no R2, não re-sobe.
Use as envs R2_* descritas em `docs/05-infra-e-deploy.md`. Não suba nada para
fora do bucket configurado.
