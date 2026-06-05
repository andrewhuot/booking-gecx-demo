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
./scripts/run_turnkey_demo.sh
```

That one command installs missing dependencies, creates `.env` if needed, starts
the backend and frontend, and opens the desktop fake Google page at `/google`.
Click the Booking.com sponsored result to enter the warm-start July 4 desktop
chat flow. Press Ctrl-C in the launcher terminal to stop both servers.

Useful launcher variants:

```bash
# Offline scripted flow; opens /google. This is the default.
./scripts/run_turnkey_demo.sh --mode mock

# Live GECX/CXAS flow; opens /google/live after provisioning the agent.
./scripts/run_turnkey_demo.sh --mode live --provision-agent --project-id YOUR_PROJECT_ID

# Keep the browser closed and print the URL instead.
./scripts/run_turnkey_demo.sh --no-open

# If port 3000 is busy, choose an allowed frontend port explicitly.
./scripts/run_turnkey_demo.sh --frontend-port 3001
```

The launcher writes logs to `.demo/backend.log` and `.demo/frontend.log`. It
sets `VITE_API_URL` for Vite and sets `DEMO_MODE` / `VITE_DEMO_MODE` to match the
selected path-based mode.

Manual startup is still available when you want separate terminals:

```bash
./scripts/setup.sh
backend/.venv/bin/python -m uvicorn backend.api:app --port 8000
cd frontend && npm install && npm run dev
```

Open **http://localhost:3000/google** for the mock ad-to-chat flow, or
**http://localhost:3000/google/live** for the live-mode ad-to-chat flow.

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
   export PROJECT_ID=YOUR_PROJECT_ID
   gcloud auth login
   gcloud auth application-default login
   gcloud config set project "$PROJECT_ID"
   gcloud auth application-default set-quota-project "$PROJECT_ID"
   gcloud services enable ces.googleapis.com
   export PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
   # Optional, only for the voice scenario's TTS:
   # gcloud services enable texttospeech.googleapis.com
   ```

2. **Run the turnkey live launcher**. It installs dependencies, writes the GCP
   values into `.env`, provisions the CXAS app, starts both local servers, and
   opens `/google/live`:

   ```bash
   ./scripts/run_turnkey_demo.sh \
     --mode live \
     --provision-agent \
     --project-id "$PROJECT_ID" \
     --project-number "$PROJECT_NUMBER"
   ```

   To deploy a separately named copy of the app, add:

   ```bash
   --display-name "My Concierge" --app-id my-concierge --model gemini-2.5-flash
   ```

   Preview the provisioning commands without touching the cloud:

   ```bash
   ./scripts/run_turnkey_demo.sh \
     --mode live \
     --dry-run-provision \
     --project-id "$PROJECT_ID" \
     --project-number "$PROJECT_NUMBER" \
     --setup-only
   ```

3. **Manual configuration path** (optional). If you prefer to edit `.env`
   yourself, copy the template:

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

4. **Manual agent provisioning** (optional). The launcher does this for you when
   you pass `--provision-agent`. To run it yourself, use the command below. It
   lints the app tree, pushes it, and writes `CXAS_APP_NAME` back into `.env`:

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

5. **Smoke-test** the live agent, then run the demo:

   ```bash
   backend/.venv/bin/python scripts/test_agent.py                # one scenario
   backend/.venv/bin/python scripts/test_agent.py --all          # all three
   ./scripts/run_turnkey_demo.sh --mode live --skip-install
   ```

That's it — the backend reads `CXAS_APP_NAME` from `.env`, and `/google/live`
now talks to *your* agent through the same desktop chat surface.

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
scripts/run_turnkey_demo.sh         One-command desktop demo launcher
scripts/create_agent.py             Provision/deploy the agent (env-driven, CLI-overridable)
scripts/test_agent.py               Live smoke test of the golden scenarios
docs/superpowers/                   Design spec + implementation plan
```
