import React from 'react';

/* ═══════════════════════════════════════════════
   Loading Skeleton Components
   Animated placeholder UI shown while heavy
   components (Quest, Admin, Camera) are loading.
   ═══════════════════════════════════════════════ */

interface SkeletonProps {
  type?: 'page' | 'cards' | 'table' | 'video' | 'form';
  count?: number;
}

/* ── Skeleton Primitives ── */

const SkeletonBox: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
);

const SkeletonLine: React.FC<{ width?: string; className?: string }> = ({ width = 'w-full', className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded-lg h-4 ${width} ${className}`} />
);

/* ── Page-level Skeleton (Full screen loading) ── */

const PageSkeleton: React.FC = () => (
  <div className="min-h-screen bg-gray-50 font-sans">
    {/* Header skeleton */}
    <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <SkeletonBox className="w-10 h-10 rounded-xl" />
        <div className="space-y-2">
          <SkeletonLine width="w-28" />
          <SkeletonLine width="w-16" className="h-2" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <SkeletonBox className="w-24 h-9 rounded-lg" />
        <SkeletonBox className="w-24 h-9 rounded-lg" />
      </div>
    </div>

    {/* Content skeleton */}
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      {/* Title area */}
      <div className="space-y-3">
        <SkeletonLine width="w-64" className="h-7" />
        <SkeletonLine width="w-96" className="h-4" />
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4 shadow-sm">
            <SkeletonBox className="w-full h-32 rounded-xl" />
            <SkeletonLine width="w-3/4" className="h-5" />
            <SkeletonLine width="w-1/2" />
            <div className="flex gap-2 pt-2">
              <SkeletonBox className="w-16 h-6 rounded-full" />
              <SkeletonBox className="w-20 h-6 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ── Cards Skeleton ── */

const CardsSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3 shadow-sm">
        <SkeletonBox className="w-full h-24 rounded-xl" />
        <SkeletonLine width="w-3/4" className="h-5" />
        <SkeletonLine width="w-1/2" />
        <SkeletonBox className="w-full h-8 rounded-lg mt-2" />
      </div>
    ))}
  </div>
);

/* ── Table Skeleton ── */

const TableSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
    {/* Table header */}
    <div className="bg-gray-50 border-b border-gray-100 px-5 py-3 flex gap-4">
      <SkeletonLine width="w-12" className="h-4" />
      <SkeletonLine width="w-32" className="h-4" />
      <SkeletonLine width="w-24" className="h-4" />
      <SkeletonLine width="w-20" className="h-4" />
      <SkeletonLine width="w-16" className="h-4" />
    </div>
    {/* Table rows */}
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="px-5 py-4 flex gap-4 items-center border-b border-gray-50">
        <SkeletonBox className="w-8 h-8 rounded-full" />
        <SkeletonLine width="w-36" />
        <SkeletonLine width="w-28" />
        <SkeletonLine width="w-20" />
        <SkeletonBox className="w-16 h-7 rounded-lg" />
      </div>
    ))}
  </div>
);

/* ── Video Player Skeleton ── */

const VideoSkeleton: React.FC = () => (
  <div className="space-y-4">
    <SkeletonBox className="w-full aspect-video rounded-2xl" />
    <div className="flex gap-3">
      <SkeletonBox className="w-28 h-10 rounded-xl" />
      <SkeletonBox className="w-28 h-10 rounded-xl" />
      <SkeletonBox className="w-28 h-10 rounded-xl" />
    </div>
  </div>
);

/* ── Form Skeleton ── */

const FormSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5 shadow-sm">
    <SkeletonLine width="w-48" className="h-6" />
    {[1, 2, 3].map(i => (
      <div key={i} className="space-y-2">
        <SkeletonLine width="w-24" className="h-3" />
        <SkeletonBox className="w-full h-10 rounded-xl" />
      </div>
    ))}
    <SkeletonBox className="w-32 h-10 rounded-xl mt-4" />
  </div>
);

/* ── Main Export ── */

const LoadingSkeleton: React.FC<SkeletonProps> = ({ type = 'page', count }) => {
  switch (type) {
    case 'cards':
      return <CardsSkeleton count={count} />;
    case 'table':
      return <TableSkeleton count={count} />;
    case 'video':
      return <VideoSkeleton />;
    case 'form':
      return <FormSkeleton />;
    case 'page':
    default:
      return <PageSkeleton />;
  }
};

export default LoadingSkeleton;
export { SkeletonBox, SkeletonLine, PageSkeleton, CardsSkeleton, TableSkeleton, VideoSkeleton, FormSkeleton };
