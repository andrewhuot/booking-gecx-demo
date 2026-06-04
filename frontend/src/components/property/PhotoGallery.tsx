import type { Property } from '../../lib/types';

interface PhotoGalleryProps {
  property: Property;
}

// Thematic emoji accents for the smaller tiles to add visual variety.
const TILE_ACCENTS = ['🏜️', '🧖', '🏊', '🌄'];

export function PhotoGallery({ property }: PhotoGalleryProps) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-5 sm:grid-rows-2">
      {/* Hero tile */}
      <div
        style={{ background: property.gradient }}
        className="relative h-64 overflow-hidden rounded-card sm:col-span-3 sm:row-span-2 sm:h-full"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <span className="absolute bottom-4 left-4 text-2xl font-bold text-white drop-shadow">
          {property.name}
        </span>
      </div>

      {/* Four smaller tiles */}
      {TILE_ACCENTS.map((accent, i) => (
        <div
          key={i}
          style={{ background: property.gradient }}
          className="relative hidden h-[124px] overflow-hidden rounded-card sm:block"
        >
          <div className="absolute inset-0 bg-black/10" />
          <span className="absolute bottom-2 right-2 text-2xl opacity-90" aria-hidden>
            {accent}
          </span>
        </div>
      ))}
    </div>
  );
}
