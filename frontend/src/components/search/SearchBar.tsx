import { useState } from 'react';
import { useDemoStore } from '../../store/demoStore';

export function SearchBar() {
  const navigateTo = useDemoStore((s) => s.navigateTo);
  const [destination, setDestination] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  const matchesSedona = destination.toLowerCase().includes('sed');

  const selectSedona = () => {
    setDestination('Sedona, Arizona');
    setShowAutocomplete(false);
  };

  const handleSearch = () => {
    setShowAutocomplete(false);
    navigateTo('search', { highlightId: undefined });
  };

  return (
    <div className="rounded-lg bg-bc-yellow p-0.5 shadow-card">
      <div className="flex flex-col overflow-visible rounded-md bg-white md:flex-row md:items-stretch">
        {/* Destination */}
        <div className="relative flex flex-1 items-center gap-2 border-b border-bc-gray-200 px-3 py-2.5 md:border-b-0 md:border-r">
          <span className="text-lg" aria-hidden>
            📍
          </span>
          <input
            type="text"
            value={destination}
            onChange={(e) => {
              setDestination(e.target.value);
              setShowAutocomplete(true);
            }}
            onFocus={() => setShowAutocomplete(true)}
            placeholder="Where are you going?"
            className="w-full bg-transparent text-sm font-medium text-bc-gray-900 placeholder:font-normal placeholder:text-bc-gray-500 focus:outline-none"
            aria-label="Where are you going?"
          />
          {showAutocomplete && matchesSedona && (
            <div className="absolute left-0 top-full z-50 mt-1 w-[320px] max-w-[90vw] overflow-hidden rounded-md border border-bc-gray-200 bg-white shadow-widget">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={selectSedona}
                className="flex w-full items-start gap-3 px-3 py-3 text-left hover:bg-bc-blue-light"
              >
                <span className="mt-0.5 text-lg" aria-hidden>
                  📍
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-bold text-bc-gray-900">Sedona, Arizona</span>
                  <span className="text-meta text-bc-gray-500">Arizona, United States</span>
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="flex items-center gap-2 border-b border-bc-gray-200 px-3 py-2.5 md:border-b-0 md:border-r">
          <span className="text-lg" aria-hidden>
            📅
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] uppercase tracking-wide text-bc-gray-500">
              Check-in — Check-out
            </span>
            <span className="text-sm font-medium text-bc-gray-900">Thu 16 Oct — Sun 19 Oct</span>
          </div>
        </div>

        {/* Guests */}
        <div className="flex items-center gap-2 border-b border-bc-gray-200 px-3 py-2.5 md:border-b-0 md:border-r">
          <span className="text-lg" aria-hidden>
            👤
          </span>
          <span className="text-sm font-medium text-bc-gray-900">
            2 adults · 0 children · 1 room
          </span>
        </div>

        {/* Search button */}
        <div className="p-1.5 md:flex md:items-stretch">
          <button
            type="button"
            onClick={handleSearch}
            className="flex w-full items-center justify-center rounded-btn bg-bc-blue px-6 py-3 text-base font-bold text-white transition-colors hover:bg-bc-blue-dark md:h-full"
          >
            Search
          </button>
        </div>
      </div>
    </div>
  );
}
