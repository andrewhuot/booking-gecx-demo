import { useDemoStore } from '../../store/demoStore';
import { cn } from '../../lib/cn';
import type { Property } from '../../lib/types';

interface PropertyListCardProps {
  property: Property;
  highlighted?: boolean;
}

function StarRow({ count }: { count: number }) {
  return (
    <span className="inline-flex" aria-label={`${count} star property`}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="text-[13px] text-bc-yellow-dark" aria-hidden>
          ★
        </span>
      ))}
    </span>
  );
}

export function PropertyListCard({ property, highlighted = false }: PropertyListCardProps) {
  const navigateTo = useDemoStore((s) => s.navigateTo);

  const open = () => navigateTo('property', { propertyId: property.id });

  return (
    <article
      className={cn(
        'flex flex-col overflow-hidden rounded-card border border-bc-gray-200 bg-white shadow-card transition-shadow hover:shadow-card-hover sm:flex-row',
        highlighted && 'ring-2 ring-bc-blue animate-highlight-glow',
      )}
    >
      {/* Image */}
      <button
        type="button"
        onClick={open}
        style={{ background: property.gradient }}
        className="relative h-44 w-full shrink-0 overflow-hidden text-left sm:h-auto sm:w-[240px]"
        aria-label={`View ${property.name}`}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <span className="absolute bottom-2 left-3 max-w-[90%] text-sm font-semibold text-white/90 drop-shadow">
          {property.name}
        </span>
      </button>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4 sm:flex-row sm:gap-4">
        <div className="flex flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <div>
              <button
                type="button"
                onClick={open}
                className="text-left text-lg font-bold text-bc-blue hover:underline"
              >
                {property.name}
              </button>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="flex items-center gap-1 text-meta text-bc-blue">
                  <span aria-hidden>📍</span>
                  {property.location}
                </span>
                <StarRow count={property.starRating} />
              </div>
            </div>

            {/* Rating block (mobile inline; hidden when shown on right column) */}
            <div className="flex items-center gap-2 sm:hidden">
              <div className="flex flex-col items-end leading-tight">
                <span className="text-sm font-bold text-bc-gray-900">{property.ratingLabel}</span>
                <span className="text-[11px] text-bc-gray-500">{property.reviews} reviews</span>
              </div>
              <span className="bc-rating">{property.rating.toFixed(1)}</span>
            </div>
          </div>

          <p className="mt-2 text-meta text-bc-gray-700">{property.tagline}</p>

          {/* Tags */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {property.tags.map((tag) => (
              <span
                key={tag}
                className="rounded bg-bc-blue-light px-2 py-0.5 text-[11px] font-medium text-bc-blue"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Genius */}
          {property.isGeniusDiscounted && (
            <div className="mt-2 flex items-center gap-2">
              <span className="bc-genius-badge">Genius</span>
              <span className="text-meta text-bc-gray-700">Genius discount available</span>
            </div>
          )}

          {/* Urgency */}
          {property.urgencyNote && (
            <p className="mt-2 text-meta font-bold text-bc-red">{property.urgencyNote}</p>
          )}
        </div>

        {/* Right column: rating + price */}
        <div className="mt-3 flex shrink-0 flex-col items-end justify-between border-t border-bc-gray-200 pt-3 sm:mt-0 sm:w-[180px] sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <div className="hidden items-center gap-2 sm:flex">
            <div className="flex flex-col items-end leading-tight">
              <span className="text-sm font-bold text-bc-gray-900">{property.ratingLabel}</span>
              <span className="text-[11px] text-bc-gray-500">{property.reviews} reviews</span>
            </div>
            <span className="bc-rating">{property.rating.toFixed(1)}</span>
          </div>

          <div className="flex w-full flex-col items-end">
            {property.originalPrice != null && (
              <span className="text-meta text-bc-gray-500 line-through">
                ${property.originalPrice}
              </span>
            )}
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-bc-green">${property.pricePerNight}</span>
              <span className="text-meta text-bc-gray-500">/night</span>
            </div>
            {property.priceNote && (
              <span className="text-[11px] text-bc-gray-500">{property.priceNote}</span>
            )}
            <span className="text-[11px] text-bc-gray-500">Includes taxes &amp; fees</span>
            <button type="button" onClick={open} className="bc-btn mt-2 w-full">
              See availability
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
