import { useDemoStore } from '../../store/demoStore';
import type { UpsellCardData } from '../../lib/types';

interface UpsellCardProps {
  data: UpsellCardData;
}

// Subtle, blue-tinted add-on offer rendered inline inside an agent bubble.
export function UpsellCard({ data }: UpsellCardProps) {
  const mode = useDemoStore((s) => s.mode);

  const handleAdd = () => {
    // Scripted mode: advance to the "Add it." user turn. In live mode the
    // backend drives the follow-up, so this is a no-op acknowledgement.
    if (mode !== 'live') {
      useDemoStore.getState().advance();
    }
  };

  return (
    <div className="mt-2 w-full overflow-hidden rounded-card border border-bc-blue/20 bg-bc-blue-light shadow-card animate-card-in">
      <div className="p-3">
        <div className="flex items-center gap-1.5">
          <span aria-hidden>✨</span>
          <h4 className="text-sm font-bold text-bc-gray-900">{data.name}</h4>
        </div>
        <p className="mt-1 text-meta text-bc-gray-700">{data.description}</p>

        <div className="mt-2.5 flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-1">
            <span className="text-base font-bold text-bc-gray-900">
              {data.price}
            </span>
            <span className="text-meta text-bc-gray-500">
              {data.priceContext}
            </span>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            className="bc-btn px-3 py-2 text-meta"
          >
            {data.cta}
          </button>
        </div>
      </div>
    </div>
  );
}
