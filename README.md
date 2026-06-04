# Booking.com GECX Demo

A demo of an AI travel concierge embedded in a Booking.com-style site. The agent
takes a traveler from a vague intent ("I need to get away") to a confirmed
booking and one tasteful upsell — and **drives the website as it talks** (it
recommends a property and the search page highlights it, checks availability and
the property page opens, books and the confirmation page appears).

It runs in two modes:

- **Scripted** (default) — a curated, fully offline walkthrough of three
  scenarios (Rachel / David / Melissa). No cloud access required.
- **Live** — the chat talks to a **real Google CX Agent Studio (CES/CXAS) agent**
  via the [`cxas-scrapi`](https://github.com/GoogleCloudPlatform/cxas-scrapi) SDK.
  The agent calls real tools (`search_properties`, `check_availability`,
  `create_booking`, `add_upsell`) and the structured responses drive the cards
  and the on-screen navigation.

## Architecture

```
Frontend (React + Vite + Zustand)        Backend (FastAPI)              Google CXAS (ces.googleapis.com)
─────────────────────────────────        ─────────────────              ────────────────────────────────
chat widget / presenter toggle  ──POST──▶ /api/chat
  useCXASAgent hook                         CXASClient.run_turn  ──────▶  Sessions.run(session_id, text)
                                                                           └─ LLM agent + 4 python tools
                                            map_structured_response ◀────  get_structured_response()
  renders card + drives site   ◀──JSON──   {agent_response, cards, site_action}
```

- `frontend/` — the site + chat/voice/mobile surfaces and the demo engine.
- `backend/` — FastAPI bridge (`/api/session`, `/api/chat`, `/api/health`) that
  proxies to CXAS and maps its structured response to the frontend's card shape.
- `agent/cxas_app/booking-concierge/` — the **deployable CXAS app** (the agent,
  its instruction, and the 4 tools) that `scripts/create_agent.py` pushes live.

## Prerequisites

- **Python 3.12** and [`uv`](https://docs.astral.sh/uv/) (for the backend venv).
- **Node 18+** and npm (for the frontend).
- **Live mode only:** the [`gcloud` CLI](https://cloud.google.com/sdk/docs/install)
  and a GCP project with the **CES API** (`ces.googleapis.com`) enabled, plus
  Application Default Credentials.

## Quickstart

```bash
# 1. Backend deps + venv (creates backend/.venv, installs cxas-scrapi, seeds .env)
./scripts/setup.sh

# 2. Backend API
backend/.venv/bin/python -m uvicorn backend.api:app --port 8000

# 3. Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

Open the URL Vite prints (**http://localhost:3000**). The backend serves on
**http://localhost:8000** and starts in scripted mode unless you set
`DEMO_MODE=live` (or flip the toggle in the UI). Stop either server with Ctrl-C
(or `pkill -f "uvicorn backend.api:app"` / `pkill -f vite`).

- **Scripted demo:** press **⌘⇧P** for the presenter panel, pick a scenario
  (or **⌘⇧1/2/3**), and press **Space** to advance. Works with no cloud setup.
- **Live demo:** see the next section to provision an agent, then in the presenter
  panel flip the **scripted → live** toggle and chat with the agent. The toggle's
  indicator turns green only when the backend reports CXAS reachable
  (`GET /api/health`).

Run the tests anytime (no cloud needed):

```bash
backend/.venv/bin/python -m pytest backend/tests -q     # backend
cd frontend && npm run test:run                         # frontend
```

## Point this at your own GCP project

Everything is environment-driven — **no code edits needed** to target a different
project or run your own independent copy of the agent.

1. **Authenticate** to your project and enable the CES API:

   ```bash
   gcloud auth login
   gcloud auth application-default login
   gcloud config set project YOUR_PROJECT_ID
   gcloud services enable ces.googleapis.com
   # Optional, only for the voice scenario's TTS:
   # gcloud services enable texttospeech.googleapis.com
   ```

2. **Configure** `.env` (copy the template if you haven't):

   ```bash
   cp .env.example .env      # setup.sh also does this
   ```

   Set at least:

   ```ini
   GCP_PROJECT_ID=your-project-id
   GCP_PROJECT_NUMBER=your-project-number   # shown by: gcloud projects describe your-project-id
   GCP_LOCATION=us                          # CES region; "global" returns 404
   ```

   Optionally rename the deployed app so it doesn't collide with another copy:

   ```ini
   CXAS_APP_DISPLAY_NAME=My Concierge
   CXAS_APP_ID=my-concierge
   CXAS_MODEL=gemini-2.5-flash
   ```

3. **Provision the agent** (lints the app tree, pushes it, and writes
   `CXAS_APP_NAME` back into `.env`):

   ```bash
   backend/.venv/bin/python scripts/create_agent.py
   ```

   - Preview without touching the cloud: `scripts/create_agent.py --dry-run`
   - Override any setting per run instead of editing `.env`:

     ```bash
     backend/.venv/bin/python scripts/create_agent.py \
       --project-id another-project --display-name "Another Concierge" --app-id another-concierge
     ```

   Re-running is idempotent: if an app with that display name already exists, it's
   overwritten in place.

4. **Smoke-test** the live agent, then run the demo:

   ```bash
   backend/.venv/bin/python scripts/test_agent.py                # one scenario
   backend/.venv/bin/python scripts/test_agent.py --all          # all three
   DEMO_MODE=live backend/.venv/bin/python -m uvicorn backend.api:app --port 8000
   ```

That's it — the backend reads `CXAS_APP_NAME` from `.env`, and the presenter
panel's **live** toggle now talks to *your* agent.

### Configuration reference

| Variable | Used by | Purpose |
|---|---|---|
| `GCP_PROJECT_ID` | script + backend | Target GCP project (required for live mode). |
| `GCP_PROJECT_NUMBER` | backend | Project number (appears in the app resource path). |
| `GCP_LOCATION` | script + backend | CES region. Use `us`. |
| `CXAS_APP_NAME` | backend | Deployed app resource path. **Written by `create_agent.py`** — leave blank initially. |
| `CXAS_APP_DISPLAY_NAME` / `CXAS_APP_ID` / `CXAS_MODEL` | script | Name / id / model for the app `create_agent.py` provisions (CLI-overridable). |
| `CXAS_REQUESTS_PER_MINUTE` | backend | Client-side pacing for the CES token quota (default 6). |
| `DEMO_MODE` | backend | `scripted` (default) or `live`. |
| `VITE_API_URL` / `VITE_DEMO_MODE` | frontend | Backend URL and the UI's initial mode. |

`.env` is gitignored. Shell environment variables override `.env`. Scripted mode
needs none of the GCP settings.

## Notes & limits

- **Token quota.** A new project's default CES `RunSession LLM tokens` quota is
  ~1,000/min; the concierge prompt is large, so rapid back-to-back live turns can
  hit `429`. The backend paces requests (`CXAS_REQUESTS_PER_MINUTE`) and retries
  `429`s with backoff. For snappy multi-turn demos, request a quota increase for
  `ces.googleapis.com` (region `us`) on your project, or shorten
  `agent/cxas_app/booking-concierge/agents/Concierge/instruction.txt`.
- **Voice** in the browser uses Web Speech; the HTTP bridge itself is text-only
  (audio streaming is out of scope), so the voice scenario runs as text turns.
- **Resilience.** `/api/chat` never returns 500 — on any CXAS problem it returns
  a friendly message so the UI can fall back to scripted mode.

## Repository layout

```
agent/cxas_app/booking-concierge/   Deployable CXAS app (agent + 4 tools)
agent/agent_config.example.json     Template; create_agent.py writes a gitignored agent_config.json on deploy
backend/                            FastAPI bridge + config + tests
frontend/                           React/Vite site, chat/voice/mobile, demo engine
scripts/setup.sh                    Backend venv + deps + .env bootstrap
scripts/create_agent.py             Provision/deploy the agent (env-driven, CLI-overridable)
scripts/test_agent.py               Live smoke test of the golden scenarios
docs/superpowers/                   Design spec + implementation plan
```
