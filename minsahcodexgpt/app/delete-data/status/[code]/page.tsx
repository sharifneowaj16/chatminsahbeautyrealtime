import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Deletion Request Status | Minsah Beauty',
  description: 'Status page for Minsah Beauty data deletion callback confirmations.',
};

type StatusPageProps = {
  params: Promise<{ code: string }>;
};

export default async function DeleteDataStatusPage({ params }: StatusPageProps) {
  const { code } = await params;

  return (
    <main className="min-h-screen bg-white px-6 py-12 text-gray-900 md:px-8 md:py-16">
      <div className="mx-auto max-w-3xl rounded-3xl border border-gray-200 bg-gray-50 p-8">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Deletion Request Received</h1>
        <p className="mt-4 leading-7 text-gray-700">
          Your request has been recorded. Keep the confirmation code below for reference while we
          process the deletion workflow.
        </p>
        <div className="mt-6 rounded-2xl border border-gray-300 bg-white p-4">
          <p className="text-sm text-gray-500">Confirmation code</p>
          <p className="mt-2 break-all font-mono text-lg text-gray-900">{code}</p>
        </div>
        <p className="mt-6 leading-7 text-gray-700">
          Verified requests are typically processed within 7 to 30 days.
        </p>
        <p className="mt-6">
          <Link href="/delete-data" className="text-blue-600 underline underline-offset-4">
            Back to delete-data instructions
          </Link>
        </p>
      </div>
    </main>
  );
}
