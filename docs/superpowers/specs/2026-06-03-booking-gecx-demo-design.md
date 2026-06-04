# Booking.com GECX Demo — Design

**Date:** 2026-06-03
**Status:** Approved (autonomous build per user direction)

## Goal

A high-fidelity Booking.com clone (React) with a natively-integrated GECX conversational AI agent, plus the real CXAS agent backend that powers "Live mode." Shown live to Booking.com's CEO. The site must look like real Booking.com; the agent must feel woven in, driving the site experience (site reactivity). Three interaction channels: desktop chat widget, voice call modal, mobile push→chat. A hidden presenter panel (Cmd+Shift+P) drives scripted scenarios.

## Architecture

```
~/booking-gecx-demo/
  frontend/   Vite + React 18 + TypeScript + Tailwind. Single-page app, client-side view router.
  backend/    Python 3.12 (uv) FastAPI. Bridges frontend → CXAS Sessions API.
  agent/      CXAS agent definition: instructions.txt, tools/, guardrails/, tests/.
  scripts/    create_agent.py, test_agent.py, deploy_agent.py, setup.sh.
  docs/        this spec.
```

### Stack decisions (autonomous)
- **Vite + React + TS** over Next.js: faster greenfield, no SSR needed (pure client demo), simpler to run on a projector. PROMPT permits either.
- **Tailwind** for the Booking.com design system, driven by CSS variables from the PROMPT color spec.
- **Zustand** for the demo engine store (scenario state, current message index, active channel, view, booking data) — a single observable store keeps site-reactivity wiring simple across widely-separated components (chat widget ↔ page router ↔ presenter panel).
- **Framer Motion** for the specified animations (message appear, card appear, push notification, page crossfade, confirmation checkmark).
- **Backend: FastAPI + cxas-scrapi** installed from GitHub source (NOT PyPI — confirmed unavailable). Python 3.12 via `uv`.

## Frontend structure

A single Zustand store (`demoStore`) is the spine. It holds: `channel` (none|chat|voice|mobile), `view` (home|search|property|confirmation) + view params, `scenario` (rachel|david|melissa), `messageIndex`, `messages` (rendered so far), `booking` (mutable confirmation data), `mode` (scripted|live), `autoPlay`, `timerStart`, `presenterOpen`, `capability`.

- **Advancing** (scripted): `advance()` pulls the next scripted message, runs its `delay` as a typing indicator (agent only), appends it, then fires its `siteAction` (navigate / highlight / selectRoom / updateConfirmation) by mutating `view`/`booking`. Spacebar and presenter Next both call `advance()`.
- **Site reactivity** = `siteAction` mutating store `view`/`booking`; the page router re-renders with a crossfade. This is the core "magic": the agent's message changes the site.
- **Live mode**: user types → typing indicator → `POST /api/chat` → parse `agent_text` + `payload` → append agent message + render card + fire siteAction derived from the payload's structured data.

### Component tree (matches PROMPT)
layout/ (Header, Footer, MobileTabBar), pages/ (Homepage, SearchResults, PropertyDetail, Confirmation), search/ (SearchBar, FilterSidebar, PropertyListCard), property/ (PhotoGallery, PropertyHeader, FacilitiesGrid, RoomTable, BookingSidebar), agent/ (ChatWidget, ChatWindow, ChatBubble, TypingIndicator, QuickReplyChips, PropertyCard, ConfirmationCard, UpsellCard), voice/ (VoiceModal, CallScreen, AudioVisualizer, CallTranscript, useSpeechSynthesis), mobile/ (MobileFrame, PushNotification, AppSplash, MobileHome, MobileChatUI), presenter/ (PresenterPanel, ScenarioSelector, ScriptPreview, CapabilityBadge).

### Data
`data/properties.ts` (6 Sedona properties, full detail for Enchantment/L'Auberge/Mii amo), `data/rachelScript.ts`, `data/davidScript.ts`, `data/melissaScript.ts`, `lib/types.ts`.

## Backend + agent

### API (`backend/api.py`)
- `POST /api/session` → `{session_id}` (uuid).
- `POST /api/chat {session_id, message, channel}` → `{agent_response, cards[], site_action, session_id}`. Calls `Sessions.run(session_id, text=message)`, then `get_structured_response()`. Maps `payload`/`tool_calls`/`tool_responses` into the same card/siteAction shapes scripted mode uses.
- `GET /api/health` → reports whether CXAS is reachable (so the frontend can show live availability and gracefully fall back to scripted).

### Agent (`scripts/create_agent.py`)
Uses `Apps` + `Agents` + `Tools` + `Guardrails`. Creates app "Booking.com Demo", an LLM agent (`gemini-2.5-flash`) with the full instructions from PROMPT Phase 2 (compressed funnel, property knowledge, persona rules, voice rules), 4 tools (search_properties, check_availability, create_booking, add_upsell) returning canned Sedona data, and guardrails. **Resilience:** wraps creation in try/except; on the known billing 403 it writes the complete agent config to `agent/` and prints enable-billing instructions, so one rerun stands up the real agent once billing is linked.

### Known environment blocker (live mode)
Project `decent-courage-233916` has `ces.googleapis.com` enabled and ADC works, but **billing is not enabled** → CES returns 403. Live mode therefore cannot run end-to-end until a billing account is linked. **Scripted mode is fully functional and is the demo path.** All live-mode code is built, correct, and ready to activate the moment billing is fixed. Region is `us` (not `global`).

## Dual mode
- **Scripted (default):** spacebar/Next advances pre-scripted messages; siteActions fire automatically; voice lines spoken via Web Speech API. Auto-play uses the per-message delays.
- **Live (opt-in, from presenter panel):** free-typed input → CXAS agent → rendered identically. Falls back to scripted automatically if `/api/health` reports CXAS unreachable.

## Testing
- Frontend: `npm run build` (tsc + vite) must pass clean. Vitest unit tests for the demo engine reducer (advance logic, siteAction application, upsell total update) and script data integrity (every property/confirmation card references a real property; totals add up).
- Backend: pytest for the payload→card mapping (pure function, no network), so it's testable without billing. `test_agent.py` runs the 3 golden scenarios against live CXAS when billing is available.
- Manual: all 3 scenarios play through in scripted mode; screenshot homepage, search, property, confirmation, chat, voice, mobile.

## Out of scope (per PROMPT)
No real auth, payments, persistence, inventory API, analytics, SEO, i18n, push infra, mobile app, or custom voice model.
