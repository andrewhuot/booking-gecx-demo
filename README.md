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
  `prepare_checkout`, `create_booking`, `add_upsell`) and the structured
  responses drive the cards and the on-screen navigation.

## Architecture

```
Frontend (React + Vite + Zustand)        Backend (FastAPI)              Google CXAS (ces.googleapis.com)
─────────────────────────────────        ─────────────────              ────────────────────────────────
chat widget / presenter toggle  ──POST──▶ /api/chat
  useCXASAgent hook                         CXASClient.run_turn  ──────▶  Sessions.run(session_id, text)
                                                                           └─ LLM agent + 5 python tools
                                            map_structured_response ◀────  get_structured_response()
  renders card + drives site   ◀──JSON──   {agent_response, cards, site_action}
```

- `frontend/` — the site + chat/voice/mobile surfaces and the demo engine.
- `backend/` — FastAPI bridge (`/api/session`, `/api/chat`, `/api/health`) that
  proxies to CXAS and maps its structured response to the frontend's card shape.
- `agent/cxas_app/booking-concierge/` — the **deployable CXAS app** (the agent,
  its instruction, and the 5 tools) that `scripts/create_agent.py` pushes live.

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

## How to run the demo

Pick one command. Each one starts on the fake Google Search page. Click the
Booking.com sponsored result to enter the warm-start chat, then use the demo
message script below.

```bash
# Mock/offline demo.
# Opens http://127.0.0.1:3000/google
./scripts/run_turnkey_demo.sh --mode mock

# Live CXAS demo after .env already has CXAS_APP_NAME.
# Opens http://127.0.0.1:3000/google/live
./scripts/run_turnkey_demo.sh --mode live

# First live run on a new GCP project.
# Prepares GCP, provisions the agent, then opens /google/live.
./scripts/run_turnkey_demo.sh --mode live --prepare-gcp --provision-agent --project-id YOUR_PROJECT_ID
```

Stop the demo with `Ctrl-C` in the launcher terminal.

Useful launcher variants:

```bash
# Offline scripted flow; opens /google. This is the default.
./scripts/run_turnkey_demo.sh --mode mock

# Live GECX/CXAS flow; prepares GCP, provisions the agent, and opens /google/live.
./scripts/run_turnkey_demo.sh --mode live --prepare-gcp --provision-agent --project-id YOUR_PROJECT_ID

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

## New computer + new GCP project

Use this checklist when you move the repo to another machine and want the live
demo to use a fresh GCP project.

1. Install the basics:

   - Python 3.12
   - [`uv`](https://docs.astral.sh/uv/)
   - Node 18+ and npm
   - [Google Cloud CLI](https://cloud.google.com/sdk/docs/install)

2. Sign in to Google Cloud on the new computer:

   ```bash
   gcloud auth login
   gcloud auth application-default login
   ```

3. Run the live-demo setup from the repo root. Replace `YOUR_PROJECT_ID` with
   the project you want to use:

   ```bash
   ./scripts/run_turnkey_demo.sh \
     --mode live \
     --prepare-gcp \
     --provision-agent \
     --project-id YOUR_PROJECT_ID
   ```

   This single command installs dependencies, creates `.env`, points gcloud at
   your project, enables `ces.googleapis.com`, finds the project number,
   provisions the CXAS app, starts the backend and frontend, and opens:
   `http://127.0.0.1:3000/google/live`.

4. Demo it. On the Google page, click the Booking.com sponsored result, then use
   the message script below.

The repo assumes a faster project and defaults to:

```ini
CXAS_REQUESTS_PER_MINUTE=12
```

If you see `429` quota responses, set that value to `6` in `.env`, wait for the
quota window to clear, and rerun the launcher.

To prepare the computer and provision the agent without starting the demo:

```bash
./scripts/run_turnkey_demo.sh \
  --mode live \
  --prepare-gcp \
  --provision-agent \
  --project-id YOUR_PROJECT_ID \
  --setup-only
```

If your organization requires an admin to enable APIs, ask them to enable
`ces.googleapis.com`, then rerun the command without `--prepare-gcp`.

## Desktop demo script

Use this script for the full desktop flow from fake Google Search through saved
payment checkout. It works in both mock mode (`/google`) and live mode
(`/google/live`).

1. Open the entry page:

   - Mock/offline: `http://127.0.0.1:3000/google`
   - Live GECX/CXAS: `http://127.0.0.1:3000/google/live`

2. On the fake Google Search page, click the sponsored Booking.com result:
   **Booking.com — July 4th Weekend Getaways**.

3. The Booking.com homepage opens with the assistant already expanded. Send
   these messages in order:

   ```text
   Around $2,000 total.
   We're leaving from New York City, 2 people.
   Beach and coast.
   Martha's Vineyard looks good.
   Choose Summercamp Hotel.
   Pick the JetBlue nonstop flight.
   Add the sunset sailing cruise.
   Book this trip.
   Use my saved Visa and confirm
   ```

4. Expected checkpoints:

   - The warm-start message mentions July 4th and America's 250th birthday.
   - `Beach and coast.` renders three destination cards.
   - `Martha's Vineyard looks good.` renders hotel cards.
   - `Choose Summercamp Hotel.` renders flight cards.
   - `Pick the JetBlue nonstop flight.` renders experience cards.
   - `Add the sunset sailing cruise.` summarizes the package at `$1,561`.
   - `Book this trip.` renders the `Complete booking` payment panel.
   - `Use my saved Visa and confirm` creates confirmation `BK-4JUL-29571`.

In live mode, the model may occasionally ask for departure city and traveler
count as separate prompts. If that happens, use these two messages instead of
the combined second line:

```text
I'm in New York City.
2 people.
```

## Point this at your own GCP project

Everything is environment-driven — **no code edits needed** to target a different
project or run your own independent copy of the agent.

1. **Authenticate** to your project:

   ```bash
   export PROJECT_ID=YOUR_PROJECT_ID
   gcloud auth login
   gcloud auth application-default login
   ```

2. **Run the turnkey live launcher**. It installs dependencies, writes the GCP
   values into `.env`, sets the gcloud project/quota project, enables the CES
   API, derives the project number, provisions the CXAS app, starts both local
   servers, and opens `/google/live`:

   ```bash
   ./scripts/run_turnkey_demo.sh \
     --mode live \
     --prepare-gcp \
     --provision-agent \
     --project-id "$PROJECT_ID"
   ```

   To deploy a separately named copy of the app, add:

   ```bash
   --display-name "My Concierge" --app-id my-concierge --model gemini-2.5-flash
   ```

   Preview the CXAS provisioning commands without pushing the app or changing
   GCP service state:

   ```bash
   ./scripts/run_turnkey_demo.sh \
     --mode live \
     --dry-run-provision \
     --project-id "$PROJECT_ID" \
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
| `CXAS_REQUESTS_PER_MINUTE` | backend | Client-side pacing for the CES token quota (default 12; lower to 6 if you see 429s). |
| `DEMO_MODE` | backend | `scripted` (default) or `live`. |
| `VITE_API_URL` / `VITE_DEMO_MODE` | frontend | Backend URL and the UI's initial mode. |

`.env` is gitignored. Shell environment variables override `.env`. Scripted mode
needs none of the GCP settings.

## Notes & limits

- **Token quota.** The repo defaults `CXAS_REQUESTS_PER_MINUTE=12`, assuming a
  project with improved CES quota. A new project's default CES `RunSession LLM
  tokens` quota is often lower; the concierge prompt is large, so rapid
  back-to-back live turns can hit `429`. The backend paces requests and retries
  `429`s with backoff. If you still see rate limits, lower
  `CXAS_REQUESTS_PER_MINUTE` to `6`, request a quota increase for
  `ces.googleapis.com` (region `us`), or shorten
  `agent/cxas_app/booking-concierge/agents/Concierge/instruction.txt`.
- **Voice** in the browser uses Web Speech; the HTTP bridge itself is text-only
  (audio streaming is out of scope), so the voice scenario runs as text turns.
- **Resilience.** `/api/chat` never returns 500 — on any CXAS problem it returns
  a friendly message so the UI can fall back to scripted mode.

## Repository layout

```
agent/cxas_app/booking-concierge/   Deployable CXAS app (agent + 5 tools)
agent/agent_config.example.json     Template; create_agent.py writes a gitignored agent_config.json on deploy
backend/                            FastAPI bridge + config + tests
frontend/                           React/Vite site, chat/voice/mobile, demo engine
scripts/setup.sh                    Backend venv + deps + .env bootstrap
scripts/run_turnkey_demo.sh         One-command desktop demo launcher
scripts/create_agent.py             Provision/deploy the agent (env-driven, CLI-overridable)
scripts/test_agent.py               Live smoke test of the golden scenarios
docs/superpowers/                   Design spec + implementation plan
```
