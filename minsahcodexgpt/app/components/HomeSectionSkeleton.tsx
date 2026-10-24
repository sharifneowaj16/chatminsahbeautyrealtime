import { Skeleton } from '@/components/ui/Skeleton';

interface HomeSectionSkeletonProps {
  type?: 'categories' | 'products' | 'combos';
}

function SkeletonCard({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex flex-col justify-between h-full rounded-[28px] border border-stone-200/70 bg-white shadow-xs ${compact ? 'p-2.5' : 'p-3 sm:p-3.5'}`}>
      <div>
        <Skeleton className="aspect-square w-full rounded-[22px] bg-stone-100" />
        <div className="mt-3 space-y-2">
          <Skeleton className="h-3 w-1/3 rounded-full bg-stone-100" />
          <Skeleton className="h-3.5 w-full rounded-full bg-stone-200/80" />
          <Skeleton className="h-3 w-1/2 rounded-full bg-stone-100" />
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between pt-4">
        <Skeleton className="h-5 w-20 rounded-full bg-stone-200/80" />
        <Skeleton className="h-8 w-16 rounded-full bg-stone-200" />
      </div>
    </div>
  );
}

export default function HomeSectionSkeleton({ type = 'products' }: HomeSectionSkeletonProps) {
  if (type === 'categories') {
    return (
      <section className="bg-white px-4 py-8 lg:px-8" aria-hidden="true">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-6 flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-24 rounded-full bg-stone-100" />
              <Skeleton className="h-6 w-48 rounded-full bg-stone-200" />
            </div>
            <Skeleton className="h-8 w-24 rounded-full bg-stone-100" />
          </div>
          <div className="flex min-h-[112px] gap-4 overflow-hidden sm:grid sm:grid-cols-4 lg:grid-cols-8">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex w-20 shrink-0 flex-col items-center gap-2 sm:w-auto">
                <Skeleton className="h-16 w-16 rounded-2xl bg-stone-100" />
                <Skeleton className="h-3 w-14 rounded-full bg-stone-100" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (type === 'combos') {
    return (
      <section className="bg-white px-4 py-8 lg:px-8" aria-hidden="true">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-6 space-y-2">
            <Skeleton className="h-5 w-28 rounded-full bg-stone-100" />
            <Skeleton className="h-6 w-52 rounded-full bg-stone-200" />
          </div>
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-40 w-80 shrink-0 rounded-[28px] bg-stone-100" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 lg:px-8 py-8 sm:py-10" aria-hidden="true">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-6 flex items-end justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-28 rounded-full bg-[#EBF7DA]" />
            <Skeleton className="h-7 w-48 sm:w-64 rounded-full bg-stone-200" />
            <Skeleton className="h-3.5 w-60 rounded-full bg-stone-100" />
          </div>
          <Skeleton className="h-9 w-24 rounded-full bg-stone-100" />
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 md:grid-cols-3 lg:grid-cols-5 md:gap-4 lg:gap-4 items-stretch">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className={`${
                index >= 2 ? (index >= 3 ? 'hidden lg:block' : 'hidden md:block') : 'block'
              } h-full`}
            >
              <SkeletonCard />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
