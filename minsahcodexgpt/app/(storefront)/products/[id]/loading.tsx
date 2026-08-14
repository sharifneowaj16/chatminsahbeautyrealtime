import { Skeleton } from '@/components/ui/Skeleton';

export default function ProductLoading() {
  return (
    <div className="min-h-screen bg-minsah-surface">
      {/* Nav skeleton */}
      <div className="sticky top-0 z-40 bg-minsah-dark h-12" />

      <div className="max-w-6xl mx-auto px-4 py-3">
        {/* Breadcrumb skeleton */}
        <Skeleton className="h-3 w-48 rounded-full mb-4" />

        <div className="lg:grid lg:grid-cols-2 lg:gap-10">
          {/* Image skeleton */}
          <Skeleton className="aspect-[4/3] md:aspect-square rounded-3xl" />

          {/* Info skeleton */}
          <div className="px-4 lg:px-0 pt-4 lg:pt-0 space-y-4">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-7 w-3/4 rounded-lg" />
              <Skeleton className="h-7 w-1/2 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-32 rounded-lg" />
            <div className="h-px bg-minsah-border-soft" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
