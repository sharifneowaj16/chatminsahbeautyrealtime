import Link from 'next/link';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

interface HomeSectionGuidePageProps {
  title: string;
  description: string;
  tips: string[];
}

export default function HomeSectionGuidePage({ title, description, tips }: HomeSectionGuidePageProps) {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/home-sections" className="rounded-lg bg-white p-2 text-minsah-dark shadow-sm transition hover:bg-minsah-accent">
          <ArrowLeft size={22} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-minsah-dark">{title}</h1>
          <p className="mt-1 text-minsah-secondary">{description}</p>
        </div>
      </div>

      <div className="rounded-xl border border-minsah-accent bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-minsah-dark">How to control this section</h2>
        <p className="mt-2 text-sm leading-6 text-minsah-secondary">
          Use the main Homepage Builder advanced settings to set title, subtitle, visibility, order, item limit, CTA link, and selected IDs/slugs. Those saved settings now render on the public homepage.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {tips.map((tip) => (
            <div key={tip} className="flex items-start gap-3 rounded-lg bg-minsah-light p-4 text-sm font-medium text-minsah-dark">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-600" />
              <span>{tip}</span>
            </div>
          ))}
        </div>

        <Link
          href="/admin/home-sections"
          className="mt-6 inline-flex rounded-lg bg-minsah-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-minsah-dark"
        >
          Open Homepage Builder
        </Link>
      </div>
    </div>
  );
}
