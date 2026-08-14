import { Skeleton } from '@/components/ui/Skeleton';

interface HomeSectionSkeletonProps {
  type?: 'categories' | 'products' | 'combos';
}

function SkeletonCard({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`rounded-3xl border border-stone-100 bg-white shadow-sm ${compact ? 'p-2' : 'p-3'}`}>
      <Skeleton className="aspect-square rounded-[1.35rem] bg-minsah-accent/70" />
      <div className="mt-3 space-y-2">
        <Skeleton className="h-3 w-2/3 rounded-full bg-minsah-light" />
        <Skeleton className="h-3 w-full rounded-full bg-minsah-light" />
        <Skeleton className="h-3 w-1/2 rounded-full bg-minsah-light" />
      </div>
      <Skeleton className="mt-4 h-9 rounded-2xl bg-minsah-light" />
    </div>
  );
}

export default function HomeSectionSkeleton({ type = 'products' }: HomeSectionSkeletonProps) {
  if (type === 'categories') {
    return (
      <section className="bg-white px-4 py-6 lg:px-6" aria-hidden="true">
        <div className="mx-auto max-w-7xl">
          <div className="mb-4 flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-40 rounded-full bg-minsah-light" />
              <Skeleton className="h-3 w-56 rounded-full bg-minsah-light" />
            </div>
            <Skeleton className="h-8 w-20 rounded-full bg-minsah-light" />
          </div>
          <div className="flex min-h-[112px] gap-4 overflow-hidden sm:grid sm:grid-cols-4 lg:grid-cols-8">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex w-20 shrink-0 flex-col items-center gap-2 sm:w-auto">
                <Skeleton className="h-16 w-16 rounded-full bg-minsah-light" />
                <Skeleton className="h-3 w-14 rounded-full bg-minsah-light" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (type === 'combos') {
    return (
      <section className="bg-white px-4 py-6" aria-hidden="true">
        <div className="mb-4 space-y-2">
          <Skeleton className="h-5 w-36 rounded-full bg-minsah-light" />
          <Skeleton className="h-3 w-52 rounded-full bg-minsah-light" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-32 w-72 shrink-0 rounded-3xl bg-minsah-light" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-6" aria-hidden="true">
      <div className="mb-4 flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40 rounded-full bg-white" />
          <Skeleton className="h-3 w-56 rounded-full bg-white/80" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full bg-white" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    </section>
  );
}
