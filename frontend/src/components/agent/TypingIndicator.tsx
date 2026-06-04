// Three-dot "agent is typing" indicator, styled to match an agent bubble.
export function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 animate-msg-in">
      {/* Agent avatar */}
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bc-navy text-sm text-white"
        aria-hidden
      >
        ✦
      </div>
      <div
        className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-bc-gray-200 bg-white px-3.5 py-3 shadow-card"
        role="status"
        aria-label="Assistant is typing"
      >
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-2 w-2 rounded-full bg-bc-gray-300 animate-dot-pulse"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
