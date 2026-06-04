import { useState } from 'react';

interface FilterGroup {
  heading: string;
  options: string[];
}

const FILTER_GROUPS: FilterGroup[] = [
  { heading: 'Your budget (per night)', options: ['$0 – $150', '$150 – $300', '$300 – $500', '$500+'] },
  { heading: 'Star rating', options: ['3 stars', '4 stars', '5 stars'] },
  { heading: 'Property type', options: ['Resort', 'Spa Hotel', 'Boutique'] },
  { heading: 'Guest rating', options: ['Wonderful: 9+', 'Very Good: 8+', 'Good: 7+'] },
  { heading: 'Wellness facilities', options: ['Spa', 'Meditation', 'Yoga', 'Hot springs'] },
];

export function FilterSidebar() {
  // Visual-only state: toggles render checked but do not filter results.
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const toggle = (key: string) =>
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <aside className="w-full">
      <div className="overflow-hidden rounded-card border border-bc-gray-200 bg-white">
        <div className="border-b border-bc-gray-200 px-4 py-3">
          <h2 className="text-sm font-bold text-bc-gray-900">Filter by:</h2>
        </div>

        {FILTER_GROUPS.map((group) => (
          <div key={group.heading} className="border-b border-bc-gray-200 px-4 py-4 last:border-b-0">
            <h3 className="mb-3 text-sm font-bold text-bc-gray-900">{group.heading}</h3>
            <ul className="space-y-2.5">
              {group.options.map((option) => {
                const key = `${group.heading}:${option}`;
                return (
                  <li key={key}>
                    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-bc-gray-700">
                      <input
                        type="checkbox"
                        checked={Boolean(checked[key])}
                        onChange={() => toggle(key)}
                        className="h-4 w-4 cursor-pointer rounded border-bc-gray-300 accent-bc-blue"
                      />
                      <span>{option}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}
