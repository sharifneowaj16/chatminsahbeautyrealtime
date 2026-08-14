import HomeSectionSkeleton from '@/app/components/HomeSectionSkeleton';

export default function Loading() {
  return (
    <div className="bg-minsah-light" aria-label="Loading homepage">
      <section className="bg-gradient-to-br from-minsah-light via-white to-minsah-accent/70 px-4 py-6 sm:py-8 lg:px-6">
        <div className="mx-auto grid max-w-7xl gap-6 overflow-hidden rounded-[2rem] border border-minsah-accent bg-white/85 p-5 shadow-sm sm:p-7 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:p-8">
          <div className="space-y-4">
            <div className="h-7 w-48 animate-pulse rounded-full bg-minsah-accent" />
            <div className="space-y-3">
              <div className="h-10 w-full max-w-xl animate-pulse rounded-full bg-minsah-light" />
              <div className="h-10 w-4/5 max-w-lg animate-pulse rounded-full bg-minsah-light" />
            </div>
            <div className="h-4 w-full max-w-md animate-pulse rounded-full bg-minsah-light" />
            <div className="flex gap-3">
              <div className="h-11 w-32 animate-pulse rounded-full bg-minsah-primary/20" />
              <div className="h-11 w-36 animate-pulse rounded-full bg-minsah-light" />
            </div>
          </div>
          <div className="min-h-[240px] animate-pulse rounded-[1.75rem] bg-minsah-primary/20 sm:min-h-[300px]" />
        </div>
      </section>

      <HomeSectionSkeleton type="categories" />
      <HomeSectionSkeleton type="combos" />
      <HomeSectionSkeleton type="products" />
      <HomeSectionSkeleton type="products" />
    </div>
  );
}
