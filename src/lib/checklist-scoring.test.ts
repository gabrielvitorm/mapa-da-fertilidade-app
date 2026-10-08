import assert from 'node:assert/strict';
import checklistSource from '../../prisma/seed-data/checklist-v2.json';
import { computeChecklist } from './checklist-scoring';
import { buildChecklistReport } from './checklist-report';
import { FAVORABLE_ANSWERS, INTERMEDIATE_ANSWERS } from './checklist-sample-answers';
import { CHECKLIST_PILLARS, type ChecklistAnswers, type ChecklistTexts, type PillarStatus } from '@/types/checklist';

interface SourceOption { value: string; label: string; exclusive?: boolean }
interface SourceQuestion { pillar: string; code: string; texto: string; multiSelect?: boolean; options: SourceOption[] }
const source = checklistSource as { questions: SourceQuestion[]; texts: { key: string; title?: string; body: string }[] };

const texts: ChecklistTexts = Object.fromEntries(
  source.texts.map((t) => [t.key, { title: t.title ?? null, body: t.body }])
);

function run(overrides: ChecklistAnswers = {}) {
  return computeChecklist({ ...FAVORABLE_ANSWERS, ...overrides });
}

function status(result: ReturnType<typeof computeChecklist>, pillar: string): PillarStatus {
  const found = result.pillars.find((p) => p.pillar === pillar);
  assert.ok(found, `pilar ${pillar} ausente`);
  return found.status;
}

// --- Integridade do conteúdo ------------------------------------------------

const codes = new Set<string>();
for (const q of source.questions) {
  assert.ok(!codes.has(q.code), `código de pergunta duplicado: ${q.code}`);
  codes.add(q.code);
  assert.ok((CHECKLIST_PILLARS as readonly string[]).includes(q.pillar), `pilar desconhecido: ${q.pillar}`);
  const optionValues = q.options.map((o) => o.value);
  assert.equal(new Set(optionValues).size, optionValues.length, `opção duplicada em ${q.code}`);
  if (!q.multiSelect) assert.ok(q.options.every((o) => !o.exclusive), `exclusive só faz sentido em multiSelect (${q.code})`);
}
// As perguntas de cada pilar ficam contíguas e na ordem dos 13 pilares.
const pillarOrder = [...new Set(source.questions.map((q) => q.pillar))];
assert.deepEqual(pillarOrder, [...CHECKLIST_PILLARS]);
// O fixture favorável responde exatamente as perguntas do JSON, com valores válidos.
assert.deepEqual(Object.keys(FAVORABLE_ANSWERS).sort(), [...codes].sort());
for (const [code, selected] of Object.entries(FAVORABLE_ANSWERS)) {
  const q = source.questions.find((x) => x.code === code)!;
  for (const v of selected) assert.ok(q.options.some((o) => o.value === v), `${code}=${v} não existe no JSON`);
}
for (const pillar of CHECKLIST_PILLARS) {
  assert.ok(texts[`pillar.${pillar}`], `falta pillar.${pillar}`);
  assert.ok(texts[`pillar_favoravel.${pillar}`], `falta pillar_favoravel.${pillar}`);
  assert.ok(texts[`pillar_atencao.${pillar}`], `falta pillar_atencao.${pillar}`);
}
// Todo next.<achado> aponta para um achado que existe.
for (const key of Object.keys(texts).filter((k) => k.startsWith('next.'))) {
  assert.ok(texts[`finding.${key.slice(5)}`], `${key} sem finding correspondente`);
}

// --- Perfil favorável -------------------------------------------------------

{
  const r = run();
  assert.equal(r.total, 0);
  assert.equal(r.classification, 'FAVORAVEL');
  assert.equal(r.completeness, 'SUFICIENTE');
  assert.deepEqual(r.locks, []);
  assert.ok(r.pillars.every((p) => p.status === 0));
}

// --- Pilar 1: idade × tempo de tentativa -----------------------------------

assert.equal(status(run({ tempo_tentativa: ['6_11'] }), 'idade_tentativa'), 1);
assert.equal(status(run({ tempo_tentativa: ['gte12'] }), 'idade_tentativa'), 2);
assert.equal(status(run({ idade: ['35_39'], tempo_tentativa: ['lt6'] }), 'idade_tentativa'), 1);
assert.equal(status(run({ idade: ['35_39'], tempo_tentativa: ['nao_comecei'] }), 'idade_tentativa'), 1);
assert.equal(status(run({ idade: ['35_39'], tempo_tentativa: ['6_11'] }), 'idade_tentativa'), 2);
{
  const r = run({ idade: ['gte40'], tempo_tentativa: ['nao_comecei'] });
  assert.equal(status(r, 'idade_tentativa'), 3);
  assert.ok(r.locks.includes('idade_40'));
  assert.equal(r.classification, 'ALTA_PRIORIDADE');
}

// Um crítico em 2 com o resto favorável e completo -> intermediária.
{
  const r = run({ tempo_tentativa: ['gte12'] });
  assert.equal(r.investigationIndicated, true);
  assert.equal(r.classification, 'INTERMEDIARIA');
  assert.deepEqual(r.missingData, []);
}

// --- ND / NA e classificação inconclusiva ----------------------------------

// < 35, pouco tempo de tentativa, sem exames: nada indicado ainda -> NA, sem pendência.
{
  const r = run({ avaliacao_trompas: ['nao'], amh: ['nao'], cfa: ['nao'], fsh: ['nao'], espermograma: ['nao'] });
  assert.equal(status(r, 'trompas'), 'NA');
  assert.equal(status(r, 'reserva_ovariana'), 'NA');
  assert.equal(status(r, 'fator_masculino'), 'NA');
  assert.deepEqual(r.missingData, []);
  assert.equal(r.classification, 'FAVORAVEL');
}

// 35–39 anos: reserva ovariana já indicada pela idade.
{
  const r = run({ idade: ['35_39'], amh: ['nao'], cfa: ['nao_lembro'] });
  assert.equal(status(r, 'reserva_ovariana'), 'ND');
  assert.deepEqual(r.missingData, ['reserva_ovariana']);
  assert.equal(r.completeness, 'PARCIAL');
  assert.equal(r.classification, 'INCONCLUSIVA');
}

// Investigação indicada sem trompas avaliadas: trompas = 2 (manual) + pendência -> dois críticos em 2.
{
  const r = run({ tempo_tentativa: ['gte12'], avaliacao_trompas: ['nao'] });
  assert.equal(status(r, 'trompas'), 2);
  assert.ok(r.missingData.includes('trompas'));
  assert.ok(r.locks.includes('dois_pilares_criticos'));
  assert.equal(r.classification, 'ALTA_PRIORIDADE');
}

// Fator masculino pendente quando indicado; ND não entra no total.
{
  const r = run({ tempo_tentativa: ['gte12'], espermograma: ['nao'] });
  assert.equal(status(r, 'fator_masculino'), 'ND');
  assert.equal(r.total, 2);
  assert.equal(r.classification, 'INCONCLUSIVA');
  assert.equal(r.completeness, 'PARCIAL');
}

// Sem parceiro: pilar não aplicável e nunca vira pendência.
{
  const r = run({ tempo_tentativa: ['gte12'], parceiro_idade: ['sem_parceiro'], espermograma: ['nao_se_aplica'] });
  assert.equal(status(r, 'fator_masculino'), 'NA');
  assert.ok(!r.missingData.includes('fator_masculino'));
}

// Antecedente masculino torna o espermograma indicado mesmo sem tempo de tentativa.
assert.ok(
  run({ espermograma: ['nao'], riscos_masculinos: ['varicocele'] }).missingData.includes('fator_masculino')
);

// Ciclo desconhecido é dado essencial.
{
  const r = run({ ciclo_duracao: ['nao_sei'] });
  assert.equal(status(r, 'ciclo_ovulacao'), 'ND');
  assert.equal(r.classification, 'INCONCLUSIVA');
}

// Trava prevalece sobre a pendência de dados.
{
  const r = run({ ciclo_duracao: ['nao_sei'], achados_pelvicos: ['endometrioma'] });
  assert.equal(r.classification, 'ALTA_PRIORIDADE');
}

// Duas pendências -> completude insuficiente.
assert.equal(
  run({ idade: ['35_39'], amh: ['nao'], cfa: ['nao'], ciclo_duracao: ['nao_sei'] }).completeness,
  'INSUFICIENTE'
);

// --- Pilar 2: ciclo ----------------------------------------------------------

assert.equal(status(run({ ciclo_duracao: ['gt35'] }), 'ciclo_ovulacao'), 2);
assert.equal(status(run({ sinais_ovulacao: ['lh_sem_pico'] }), 'ciclo_ovulacao'), 1);
assert.equal(status(run({ sinais_ovulacao: ['nenhum'] }), 'ciclo_ovulacao'), 1);
assert.equal(status(run({ sangramento: ['escapes'] }), 'ciclo_ovulacao'), 2);
assert.equal(status(run({ progesterona: ['lte3'] }), 'ciclo_ovulacao'), 2);
assert.equal(status(run({ progesterona: ['gt3'] }), 'ciclo_ovulacao'), 0);
assert.equal(status(run({ sintomas_hormonais: ['sim'] }), 'ciclo_ovulacao'), 2);
{
  const r = run({ sintomas_hormonais: ['sim'], ciclo_duracao: ['irregular'] });
  assert.equal(status(r, 'ciclo_ovulacao'), 3);
  assert.ok(r.locks.includes('suspeita_insuficiencia_ovariana'));
}
assert.ok(run({ amenorreia_90: ['sim'] }).locks.includes('amenorreia_90'));

// --- Pilar 3: SOMP (sem contar o ciclo de novo) -----------------------------

assert.equal(status(run({ ciclo_duracao: ['irregular'] }), 'somp'), 0);
assert.equal(status(run({ sinais_androgenicos: ['acne'] }), 'somp'), 1);
assert.equal(status(run({ sinais_androgenicos: ['acne', 'hirsutismo'] }), 'somp'), 2);
assert.equal(status(run({ exames_somp: ['usg_policistico'], amh: ['gt4'] }), 'somp'), 2);
assert.equal(status(run({ diagnostico_somp: ['sim_acompanhada'] }), 'somp'), 2);
// AMH elevado pontua em SOMP, não em reserva ovariana.
assert.equal(status(run({ amh: ['gt4'] }), 'reserva_ovariana'), 0);

// --- Pilares 4 e 5 -----------------------------------------------------------

assert.equal(status(run({ dor_pelvica: ['dor_fora_menstruacao'] }), 'endometriose_pelve'), 1);
assert.equal(status(run({ dor_pelvica: ['colica_incapacitante'] }), 'endometriose_pelve'), 2);
assert.equal(status(run({ achados_pelvicos: ['miomas'] }), 'endometriose_pelve'), 2);
assert.equal(status(run({ achados_pelvicos: ['malformacao'] }), 'endometriose_pelve'), 3);
assert.equal(status(run({ avaliacao_trompas: ['obstrucao_unilateral'] }), 'trompas'), 2);
assert.equal(status(run({ avaliacao_trompas: ['obstrucao_bilateral'] }), 'trompas'), 3);
assert.equal(status(run({ riscos_trompas: ['hidrossalpinge'] }), 'trompas'), 3);
assert.equal(status(run({ riscos_trompas: ['ectopica'] }), 'trompas'), 1);
// Antecedente de risco torna a avaliação tubária indicada.
assert.equal(status(run({ avaliacao_trompas: ['nao'], riscos_trompas: ['ist_dip'] }), 'trompas'), 2);

// --- Pilar 6: reserva ovariana ----------------------------------------------

assert.equal(status(run({ amh: ['1_1_5'] }), 'reserva_ovariana'), 1);
assert.equal(status(run({ amh: ['lt1'] }), 'reserva_ovariana'), 2);
assert.equal(status(run({ fsh: ['gte10'] }), 'reserva_ovariana'), 1);
{
  const r = run({ amh: ['lt1'], fsh: ['gte10'] });
  assert.equal(status(r, 'reserva_ovariana'), 3);
  assert.ok(r.locks.includes('reserva_muito_reduzida'));
}
assert.equal(status(run({ historico_ovariano: ['um_ovario'] }), 'reserva_ovariana'), 1);
// Endometrioma torna a reserva indicada mesmo < 35 anos.
assert.ok(run({ amh: ['nao'], cfa: ['nao'], achados_pelvicos: ['endometrioma'] }).missingData.includes('reserva_ovariana'));

// --- Pilares 7 a 12 ----------------------------------------------------------

assert.equal(status(run({ tireoide_condicao: ['sim_controlada'] }), 'tireoide'), 0);
assert.equal(status(run({ tireoide_condicao: ['sim_descompensada'] }), 'tireoide'), 3);
assert.equal(status(run({ tireoide_extra: ['anticorpos_positivos'] }), 'tireoide'), 1);
assert.equal(status(run({ exposicao_domestica: ['aromatizadores'] }), 'disruptores'), 1);
assert.equal(status(run({ exposicao_relevante: ['convive_fumantes'] }), 'disruptores'), 2);
assert.equal(status(run({ figado_sinais: ['alcool'] }), 'figado'), 1);
assert.equal(status(run({ figado_exames: ['esteatose'] }), 'figado'), 2);
assert.equal(status(run({ sintomas_intestinais: ['gases'], frequencia_intestinal: ['ocasional'] }), 'intestino'), 1);
assert.equal(status(run({ sintomas_intestinais: ['gases'], frequencia_intestinal: ['persistente'] }), 'intestino'), 2);
assert.equal(status(run({ sintomas_intestinais: ['alarme'] }), 'intestino'), 3);
assert.equal(status(run({ condicoes_intestinais: ['gluten'] }), 'intestino'), 2);
assert.equal(status(run({ estado_nutricional: ['sobrepeso'] }), 'metabolismo_nutricao'), 1);
assert.equal(status(run({ estado_nutricional: ['obesidade'] }), 'metabolismo_nutricao'), 2);
assert.equal(status(run({ comportamento_alimentar: ['transtorno_ativo'] }), 'metabolismo_nutricao'), 3);
assert.equal(status(run({ cafeina: ['acima_200'] }), 'metabolismo_nutricao'), 1);
assert.equal(status(run({ homocisteina: ['acima_8'] }), 'metilacao_inflamacao'), 2);
assert.equal(status(run({ deficiencias: ['vit_d'] }), 'metilacao_inflamacao'), 1);
assert.equal(status(run({ deficiencias: ['vit_d', 'ferro'] }), 'metilacao_inflamacao'), 2);
assert.equal(status(run({ inflamacao: ['alterados'] }), 'metilacao_inflamacao'), 1);
// Exames não realizados aparecem como achado, sem pontuar.
{
  const r = run({ homocisteina: ['nao'], deficiencias: ['nunca_investiguei'] });
  assert.equal(status(r, 'metilacao_inflamacao'), 0);
  assert.ok(r.pillars.find((p) => p.pillar === 'metilacao_inflamacao')!.findings.some((f) => f.key === 'exames_nao_realizados' && f.points === 0));
}

// --- Pilar 13: fator masculino ----------------------------------------------

assert.equal(status(run({ espermograma: ['alterado'] }), 'fator_masculino'), 2);
assert.equal(status(run({ espermograma: ['grave'] }), 'fator_masculino'), 3);
assert.equal(status(run({ riscos_masculinos: ['testosterona'] }), 'fator_masculino'), 3);
assert.equal(status(run({ riscos_masculinos: ['fuma'] }), 'fator_masculino'), 1);
assert.equal(status(run({ parceiro_idade: ['gte50'] }), 'fator_masculino'), 1);
// Ausência de fragmentação espermática nunca pontua.
assert.equal(status(run({ fragmentacao: ['nao'], tempo_tentativa: ['gte12'] }), 'fator_masculino'), 0);

// --- Fronteiras do total auxiliar -------------------------------------------

// 4 pilares em 1 ponto (total 4) -> intermediária pela regra dos quatro pilares.
{
  const r = run({
    sinais_androgenicos: ['acne'],
    exposicao_domestica: ['aquece_plastico'],
    figado_sinais: ['enxaqueca'],
    cafeina: ['acima_200'],
  });
  assert.equal(r.total, 4);
  assert.equal(r.classification, 'INTERMEDIARIA');
}
// 3 pilares em 1 ponto (total 3) -> favorável.
assert.equal(
  run({ sinais_androgenicos: ['acne'], exposicao_domestica: ['aquece_plastico'], cafeina: ['acima_200'] }).classification,
  'FAVORAVEL'
);
// Total 4 com um pilar não crítico em 2 -> favorável (0 a 4, sem crítico em 2).
assert.equal(run({ figado_exames: ['esteatose'], cafeina: ['acima_200'], figado_sinais: [] }).total, 3);
assert.equal(
  run({ figado_exames: ['esteatose'], exposicao_domestica: ['aquece_plastico'], cafeina: ['acima_200'] }).classification,
  'FAVORAVEL'
);
// Total 5 só com não críticos -> intermediária.
assert.equal(
  run({ figado_exames: ['esteatose'], condicoes_intestinais: ['gluten'], cafeina: ['acima_200'] }).classification,
  'INTERMEDIARIA'
);
// Total 10 só com não críticos em 2 -> alta prioridade pelo total.
{
  const r = run({
    sinais_androgenicos: ['acne', 'hirsutismo'],
    exposicao_relevante: ['ocupacional'],
    figado_exames: ['esteatose'],
    condicoes_intestinais: ['gluten'],
    estado_nutricional: ['obesidade'],
  });
  assert.equal(r.total, 10);
  assert.deepEqual(r.locks, []);
  assert.equal(r.classification, 'ALTA_PRIORIDADE');
}
// Total 9 -> intermediária.
assert.equal(
  run({
    sinais_androgenicos: ['acne', 'hirsutismo'],
    exposicao_relevante: ['ocupacional'],
    figado_exames: ['esteatose'],
    condicoes_intestinais: ['gluten'],
    cafeina: ['acima_200'],
  }).classification,
  'INTERMEDIARIA'
);

// --- Perfil demo -------------------------------------------------------------

{
  const r = computeChecklist(INTERMEDIATE_ANSWERS);
  assert.equal(r.total, 7);
  assert.equal(r.classification, 'INTERMEDIARIA');
  assert.deepEqual(r.missingData, []);
}

// --- Relatório ----------------------------------------------------------------

{
  const report = buildChecklistReport(run({ tempo_tentativa: ['gte12'], avaliacao_trompas: ['nao'], amh: ['lt1'] }), texts);
  assert.equal(report.classification, 'ALTA_PRIORIDADE');
  assert.equal(report.priorities.length, 3);
  // Prioridades: todos em 2, críticos na ordem dos pilares.
  assert.deepEqual(report.priorities.map((p) => p.key), ['idade_tentativa', 'trompas', 'reserva_ovariana']);
  assert.ok(report.locks.some((l) => l.key === 'dois_pilares_criticos' && l.body.length > 0));
  assert.equal(report.favorables.length, 10);
}

// --- Coerência das saídas pós-quiz --------------------------------------------

function pillarOf(overrides: ChecklistAnswers, pillar: string) {
  const report = buildChecklistReport(run(overrides), texts);
  return report.pillars.find((p) => p.key === pillar)!;
}
const keys = (p: { findings: { key: string }[] }) => p.findings.map((f) => f.key);

// "Fiz, mas não sei o resultado" não é tratado como "não fiz".
assert.deepEqual(keys(pillarOf({ tempo_tentativa: ['gte12'], avaliacao_trompas: ['nao_lembro'] }, 'trompas')), [
  'trompas_resultado_desconhecido',
]);
assert.ok(
  keys(pillarOf({ tempo_tentativa: ['gte12'], espermograma: ['nao_sei'] }, 'fator_masculino')).includes(
    'espermograma_resultado_desconhecido'
  )
);
assert.ok(
  keys(pillarOf({ idade: ['35_39'], amh: ['nao_lembro'], cfa: ['nao'] }, 'reserva_ovariana')).includes(
    'reserva_resultado_desconhecido'
  )
);
// Espermograma não indicado: NA sem achado mandando procurar urologista.
{
  const p = pillarOf({ espermograma: ['nao'] }, 'fator_masculino');
  assert.equal(p.status, 'NA');
  assert.deepEqual(p.findings, []);
  assert.equal(p.nextStep, texts['pillar_na.fator_masculino'].body);
}
// Limítrofe não é rotulado como reduzido.
assert.deepEqual(keys(pillarOf({ cfa: ['5_7'] }, 'reserva_ovariana')), ['cfa_limitrofe']);
// Marcações contraditórias de LH: o pico identificado prevalece.
assert.equal(pillarOf({ sinais_ovulacao: ['lh_pico', 'lh_sem_pico'] }, 'ciclo_ovulacao').status, 0);
// Progesterona ovulatória dispensa o achado "ovulação não acompanhada".
assert.equal(pillarOf({ sinais_ovulacao: ['nenhum'], progesterona: ['gt3'] }, 'ciclo_ovulacao').status, 0);
// Metilação sem exames não diz que os exames vieram normais.
{
  const p = pillarOf({ homocisteina: ['nao'], deficiencias: ['nunca_investiguei'], inflamacao: ['nao'] }, 'metilacao_inflamacao');
  assert.equal(p.status, 0);
  assert.equal(p.nextStep, texts['next.exames_nao_realizados'].body);
}
assert.equal(
  pillarOf({ inflamacao: ['nao_lembro'] }, 'metilacao_inflamacao').nextStep,
  texts['next.exames_nao_realizados'].body
);
// Conduta específica quando o achado principal pede.
assert.equal(pillarOf({ diagnostico_somp: ['sim_acompanhada'] }, 'somp').nextStep, texts['next.diagnostico_somp'].body);
assert.equal(
  pillarOf({ sintomas_intestinais: ['alarme', 'gases'] }, 'intestino').nextStep,
  texts['next.sinais_alarme_intestinais'].body
);
// Nível "Atenção" usa o texto brando, não a frase de investigação do manual.
assert.equal(pillarOf({ sangramento: ['fluxo_intenso'] }, 'ciclo_ovulacao').nextStep, texts['pillar_atencao.ciclo_ovulacao'].body);
assert.equal(pillarOf({ sangramento: ['escapes'] }, 'ciclo_ovulacao').nextStep, texts['pillar.ciclo_ovulacao'].body);
// Pendência mostra o texto ND do pilar.
{
  const report = buildChecklistReport(run({ idade: ['35_39'], amh: ['nao'], cfa: ['nao'] }), texts);
  assert.equal(report.missingData[0].text, texts['pillar_nd.reserva_ovariana'].body);
}

// --- Fuzz: invariantes + nenhum texto faltando --------------------------------

let seed = 42;
function random() {
  seed = (seed * 1103515245 + 12345) % 2 ** 31;
  return seed / 2 ** 31;
}

for (let i = 0; i < 3000; i++) {
  const answers: ChecklistAnswers = {};
  for (const q of source.questions) {
    if (q.multiSelect) {
      const exclusive = q.options.filter((o) => o.exclusive);
      if (exclusive.length > 0 && random() < 0.3) {
        answers[q.code] = [exclusive[Math.floor(random() * exclusive.length)].value];
      } else {
        const picked = q.options.filter((o) => !o.exclusive && random() < 0.35).map((o) => o.value);
        answers[q.code] = picked.length > 0 ? picked : [q.options[0].value];
      }
    } else {
      answers[q.code] = [q.options[Math.floor(random() * q.options.length)].value];
    }
  }

  const r = computeChecklist(answers);
  const numeric = r.pillars.filter((p) => typeof p.status === 'number');
  assert.equal(r.total, numeric.reduce((s, p) => s + (p.status as number), 0));
  if (r.pillars.some((p) => p.status === 3)) assert.equal(r.classification, 'ALTA_PRIORIDADE');
  if (r.classification === 'FAVORAVEL') {
    assert.ok(r.total <= 4 && r.missingData.length === 0);
    assert.ok(!r.pillars.some((p) => p.critical && p.status === 2));
  }
  for (const p of r.pillars) {
    if (p.status === 'ND') assert.ok(r.missingData.includes(p.pillar));
  }
  const report = buildChecklistReport(r, texts); // lança se algum achado/pilar estiver sem texto

  assert.equal(Object.values(report.statusCounts).reduce((a, b) => a + b, 0), 13);
  assert.equal(
    report.findingsCount,
    report.pillars.reduce((n, p) => n + p.findings.filter((f) => f.points > 0).length, 0)
  );
  for (const p of report.pillars) {
    const override = p.findings[0] && texts[`next.${p.findings[0].key}`];
    // NA nunca carrega achado (não há o que recomendar ainda).
    if (p.status === 'NA') assert.deepEqual(p.findings, [], `${p.key} NA com achados`);
    // Favorável nunca carrega achado que pontua.
    if (p.status === 0) assert.ok(p.findings.every((f) => f.points === 0), `${p.key} favorável com achado`);
    // O próximo passo combina com o nível do pilar.
    if (!override) {
      const expected =
        p.status === 0 ? `pillar_favoravel.${p.key}` :
        p.status === 1 ? `pillar_atencao.${p.key}` :
        p.status === 'NA' ? `pillar_na.${p.key}` :
        p.status === 'ND' ? `pillar_nd.${p.key}` : `pillar.${p.key}`;
      assert.equal(p.nextStep, (texts[expected] ?? texts[`pillar.${p.key}`]).body, `${p.key} próximo passo incoerente`);
    }
    // A pontuação do pilar é a do seu achado mais grave (exceto SOMP, que soma sinais).
    if (typeof p.status === 'number' && p.key !== 'somp') {
      assert.equal(Math.max(0, ...p.findings.map((f) => f.points)), p.status, `${p.key} nota ≠ achado principal`);
    }
  }
  for (const m of report.missingData) assert.ok(m.text.length > 0);
}

console.log('checklist-scoring.test.ts: all assertions passed');
