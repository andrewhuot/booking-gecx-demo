import { useDemoStore } from '../../store/demoStore';
import type { ViewName } from '../../lib/types';

interface Tab {
  label: string;
  icon: string;
  view?: ViewName;
}

const TABS: Tab[] = [
  { label: 'Search', icon: '🔍', view: 'home' },
  { label: 'Saved', icon: '❤️' },
  { label: 'Bookings', icon: '🧳', view: 'confirmation' },
  { label: 'Account', icon: '👤' },
];

export function MobileTabBar() {
  const view = useDemoStore((s) => s.view);
  const navigateTo = useDemoStore((s) => s.navigateTo);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-bc-gray-200 bg-white md:hidden">
      <ul className="mx-auto flex max-w-md items-stretch">
        {TABS.map((tab) => {
          const active = tab.view != null && tab.view === view;
          return (
            <li key={tab.label} className="flex-1">
              <button
                type="button"
                onClick={() => tab.view && navigateTo(tab.view)}
                className={
                  'flex w-full flex-col items-center gap-0.5 px-1 py-2 text-[11px] font-medium transition-colors ' +
                  (active ? 'text-bc-blue' : 'text-bc-gray-500')
                }
              >
                <span className="text-lg leading-none" aria-hidden>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
