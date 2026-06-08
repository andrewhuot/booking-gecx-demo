import type {
  ConfirmationCardData,
  ConfirmationUpdateCardData,
  ItinerarySectionData,
} from '../../lib/types';

interface ConfirmationCardProps {
  data?: ConfirmationCardData;
  // Compact variant rendered when an add-on is applied to an existing booking.
  update?: ConfirmationUpdateCardData;
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="grid grid-cols-[78px_minmax(0,1fr)] gap-3 py-0.5">
      <span className="text-meta text-bc-gray-500">{label}</span>
      <span className="min-w-0 text-right text-meta font-medium text-bc-gray-900">
        {value}
      </span>
    </div>
  );
}

function ItinerarySections({ sections }: { sections: ItinerarySectionData[] }) {
  return (
    <div className="mt-3 space-y-3">
      {sections.map((section) => (
        <section key={section.title} aria-label={section.title}>
          <h4 className="text-[11px] font-bold uppercase tracking-wide text-bc-gray-500">
            {section.title}
          </h4>
          <div className="mt-1 space-y-0.5">
            {section.rows.map((row) => (
              <Row key={`${section.title}-${row.label}`} label={row.label} value={row.value} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// Green-accented booking receipt rendered inline inside an agent bubble.
// Renders the full confirmation by default, or a compact "added" variant
// when an `update` payload is supplied.
export function ConfirmationCard({ data, update }: ConfirmationCardProps) {
  if (update) {
    return (
      <div className="mt-2 w-full overflow-hidden rounded-card border border-bc-gray-200 border-l-4 border-l-bc-green bg-white shadow-card animate-card-in">
        <div className="p-3">
          <div className="flex items-center gap-2">
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full bg-bc-green text-[11px] font-bold text-white animate-check-pop"
              aria-hidden
            >
              ✓
            </span>
            <span className="text-sm font-bold text-bc-gray-900">
              Booking {update.status}
            </span>
          </div>
          <div className="mt-2 space-y-0.5">
            <Row label="Added" value={update.addOn} />
            <Row label="Add-on price" value={update.addOnPrice} />
            <Row label="Confirmation" value={update.confirmationNumber} />
          </div>
          <div className="mt-2 flex items-baseline justify-between border-t border-bc-gray-200 pt-2">
            <span className="text-meta font-medium text-bc-gray-700">
              New total
            </span>
            <span className="text-base font-bold text-bc-green">
              {update.updatedTotal}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mt-2 w-full overflow-hidden rounded-card border border-bc-gray-200 border-l-4 border-l-bc-green bg-white shadow-card animate-card-in">
      <div className="p-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full bg-bc-green text-xs font-bold text-white animate-check-pop"
            aria-hidden
          >
            ✓
          </span>
          <span className="text-sm font-bold text-bc-gray-900">
            Booking {data.status}
          </span>
        </div>

        {/* Confirmation number */}
        <div className="mt-2 rounded bg-bc-gray-100 px-2.5 py-1.5">
          <span className="text-[10px] uppercase tracking-wide text-bc-gray-500">
            Confirmation
          </span>
          <div className="font-mono text-sm font-bold text-bc-gray-900">
            {data.confirmationNumber}
          </div>
        </div>

        {data.itinerarySections?.length ? (
          <ItinerarySections sections={data.itinerarySections} />
        ) : (
          <div className="mt-2 space-y-0.5">
            <Row label="Property" value={data.property} />
            <Row label="Dates" value={data.dates} />
            <Row label="Room" value={data.room} />
            <Row label="Nights" value={data.nights} />
          </div>
        )}

        {/* Total */}
        <div className="mt-2 flex items-baseline justify-between border-t border-bc-gray-200 pt-2">
          <span className="text-meta font-medium text-bc-gray-700">Total</span>
          <span className="text-base font-bold text-bc-green">{data.total}</span>
        </div>
      </div>
    </div>
  );
}
