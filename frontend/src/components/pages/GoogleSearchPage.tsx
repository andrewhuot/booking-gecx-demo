import type { DemoMode } from '../../lib/types';
import { adHrefForGoogleMode } from '../../lib/demoRoutes';

interface GoogleSearchPageProps {
  mode: DemoMode;
}

function navigateInApp(href: string) {
  window.history.pushState({}, '', href);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function GoogleSearchPage({ mode }: GoogleSearchPageProps) {
  const adHref = adHrefForGoogleMode(mode);

  return (
    <main className="min-h-full bg-white text-[#202124]">
      <div className="border-b border-[#dadce0]">
        <div className="flex items-center gap-7 px-8 py-5">
          <div className="select-none text-[30px] leading-none tracking-tight" aria-label="Google">
            <span className="text-[#4285f4]">G</span>
            <span className="text-[#ea4335]">o</span>
            <span className="text-[#fbbc05]">o</span>
            <span className="text-[#4285f4]">g</span>
            <span className="text-[#34a853]">l</span>
            <span className="text-[#ea4335]">e</span>
          </div>
          <div className="flex h-11 w-[692px] max-w-[60vw] items-center rounded-full border border-[#dfe1e5] px-5 shadow-[0_1px_6px_rgba(32,33,36,0.18)]">
            <span className="flex-1 text-[16px]">july 4th weekend trips</span>
            <span className="text-[#4285f4]" aria-hidden>
              🔍
            </span>
          </div>
          <div className="ml-auto flex items-center gap-4 text-sm text-[#5f6368]">
            <span>Gmail</span>
            <span>Images</span>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#1a73e8] font-medium text-white">
              D
            </span>
          </div>
        </div>
        <div className="ml-[178px] flex gap-7 px-8 pb-3 text-sm text-[#5f6368]">
          <span className="border-b-2 border-[#1a73e8] pb-3 text-[#1a73e8]">All</span>
          <span>Images</span>
          <span>News</span>
          <span>Videos</span>
          <span>Shopping</span>
          <span>More</span>
        </div>
      </div>

      <section className="ml-[178px] max-w-[680px] px-8 py-3">
        <p className="mb-5 text-sm text-[#70757a]">About 48,200,000 results (0.42 seconds)</p>

        <a
          href={adHref}
          onClick={(event) => {
            event.preventDefault();
            navigateInApp(adHref);
          }}
          className="group block rounded-[2px] py-3 outline-none focus-visible:ring-2 focus-visible:ring-[#1a73e8]"
        >
          <div className="mb-1 flex items-center gap-2 text-sm text-[#202124]">
            <span className="rounded-[3px] border border-[#5f6368] px-1 text-[11px] font-bold leading-4">
              Sponsored
            </span>
            <span>Booking.com</span>
            <span className="text-[#5f6368]">booking.com/july4th</span>
          </div>
          <h1 className="text-[20px] leading-[1.3] text-[#1a0dab] group-hover:underline">
            Booking.com — July 4th Weekend Getaways
          </h1>
          <p className="mt-1 text-[14px] leading-[1.58] text-[#4d5156]">
            America turns 250. Make it count. Plan your flights, hotel &amp;
            experiences in one conversation.
          </p>
        </a>

        <div className="mt-4 space-y-7 text-[14px] leading-[1.58] text-[#4d5156]">
          <article>
            <div className="text-sm text-[#202124]">travel.usnews.com</div>
            <h2 className="text-[20px] leading-[1.3] text-[#1a0dab]">
              15 Best Fourth of July Weekend Getaways
            </h2>
            <p>
              Explore beach towns, mountain escapes, and classic long-weekend
              destinations for Independence Day.
            </p>
          </article>
          <article>
            <div className="text-sm text-[#202124]">cntraveler.com</div>
            <h2 className="text-[20px] leading-[1.3] text-[#1a0dab]">
              Where to Travel for the Long July 4th Weekend
            </h2>
            <p>
              Coastal hotels, summer festivals, and smart tips for booking the
              busiest holiday weekend of the year.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
