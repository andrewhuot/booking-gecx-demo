# Live CXAS Integration — Design

**Date:** 2026-06-04
**Status:** Approved (pending spec review)
**Supersedes the "billing blocked" assumption in:** `2026-06-03-booking-gecx-demo-design.md`, `backend/cxas_client.py`, `scripts/create_agent.py`

## Goal

Wire the Booking.com GECX demo to a **real, non-mocked** CX Agent Studio agent via SCRAPI
(`GoogleCloudPlatform/cxas-scrapi`), end-to-end: deploy the agent to live CXAS, bridge the
FastAPI backend to it, prove a real multi-turn session works, and let the frontend toggle
between the curated scripted demo and live CXAS.

## Reality correction (verified 2026-06-04)

The committed code asserts the GCP project has billing disabled and live mode is blocked.
**This is stale.** Verified against project `decent-courage-233916` (number `1078946815141`):

- `ces.googleapis.com` (the API backing CX Agent Studio / Customer Engagement Suite) is **ENABLED**.
- `dialogflow.googleapis.com` and `texttospeech.googleapis.com` were **successfully enabled** this
  session (the enable operations completed with no error — which is impossible without billing).
- Application Default Credentials (ADC) authenticate fine; an access token prints and
  `GET ces.googleapis.com/v1beta/projects/.../locations/us/apps` returns real data.
- Region is **`us`** (`global` → 404 for CES).

So this is a *finish-and-verify-the-real-thing* task, not a *work-around-billing* task. The
"billing disabled" copy in `cxas_client.py` / `create_agent.py` will be corrected.

### Orphaned apps (left as-is, per decision)

Two half-built apps exist from an earlier session; **neither is runnable** and both are left untouched:
- `booking-demo` (`aaffa845-…`): empty "Root agent", no tools, no deployment.
- `Booking Sedona Reset Demo` (`booking-sedona-reset-demo`): 10 tools, but no agent and no deployment.

We deploy a **fresh, cleanly-named app** from the repo's version-controlled definition.

## Verified SCRAPI API surface (the ground truth the rewrite targets)

Confirmed by reading the cloned SDK source (not the stale getting-started notebook):

- Constructors: `Apps(project_id, location)`; `Agents(app_name)`, `Tools(app_name)`,
  `Guardrails(app_name)`, `Sessions(app_name, deployment_id=None)` — agent-scoped classes take the
  full `app_name` resource path. Auth via ADC automatically.
- `Sessions.run(session_id, text=None, modality=Modality.TEXT, …)` → proto `RunSessionResponse`.
  `Modality` lives at `cxas_scrapi.core.sessions.Modality` (`TEXT="text"`, `AUDIO="audio"`).
  There is **no** `run_turn`/`detect_intent`. `deployment_id` is optional (omit → draft/latest).
- `Sessions.get_structured_response(resp)` → `{agent_text, tool_calls:[{action,args}],
  tool_responses:[{action:"_response:NAME",response}], agent_transfer, session_ended, citations,
  payload}`. **`payload` is the agent's first custom payload** and is populated only from
  `ResponseMessage.payload` parts (emitted by callbacks via `Part.from_json(...)`), NOT from raw
  tool return dicts (those land in `tool_responses[].response`).
- Deploy a whole app from a local directory = **`cxas push --app-dir <dir>`** (CLI). `cxas create`
  only makes an empty shell; `cxas run` runs evals, not chat. SDK equivalent:
  `Apps.import_as_new_app(display_name, local_path=<zip>)`.
- App dir layout: top-level `app.json` (`{name, displayName, rootAgent, variableDeclarations}`);
  `agents/<Name>/<Name>.json` + `instruction.txt` + callback `python_code.py`;
  `tools/<name>/<name>.json` + `python_function/python_code.py`. Tool params are inferred from the
  Python signature + type hints; the `description` is the LLM-facing declaration.

**Assessment of existing backend code:** `backend/cxas_client.py` and `backend/mapping.py` are
*already substantially correct* against this surface (Sessions.run + get_structured_response shapes
match, and `mapping.py` handles both the `payload` path and a tool-response synthesis fallback).
What is wrong: (1) the `agent/tools/*.json` are OpenAI-style schemas, not CXAS `python_function`
tools; (2) `create_agent.py` provisions piecemeal instead of via `cxas push`; (3) the
billing-blocked messaging. The agent definition and provisioning are the real work.

## Architecture

```
Frontend (React, Vite)            Backend (FastAPI)              Google CXAS (ces.googleapis.com, region us)
──────────────────────            ─────────────────              ───────────────────────────────────────────
PresenterPanel toggle ──setMode──▶ store.mode = 'live'
ChatWindow.submitLive  ──POST───▶  /api/chat
  useCXASAgent.sendMessage           CXASClient.run_turn   ──▶    Sessions.run(session_id, text, modality)
                                                                   └─ LLM agent (gemini-2.5-flash), 4 tools
                                                                      after_tool callback → Part.from_json(payload)
                                   map_structured_response  ◀──    get_structured_response()
                                     → {agent_response,              → {agent_text, tool_calls,
                                        cards, site_action}             tool_responses, payload}
  pushAgentMessage     ◀──JSON───   ChatResponse
   renders card +
   drives site nav (applySiteAction)
useCXASAgent.checkHealth ─GET────▶ /api/health → {cxas_reachable} ─▶ store.setLiveAvailable(...)
```

## Components

### 1. App definition — pushable CXAS app tree at `agent/cxas_app/booking-concierge/`

- `app.json`: `{name: <uuid>, displayName: "Booking.com Concierge Demo", rootAgent: "Concierge",
  variableDeclarations: []}` (single LLM agent — no slot-filling vars).
- `agents/Concierge/Concierge.json`: `{name, displayName: "Concierge",
  instruction: "agents/Concierge/instruction.txt",
  tools: ["search_properties","check_availability","create_booking","add_upsell"],
  afterToolCallbacks: [{pythonCode: "agents/Concierge/after_tool_callbacks/after_tool_callbacks_01/python_code.py"}]}`.
- `agents/Concierge/instruction.txt`: the existing concierge persona (ported, lightly trimmed).
- `tools/<tool>/<tool>.json` + `tools/<tool>/python_function/python_code.py` ×4 (real format).
- `agents/Concierge/after_tool_callbacks/.../python_code.py`: small, generic — reads
  `tool_response["payload"]` (a `{action, card, site_action?}` dict the tool returned) and emits it
  via `Part.from_json(json.dumps(payload))` so it surfaces as the structured-response `payload`.

### 2. Tool behavior + data

A shared `_data.py` (imported by each tool — co-located so `cxas push` bundles it under `tools/`)
holds the **same 6 Sedona properties as `frontend/src/data/properties.ts`** (ids, names, prices,
ratings, rooms). Each tool returns plain data **plus** a `payload` shaped exactly as `mapping.py`
expects:

- `search_properties(vibe, budget_per_night?, party?, check_in?, check_out?, location?)` → best-fit
  property + `payload = {action:"search_properties", card:{type:"property", id, name, location,
  rating, ratingLabel, reviews, price:"$339", priceUnit:"/night", tags, cta:"Check Availability"}}`.
- `check_availability(property_id, check_in, check_out)` → room/nights/total +
  `payload = {action:"check_availability", data:{property_id, room_id, room, nightly_rate, nights, total}}`.
- `create_booking(property_id, room_id, check_in, check_out, guest_name, payment_method)` →
  deterministic `confirmation_number` + `payload = {action:"create_booking",
  card:{type:"confirmation", confirmationNumber, property, dates, room, nights, total, status:"Confirmed"}}`.
- `add_upsell(confirmation_number, addon_id)` → updated total + `payload = {action:"add_upsell",
  card:{type:"confirmation_update", confirmationNumber, addOn, addOnPrice, updatedTotal, status:"Updated"}}`.

Confirmation numbers are deterministic (hash of inputs) so reruns and tests are stable. No fabricated
data — all values come from `_data.py`.

### 3. Provisioning — rewrite `scripts/create_agent.py`

Deploy via the `cxas` CLI: lint then push.
```
cxas lint --app-dir agent/cxas_app/booking-concierge
cxas push --app-dir agent/cxas_app/booking-concierge \
  --display-name "Booking.com Concierge Demo" --project-id decent-courage-233916 --location us
```
On success, parse the returned `app_name`, write it to `agent/agent_config.json`
(`provisioned: true`, real `app_name`) and upsert `CXAS_APP_NAME` into `.env`. Idempotent: if an app
with that display name already exists, `--to` overwrite it instead of creating a duplicate. Keep the
graceful error reporting, but correct the (now false) billing narrative.

### 4. Backend corrections — `backend/cxas_client.py`, `backend/config.py`

- `run_turn`: keep `Sessions.run` + `get_structured_response` (already correct). The HTTP bridge is
  **text-only** — `modality` is always `Modality.TEXT` regardless of `channel` (audio uses a separate
  WebSocket bidi path that is out of scope; the voice scenario runs as text turns and the frontend
  speaks the reply via Web Speech). Pass `deployment_id` only if configured.
- `health`: keep the `list_agents()` probe (correct).
- Correct the billing-blocked copy in `_humanize_error` / comments to reflect real failure modes
  (auth, app-not-provisioned, transport) rather than asserting billing is off.
- `config.py`: default `DEMO_MODE` stays `scripted`; `CXAS_APP_NAME` read from `.env` after provisioning.

### 5. Frontend — wire the already-present toggle

The store (`mode`, `setMode`, `liveAvailable`, `setLiveAvailable`, `pushAgentMessage`), the
`useCXASAgent` hook, `ChatWindow.submitLive`, the `PresenterPanel` scripted↔live toggle, and the
`liveAvailable` indicator **already exist**. The only gap: nothing calls `checkHealth()` to set
`liveAvailable`. Add a small effect (App-level or PresenterPanel mount) that calls
`useCXASAgent().checkHealth()` and `setLiveAvailable(result)` once on load (and optionally when the
user flips to live). `VITE_API_URL` already points the hook at the backend.

## Data flow (live turn)

1. User types in `ChatWindow` (live mode) → `submitLive` → `pushUserMessage` + `POST /api/chat`.
2. Backend `CXASClient.run_turn` → `Sessions.run(session_id, text, modality)`.
3. CXAS LLM agent calls a tool; the tool returns data + `payload`; the `after_tool` callback emits the
   `payload` as a `ResponseMessage.payload`.
4. `get_structured_response` returns `{agent_text, tool_calls, tool_responses, payload}`.
5. `map_structured_response` builds `{agent_response, cards, site_action}` (payload-first, tool-response
   fallback).
6. Frontend `pushAgentMessage` renders the card and `applySiteAction` drives navigation/highlight.

## Error handling

- `/api/chat` never 500s: on `CXASUnavailable` it returns HTTP 200 with a friendly message and empty
  cards (already implemented), so the frontend can fall back to scripted instantly.
- Frontend `submitLive` already catches fetch errors and posts a graceful agent message.
- `liveAvailable=false` (health probe fails) → the toggle shows live as unavailable; scripted remains
  the default and always works.
- Provisioning script degrades gracefully and is rerunnable.

## Testing & "done" criteria (full e2e)

1. **Backend unit tests** (`backend/tests/test_mapping.py`) pass — extend with cases for the real
   `payload` shapes the new tools emit, and the tool-response-synthesis fallback.
2. **Tool unit tests** — new `backend`/agent-side tests for the 4 tools' pure logic (correct property
   match, deterministic confirmation numbers, payload shapes) without network.
3. **Live session smoke test** (`scripts/test_agent.py`) — runs at least the Rachel scripted scenario
   (intent → match → book → upsell) against **live CXAS**, prints agent text + mapped cards/site_action,
   and the output is captured as evidence in the final report.
4. **Frontend tests** (existing `demoStore.test.ts`, `scripts.test.ts`) still pass; `tsc` + lint clean.
5. **Manual e2e** — backend running, frontend `npm run dev`, flip to live in the presenter panel,
   `liveAvailable` shows green, send a real message, observe a real card + site navigation. Captured
   via screenshot or described with evidence.

## Out of scope (YAGNI)

- Voice/audio streaming through the HTTP bridge (Web Speech in the frontend stays; backend audio
  modality only if trivial). The voice *scenario* still runs as text turns end-to-end.
- The bella_notte slot-filling DAG framework (overkill for a 4-turn concierge).
- Guardrails as a separate CXAS resource — the persona's guardrail rules stay in the instruction text
  for this demo (can be promoted to a `Guardrails` resource later).
- Versions/deployments — run against draft; add a deployment only if a stable pinned version is needed.
