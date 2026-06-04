import type { Property } from '../../lib/types';

interface PropertyHeaderProps {
  property: Property;
}

export function PropertyHeader({ property }: PropertyHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className="inline-flex" aria-label={`${property.starRating} star property`}>
            {Array.from({ length: property.starRating }).map((_, i) => (
              <span key={i} className="text-sm text-bc-yellow-dark" aria-hidden>
                ★
              </span>
            ))}
          </span>
          {property.isGeniusDiscounted && <span className="bc-genius-badge">Genius</span>}
        </div>

        <h1 className="mt-1 text-[28px] font-bold leading-tight text-bc-gray-900">
          {property.name}
        </h1>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="bc-rating">{property.rating.toFixed(1)}</span>
          <span className="text-sm font-bold text-bc-gray-900">{property.ratingLabel}</span>
          <span className="text-meta text-bc-gray-500">· {property.reviews} reviews</span>
        </div>

        <div className="mt-2 flex items-center gap-1 text-meta text-bc-blue">
          <span aria-hidden>📍</span>
          <span>{property.location}</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {property.tags.map((tag) => (
            <span
              key={tag}
              className="rounded bg-bc-blue-light px-2 py-0.5 text-[11px] font-medium text-bc-blue"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <button type="button" className="bc-btn-lg shrink-0">
        Reserve
      </button>
    </div>
  );
}
