import { db } from '../src/lib/db';
import { createAssessment } from '../src/lib/assessment-service';
import { parseCsv } from '../src/lib/csv';
import quizSource from './seed-data/quiz-source.json';
import { readFileSync } from 'fs';
import path from 'path';
import desafioBaixa from '../seeds/desafio-track-baixa.json';
import desafioModerada from '../seeds/desafio-track-moderada.json';
import desafioAlta from '../seeds/desafio-track-alta.json';

interface QuizSourceOption {
  ordem: number;
  label: string;
  rawScore: number;
}
interface QuizSourceQuestion {
  ordem: number;
  texto: string;
  options: QuizSourceOption[];
}
interface QuizSourcePillar {
  pillar: string;
  weight: number;
  max: number;
  questions: QuizSourceQuestion[];
}
interface QuizSourceMessage {
  pillar: string;
  level: 'Alto' | 'Moderado' | 'Baixo';
  diagnostico: string;
  recomendacao: string;
}
interface QuizSource {
  scoreDenominator: number;
  pillars: QuizSourcePillar[];
  pillarMessages: QuizSourceMessage[];
}

const source = quizSource as QuizSource;

async function seedScoreRules() {
  for (const p of source.pillars) {
    await db.scoreRule.upsert({
      where: { pillar: p.pillar },
      update: { peso: p.weight, maxDoPilar: p.max, scoreDenominator: source.scoreDenominator },
      create: {
        pillar: p.pillar,
        peso: p.weight,
        maxDoPilar: p.max,
        scoreDenominator: source.scoreDenominator,
      },
    });
  }
  console.log(`ScoreRule: ${source.pillars.length} pilares`);
}

async function seedQuestions() {
  // Idempotente por reset completo — conteúdo de quiz, não dado transacional.
  await db.questionOption.deleteMany({});
  await db.question.deleteMany({});

  let totalQuestions = 0;
  let totalOptions = 0;
  for (let pillarIndex = 0; pillarIndex < source.pillars.length; pillarIndex++) {
    const p = source.pillars[pillarIndex];
    for (const q of p.questions) {
      await db.question.create({
        data: {
          pillar: p.pillar,
          pillarOrdem: pillarIndex + 1,
          ordem: q.ordem,
          texto: q.texto,
          options: {
            create: q.options.map((o) => ({
              label: o.label,
              ordem: o.ordem,
              rawScore: o.rawScore,
            })),
          },
        },
      });
      totalQuestions += 1;
      totalOptions += q.options.length;
    }
  }
  console.log(`Question: ${totalQuestions}, QuestionOption: ${totalOptions}`);
}

async function seedPillarMessages() {
  for (const m of source.pillarMessages) {
    await db.pillarMessage.upsert({
      where: { pillar_level: { pillar: m.pillar, level: m.level } },
      update: { diagnostico: m.diagnostico, recomendacao: m.recomendacao },
      create: {
        pillar: m.pillar,
        level: m.level,
        diagnostico: m.diagnostico,
        recomendacao: m.recomendacao,
      },
    });
  }
  console.log(`PillarMessage: ${source.pillarMessages.length}`);
}

async function seedProducts() {
  await db.product.upsert({
    where: { slug: 'acesso-relatorio' },
    update: {},
    create: {
      slug: 'acesso-relatorio',
      nome: 'Acesso + Relatório de Fertilidade',
      priceCents: 4990,
      kind: 'APP_ACCESS',
      platform: 'KIWIFY',
      platformProductId: 'PLACEHOLDER-acesso-relatorio',
      checkoutUrl: 'https://pay.kiwify.com.br/PLACEHOLDER-acesso-relatorio',
      grants: { entitlement: 'REPORT' },
    },
  });
  console.log('Product: acesso-relatorio');
}

interface DesafioSourceMessage {
  ordem: number;
  tipo: 'TEXTO' | 'AUDIO' | 'IMAGEM' | 'VIDEO';
  delayMs: number;
  texto?: string;
  mediaKey?: string;
}
interface DesafioSourceDay {
  dayNumber: number;
  isOnboarding: boolean;
  messages: DesafioSourceMessage[];
}
interface DesafioSourceTrack {
  track: {
    level: 'BAIXA' | 'MODERADA' | 'ALTA';
    codename: string;
    title: string;
    defaultCooldownHours: number;
  };
  days: DesafioSourceDay[];
}

const DESAFIO_TRACKS = [desafioBaixa, desafioModerada, desafioAlta] as unknown as DesafioSourceTrack[];

function loadDayTitles(): Map<number, string> {
  const csvPath = path.join(process.cwd(), 'seeds', 'aulas-manifesto.csv');
  const content = readFileSync(csvPath, 'utf-8');
  const rows = parseCsv(content);

  const [header, ...dataRows] = rows;
  const dayIdx = header.indexOf('dia');
  const titleIdx = header.indexOf('titulo');

  const titles = new Map<number, string>();
  for (const row of dataRows) {
    const dayNumber = Number(row[dayIdx]);
    if (!titles.has(dayNumber)) {
      titles.set(dayNumber, row[titleIdx]);
    }
  }
  return titles;
}

async function seedChallengeTracks() {
  const dayTitles = loadDayTitles();

  for (const source of DESAFIO_TRACKS) {
    const track = await db.challengeTrack.upsert({
      where: { level: source.track.level },
      update: {
        codename: source.track.codename,
        title: source.track.title,
        defaultCooldownHours: source.track.defaultCooldownHours,
      },
      create: {
        level: source.track.level,
        codename: source.track.codename,
        title: source.track.title,
        defaultCooldownHours: source.track.defaultCooldownHours,
      },
    });

    const existingDays = await db.challengeDay.findMany({
      where: { trackId: track.id },
      select: { id: true },
    });
    if (existingDays.length > 0) {
      await db.challengeMessage.deleteMany({
        where: { dayId: { in: existingDays.map((d) => d.id) } },
      });
      await db.challengeDay.deleteMany({ where: { trackId: track.id } });
    }

    for (const day of source.days) {
      await db.challengeDay.create({
        data: {
          trackId: track.id,
          dayNumber: day.dayNumber,
          isOnboarding: day.isOnboarding,
          title: dayTitles.get(day.dayNumber) ?? `Dia ${day.dayNumber}`,
          messages: {
            create: day.messages.map((m) => ({
              ordem: m.ordem,
              tipo: m.tipo,
              texto: m.texto,
              mediaKey: m.mediaKey,
              delayMs: m.delayMs,
            })),
          },
        },
      });
    }

    console.log(`ChallengeTrack ${source.track.level}: ${source.days.length} dias`);
  }
}

async function seedDemoUserAndCatalog() {
  await db.product.upsert({
    where: { slug: 'desafio-7-dias' },
    update: {},
    create: {
      slug: 'desafio-7-dias',
      nome: 'Desafio de 7 Dias',
      priceCents: 19790,
      kind: 'CHALLENGE',
      platform: 'KIWIFY',
      platformProductId: 'PLACEHOLDER-desafio-7-dias',
      checkoutUrl: 'https://pay.kiwify.com.br/PLACEHOLDER-desafio-7-dias',
      grants: { entitlement: 'CHALLENGE', trackByLevel: true },
    },
  });
  console.log('Product: desafio-7-dias');

  const DEMO_EMAIL = 'carolinapalitot20@gmail.com';
  const DEMO_NOME = 'Carolina Palitot';

  const user = await db.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { nome: DEMO_NOME },
    create: { email: DEMO_EMAIL, nome: DEMO_NOME },
  });

  // Idempotente: limpa assessments/entitlements anteriores da demo antes de recriar.
  await db.entitlement.deleteMany({ where: { userId: user.id } });
  await db.assessment.deleteMany({ where: { userId: user.id } });

  const questions = await db.question.findMany({ include: { options: true } });
  // Ordena por rawScore crescente e pega a "mediana por baixo" (index
  // floor(length * 0.5)) — verificado contra o banco real: produz
  // resultadoFinal ~68 (MODERADA), com folga confortável da fronteira em 60.
  const answers = questions.map((q) => {
    const sorted = [...q.options].sort((a, b) => a.rawScore - b.rawScore);
    const median = sorted[Math.floor(sorted.length * 0.5)];
    return { questionId: q.id, optionId: median.id };
  });

  const result = await createAssessment({
    source: 'APP_NATIVE',
    lead: { nome: DEMO_NOME, email: DEMO_EMAIL },
    answers,
  });

  // Adoção do assessment órfão pela usuária — o mesmo movimento que o
  // webhook de pagamento vai fazer de verdade na Fase 4.
  await db.assessment.update({
    where: { id: result.assessmentId },
    data: { userId: user.id },
  });

  const reportProduct = await db.product.findUniqueOrThrow({ where: { slug: 'acesso-relatorio' } });
  await db.entitlement.create({
    data: { userId: user.id, productId: reportProduct.id, type: 'REPORT', status: 'ACTIVE' },
  });

  const challengeProduct = await db.product.findUniqueOrThrow({ where: { slug: 'desafio-7-dias' } });
  await db.entitlement.create({
    data: {
      userId: user.id,
      productId: challengeProduct.id,
      type: 'CHALLENGE',
      status: 'ACTIVE',
      metadata: { track: result.nivelGlobal } as unknown as object,
    },
  });

  const track = await db.challengeTrack.findUniqueOrThrow({ where: { level: result.nivelGlobal } });

  // Dias 0-3 concluídos com timestamps escalonados (folga de sobra sobre o
  // cooldown de 20h da trilha), dia 4 liberado. Usuária pronta pra demo sem
  // precisar simular o fluxo do zero.
  const now = Date.now();
  const HOUR_MS = 3600_000;
  const dayCompletions = {
    0: { completedAt: new Date(now - 96 * HOUR_MS).toISOString() },
    1: { completedAt: new Date(now - 72 * HOUR_MS).toISOString() },
    2: { completedAt: new Date(now - 48 * HOUR_MS).toISOString() },
    3: { completedAt: new Date(now - 24 * HOUR_MS).toISOString() },
  };

  await db.challengeProgress.upsert({
    where: { userId_trackId: { userId: user.id, trackId: track.id } },
    update: { currentDay: 4, dayCompletions: dayCompletions as unknown as object },
    create: {
      userId: user.id,
      trackId: track.id,
      currentDay: 4,
      dayCompletions: dayCompletions as unknown as object,
    },
  });

  console.log(
    `Demo user: ${user.email} (assessment ${result.assessmentId}, nivel ${result.nivelGlobal}, resultadoFinal ${result.resultadoFinal}, desafio dia 4/7 liberado)`
  );
}

async function main() {
  await seedScoreRules();
  await seedQuestions();
  await seedPillarMessages();
  await seedProducts();
  await seedChallengeTracks();
  await seedDemoUserAndCatalog();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
