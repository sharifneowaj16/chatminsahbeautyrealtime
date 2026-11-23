import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export type AuthShellProps = {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
  footer?: ReactNode;
};

export function AuthBrand() {
  return (
    <Link
      href="/"
      className="inline-flex flex-col items-center gap-1.5 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c3a13]"
      aria-label="Minsah Beauty home"
    >
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#B5C4BB] bg-[#EAF7D8] px-3 py-1 text-[11px] font-bold tracking-wide text-[#062402]">
        <ShieldCheck className="h-3.5 w-3.5 text-[#4b6723]" />
        <span>MINSAH VIP &bull; 100% Authentic</span>
      </span>
      <span className="mt-1 text-2xl font-black tracking-tight text-[#062402]">
        Minsah Beauty
      </span>
    </Link>
  );
}

export function AuthShell({
  title,
  description,
  children,
  backHref,
  backLabel = 'Back',
  footer,
}: AuthShellProps) {
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#EAF7D8]/45 via-[#F4F3EF] to-[#F4F3EF] px-4 py-10 font-sans"
      lang="en"
    >
      <div className="w-full max-w-md">
        {backHref ? (
          <div className="mb-4">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-bold text-[#1c3a13] hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{backLabel}</span>
            </Link>
          </div>
        ) : null}

        <div className="mb-6 text-center">
          <AuthBrand />
        </div>

        <section className="rounded-[28px] border border-[#E2DED8] bg-[#FAF9F6] p-6 shadow-xl shadow-[#062402]/5 sm:p-7">
          <header className="mb-5 text-center">
            <h1 className="text-2xl font-black tracking-tight text-[#062402]">{title}</h1>
            {description ? (
              <div className="mt-1.5 text-xs leading-relaxed text-[#5A615D]">{description}</div>
            ) : null}
          </header>

          {children}
        </section>

        {footer ? (
          <div className="mt-6 text-center text-xs text-[#5A615D]">{footer}</div>
        ) : null}
      </div>
    </main>
  );
}
