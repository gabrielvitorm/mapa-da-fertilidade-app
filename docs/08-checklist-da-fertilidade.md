# 08 — Checklist da Fertilidade (quiz v2)

Substitui o "Mapa da Fertilidade" do Typebot (docs/02) como quiz padrão do app.
Fonte: *Checklist da Fertilidade* + *Manual profissional do Checklist da
Fertilidade* (Carolina Palitot, set/2026).

## Convivência com o quiz antigo

| | Mapa v1 (`MAPA_V1`) | Checklist v2 (`CHECKLIST_V2`) |
| --- | --- | --- |
| Status | **Oculto, preservado** | Padrão em `/quiz` |
| Perguntas | `Question.version = MAPA_V1` (seed `quiz-source.json`) | `Question.version = CHECKLIST_V2` (seed `checklist-v2.json`) |
| Motor | `src/lib/scoring.ts` (docs/02) | `src/lib/checklist-scoring.ts` |
| Relatório | `ReportView` / `ReportPrintView` | `ChecklistReportView` / `ChecklistReportPrintView` |

- `/quiz` e `/captura` servem só a versão ativa (`src/lib/quiz-version.ts`).
  Para reativar o quiz antigo sem deploy: `QUIZ_VERSION=MAPA_V1`.
- Cada `Assessment` guarda `quizVersion`; teaser, relatório, PDF e dashboard
  escolhem a tela pela versão. Assessments antigos continuam abrindo o relatório antigo.
- `createAssessment` deduz a versão pelas opções enviadas: o Typebot (v1) e o
  quiz nativo (v2) usam a mesma ingestão. Misturar versões é rejeitado.

## Modelo de pontuação (manual profissional)

Cada um dos 13 pilares recebe **uma** nota, pelo achado de maior prioridade do bloco:

| Pontos | Nível | Significado |
| :-: | --- | --- |
| 0 | Favorável | Sem sinal relevante ou condição bem acompanhada |
| 1 | Atenção | Fator leve ou modificável |
| 2 | Investigar | Justifica investigação direcionada |
| 3 | Prioridade alta | Pede avaliação médica prioritária |
| ND | Dados insuficientes | Dado essencial ausente quando a avaliação já é indicada |
| NA | Não aplicável | Avaliação ainda não indicada |

**Total auxiliar** = soma só dos pilares 0–3 (ND/NA ficam de fora). **Nunca é
exibido como porcentagem** (orientação do manual). O app não mostra o total
para a usuária, só a classificação.

### Classificação (ordem de precedência)

1. **Alta prioridade** se houver qualquer trava: qualquer pilar com 3, ou dois
   pilares críticos com 2 (`dois_pilares_criticos`).
2. **Inconclusiva** se faltar algum dado essencial (`missingData`).
3. **Alta prioridade** se total ≥ 10.
4. **Intermediária** se total ≥ 5, ou um crítico com 2, ou quatro ou mais pilares com 1.
5. **Favorável** no restante (0–4, sem crítico em 2, dados completos).

Pilares críticos: idade e tentativa, ciclo e ovulação, endometriose e pelve,
trompas, reserva ovariana e fator masculino.

**Completude:** nenhuma pendência = suficiente; 1 = parcial; 2 ou mais = insuficiente.

### Trilha do desafio

`CLASSIFICATION_TO_TRACK`: Favorável → ALTA (Floração), Intermediária e
Inconclusiva → MODERADA (Raízes), Alta prioridade → BAIXA (Semente). Gravado em
`Assessment.nivelGlobal`, que o webhook já usa para abrir a trilha.

## Decisões de implementação (validar com a Carolina)

O manual descreve critérios clínicos. Como a usuária responde sozinha, cada
critério virou uma regra objetiva sobre as respostas. Os pontos abaixo foram
**decididos pelo dev** e devem ser revisados pela expert:

1. **Perguntas abertas viraram faixas.** AMH: < 1,0 reduzido; 1,0–1,5 limítrofe;
   1,5–4,0 esperado; > 4,0 elevado. Contagem de folículos: < 5 reduzida, 5–7
   limítrofe. FSH ≥ 10 limítrofe. Homocisteína: alvo ≤ 8 µmol/L (do checklist).
   Cafeína: > ~200 mg/dia. Peso: faixas de IMC. Idade do parceiro: ≥ 40 = atenção.
2. **Perguntas Sim/Não agrupadas em múltipla escolha** ("marque todas"), com
   opção exclusiva "Nenhum desses". São 39 telas em vez de cerca de 100.
3. **Perguntas repetidas no checklist** (variação de peso; intolerância e glúten)
   aparecem uma vez só, no pilar onde pontuam. AMH > 4 pontua só em SOMP.
4. **"Investigação indicada"** = pilar 1 com 2 ou mais pontos (< 35 anos e 12 meses ou
   mais; 35–39 e 6 meses ou mais; 40 ou mais). Ela torna obrigatórias:
   - **trompas**: se não avaliadas, ficam com 2 pontos (critério literal do
     manual) e pendência; antecedente de ectópica, IST/DIP ou hidrossalpinge
     também torna a avaliação indicada;
   - **reserva ovariana**: indicada também por idade ≥ 35, histórico ovariano ou endometrioma;
   - **fator masculino**: indicado também por varicocele, trauma, cirurgia,
     testosterona ou quimio/radioterapia.
   Consequência: mulher < 35 anos com 12 meses ou mais de tentativa e sem histerossalpingografia
   já cai em **alta prioridade** (idade = 2 e trompas = 2, dois críticos).
5. **Pontos 3 sem avaliação clínica** só são dados quando a resposta é explícita:
   amenorreia ≥ 90 dias; ondas de calor junto com ciclo irregular ou ausente
   (suspeita de insuficiência ovariana); 2 ou mais marcadores de reserva reduzidos;
   tireoide "descompensada ou sem acompanhamento"; sangue nas fezes ou
   emagrecimento sem explicação; transtorno alimentar ativo; endometrioma,
   aderência ou malformação; obstrução bilateral ou hidrossalpinge; azoospermia,
   alteração seminal grave ou uso de testosterona/anabolizantes. SOMP,
   disruptores, fígado e metilação vão no máximo até 2 por autorrelato.
6. **Tireoide controlada = 0** (literal do manual), mas o texto de acompanhamento aparece no relatório.
7. **Fragmentação espermática ausente nunca pontua** (orientação do manual);
   alterada = 2.
8. **Sem parceiro homem** ("não se aplica"): fator masculino = NA e nunca vira pendência.
9. **Textos novos.** Os textos de achados que o checklist não trazia foram
   escritos no mesmo tom: fluxo alterado, escapes, progesterona ≤ 3,
   ovulação não acompanhada, andrógenos, morfologia policística, diagnóstico de
   SOMP, dor leve, endometriose/adenomiose, cirurgia uterina, AMH limítrofe,
   reserva muito reduzida ou não avaliada, tireoide descompensada, tabagismo,
   exposição ocupacional, álcool, sinais de alarme intestinais, sobrepeso,
   transtorno ativo, idade paterna, alteração seminal grave, mais as frases
   "favorável", "NA" e "ND" por pilar. Todos ficam editáveis na tabela `ChecklistText`.

## Coerência das saídas pós-quiz

Regras garantidas por teste (`checklist-scoring.test.ts`, incluindo 3.000 combinações aleatórias):

- **O próximo passo acompanha o nível do pilar.** Favorável (`pillar_favoravel.*`), Atenção
  (`pillar_atencao.*`, mais brando), Investigar e Prioridade alta (frase do manual,
  `pillar.*`), ND (`pillar_nd.*`), NA (`pillar_na.*`). Quando o achado principal pede
  outra conduta, `next.<achado>` tem prioridade. Exemplos: SOMP já diagnosticada,
  tireoide descompensada ou controlada, sinais de alarme intestinais, transtorno
  alimentar ativo, exames de metilação não feitos.
- **"Fiz, mas não sei o resultado" não é "não fiz"**: trompas, reserva e espermograma
  têm achados `*_resultado_desconhecido`.
- **NA nunca carrega achado.** Espermograma não indicado não mostra "procure o urologista".
- **Favorável nunca carrega achado que pontua.** A nota do pilar é sempre a do seu
  achado mais grave (exceto SOMP, que soma sinais).
- **Exame não feito não aparece como normal**: metilação sem exames mostra
  "exames ainda não realizados", nunca "os exames não mostraram alteração".
- **Respostas contraditórias** (pico de LH identificado e não identificado) resolvem
  para o dado mais favorável; progesterona lútea > 3 dispensa "ovulação não acompanhada".
- **Faixa limítrofe tem título de limítrofe** (folículos 5–7, AMH 1,0–1,5).

## O que o teaser (pré-pagamento) libera

| Liberado | Só no relatório pago |
| --- | --- |
| Classificação + texto do manual + completude + nº de achados | Explicação de cada achado (exceto a prévia) |
| Mapa dos 13 pilares (barra de distribuição + selo de cada pilar) | Próximo passo de cada pilar |
| Travas de prioridade, com texto completo (segurança: nunca bloqueado) | Resumo detalhado por pilar |
| Avaliações essenciais pendentes, com orientação | PDF para a consulta |
| 3 prioridades com títulos dos achados + explicação completa do 1º achado | |
| Pontos favoráveis | |

## Onde ficam as coisas

| O quê | Onde |
| --- | --- |
| Perguntas, opções, textos | `prisma/seed-data/checklist-v2.json` → tabelas `Question`/`QuestionOption` (IDs estáveis `v2_<code>` / `v2_<code>__<value>`) e `ChecklistText` |
| Regras de pontuação | `src/lib/checklist-scoring.ts` (função pura; combinações e travas não cabem em dado) |
| Montagem do relatório | `src/lib/checklist-report.ts` |
| Validação do envio | `src/lib/checklist-answers.ts` (todas respondidas, escolha única, exclusiva sozinha) |
| Tipos e rótulos | `src/types/checklist.ts` |
| Testes | `npx tsx src/lib/checklist-scoring.test.ts` e `src/lib/checklist-answers.test.ts` |
| Previews sem banco | `/preview/quiz`, `/preview/resultado-checklist?perfil=…`, `/preview/relatorio-checklist?perfil=…` (`favoravel`, `intermediario`, `alta`, `inconclusivo`) |

**Editar um texto** (achado, frase de pilar, classificação, encerramento): basta
alterar `ChecklistText`, sem deploy. **Mudar uma regra ou faixa** exige alterar
`checklist-scoring.ts` + o teste. O relatório **recalcula a partir das respostas**
gravadas (`Assessment.answers` guarda `questionCode` e `value`), então regras e
textos novos valem também para relatórios antigos. `Assessment.classification`
e `nivelGlobal` são o snapshot do momento da compra (dashboard e trilha).

## Dados sensíveis

As respostas são dados de saúde (LGPD). O manual pede para informar a
finalidade da coleta, restringir o acesso, definir prazo de retenção e oferecer
canal de correção. **Pendente:** definir a política de retenção e o texto de
consentimento na captura.
