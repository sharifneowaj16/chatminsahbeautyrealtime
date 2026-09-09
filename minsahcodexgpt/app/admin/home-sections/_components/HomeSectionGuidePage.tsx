import Link from 'next/link';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

interface HomeSectionGuidePageProps {
  title: string;
  description: string;
  tips: string[];
}

export default function HomeSectionGuidePage({ title, description, tips }: HomeSectionGuidePageProps) {
  return (
    <div className="p-6 space-y-6">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/home-sections" className="rounded-lg bg-[#1E1E24] border border-[#2A2A32] p-2 text-[#F5F3F0] shadow-sm transition hover:bg-[#26262E]">
          <ArrowLeft size={22} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#F5F3F0]">{title}</h1>
          <p className="mt-1 text-sm text-[#9A9691]">{description}</p>
        </div>
      </div>

      <div className="rounded-xl border border-[#2A2A32] bg-[#1E1E24] p-6 shadow-sm">
        <h2 className="text-xl font-bold text-[#F5F3F0]">How to control this section</h2>
        <p className="mt-2 text-sm leading-6 text-[#9A9691]">
          Use the main Homepage Builder advanced settings to set title, subtitle, visibility, order, item limit, CTA link, and selected IDs/slugs. Those saved settings now render on the public homepage.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {tips.map((tip) => (
            <div key={tip} className="flex items-start gap-3 rounded-lg bg-[#14141A] border border-[#2A2A32] p-4 text-sm font-medium text-[#F5F3F0]">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-400" />
              <span>{tip}</span>
            </div>
          ))}
        </div>

        <Link
          href="/admin/home-sections"
          className="mt-6 inline-flex rounded-lg bg-[#D07A60] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#E08D70]"
        >
          Open Homepage Builder
        </Link>
      </div>
    </div>
  );
}
