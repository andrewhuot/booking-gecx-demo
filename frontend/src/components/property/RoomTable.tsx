import { useDemoStore } from '../../store/demoStore';
import { cn } from '../../lib/cn';
import type { Property } from '../../lib/types';

interface RoomTableProps {
  property: Property;
}

export function RoomTable({ property }: RoomTableProps) {
  const selectedRoomId = useDemoStore((s) => s.viewParams.selectedRoomId);
  const navigateTo = useDemoStore((s) => s.navigateTo);

  const select = (roomId: string) =>
    navigateTo('property', { propertyId: property.id, selectedRoomId: roomId });

  return (
    <section>
      <h2 className="text-xl font-bold text-bc-gray-900">Availability</h2>

      <div className="mt-4 overflow-hidden rounded-card border border-bc-gray-200">
        {/* Header row */}
        <div className="hidden grid-cols-[2fr_1fr_1fr_auto] gap-3 bg-bc-navy px-4 py-2.5 text-meta font-bold text-white sm:grid">
          <span>Room type</span>
          <span>Sleeps</span>
          <span>Price per night</span>
          <span className="text-right">Select</span>
        </div>

        {property.rooms.map((room) => {
          const isSelected = room.id === selectedRoomId;
          return (
            <div
              key={room.id}
              className={cn(
                'grid grid-cols-1 gap-3 border-t border-bc-gray-200 px-4 py-4 first:border-t-0 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-center',
                isSelected && 'bg-bc-blue-light ring-1 ring-inset ring-bc-blue',
              )}
            >
              {/* Room type + features */}
              <div>
                <div className="font-bold text-bc-gray-900">{room.name}</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {room.features.map((feature) => (
                    <span
                      key={feature}
                      className="rounded bg-bc-gray-100 px-2 py-0.5 text-[11px] text-bc-gray-700"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              {/* Sleeps */}
              <div className="text-sm text-bc-gray-700">
                <span className="sm:hidden font-medium">Sleeps: </span>
                <span aria-label={`Sleeps ${room.sleeps}`}>
                  {Array.from({ length: room.sleeps }).map((_, i) => (
                    <span key={i} aria-hidden>
                      👤
                    </span>
                  ))}
                </span>
              </div>

              {/* Price */}
              <div className="text-sm">
                <span className="text-lg font-bold text-bc-green">${room.price}</span>
              </div>

              {/* Select */}
              <div className="sm:text-right">
                <button
                  type="button"
                  onClick={() => select(room.id)}
                  className={cn(
                    'bc-btn w-full sm:w-auto',
                    isSelected && 'bg-bc-green hover:bg-bc-green',
                  )}
                >
                  {isSelected ? 'Selected ✓' : 'Select'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
