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
        <Link href="/admin/home-sections" className="rounded-lg bg-[#161824] border border-[#232636] p-2 text-[#F7F8F8] shadow-sm transition hover:bg-[#1b1e2c]">
          <ArrowLeft size={22} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#F7F8F8]">{title}</h1>
          <p className="mt-1 text-sm text-[#8A8F98]">{description}</p>
        </div>
      </div>

      <div className="rounded-xl border border-[#232636] bg-[#161824] p-6 shadow-sm">
        <h2 className="text-xl font-bold text-[#F7F8F8]">How to control this section</h2>
        <p className="mt-2 text-sm leading-6 text-[#8A8F98]">
          Use the main Homepage Builder advanced settings to set title, subtitle, visibility, order, item limit, CTA link, and selected IDs/slugs. Those saved settings now render on the public homepage.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {tips.map((tip) => (
            <div key={tip} className="flex items-start gap-3 rounded-lg bg-[#10121b] border border-[#232636] p-4 text-sm font-medium text-[#F7F8F8]">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-white" />
              <span>{tip}</span>
            </div>
          ))}
        </div>

        <Link
          href="/admin/home-sections"
          className="mt-6 inline-flex rounded-lg bg-[#5e6ad2] hover:bg-[#6d78d5] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/90"
        >
          Open Homepage Builder
        </Link>
      </div>
    </div>
  );
}
