/**
 * Motor de pontuação do Checklist da Fertilidade (quiz v2). Spec: docs/08.
 *
 * Função pura: recebe as respostas indexadas por código de pergunta e devolve
 * a nota 0–3 (ou ND/NA) de cada um dos 13 pilares, o total auxiliar, as travas
 * e a classificação final. Regras traduzidas do "Manual profissional do
 * Checklist da Fertilidade" (Carolina Palitot, set/2026):
 *
 * - cada pilar é pontuado UMA vez, pelo achado de maior prioridade do bloco;
 * - o mesmo achado não é somado em dois blocos (ex.: ciclo irregular só conta
 *   em "ciclo", nunca em "SOMP"; AMH elevado só pontua em "SOMP");
 * - "não realizado" não é normal: ND quando o dado já é necessário, NA quando
 *   ainda não há indicação;
 * - ND e NA não entram no total; as travas prevalecem sobre o total.
 */

import {
  CHECKLIST_PILLARS,
  CRITICAL_PILLARS,
  type ChecklistAnswers,
  type ChecklistClassification,
  type ChecklistComputation,
  type ChecklistPillarKey,
  type ChecklistPillarResult,
  type DataCompleteness,
  type PillarPoints,
  type PillarStatus,
} from '@/types/checklist';

interface Context {
  age: string | undefined;
  /** Idade × tempo de tentativa já indicam investigação (pilar 1 com 2+ pontos). */
  investigationIndicated: boolean;
}

class PillarBuilder {
  points: PillarPoints = 0;
  readonly findings: { key: string; points: PillarPoints }[] = [];
  missing = false;
  notApplicable = false;

  add(key: string, points: PillarPoints = 0) {
    this.findings.push({ key, points });
    this.raise(points);
  }

  raise(points: PillarPoints) {
    if (points > this.points) this.points = points;
  }
}

function values(answers: ChecklistAnswers, code: string): string[] {
  return answers[code] ?? [];
}

function one(answers: ChecklistAnswers, code: string): string | undefined {
  return values(answers, code)[0];
}

function has(answers: ChecklistAnswers, code: string, ...options: string[]): boolean {
  const selected = values(answers, code);
  return options.some((o) => selected.includes(o));
}

function idadeTentativa(a: ChecklistAnswers): PillarBuilder {
  const b = new PillarBuilder();
  const age = one(a, 'idade');
  const tempo = one(a, 'tempo_tentativa');

  if (age === 'gte40') {
    b.add('idade_40', 3);
  } else if (age === 'lt35') {
    if (tempo === 'gte12') b.add('tempo_tentativa_aumentado', 2);
    else if (tempo === '6_11') b.add('tempo_tentativa_atencao', 1);
  } else if (age === '35_39') {
    if (tempo === '6_11' || tempo === 'gte12') b.add('tempo_tentativa_aumentado', 2);
    else b.add('tempo_tentativa_atencao', 1);
  }
  return b;
}

function cicloOvulacao(a: ChecklistAnswers): PillarBuilder {
  const b = new PillarBuilder();
  const duracao = one(a, 'ciclo_duracao');
  const cicloAlterado = duracao === 'lt21' || duracao === 'gt35' || duracao === 'irregular';
  const amenorreia = has(a, 'amenorreia_90', 'sim');

  if (cicloAlterado) b.add('ciclo_fora_padrao', 2);
  if (duracao === 'nao_sei') {
    b.add('ciclo_desconhecido', 0);
    b.missing = true;
  }
  if (amenorreia) b.add('amenorreia_90', 3);

  if (has(a, 'sangramento', 'entre_menstruacoes', 'escapes')) b.add('escapes_sangramento', 2);
  if (has(a, 'sangramento', 'fluxo_intenso', 'coagulos', 'sangramento_longo')) b.add('fluxo_alterado', 1);

  const progesterona = one(a, 'progesterona');

  // "Consigo identificar o pico" prevalece sobre "não consigo" quando as duas são marcadas.
  if (has(a, 'sinais_ovulacao', 'lh_sem_pico') && !has(a, 'sinais_ovulacao', 'lh_pico')) b.add('ausencia_pico_lh', 1);
  // Progesterona lútea > 3 já é evidência de ovulação: não acompanhar sinais deixa de ser achado.
  if (has(a, 'sinais_ovulacao', 'nenhum') && progesterona !== 'gt3') b.add('ovulacao_nao_rastreada', 1);

  if (progesterona === 'gt3') b.add('progesterona_ovulatoria', 0);
  if (progesterona === 'lte3') b.add('progesterona_baixa', 2);

  if (has(a, 'sintomas_hormonais', 'sim')) {
    // Sintoma isolado = investigar; junto com ciclo ausente/irregular sugere
    // insuficiência ovariana, que é trava de alta prioridade.
    if (cicloAlterado || amenorreia) b.add('suspeita_insuficiencia_ovariana', 3);
    else b.add('sintomas_hipoestrogenismo', 2);
  }
  return b;
}

function somp(a: ChecklistAnswers): PillarBuilder {
  const b = new PillarBuilder();
  let sinais = 0;

  const androgenicos = values(a, 'sinais_androgenicos').filter((v) =>
    ['hirsutismo', 'acne', 'queda_cabelo'].includes(v)
  );
  if (androgenicos.length > 0) b.add('sinais_androgenicos', 1);
  sinais += androgenicos.length;

  if (has(a, 'sinais_androgenicos', 'acantose')) {
    b.add('acantose', 1);
    sinais += 1;
  }
  for (const [option, finding] of [
    ['androgenos_altos', 'androgenos_elevados'],
    ['usg_policistico', 'usg_policistico'],
    ['glicemia_alterada', 'glicemia_alterada'],
  ] as const) {
    if (has(a, 'exames_somp', option)) {
      b.add(finding, 1);
      sinais += 1;
    }
  }
  if (one(a, 'amh') === 'gt4') {
    b.add('amh_elevado_somp', 1);
    sinais += 1;
  }

  if (sinais >= 2) b.raise(2);
  if (has(a, 'diagnostico_somp', 'sim_acompanhada', 'sim_sem_acompanhamento')) b.add('diagnostico_somp', 2);
  return b;
}

function endometriosePelve(a: ChecklistAnswers): PillarBuilder {
  const b = new PillarBuilder();

  if (has(a, 'dor_pelvica', 'colica_incapacitante', 'dispareunia', 'dor_evacuar_urinar')) {
    b.add('dor_pelvica_importante', 2);
  }
  if (has(a, 'dor_pelvica', 'dor_fora_menstruacao')) b.add('dor_pelvica_leve', 1);

  if (has(a, 'achados_pelvicos', 'endometrioma')) b.add('endometrioma', 3);
  if (has(a, 'achados_pelvicos', 'aderencias', 'malformacao')) b.add('cavidade_alterada', 3);
  if (has(a, 'achados_pelvicos', 'endometriose_diagnostico')) b.add('endometriose_diagnostico', 2);
  if (has(a, 'achados_pelvicos', 'cirurgia_endometriose')) b.add('cirurgia_endometriose', 2);
  if (has(a, 'achados_pelvicos', 'miomas')) b.add('miomas', 2);
  if (has(a, 'achados_pelvicos', 'polipos')) b.add('polipos', 2);
  if (has(a, 'achados_pelvicos', 'cirurgia_uterina')) b.add('cirurgia_uterina', 2);
  return b;
}

function trompas(a: ChecklistAnswers, ctx: Context): PillarBuilder {
  const b = new PillarBuilder();
  const avaliacao = one(a, 'avaliacao_trompas');

  if (avaliacao === 'obstrucao_bilateral') b.add('obstrucao_bilateral', 3);
  if (avaliacao === 'obstrucao_unilateral') b.add('obstrucao_unilateral', 2);
  if (has(a, 'riscos_trompas', 'hidrossalpinge')) b.add('hidrossalpinge', 3);
  if (has(a, 'riscos_trompas', 'ectopica')) b.add('ectopica', 1);
  if (has(a, 'riscos_trompas', 'ist_dip')) b.add('infeccao_pelvica', 1);

  if (avaliacao === 'nao' || avaliacao === 'nao_lembro') {
    const temRisco = has(a, 'riscos_trompas', 'hidrossalpinge', 'ectopica', 'ist_dip');
    if (ctx.investigationIndicated || temRisco) {
      // Manual, pilar 5: "avaliação tubária indicada ainda não concluída" = 2.
      b.add(avaliacao === 'nao' ? 'trompas_nao_avaliadas' : 'trompas_resultado_desconhecido', 2);
      b.missing = true;
    } else {
      b.notApplicable = true;
    }
  }
  return b;
}

function reservaOvariana(a: ChecklistAnswers, ctx: Context): PillarBuilder {
  const b = new PillarBuilder();
  const amh = one(a, 'amh');
  const cfa = one(a, 'cfa');
  const fsh = one(a, 'fsh');
  let reduzidos = 0;

  if (amh === 'lt1') {
    b.add('amh_reduzido', 2);
    reduzidos += 1;
  }
  if (amh === '1_1_5') b.add('amh_limitrofe', 1);
  if (amh === 'gt4') b.add('amh_elevado', 0);

  if (cfa === 'lt5') {
    b.add('cfa_reduzida', 2);
    reduzidos += 1;
  }
  if (cfa === '5_7') b.add('cfa_limitrofe', 1);

  // FSH ≥ 10 sozinho é limítrofe; somado a outro marcador reduzido, compõe a combinação.
  if (fsh === 'gte10') {
    b.add('fsh_alterado', 1);
    reduzidos += 1;
  }
  if (reduzidos >= 2) b.add('reserva_muito_reduzida', 3);

  const historico = has(a, 'historico_ovariano', 'retirou_endometrioma', 'um_ovario');
  if (historico) b.add('historico_ovariano', 1);

  const avaliada =
    ['lt1', '1_1_5', '1_5_4', 'gt4'].includes(amh ?? '') || ['lt5', '5_7', 'gte8'].includes(cfa ?? '');
  if (!avaliada) {
    const indicada =
      ctx.age === '35_39' ||
      ctx.age === 'gte40' ||
      ctx.investigationIndicated ||
      historico ||
      has(a, 'achados_pelvicos', 'endometrioma', 'cirurgia_endometriose');
    if (indicada) {
      const resultadoPerdido = amh === 'nao_lembro' || cfa === 'nao_lembro';
      b.add(resultadoPerdido ? 'reserva_resultado_desconhecido' : 'reserva_nao_avaliada', 0);
      b.missing = true;
    } else {
      b.notApplicable = true;
    }
  }
  return b;
}

function tireoide(a: ChecklistAnswers): PillarBuilder {
  const b = new PillarBuilder();
  const condicao = one(a, 'tireoide_condicao');

  // Manual, pilar 7: condição "adequadamente controlada" = 0 (o texto do achado continua no relatório).
  if (condicao === 'sim_controlada') b.add('tireoide_condicao', 0);
  if (condicao === 'sim_descompensada') b.add('tireoide_descompensada', 3);
  if (has(a, 'tireoide_extra', 'anticorpos_positivos')) b.add('anticorpos_tireoide', 1);
  if (has(a, 'tireoide_extra', 'historico_familiar')) b.add('historico_familiar_tireoide', 1);
  return b;
}

function disruptores(a: ChecklistAnswers): PillarBuilder {
  const b = new PillarBuilder();
  if (has(a, 'exposicao_relevante', 'fuma', 'convive_fumantes')) b.add('tabagismo', 2);
  if (has(a, 'exposicao_relevante', 'ocupacional')) b.add('exposicao_ocupacional', 2);
  if (has(a, 'exposicao_domestica', 'aquece_plastico', 'embalagem_quente', 'reutiliza_garrafa', 'aromatizadores')) {
    b.add('exposicao_domestica', 1);
  }
  return b;
}

function figado(a: ChecklistAnswers): PillarBuilder {
  const b = new PillarBuilder();
  if (has(a, 'figado_exames', 'esteatose', 'enzimas_alteradas', 'doenca_hepatica')) b.add('figado_alterado', 2);
  for (const sinal of ['alcool', 'enxaqueca', 'lingua', 'autoimune']) {
    if (has(a, 'figado_sinais', sinal)) b.add(sinal, 1);
  }
  return b;
}

function intestino(a: ChecklistAnswers): PillarBuilder {
  const b = new PillarBuilder();
  if (has(a, 'sintomas_intestinais', 'alarme')) b.add('sinais_alarme_intestinais', 3);
  if (has(a, 'sintomas_intestinais', 'constipacao', 'diarreia', 'alterna', 'estufamento', 'gases', 'dor_abdominal')) {
    b.add('sintomas_intestinais', one(a, 'frequencia_intestinal') === 'persistente' ? 2 : 1);
  }
  if (has(a, 'condicoes_intestinais', 'intolerancia')) b.add('intolerancia_alimentar', 2);
  if (has(a, 'condicoes_intestinais', 'gluten')) b.add('gluten_celiaca', 2);
  if (has(a, 'condicoes_intestinais', 'candidiase')) b.add('candidiase_recorrente', 2);
  return b;
}

function metabolismoNutricao(a: ChecklistAnswers): PillarBuilder {
  const b = new PillarBuilder();
  if (has(a, 'comportamento_alimentar', 'transtorno_ativo')) b.add('transtorno_alimentar_ativo', 3);

  const variacao = one(a, 'peso_variacao');
  if (variacao === 'importante') b.add('variacao_peso', 2);
  if (variacao === 'leve') b.add('variacao_peso', 1);

  const estado = one(a, 'estado_nutricional');
  if (estado === 'magreza' || estado === 'obesidade') b.add('magreza_obesidade', 2);
  if (estado === 'sobrepeso') b.add('sobrepeso', 1);

  if (has(a, 'comportamento_alimentar', 'gordura_elevada')) b.add('gordura_elevada', 2);
  if (has(a, 'comportamento_alimentar', 'compulsao', 'restricao')) b.add('comportamento_alimentar', 2);
  if (has(a, 'cafeina', 'acima_200')) b.add('cafeina_elevada', 1);
  return b;
}

function metilacaoInflamacao(a: ChecklistAnswers): PillarBuilder {
  const b = new PillarBuilder();
  const homocisteina = one(a, 'homocisteina');
  if (homocisteina === 'acima_8') b.add('homocisteina_elevada', 2);

  const deficiencias = values(a, 'deficiencias').filter((v) => v !== 'nenhuma' && v !== 'nunca_investiguei');
  if (deficiencias.length >= 2) b.add('deficiencia_nutricional', 2);
  else if (deficiencias.length === 1) b.add('deficiencia_nutricional', 1);
  if (has(a, 'deficiencias', 'b12', 'folato', 'b6')) b.add('vitaminas_b_reduzidas', 0);

  if (has(a, 'inflamacao', 'alterados')) b.add('inflamacao_alterada', 1);

  // Exame não feito não é normal: qualquer lacuna vira achado informativo (sem pontos).
  const semResultado = (v: string | undefined) => v === 'nao' || v === 'nao_lembro';
  if (semResultado(homocisteina) || semResultado(one(a, 'inflamacao')) || has(a, 'deficiencias', 'nunca_investiguei')) {
    b.add('exames_nao_realizados', 0);
  }
  return b;
}

function fatorMasculino(a: ChecklistAnswers, ctx: Context): PillarBuilder {
  const b = new PillarBuilder();
  const idade = one(a, 'parceiro_idade');
  if (idade === 'sem_parceiro') {
    b.notApplicable = true;
    return b;
  }

  const espermograma = one(a, 'espermograma');
  if (espermograma === 'grave') b.add('alteracao_seminal_grave', 3);
  if (has(a, 'riscos_masculinos', 'testosterona')) b.add('testosterona_anabolizantes', 3);
  if (espermograma === 'alterado') b.add('espermograma_alterado', 2);
  if (has(a, 'fragmentacao', 'alterada')) b.add('fragmentacao_alterada', 2);
  if (has(a, 'riscos_masculinos', 'varicocele', 'trauma_cirurgia')) b.add('varicocele_trauma', 2);
  if (has(a, 'riscos_masculinos', 'quimio_radio')) b.add('quimio_radio', 2);
  if (has(a, 'riscos_masculinos', 'fuma')) b.add('tabagismo_parceiro', 1);
  if (idade === '40_49' || idade === 'gte50') b.add('idade_paterna', 1);

  // A ausência de fragmentação espermática nunca pontua (manual, orientações de uso).
  if (espermograma === 'nao' || espermograma === 'nao_sei') {
    const antecedente = has(a, 'riscos_masculinos', 'varicocele', 'trauma_cirurgia', 'testosterona', 'quimio_radio');
    if (ctx.investigationIndicated || antecedente) {
      b.add(espermograma === 'nao' ? 'espermograma_nao_realizado' : 'espermograma_resultado_desconhecido', 0);
      b.missing = true;
    } else {
      // Ainda não indicado: sem achado de "procure o urologista", que contradiria o NA.
      b.notApplicable = true;
    }
  } else if (espermograma === 'nao_se_aplica') {
    b.notApplicable = true;
  }
  return b;
}

function resolveStatus(b: PillarBuilder): PillarStatus {
  if (b.points > 0) return b.points;
  if (b.missing) return 'ND';
  if (b.notApplicable) return 'NA';
  return 0;
}

function classify(
  pillars: ChecklistPillarResult[],
  total: number,
  locks: string[],
  missingData: ChecklistPillarKey[]
): ChecklistClassification {
  if (locks.length > 0) return 'ALTA_PRIORIDADE';
  if (missingData.length > 0) return 'INCONCLUSIVA';
  if (total >= 10) return 'ALTA_PRIORIDADE';

  const criticosEm2 = pillars.filter((p) => p.critical && p.status === 2).length;
  const pilaresEm1 = pillars.filter((p) => p.status === 1).length;
  if (total >= 5 || criticosEm2 >= 1 || pilaresEm1 >= 4) return 'INTERMEDIARIA';
  return 'FAVORAVEL';
}

function completenessFor(missing: number): DataCompleteness {
  if (missing === 0) return 'SUFICIENTE';
  if (missing === 1) return 'PARCIAL';
  return 'INSUFICIENTE';
}

export function computeChecklist(answers: ChecklistAnswers): ChecklistComputation {
  const pilar1 = idadeTentativa(answers);
  const ctx: Context = {
    age: one(answers, 'idade'),
    investigationIndicated: pilar1.points >= 2,
  };

  const builders: Record<ChecklistPillarKey, PillarBuilder> = {
    idade_tentativa: pilar1,
    ciclo_ovulacao: cicloOvulacao(answers),
    somp: somp(answers),
    endometriose_pelve: endometriosePelve(answers),
    trompas: trompas(answers, ctx),
    reserva_ovariana: reservaOvariana(answers, ctx),
    tireoide: tireoide(answers),
    disruptores: disruptores(answers),
    figado: figado(answers),
    intestino: intestino(answers),
    metabolismo_nutricao: metabolismoNutricao(answers),
    metilacao_inflamacao: metilacaoInflamacao(answers),
    fator_masculino: fatorMasculino(answers, ctx),
  };

  const locks: string[] = [];
  const missingData: ChecklistPillarKey[] = [];
  const pillars: ChecklistPillarResult[] = CHECKLIST_PILLARS.map((pillar) => {
    const b = builders[pillar];
    const ordered = [...b.findings].sort((x, y) => y.points - x.points);
    for (const f of ordered) if (f.points === 3) locks.push(f.key);
    if (b.missing) missingData.push(pillar);
    return {
      pillar,
      status: resolveStatus(b),
      critical: CRITICAL_PILLARS.includes(pillar),
      findings: ordered,
    };
  });

  const total = pillars.reduce((sum, p) => (typeof p.status === 'number' ? sum + p.status : sum), 0);
  if (pillars.filter((p) => p.critical && p.status === 2).length >= 2) locks.push('dois_pilares_criticos');

  return {
    pillars,
    total,
    classification: classify(pillars, total, locks, missingData),
    locks,
    missingData,
    completeness: completenessFor(missingData.length),
    investigationIndicated: ctx.investigationIndicated,
  };
}
