import { useCallback, useRef } from 'react';
import type { ScriptMessage, CardData, SiteAction } from '../lib/types';

const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000';

interface BackendChatResponse {
  agent_response: string;
  cards: CardData[];
  site_action: SiteAction | null;
  capability?: string;
  session_id: string;
}

// Live-mode bridge to the Python FastAPI backend, which proxies to the CXAS
// Sessions API. Returns a ScriptMessage so live responses render identically to
// scripted ones.
export function useCXASAgent() {
  const sessionId = useRef<string | null>(null);

  const initSession = useCallback(async (): Promise<string> => {
    const res = await fetch(`${API_URL}/api/session`, { method: 'POST' });
    if (!res.ok) throw new Error(`session init failed: ${res.status}`);
    const data = await res.json();
    sessionId.current = data.session_id;
    return data.session_id;
  }, []);

  const sendMessage = useCallback(
    async (message: string, channel: 'chat' | 'voice' = 'chat'): Promise<ScriptMessage> => {
      let sid = sessionId.current;
      if (!sid) sid = await initSession();

      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sid, message, channel }),
      });
      if (!res.ok) throw new Error(`chat failed: ${res.status}`);
      const data: BackendChatResponse = await res.json();

      return {
        role: 'agent',
        text: data.agent_response,
        delay: 0,
        capability: data.capability || 'Live',
        isVoice: channel === 'voice',
        card: data.cards && data.cards.length > 0 ? data.cards[0] : undefined,
        siteAction: data.site_action || undefined,
      };
    },
    [initSession],
  );

  const checkHealth = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/api/health`);
      if (!res.ok) return false;
      const data = await res.json();
      return Boolean(data.cxas_reachable);
    } catch {
      return false;
    }
  }, []);

  return { sendMessage, initSession, checkHealth };
}
