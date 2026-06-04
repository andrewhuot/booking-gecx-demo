import { useDemoStore } from '../../store/demoStore';
import { getProperty } from '../../data/properties';
import type { PropertyCardData } from '../../lib/types';

interface PropertyCardProps {
  data: PropertyCardData;
}

// Compact, premium recommendation card rendered inline inside an agent bubble.
export function PropertyCard({ data }: PropertyCardProps) {
  const navigateTo = useDemoStore((s) => s.navigateTo);
  const property = getProperty(data.id);
  const gradient =
    property?.gradient ?? 'linear-gradient(135deg, #356B9E 0%, #2C4F6B 100%)';

  const viewDetails = () => navigateTo('property', { propertyId: data.id });
  const checkAvailability = () =>
    navigateTo('search', { highlightId: data.id });

  return (
    <div className="mt-2 w-full overflow-hidden rounded-card border border-bc-gray-200 bg-white shadow-card animate-card-in">
      {/* Thumbnail strip with name overlay */}
      <div
        className="relative h-24 w-full"
        style={{ background: gradient }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        <div className="absolute bottom-2 left-3 right-3">
          <h4 className="truncate text-sm font-bold leading-tight text-white drop-shadow">
            {data.name}
          </h4>
        </div>
      </div>

      {/* Body */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="flex items-center gap-1 text-meta text-bc-gray-500">
            <span aria-hidden>📍</span>
            <span className="truncate">{data.location}</span>
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            <div className="flex flex-col items-end leading-tight">
              {data.ratingLabel && (
                <span className="text-[11px] font-bold text-bc-gray-900">
                  {data.ratingLabel}
                </span>
              )}
              {data.reviews != null && (
                <span className="text-[10px] text-bc-gray-500">
                  {data.reviews.toLocaleString()} reviews
                </span>
              )}
            </div>
            {/* Live agent data can omit a numeric rating — guard before formatting. */}
            {typeof data.rating === 'number' && (
              <span className="bc-rating">{data.rating.toFixed(1)}</span>
            )}
          </div>
        </div>

        {/* Tags */}
        {data.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {data.tags.map((tag) => (
              <span
                key={tag}
                className="rounded bg-bc-blue-light px-1.5 py-0.5 text-[10px] font-medium text-bc-blue"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Price */}
        <div className="mt-2.5 flex items-baseline gap-1">
          <span className="text-base font-bold text-bc-green">{data.price}</span>
          <span className="text-meta text-bc-gray-500">{data.priceUnit}</span>
        </div>

        {/* Actions */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={viewDetails}
            className="text-meta font-medium text-bc-blue hover:underline"
          >
            View Details
          </button>
          <button
            type="button"
            onClick={checkAvailability}
            className="bc-btn px-3 py-2 text-meta"
          >
            {data.cta}
          </button>
        </div>
      </div>
    </div>
  );
}
