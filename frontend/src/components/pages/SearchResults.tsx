import { useEffect, useRef } from 'react';
import { useDemoStore } from '../../store/demoStore';
import { PROPERTIES } from '../../data/properties';
import { FilterSidebar } from '../search/FilterSidebar';
import { PropertyListCard } from '../search/PropertyListCard';

export function SearchResults() {
  const highlightId = useDemoStore((s) => s.viewParams.highlightId);
  const highlightRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightId]);

  return (
    <div className="bg-bc-gray-100 pb-12">
      {/* Top strip */}
      <div className="border-b border-bc-gray-200 bg-white">
        <div className="mx-auto flex max-w-[1128px] flex-wrap items-center justify-between gap-3 px-4 py-4">
          <h1 className="text-lg font-bold text-bc-gray-900">
            Sedona, Arizona: 42 properties found
          </h1>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-btn border border-bc-gray-300 px-3 py-2 text-sm font-medium text-bc-gray-700 hover:border-bc-blue"
          >
            Sort by: Our top picks <span aria-hidden>▾</span>
          </button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="mx-auto flex max-w-[1128px] flex-col gap-6 px-4 pt-6 lg:flex-row">
        <div className="shrink-0 lg:w-[280px]">
          <div className="lg:sticky lg:top-20">
            <FilterSidebar />
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-4">
          {PROPERTIES.map((property) => {
            const isHighlighted = property.id === highlightId;
            return (
              <div key={property.id} ref={isHighlighted ? highlightRef : undefined}>
                <PropertyListCard property={property} highlighted={isHighlighted} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
