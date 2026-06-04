import { useDemoStore } from '../../store/demoStore';
import type { Property, Room } from '../../lib/types';

interface BookingSidebarProps {
  property: Property;
}

const NIGHTS = 3;

export function BookingSidebar({ property }: BookingSidebarProps) {
  const selectedRoomId = useDemoStore((s) => s.viewParams.selectedRoomId);

  const room: Room | undefined =
    property.rooms.find((r) => r.id === selectedRoomId) ?? property.rooms[0];

  // Properties always ship with at least one room, but guard defensively.
  const price = room?.price ?? property.pricePerNight;
  const total = price * NIGHTS;

  return (
    <div className="overflow-hidden rounded-card border border-bc-gray-200 bg-white shadow-card">
      <div className="border-b border-bc-gray-200 px-4 py-3">
        <h2 className="text-base font-bold text-bc-gray-900">Your booking details</h2>
      </div>

      <div className="px-4 py-4">
        {/* Dates */}
        <div className="flex">
          <div className="flex-1 border-r border-bc-gray-200 pr-3">
            <div className="text-[11px] uppercase tracking-wide text-bc-gray-500">Check-in</div>
            <div className="text-sm font-bold text-bc-gray-900">Thu, Oct 16</div>
          </div>
          <div className="flex-1 pl-3">
            <div className="text-[11px] uppercase tracking-wide text-bc-gray-500">Check-out</div>
            <div className="text-sm font-bold text-bc-gray-900">Sun, Oct 19</div>
          </div>
        </div>

        <div className="mt-3 border-t border-bc-gray-200 pt-3">
          <div className="text-[11px] uppercase tracking-wide text-bc-gray-500">Total length of stay</div>
          <div className="text-sm font-medium text-bc-gray-900">3 nights</div>
        </div>

        {/* Selected room */}
        <div className="mt-3 border-t border-bc-gray-200 pt-3">
          <div className="text-[11px] uppercase tracking-wide text-bc-gray-500">You selected</div>
          <div className="text-sm font-bold text-bc-gray-900">{room?.name ?? 'Standard Room'}</div>
        </div>

        {/* Price breakdown */}
        <div className="mt-4 rounded-card bg-bc-gray-100 px-3 py-3">
          <div className="flex items-center justify-between text-sm text-bc-gray-700">
            <span>
              {NIGHTS} nights × ${price}
            </span>
            <span className="font-bold text-bc-gray-900">${total}</span>
          </div>
          <div className="mt-1 text-[11px] text-bc-gray-500">+ taxes &amp; fees</div>
        </div>

        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-sm font-bold text-bc-gray-900">Total</span>
          <span className="text-xl font-bold text-bc-green">${total}</span>
        </div>

        <button type="button" className="bc-btn-lg mt-4 w-full">
          Reserve
        </button>

        <p className="mt-2 text-center text-meta text-bc-gray-500">You&apos;ll be charged later</p>
        <p className="mt-2 flex items-center justify-center gap-1 text-meta font-medium text-bc-green">
          <span aria-hidden>✓</span> Free cancellation
        </p>
      </div>
    </div>
  );
}
