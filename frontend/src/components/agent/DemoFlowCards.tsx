import type { SyntheticEvent } from 'react';
import type {
  ChoiceGroupCardData,
  ChoiceOptionData,
  CostSummaryCardData,
  LocationPermissionCardData,
  PaymentPanelCardData,
} from '../../lib/types';
import { chatImages } from '../../assets/chat';
import { dispatchChatSubmit } from './chatSubmitEvent';

function submit(text: string) {
  dispatchChatSubmit(text);
}

const OPTION_IMAGES: Record<string, { src: string; position?: string }> = {
  'marthas-vineyard': { src: chatImages.destMarthasVineyard, position: 'center 45%' },
  'outer-banks': { src: chatImages.destOuterBanks, position: 'center 58%' },
  kennebunkport: { src: chatImages.destKennebunkport, position: 'center center' },
  'harbor-view': { src: chatImages.hotelHarborView, position: 'center center' },
  summercamp: { src: chatImages.hotelSummercamp, position: 'center center' },
  christopher: { src: chatImages.hotelChristopher, position: 'center center' },
  jetblue: { src: chatImages.flightJetblue, position: 'center center' },
  'cape-air': { src: chatImages.flightCapeAir, position: 'center center' },
  'sunset-sailing': { src: chatImages.experienceSunsetSailing, position: 'center center' },
  'bike-wine': { src: chatImages.experienceBikeWine, position: 'center center' },
};

function optionImage(option: ChoiceOptionData) {
  if (option.image) {
    return { src: option.image, position: option.imagePosition };
  }
  return OPTION_IMAGES[option.id];
}

function optionImageAlt(option: ChoiceOptionData) {
  return option.imageLabel || option.title;
}

function hideImageOnError(event: SyntheticEvent<HTMLImageElement>) {
  event.currentTarget.style.display = 'none';
}

export function LocationPermissionCard({ data }: { data: LocationPermissionCardData }) {
  return (
    <div className="mt-2 w-full overflow-hidden rounded-card border border-bc-gray-300 bg-white shadow-card animate-card-in">
      <div className="border-b border-bc-gray-200 bg-bc-gray-100 px-3 py-2">
        <div className="text-[11px] font-medium text-bc-gray-500">Location request</div>
      </div>
      <div className="p-3">
        <div className="text-sm font-bold text-bc-gray-900">{data.title}</div>
        <p className="mt-1 text-meta leading-snug text-bc-gray-500">{data.body}</p>
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-btn px-3 py-2 text-meta font-medium text-bc-blue hover:bg-bc-blue-light"
          >
            Block
          </button>
          <button
            type="button"
            onClick={() => submit(data.replyText)}
            className="bc-btn px-3 py-2 text-meta"
          >
            {data.cta}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ChoiceGroupCard({ data }: { data: ChoiceGroupCardData }) {
  const isChipLayout = data.layout === 'chips';

  return (
    <div className="mt-2 w-full animate-card-in">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-bc-gray-500">
        {data.title}
      </div>
      <div className={isChipLayout ? 'flex flex-wrap gap-2' : 'flex snap-x gap-2 overflow-x-auto pb-1'}>
        {data.options.map((option) => {
          const media = optionImage(option);
          const mediaAlt = optionImageAlt(option);

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => submit(option.replyText)}
              className={
                isChipLayout
                  ? 'rounded-full border border-bc-blue/30 bg-bc-blue-light px-3.5 py-1.5 text-meta font-medium text-bc-blue transition-colors hover:bg-bc-blue hover:text-white'
                  : 'group w-[245px] shrink-0 snap-start overflow-hidden rounded-card border border-bc-gray-200 bg-white text-left shadow-card transition-shadow hover:shadow-card-hover'
              }
            >
              {isChipLayout ? (
                option.title
              ) : (
                <>
                  <div className="relative h-28 overflow-hidden bg-gradient-to-br from-bc-blue-light via-white to-bc-yellow/30">
                    {media ? (
                      <img
                        src={media.src}
                        alt={mediaAlt}
                        onError={hideImageOnError}
                        style={{ objectPosition: media.position || 'center center' }}
                        className="absolute inset-0 block h-full w-full object-cover saturate-[1.05] transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-end px-3 py-2">
                        <div className="text-[11px] font-semibold text-bc-navy">
                          {mediaAlt}
                        </div>
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-white/10" />
                  </div>
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold leading-tight text-bc-gray-900">
                          {option.title}
                        </h4>
                        {option.subtitle && (
                          <p className="mt-0.5 text-[11px] leading-snug text-bc-gray-500">
                            {option.subtitle}
                          </p>
                        )}
                      </div>
                      {option.icon && <span className="text-base">{option.icon}</span>}
                    </div>
                    {option.meta && (
                      <p className="mt-2 text-[11px] leading-snug text-bc-gray-500">{option.meta}</p>
                    )}
                    {option.price && (
                      <p className="mt-2 text-[12px] font-bold text-bc-green">{option.price}</p>
                    )}
                    {option.description && (
                      <p className="mt-2 text-[11px] leading-snug text-bc-gray-700">
                        {option.description}
                      </p>
                    )}
                  </div>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CostSummaryCard({ data }: { data: CostSummaryCardData }) {
  return (
    <div className="mt-2 overflow-hidden rounded-card border border-bc-gray-200 bg-white shadow-card animate-card-in">
      <div className="bg-bc-blue-light px-3 py-2">
        <h4 className="text-sm font-bold text-bc-navy">{data.title}</h4>
      </div>
      <div className="p-3">
        <div className="space-y-1.5">
          {data.rows.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-3">
              <span className="text-meta text-bc-gray-700">{row.label}</span>
              <span className="text-meta font-bold text-bc-gray-900">{row.value}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-baseline justify-between border-t border-bc-gray-200 pt-3">
          <span className="text-sm font-bold text-bc-gray-900">Total</span>
          <span className="text-lg font-bold text-bc-green">{data.total}</span>
        </div>
        {data.note && <p className="mt-1.5 text-meta text-bc-gray-500">{data.note}</p>}
        {data.cta && data.replyText && (
          <button
            type="button"
            onClick={() => submit(data.replyText || data.cta || '')}
            className="bc-btn mt-3 w-full py-2.5 text-sm"
          >
            {data.cta}
          </button>
        )}
      </div>
    </div>
  );
}

export function PaymentPanelCard({ data }: { data: PaymentPanelCardData }) {
  return (
    <div className="mt-2 overflow-hidden rounded-card border border-bc-gray-200 bg-white shadow-card animate-card-in">
      <div className="border-b border-bc-gray-200 px-3 py-2">
        <h4 className="text-sm font-bold text-bc-gray-900">{data.title}</h4>
      </div>
      <div className="p-2">
        {data.options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => submit(option.replyText)}
            className="flex w-full items-center gap-3 rounded-card px-2.5 py-2.5 text-left transition-colors hover:bg-bc-blue-light"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-bc-gray-100 text-sm font-bold text-bc-navy">
              {option.icon || '•'}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-bc-gray-900">{option.title}</span>
              {option.subtitle && (
                <span className="block text-meta text-bc-gray-500">{option.subtitle}</span>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
