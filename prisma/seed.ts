import { db } from '../src/lib/db';
import quizSource from './seed-data/quiz-source.json';

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

async function main() {
  await seedScoreRules();
  await seedQuestions();
  await seedPillarMessages();
  await seedProducts();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
