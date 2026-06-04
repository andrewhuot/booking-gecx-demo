import { useDemoStore } from '../../store/demoStore';

const NAV_ITEMS = [
  { label: 'Stays', active: true },
  { label: 'Flights', active: false },
  { label: 'Car rentals', active: false },
  { label: 'Attractions', active: false },
  { label: 'Airport taxis', active: false },
];

export function Header() {
  const navigateTo = useDemoStore((s) => s.navigateTo);

  const handleCallUs = () => {
    // Open the voice demo: pick David's scenario, then switch to the voice channel.
    useDemoStore.getState().setScenario('david');
    useDemoStore.getState().setChannel('voice');
  };

  return (
    <header className="sticky top-0 z-40 bg-bc-navy text-white">
      <div className="mx-auto flex h-16 max-w-[1128px] items-center justify-between gap-4 px-4">
        {/* Logo */}
        <button
          type="button"
          onClick={() => navigateTo('home')}
          className="shrink-0 text-[22px] font-bold leading-none tracking-tight"
          aria-label="Booking.com home"
        >
          Booking<span className="text-bc-yellow">.</span>com
        </button>

        {/* Nav links */}
        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              type="button"
              className={
                'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ' +
                (item.active
                  ? 'border-white/70 bg-white/10'
                  : 'border-transparent hover:bg-white/10')
              }
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right cluster */}
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={handleCallUs}
            className="hidden items-center gap-1.5 rounded-full px-2 py-1.5 text-sm font-medium hover:bg-white/10 sm:flex"
          >
            <span aria-hidden>📞</span>
            <span>Call us</span>
          </button>

          <button
            type="button"
            className="hidden rounded px-2 py-1.5 text-sm font-medium hover:bg-white/10 lg:block"
          >
            USD
          </button>

          <button
            type="button"
            className="hidden h-9 w-9 items-center justify-center rounded-full text-base hover:bg-white/10 sm:flex"
            aria-label="Notifications"
          >
            <span aria-hidden>🔔</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-sm font-bold text-bc-navy">
              DU
            </div>
            <div className="hidden flex-col leading-tight lg:flex">
              <span className="text-sm font-medium">Demo User</span>
              <span className="inline-flex w-fit items-center rounded bg-white px-1.5 py-0.5 text-[11px] font-bold text-bc-navy">
                Genius Level 2
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
