import { useDemoStore } from '../../store/demoStore';

const CHIPS = ['Find a stay', 'Manage booking', 'Get recommendations'] as const;

interface QuickReplyChipsProps {
  // Optional submit handler (used in live mode to send the chip text as a message).
  onSelect?: (text: string) => void;
}

// Suggested first-tap prompts shown before the user has sent anything.
export function QuickReplyChips({ onSelect }: QuickReplyChipsProps) {
  const mode = useDemoStore((s) => s.mode);

  const handleClick = (text: string) => {
    if (mode === 'live') {
      onSelect?.(text);
    } else {
      // Scripted mode: chips act as a generic "send" that plays the next line.
      useDemoStore.getState().advance();
    }
  };

  return (
    <div className="flex flex-wrap gap-2 px-1 pt-1">
      {CHIPS.map((chip) => (
        <button
          key={chip}
          type="button"
          onClick={() => handleClick(chip)}
          className="rounded-full border border-bc-blue/30 bg-bc-blue-light px-3.5 py-1.5 text-meta font-medium text-bc-blue transition-colors hover:bg-bc-blue hover:text-white"
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
