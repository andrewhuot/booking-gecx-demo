import { useCallback, useEffect, useRef, useState } from 'react';

interface UseSpeechSynthesis {
  speak: (text: string) => void;
  cancel: () => void;
  speaking: boolean;
  supported: boolean;
}

// Preferred English voices, best first. We pick the first one that's available.
const PREFERRED_VOICES = [
  'Google UK English Female',
  'Google US English',
  'Samantha',
  'Microsoft Aria Online (Natural) - English (United States)',
  'Microsoft Jenny Online (Natural) - English (United States)',
  'Karen',
  'Moira',
  'Tessa',
];

// Thin wrapper around the Web Speech API (`window.speechSynthesis`). Speaks the
// given text aloud with a good English voice, exposes a `speaking` flag for
// driving visualizers, and gracefully no-ops when the API is unavailable.
export function useSpeechSynthesis(): UseSpeechSynthesis {
  const supported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;

  const [speaking, setSpeaking] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Resolve the best available voice. Voices can load asynchronously, so we
  // listen for `voiceschanged` as well as reading them immediately.
  useEffect(() => {
    if (!supported) return;

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return;

      const byName = PREFERRED_VOICES.map((name) =>
        voices.find((v) => v.name === name),
      ).find(Boolean);

      const englishLocal =
        voices.find((v) => v.lang.startsWith('en') && v.localService) ?? null;
      const anyEnglish = voices.find((v) => v.lang.startsWith('en')) ?? null;

      voiceRef.current = byName ?? englishLocal ?? anyEnglish ?? voices[0];
    };

    pickVoice();
    window.speechSynthesis.addEventListener('voiceschanged', pickVoice);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', pickVoice);
    };
  }, [supported]);

  // Stop any in-flight speech when the hook unmounts.
  useEffect(() => {
    if (!supported) return;
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [supported]);

  const cancel = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback(
    (text: string) => {
      if (!supported || !text.trim()) return;

      // Replace whatever is currently being said with the new line.
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      if (voiceRef.current) utterance.voice = voiceRef.current;
      utterance.lang = voiceRef.current?.lang ?? 'en-US';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [supported],
  );

  return { speak, cancel, speaking, supported };
}
