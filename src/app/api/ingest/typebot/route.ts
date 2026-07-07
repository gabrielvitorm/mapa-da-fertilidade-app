import { NextRequest, NextResponse } from 'next/server';
import { createAssessment, type RawAnswer } from '@/lib/assessment-service';

interface TypebotIngestBody {
  nome: string;
  email: string;
  cpf?: string;
  celular?: string;
  answers: RawAnswer[];
}

export async function POST(request: NextRequest) {
  const token = request.headers.get('X-Ingest-Token');
  if (!token || token !== process.env.INGEST_TOKEN) {
    return NextResponse.json({ error: 'Invalid or missing X-Ingest-Token' }, { status: 401 });
  }

  const body = (await request.json()) as TypebotIngestBody;

  if (!body.nome || !body.email) {
    return NextResponse.json({ error: 'nome and email are required' }, { status: 400 });
  }
  if (!Array.isArray(body.answers) || body.answers.length === 0) {
    return NextResponse.json({ error: 'answers must be a non-empty array' }, { status: 400 });
  }

  try {
    const result = await createAssessment({
      source: 'TYPEBOT',
      lead: { nome: body.nome, email: body.email, cpf: body.cpf, celular: body.celular },
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
