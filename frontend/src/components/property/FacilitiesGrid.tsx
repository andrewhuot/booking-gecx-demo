import type { Property } from '../../lib/types';

interface FacilitiesGridProps {
  property: Property;
}

// Map a facility label to a representative emoji. Matching is substring-based
// (case-insensitive) so variants like "All-Inclusive Dining" still resolve.
function facilityEmoji(facility: string): string {
  const f = facility.toLowerCase();
  if (f.includes('spa')) return '🧖';
  if (f.includes('pool')) return '🏊';
  if (f.includes('wifi')) return '📶';
  if (f.includes('dining') || f.includes('restaurant')) return '🍽️';
  if (f.includes('fitness')) return '🏋️';
  if (f.includes('yoga')) return '🧘';
  if (f.includes('meditation')) return '🌿';
  if (f.includes('hik')) return '🥾';
  if (f.includes('shuttle')) return '🚐';
  if (f.includes('room service')) return '🛎️';
  if (f.includes('grotto')) return '💎';
  if (f.includes('rooftop')) return '🌆';
  return '✓';
}

export function FacilitiesGrid({ property }: FacilitiesGridProps) {
  return (
    <section>
      <h2 className="text-xl font-bold text-bc-gray-900">Facilities</h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {property.facilities.map((facility) => (
          <div
            key={facility}
            className="flex items-center gap-2.5 rounded-card border border-bc-gray-200 bg-white px-3 py-2.5"
          >
            <span className="text-lg" aria-hidden>
              {facilityEmoji(facility)}
            </span>
            <span className="text-sm text-bc-gray-700">{facility}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
