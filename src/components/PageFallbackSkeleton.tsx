import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton shown while a lazy route chunk is loading. Feels snappier than plain "Loading…". */
export function PageFallbackSkeleton() {
  return (
    <div className="flex min-h-[50vh] flex-col p-6" aria-busy="true" aria-label="Loading page">
      <div className="mb-6 flex items-center gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-lg" />
        ))}
      </div>
      <div className="mt-6 flex-1 space-y-3">
        <Skeleton className="h-4 w-full max-w-2xl" />
        <Skeleton className="h-4 w-full max-w-xl" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>
    </div>
  );
}
