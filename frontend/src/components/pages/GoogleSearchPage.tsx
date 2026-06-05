import type { DemoMode } from '../../lib/types';
import type { ReactNode } from 'react';
import { adHrefForGoogleMode } from '../../lib/demoRoutes';

interface GoogleSearchPageProps {
  mode: DemoMode;
}

function navigateInApp(href: string) {
  window.history.pushState({}, '', href);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function GoogleLogo() {
  return (
    <div className="select-none text-[30px] leading-none tracking-tight" aria-label="Google">
      <span className="text-[#4285f4]">G</span>
      <span className="text-[#ea4335]">o</span>
      <span className="text-[#fbbc05]">o</span>
      <span className="text-[#4285f4]">g</span>
      <span className="text-[#34a853]">l</span>
      <span className="text-[#ea4335]">e</span>
    </div>
  );
}

function IconButton({ label, children }: { label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-full text-[#5f6368] transition-colors hover:bg-[#f1f3f4]"
    >
      {children}
    </button>
  );
}

interface ResultProps {
  site: string;
  path: string;
  title: string;
  description: string;
  favicon?: string;
  imageLabel?: string;
  sitelinks?: string[];
}

function SearchResult({
  site,
  path,
  title,
  description,
  favicon,
  imageLabel,
  sitelinks = [],
}: ResultProps) {
  return (
    <article className="py-3">
      <div className="mb-1 flex items-center gap-3 text-[14px] text-[#202124]">
        <span className="grid h-7 w-7 place-items-center rounded-full border border-[#dadce0] bg-white text-[13px]">
          {favicon || site.charAt(0)}
        </span>
        <div className="min-w-0 leading-tight">
          <div>{site}</div>
          <div className="truncate text-[12px] text-[#4d5156]">{path}</div>
        </div>
        <span className="text-lg leading-none text-[#5f6368]">⋮</span>
      </div>
      <div className="flex gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-[20px] leading-[1.3] text-[#1a0dab] hover:underline">
            {title}
          </h2>
          <p className="mt-1 text-[14px] leading-[1.58] text-[#4d5156]">
            {description}
          </p>
          {sitelinks.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-x-2 text-[14px] text-[#1a0dab]">
              {sitelinks.map((link, index) => (
                <span key={link}>
                  {index > 0 && <span className="mr-2 text-[#4d5156]">·</span>}
                  {link}
                </span>
              ))}
            </div>
          )}
        </div>
        {imageLabel && (
          <div
            className="mt-1 grid h-[92px] w-[92px] shrink-0 place-items-end overflow-hidden rounded-[8px] bg-gradient-to-br from-[#b5d9ff] via-[#f8fbff] to-[#c88d50] p-2 text-right text-[10px] font-medium leading-tight text-[#3c4043]"
            aria-label={imageLabel}
          >
            {imageLabel}
          </div>
        )}
      </div>
    </article>
  );
}

export function GoogleSearchPage({ mode }: GoogleSearchPageProps) {
  const adHref = adHrefForGoogleMode(mode);
  const organicResults: ResultProps[] = [
    {
      site: 'Expedia',
      path: 'https://www.expedia.com/getaway/fourth_of_july',
      title: 'Cheap 4th of July Getaways | Affordable Trip Deals',
      description:
        'Compare package deals and browse Fourth of July getaways. Everyone’s vacation is unique, so design a vacation package that fits your holiday weekend.',
      favicon: '↗',
      imageLabel: 'coastal hotel',
    },
    {
      site: 'U.S. News Travel',
      path: 'https://travel.usnews.com/rankings/best-july-fourth-weekend-getaways',
      title: 'Best Fourth of July Weekend Getaways',
      description:
        'Explore beach towns, mountain escapes, fireworks celebrations, and classic long-weekend destinations for Independence Day.',
      favicon: 'U',
    },
    {
      site: 'Condé Nast Traveler',
      path: 'https://www.cntraveler.com/story/july-fourth-weekend-trips',
      title: 'Where to Travel for the Long July 4th Weekend',
      description:
        'Coastal hotels, summer festivals, smart booking tips, and quick-flight escapes for one of the busiest travel weekends of the year.',
      favicon: 'C',
      sitelinks: ['Beach towns', 'Weekend flights', 'Family trips'],
    },
    {
      site: 'Martha’s Vineyard Chamber',
      path: 'https://www.mvy.com/events/fourth-of-july',
      title: 'Martha’s Vineyard Fourth of July Weekend Guide',
      description:
        'Parades, harbor cruises, ferry timing, beach days, seafood spots, and fireworks-adjacent ways to spend the holiday weekend.',
      favicon: 'MV',
    },
    {
      site: 'Hilton',
      path: 'https://www.hilton.com/en/locations/july-4-getaways',
      title: 'Relax by Oceanfront Pools - Secluded Cottages and Villas',
      description:
        'From exclusive experiences to tranquil spa days, discover beach towns with online rates, flexible booking, and summer savings.',
      favicon: 'H',
    },
  ];

  return (
    <main className="min-h-full bg-white font-[Arial,sans-serif] text-[#202124]">
      <div className="border-b border-[#dadce0]">
        <div className="flex items-center gap-7 px-[70px] py-[25px]">
          <GoogleLogo />
          <form
            role="search"
            aria-label="Google Search"
            className="flex h-[52px] w-[862px] max-w-[63vw] items-center rounded-full border border-[#dfe1e5] bg-white pl-6 pr-3 shadow-[0_1px_6px_rgba(32,33,36,0.18)]"
          >
            <input
              readOnly
              aria-label="Search"
              type="search"
              value="July 4th getaway"
              className="min-w-0 flex-1 bg-transparent text-[16px] text-[#202124] outline-none"
            />
            <IconButton label="Clear search">
              <span className="text-[29px] leading-none">×</span>
            </IconButton>
            <div className="mx-2 h-8 w-px bg-[#dadce0]" aria-hidden />
            <IconButton label="Search by voice">
              <span className="text-[20px]">🎙</span>
            </IconButton>
            <IconButton label="Search by image">
              <span className="text-[19px]">◉</span>
            </IconButton>
            <IconButton label="Search">
              <span className="text-[22px]">⌕</span>
            </IconButton>
          </form>
          <div className="ml-auto flex items-center gap-4 text-[#5f6368]">
            <IconButton label="Share">⇧</IconButton>
            <IconButton label="Google apps">
              <span className="text-[22px] leading-none">⁙</span>
            </IconButton>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#fbbc04] via-[#ea4335] to-[#34a853] p-[2px]">
              <span className="grid h-full w-full place-items-center rounded-full bg-[#f4511e] text-[18px] font-medium text-white">
                A
              </span>
            </span>
          </div>
        </div>
        <div className="ml-[226px] flex h-[44px] items-end gap-8 px-0 text-[14px] font-medium text-[#5f6368]">
          <span className="pb-[13px]">AI Mode</span>
          <span className="border-b-[3px] border-[#202124] pb-[13px] text-[#202124]">
            All
          </span>
          <span className="pb-[13px]">Images</span>
          <span className="pb-[13px]">News</span>
          <span className="pb-[13px]">Short videos</span>
          <span className="pb-[13px]">Shopping</span>
          <span className="pb-[13px]">Videos</span>
          <span className="pb-[13px]">
            <span>More</span>
            <span aria-hidden="true"> ▾</span>
          </span>
          <span className="pb-[13px]">
            <span>Tools</span>
            <span aria-hidden="true"> ▾</span>
          </span>
        </div>
      </div>

      <section className="ml-[226px] max-w-[760px] py-8">
        <h1 className="mb-4 text-[22px] font-normal leading-8 text-[#202124]">
          Sponsored results
        </h1>
        <div className="mb-3 border-t border-[#dadce0]" />

        <a
          href={adHref}
          onClick={(event) => {
            event.preventDefault();
            navigateInApp(adHref);
          }}
          className="group block rounded-[2px] py-3 outline-none focus-visible:ring-2 focus-visible:ring-[#1a73e8]"
        >
          <div className="mb-1 flex items-center gap-3 text-[14px] text-[#202124]">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-[#003b95] text-[13px] font-bold text-white">
              B.
            </span>
            <div className="min-w-0 leading-tight">
              <div>Booking.com · Sponsored</div>
              <div className="truncate text-[12px] text-[#4d5156]">
                https://www.booking.com › july-4th-weekend
              </div>
            </div>
            <span className="text-lg leading-none text-[#5f6368]">⋮</span>
          </div>
          <h1 className="text-[20px] leading-[1.3] text-[#1a0dab] group-hover:underline">
            Booking.com — July 4th Weekend Getaways
          </h1>
          <p className="mt-1 text-[14px] leading-[1.58] text-[#4d5156]">
            America turns 250. Make it count. Plan flights, hotel, and
            experiences in one conversation with Booking.com Assistant.
          </p>
          <div className="mt-4 border-t border-[#dadce0]">
            {[
              ['July 4th beach stays', 'Compare hotels, flights, and experiences for the long weekend.'],
              ['Martha’s Vineyard packages', 'Hotels near Oak Bluffs, ferry-friendly stays, and flexible flights.'],
            ].map(([title, body]) => (
              <div
                key={title}
                className="flex items-center justify-between border-b border-[#dadce0] py-3 pl-4"
              >
                <div>
                  <div className="text-[18px] leading-6 text-[#1a0dab]">{title}</div>
                  <div className="text-[14px] text-[#4d5156]">{body}</div>
                </div>
                <span className="pr-3 text-2xl text-[#5f6368]">›</span>
              </div>
            ))}
          </div>
        </a>

        <div className="my-5 border-t border-[#dadce0]" />

        <p className="mb-3 text-sm text-[#70757a]">
          About 48,200,000 results (0.42 seconds)
        </p>

        <div className="space-y-3 text-[14px] leading-[1.58] text-[#4d5156]">
          {organicResults.map((result) => (
            <SearchResult key={result.title} {...result} />
          ))}
        </div>
      </section>
    </main>
  );
}
