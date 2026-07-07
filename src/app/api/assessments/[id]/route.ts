import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const assessment = await db.assessment.findUnique({ where: { id } });

  if (!assessment) {
    return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: assessment.id,
    leadNome: assessment.leadNome,
    leadEmail: assessment.leadEmail,
    nivelGlobal: assessment.nivelGlobal,
    resultadoFinal: assessment.resultadoFinal,
    pillarScores: assessment.pillarScores,
  });
}
