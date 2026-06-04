import { AnimatePresence, motion } from 'framer-motion';
import { useDemoStore } from '../../store/demoStore';

function DetailRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-bc-gray-200 py-3 last:border-b-0">
      <span className="text-sm text-bc-gray-500">{label}</span>
      <span
        className={
          'text-right text-sm font-bold ' + (accent ? 'text-bc-green' : 'text-bc-gray-900')
        }
      >
        {value}
      </span>
    </div>
  );
}

export function Confirmation() {
  const booking = useDemoStore((s) => s.booking);
  const navigateTo = useDemoStore((s) => s.navigateTo);

  if (!booking) {
    return (
      <div className="mx-auto max-w-[640px] px-4 py-20 text-center">
        <div className="text-4xl" aria-hidden>
          🧳
        </div>
        <h1 className="mt-4 text-xl font-bold text-bc-gray-900">No booking yet</h1>
        <p className="mt-2 text-bc-gray-500">
          Once you complete a reservation, your confirmation will appear here.
        </p>
        <button type="button" onClick={() => navigateTo('home')} className="bc-btn-lg mt-6">
          Start searching
        </button>
      </div>
    );
  }

  return (
    <div className="bg-bc-gray-100 py-12">
      <div className="mx-auto max-w-[640px] px-4">
        <div className="overflow-hidden rounded-card border border-bc-gray-200 bg-white shadow-card">
          {/* Header band */}
          <div className="flex flex-col items-center gap-4 border-b border-bc-gray-200 px-6 py-8 text-center">
            <div className="flex h-20 w-20 animate-check-pop items-center justify-center rounded-full bg-bc-green text-4xl font-bold text-white">
              ✓
            </div>
            <h1 className="text-2xl font-bold text-bc-gray-900">Your booking is confirmed!</h1>
            <p className="text-sm text-bc-gray-500">
              A confirmation email is on its way to your inbox.
            </p>
          </div>

          <div className="px-6 py-6">
            {/* Confirmation number */}
            <div className="rounded-card border border-bc-gray-200 bg-bc-gray-100 px-4 py-4 text-center">
              <div className="text-[11px] uppercase tracking-wide text-bc-gray-500">
                Confirmation number
              </div>
              <div className="mt-1 text-2xl font-bold tracking-wide text-bc-navy">
                {booking.confirmationNumber}
              </div>
            </div>

            {/* Details */}
            <div className="mt-5">
              <DetailRow label="Property" value={booking.property} />
              <DetailRow label="Dates" value={booking.dates} />
              <DetailRow label="Room" value={booking.room} />
              <DetailRow label="Total" value={booking.total} accent />
            </div>

            {/* Add-on (animates in when present) */}
            <AnimatePresence>
              {booking.addOn && (
                <motion.div
                  key="addon"
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 20 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <div className="rounded-card border border-bc-blue/30 bg-bc-blue-light px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg" aria-hidden>
                        ✨
                      </span>
                      <span className="text-sm font-bold text-bc-navy">Added: {booking.addOn}</span>
                    </div>
                    {booking.addOnPrice && (
                      <div className="mt-1 text-meta text-bc-gray-700">{booking.addOnPrice}</div>
                    )}
                    <div className="mt-2 flex items-center justify-between border-t border-bc-blue/20 pt-2">
                      <span className="text-sm font-medium text-bc-gray-700">Updated total</span>
                      <span className="text-base font-bold text-bc-green">{booking.total}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* What's next */}
            <div className="mt-6">
              <div className="text-sm font-bold text-bc-gray-900">What&apos;s next</div>
              <div className="mt-2 flex flex-wrap gap-4">
                <button
                  type="button"
                  className="text-sm font-medium text-bc-blue hover:underline"
                >
                  View in My Trips
                </button>
                <button
                  type="button"
                  className="text-sm font-medium text-bc-blue hover:underline"
                >
                  Print confirmation
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo('home')}
                  className="text-sm font-medium text-bc-blue hover:underline"
                >
                  Continue browsing
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
