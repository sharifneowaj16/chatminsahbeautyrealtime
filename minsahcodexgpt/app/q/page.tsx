import { redirect } from 'next/navigation';

export default async function QuickRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; t?: string }>;
}) {
  const resolved = await searchParams;
  const token = resolved.token || resolved.t;

  if (token) {
    redirect(`/q/${encodeURIComponent(token)}`);
  }

  redirect('/');
}

