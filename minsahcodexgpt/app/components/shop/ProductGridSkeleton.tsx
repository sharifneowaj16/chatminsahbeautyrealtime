import { Skeleton } from "@/components/ui/Skeleton";

interface ProductGridSkeletonProps {
  count?: number;
}

export default function ProductGridSkeleton({ count = 8 }: ProductGridSkeletonProps) {
  return (
    <div
      className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6 xl:grid-cols-4"
      aria-label="Loading products"
      aria-busy="true"
    >
      {Array.from({ length: count }).map((_, index) => (
        <article
          key={index}
          className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5"
        >
          <Skeleton className="aspect-square w-full rounded-none" />
          <div className="space-y-3 p-3 md:p-4">
            <Skeleton className="h-3 w-20" />
            <div className="min-h-[2.45rem] space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
            <div className="flex min-h-5 items-center gap-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-8" />
            </div>
            <div className="min-h-[1.75rem]">
              <Skeleton className="h-6 w-24" />
            </div>
            <div className="flex min-h-[1.75rem] gap-1.5">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
            <Skeleton className="h-11 w-full rounded-2xl" />
          </div>
        </article>
      ))}
    </div>
  );
}
