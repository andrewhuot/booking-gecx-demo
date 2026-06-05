# PLAN.md

## Goal
Build the Part 1 Booking.com conversational demo flow from the supplied script: a fake high-fidelity Google search page leads into a warm-start desktop Booking.com chat experience that can run in mock/scripted mode or through the GECX/CXAS backend.

## Context
- Demo script source: `/Users/andrew/Downloads/booking-ai-agent-demo-script.md`
- Existing frontend app: `frontend/src/App.tsx`
- Demo state and scripted engine: `frontend/src/store/demoStore.ts`
- Shared frontend types: `frontend/src/lib/types.ts`
- Existing chat components: `frontend/src/components/agent/ChatWidget.tsx`, `frontend/src/components/agent/ChatWindow.tsx`, `frontend/src/components/agent/MessageList.tsx`, and card components under `frontend/src/components/agent/`
- Existing mobile frame/chat components: `frontend/src/components/mobile/`
- Existing live-mode hook: `frontend/src/hooks/useCXASAgent.ts`
- Existing backend mapping and tests: `backend/mapping.py`, `backend/tests/test_mapping.py`
- Existing frontend tests: `frontend/src/store/demoStore.test.ts`, `frontend/src/data/scripts.test.ts`, `frontend/src/components/agent/ChatWidget.test.tsx`
- Prior approved autonomous spec: `docs/superpowers/specs/2026-06-03-booking-gecx-demo-design.md`
- Current repo is a React + Vite + TypeScript frontend with Zustand state, plus a FastAPI backend bridge for CXAS.

## Constraints
- Ignore Part 2 voice agent from the script; Part 1 chat flow is the owned scope.
- Preserve the existing Booking.com UI feel and reuse existing chat/card components where practical.
- Keep mock mode fully offline and deterministic.
- Keep live/GECX mode available through the existing backend bridge and render responses through the same chat surface.
- Use a subtle mode switch; path-based mode selection is preferred over visible controls.
- Prefer small, additive, testable changes.
- Do not edit unrelated files.
- Keep the test suite green after each milestone where possible.

## Milestones

### Milestone 1 — Understand and de-risk
Inspect existing routing, demo state, scripts, chat cards, mobile components, live hook, and backend mapping. Confirm how to add a new Part 1 script without breaking Rachel/David/Melissa legacy scenarios. Success is a concrete implementation approach documented here and a failing test that describes the new route/mode warm-start behavior.

### Milestone 2 — Implement the turnkey demo flow
Create a July 4 Booking.com script and route-aware demo bootstrap. Add a fake Google Search screen at `/google` with the specified Booking.com sponsored result. Clicking the ad should navigate to the Booking.com demo path and open the desktop Booking.com site with the right-side chat panel expanded and the warm-start message already loaded. Add path variants for mock and live mode, likely `/demo/mock` and `/demo/live`, while preserving existing presenter-driven behavior for the old demo.

### Milestone 3 — Unify mock and live chat behavior
Ensure the same desktop chat UI works with scripted mock messages and live CXAS responses. For mock mode, drive the supplied script with typed user turns, quick replies, clickable destination/hotel/experience cards, and a checkout confirmation. For live mode, seed the same warm-start first message and route user turns through `useCXASAgent`; keep backend errors friendly.

### Milestone 4 — Harden and verify
Add/adjust Vitest coverage for route parsing, warm-start, script integrity, and core UI behavior. Run frontend tests, lint/build where feasible, then start the dev server and verify `/google`, `/demo/mock`, and `/demo/live` in the browser at desktop and mobile-sized viewports.

### Milestone 5 — Add a turnkey desktop launcher
Create a repo-root script that installs dependencies, configures `.env`, optionally provisions the live CXAS app, starts the backend and frontend, opens the correct fake Google entry route, and stops both servers with Ctrl-C. Document mock and live usage in `README.md`, including how to point the launcher at the user's own GCP project.

## Verification Commands
Run these from the repo root unless noted otherwise.

```bash
python3 -m pytest backend/tests/test_turnkey_launcher.py -q  # PASS: 3 tests
cd frontend && npm run test:run                         # PASS: 8 files, 77 tests
cd frontend && npm run build                            # PASS
cd frontend && npm run lint                             # PASS
backend/.venv/bin/python -m pytest backend/tests -q     # PASS: 39 tests
backend/.venv/bin/cxas lint --app-dir agent/cxas_app/booking-concierge  # PASS: 0 errors, 5 warnings, 1 info
cd frontend && npm run dev -- --host 127.0.0.1 --port 3000
```

## Acceptance Criteria
- `/google` shows a high-fidelity fake Google search results page for "july 4th weekend trips" with the specified Booking.com sponsored result.
- Clicking the sponsored result opens the desktop Booking.com chat demo with the script's warm-start agent message already visible in the right-side chat panel.
- The Part 1 script can be completed in mock mode from ad click through confirmation reference `BK-4JUL-29571`.
- A subtle path-based live mode (`/demo/live`) uses the same chat surface and sends user turns through the existing GECX/CXAS backend hook.
- A subtle path-based mock mode (`/demo/mock`) runs fully offline.
- The Part 1 ad-to-checkout flow does not open the mobile phone frame; the legacy Melissa mobile scenario remains available only through the existing presenter controls.
- The demo intentionally excludes Part 2 voice-agent behavior.
- Relevant frontend and backend tests pass, or any inability to run them is documented.
- `scripts/run_turnkey_demo.sh` can launch the desktop mock flow from one terminal and exposes live-mode provisioning flags for GCP/GECX/CXAS.
- `README.md` explains both one-command mock launch and how to point the same script at a user's own GCP project.

## Progress
- [x] Milestone 1 context scan started
- [x] Milestone 1 complete
- [x] Milestone 2 complete
- [x] Milestone 3 complete
- [x] Milestone 4 complete
- [x] Milestone 5 complete

## Current Update — New Computer GCP Portability

### Goal
Make it easy to copy this repo to a new computer, point it at a new Google Cloud project with better quota, provision the CXAS app, and run the live desktop demo without editing code or hand-populating `.env`.

### Relevant Files
- `scripts/run_turnkey_demo.sh` - one-command launcher and environment writer.
- `README.md` - operator-facing runbook for new machines and new GCP projects.
- `backend/tests/test_turnkey_launcher.py` - shell launcher regression tests.
- `.env.example` - documented configuration defaults.

### Constraints
- Do not commit secrets or local `.env` values.
- Keep GCP changes opt-in because enabling APIs and changing gcloud config are local/cloud side effects.
- Preserve the existing mock path and existing live path.
- Use the existing launcher instead of introducing a competing setup script.

### Acceptance Criteria
- `./scripts/run_turnkey_demo.sh --help` explains `--prepare-gcp`.
- In setup-only mode with a fake `gcloud`, `--prepare-gcp --project-id X` writes `GCP_PROJECT_ID=X`, derives `GCP_PROJECT_NUMBER`, and keeps live-mode env values.
- The README contains a clear "New computer + new GCP project" recipe.
- Existing launcher behavior remains unchanged when `--prepare-gcp` is omitted.

### Progress
- [x] Current launcher and README inspected.
- [x] Failing tests written.
- [x] Launcher implementation complete.
- [x] README updated.
- [x] Validation complete.
- [x] Changes committed and pushed.

## Current Update — Homepage Card Imagery

### Goal
Make the Booking.com-style homepage cards feel more premium by using the bundled
landing photography more intentionally across destinations, property types, and
inspiration cards.

### Relevant Files
- `frontend/src/components/pages/Homepage.tsx` - card data and visual rendering.
- `frontend/src/components/pages/Homepage.test.tsx` - regression coverage for
  matched image metadata.
- `frontend/src/assets/landing/` - local image assets already bundled by Vite.

### Acceptance Criteria
- Destination, property type, and inspiration cards expose descriptive image alt
  text that matches each card name.
- Card image crops are tuned per card so the meaningful subject remains visible.
- Visual treatment gives the images a more polished, high-quality presentation.
- Frontend tests and build pass.

### Progress
- [x] Existing assets inspected.
- [x] Failing image metadata test written.
- [x] Homepage card presentation updated.
- [x] Validation complete.
- [x] Changes committed and pushed.

## Decision Log
- 2026-06-04 00:00 — Use path-based mode selection because the request asked for a subtle toggle and the existing UI already has presenter controls for visible mode switching.
- 2026-06-04 00:00 — Keep Part 1 on the desktop chat channel and leave the existing voice channel untouched because the script explicitly says Part 2 will be handled separately.
- 2026-06-04 00:00 — Reuse the existing Zustand demo engine and chat components because the repo already has mock/live parity and the requested change is a new flow, not a new app shell.
- 2026-06-04 00:00 — Revised per user direction: the ad click should stay on desktop, not launch the mobile frame.
- 2026-06-04 17:30 — Add `scripts/run_turnkey_demo.sh` as the primary launcher so demoers can run the full desktop ad-to-chat flow from one terminal while preserving manual server commands for troubleshooting.
- 2026-06-05 01:00 — Add opt-in `--prepare-gcp` to the same launcher so new-machine live setup can enable CES, set gcloud project and ADC quota project, derive `GCP_PROJECT_NUMBER`, provision the app, and start the demo from one command after the user authenticates.

## Notes / Blockers
- Live mode depends on the backend and CXAS credentials being available at runtime; mock mode remains independent of that external state.
- Browser/IAB rendered QA was attempted against `http://127.0.0.1:3001/google`, but the Browser runtime rejected the localhost URL under its URL policy. Per that policy, no alternate browser surface was used. The ad-click and first-turn desktop flow are covered by `frontend/src/App.test.tsx`, and the full mock conversation through `BK-4JUL-29571` is covered by `frontend/src/store/demoStore.test.ts`.
- The frontend dev server is running at `http://127.0.0.1:3001/` because port 3000 was already occupied.
- `backend/.venv/bin/python scripts/create_agent.py --dry-run` was attempted after the local CXAS app tree update, but this worktree's `.env` has no `GCP_PROJECT_ID`, so the first attempt exited before validation or push. `backend/.venv/bin/python scripts/create_agent.py --dry-run --project-id dry-run-project` succeeded and printed the expected `cxas lint` / `cxas push` commands.
- `backend/.venv/bin/cxas lint --app-dir agent/cxas_app/booking-concierge` passes with 0 errors. It still reports non-blocking warnings from existing self-contained helper functions and current-date lint heuristics.
- Real `/demo/live` cloud conversation is not validated in this worktree because `/api/health` reports `CXAS_APP_NAME is not set`. The `/demo/live` UI warm-start and friendly backend fallback were verified with Playwright. Set `GCP_PROJECT_ID`, run `scripts/create_agent.py`, and ensure `CXAS_APP_NAME` is written to `.env` before claiming live cloud validation.
- Playwright end-to-end mock validation passed at desktop viewport 1440x980: `/google` → sponsored ad click → `/demo/mock` → warm-start desktop chat → budget → location allow → 2 people → beach/coast → Martha's Vineyard → Summercamp Hotel → JetBlue → Sunset Sailing Cruise → Book This Trip → Visa ending 4242 → confirmation `BK-4JUL-29571`. Final run captured no console warnings/errors and verified the mobile frame is not visible.
