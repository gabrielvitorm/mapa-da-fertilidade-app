import { LoginForm } from '@/components/screens/LoginForm';

interface LoginPageProps {
  searchParams?: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {};
  const initialError = params.error === 'invalid_token'
    ? 'Esse link expirou ou já foi usado. Peça um novo.'
    : null;

  return <LoginForm initialError={initialError} />;
}
