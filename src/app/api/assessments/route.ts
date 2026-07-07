import { NextRequest, NextResponse } from 'next/server';
import { createAssessment, type RawAnswer, type AssessmentLead } from '@/lib/assessment-service';

interface CreateAssessmentBody {
  lead: AssessmentLead;
  answers: RawAnswer[];
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as CreateAssessmentBody;

  if (!body.lead?.nome || !body.lead?.email) {
    return NextResponse.json({ error: 'lead.nome and lead.email are required' }, { status: 400 });
  }
  if (!Array.isArray(body.answers) || body.answers.length === 0) {
    return NextResponse.json({ error: 'answers must be a non-empty array' }, { status: 400 });
  }

  try {
    const result = await createAssessment({
      source: 'APP_NATIVE',
      lead: body.lead,
      answers: body.answers,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    );
  }
}
