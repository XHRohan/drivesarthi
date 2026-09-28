# DriveSarthi — Development Status

> Update this file whenever a module is completed or a major decision is made.

## Completed Features

| Module | Status | Notes |
|--------|--------|-------|
| Project scaffold | Done | Next.js 16.3.6, React 19, Tailwind v4, App Router |
| Traffic dataset | Done | `drivesarthi_traffic_data.csv` — 43,200 rows, 5 roads, 5-min intervals |
| Project documentation | Done | PROJECT_CONTEXT.md, ARCHITECTURE.md, DEVELOPMENT_STATUS.md, DEVELOPMENT_RULES.md, .kiro/steering/ |
| Supabase client | Done | `src/lib/supabase.js` — lazy proxy, safe at build time |
| Auth context | Done | `src/context/AuthContext.js` — useAuth(): signUp, signIn, signOut, user, session |
| Auth pages | Done | login (Suspense, registered banner), register (name/email/phone/vehicle) |
| Route protection | Done | Client-side via useRequireAuth hook in (app) layout — Supabase v2 uses localStorage |
| Database schema | Done | `supabase/schema.sql` — 7 tables with RLS; trigger auto-creates profile on signup |
| Traffic data import | Done | `scripts/import-traffic-data.mjs` — npm run import-traffic |
| Storage utility | Done | `src/lib/storage.js` — uploadIncidentImage, deleteIncidentImage, getIncidentImageUrl |
| FastAPI helpers | Done | `src/lib/api.js` — analyzeImage, getTrafficCurrent, predictTraffic, getSignalTiming |
| App shell layout | Done | `src/app/(app)/layout.js` — fixed sidebar (desktop) + drawer (mobile) + sticky header |
| Sidebar / Header | Done | 8 nav items, active state, avatar initials, sign-out dropdown |
| Landing page | Done | `src/app/page.js` — auth-aware redirect to /dashboard or /login |
| Dashboard (Live Map) | Done | Full-screen Leaflet map — GPS location (fallback: ABESIT Ghaziabad), all signals + parking overlaid, HUD cards, signal/parking detail panels |
| LiveMap component | Done | `src/components/map/LiveMap.js` — signal icons (phase-coloured), parking icons (availability-coloured), user dot, popup details, recenter on GPS |
| ABESIT area seed data | Done | `supabase/seed-abesit-data.sql` — 30 signals + 25 parking lots around NH-9 Ghaziabad / ABESIT area |
| Profile page | Done | Reads/writes Supabase profiles table; avatar initials, edit form |
| Traffic query utilities | Done | `src/lib/trafficQueries.js` — 8 typed fetch functions with road/date filters |
| Traffic Analytics | Done | 6 Recharts charts: density/speed trend, congestion pie, vehicle bar, peak-hour, daily trend, road comparison |
| Traffic filter controls | Done | `src/components/ui/TrafficFilters.js` — road, date range, congestion level, quick presets |
| Recharts (charts) | Done | recharts@3.10.1 installed |
| Map infrastructure | Done | `src/components/map/BaseMap.js` — Leaflet/OSM, dynamic SSR-safe import, default icon fix |
| Leaflet installed | Done | leaflet@1.9.4, react-leaflet@5.0.0 |
| Geo utilities | Done | `src/lib/geo.js` — haversineKm, formatDistance, getCurrentPosition, sortByDistance |
| Signal helpers | Done | `src/lib/signalHelpers.js` — computeSignalState, estimatedWaitSeconds, recommendedSpeed, PHASE_COLOURS |
| Signal seed data | Done | `supabase/seed-signals.sql` — 10 signals across 5 roads; run once in Supabase SQL Editor |
| Smart Signal Assistant | Done | `src/app/(app)/signal/page.js` — live countdown ring, phase display, recommended speed, Leaflet map, road filter |
| Parking helpers | Done | `src/lib/parkingHelpers.js` — enrichAndRankLots, parkingScore (dist 40% + avail 45% + cap 15%), availabilityBadge |
| Parking seed script | Done | `scripts/seed-parking.mjs` — seeds 15 lots; skips if table already populated |
| Nearby Parking | Done | `src/app/(app)/parking/page.js` — ranked list, capacity bars, detail panel, colour-coded map, recommendation banner |

## Currently Incomplete Features

| Module | Status | Notes |
|--------|--------|-------|
| Supabase project setup | Manual step | Run schema.sql + seed SQLs + set env vars |
| Emergency SOS | Done | `src/app/(app)/sos/page.js` — 4 service dials (tel: links), personal contact CRUD via Supabase |
| Incident Reporting | Done | `src/app/(app)/incidents/page.js` — list, report form, map view; `[id]/page.js` — detail, resolve, delete |
| Incident helpers | Done | `src/lib/incidentHelpers.js` — type/status config, fetchMyIncidents, createIncident (with image upload), resolveIncident, deleteIncident |
| AI Traffic Analyzer | Done | `src/app/(app)/analyzer/page.js` — drag-drop upload, YOLO detection, vehicle breakdown, density bar, clearance estimate |
| FastAPI backend | Done | `backend/` — FastAPI + YOLOv8n (COCO); POST /analyze/image; GET /health |

## Known Issues

- `.env.local` must be created from `.env.local.example` before Supabase calls work
- `incident-images` storage bucket must be created manually in Supabase Dashboard
- Dashboard shows empty state until `traffic_data` is populated via `npm run import-traffic`
- Signal countdown is simulated from stored timing — not a live feed

## Manual Steps Required in Supabase Dashboard

1. Create a Supabase project at https://supabase.com
2. Copy credentials to `.env.local` (URL + anon key from Project Settings -> API)
3. Run the schema: SQL Editor -> paste `supabase/schema.sql` -> Run
4. Run ABESIT area seed: SQL Editor -> paste `supabase/seed-abesit-data.sql` -> Run  ← **NEW: populates 30 signals + 25 parking lots**
5. Run signal seed (optional, legacy): SQL Editor -> paste `supabase/seed-signals.sql` -> Run
5. Create storage bucket: Storage -> New bucket -> name: `incident-images` -> Public: off
6. Import traffic data:
   ```powershell
   $env:SUPABASE_URL="https://your-project.supabase.co"
   $env:SUPABASE_SERVICE_KEY="your-service-role-key"
   npm run import-traffic
   ```
7. Seed parking lots:
   ```powershell
   $env:SUPABASE_URL="https://your-project.supabase.co"
   $env:SUPABASE_SERVICE_KEY="your-service-role-key"
   node scripts/seed-parking.mjs
   ```

## Traffic Data Flow

```
drivesarthi_traffic_data.csv  (project root, never modify)
  -> scripts/import-traffic-data.mjs  (npm run import-traffic)
     -> Supabase public.traffic_data
        -> src/lib/trafficQueries.js
           -> Dashboard + Analytics pages
              -> Recharts components
```

## Map / Signal / Parking Data Flow

```
supabase/seed-signals.sql  -> Supabase public.signals  -> Signal page
                                                           (computeSignalState simulates live phase)

scripts/seed-parking.mjs   -> Supabase public.parking_lots -> Parking page
                                                               (enrichAndRankLots scores + sorts)

Browser Geolocation API    -> userPos {lat, lng}
                              -> haversineKm() distances for both Signal and Parking
                              -> sortByDistance() nearest-first ordering
```

## Incident / SOS Data Flow

```
Incident Reporting:
  User fills form (type, description, address, GPS, optional image)
    -> createIncident(userId, fields, imageFile)  [src/lib/incidentHelpers.js]
       -> supabase.from('incidents').insert(...)  -> public.incidents (RLS: user owns row)
       -> uploadIncidentImage(userId, id, file)   -> Supabase Storage: incident-images/{userId}/{id}.ext
       -> supabase.from('incidents').update({ image_url })
    -> List page re-fetches via fetchMyIncidents(userId)
    -> Detail page at /incidents/[id] — resolve (update status) or delete

Emergency SOS:
  Service dials: static tel: links (102 ambulance, 100 police, 101 fire, 108 disaster)
  Personal contacts:
    -> supabase.from('emergency_contacts').insert/select/delete
       RLS: user owns rows
    -> tel: link on each ContactCard for direct calling
```

Build remaining modules in this order:

1. Emergency SOS — emergency_contacts CRUD + hardcoded service numbers; no FastAPI needed
2. Incident Reporting — report form + Supabase Storage image upload; no FastAPI needed
3. AI Traffic Analyzer — requires FastAPI + YOLO; build Python backend first

## Important Implementation Decisions

| Decision | Rationale |
|----------|-----------|
| App Router (not Pages Router) | Default for Next.js 16; supports React Server Components |
| Supabase for all CRUD | Avoids needing FastAPI for non-AI operations |
| FastAPI only for AI/ML | Keeps Python backend focused |
| Synthetic CSV as sole traffic source | No external API keys required |
| Tailwind v4 | Already installed; do not downgrade |
| No TypeScript | Explicit project constraint |
| React Context for state | Sufficient for prototype scope |
| Lazy Supabase client proxy | Safe at build time without env vars |
| DB trigger for profiles | Auto-creates profile row on signup |
| Client-side auth guard | Supabase v2 uses localStorage, not cookies; middleware cannot read session |
| useRequireAuth in (app)/layout.js | Covers all authenticated routes in one place |
| recharts@3.10.1 | Standard React charting |
| Queries capped at 5,000 rows | Avoids loading 43,200 rows in browser |
| Promise.allSettled for analytics | Parallel chart loads; one failure doesn't block others |
| leaflet dynamic import (ssr:false) | Leaflet accesses window at module load; breaks SSR |
| Leaflet CSS in globals.css | Required for tile rendering; imported once globally |
| Default icon URL fix in BaseMap | Webpack breaks Leaflet's built-in icon path resolution |
| Signal state from wall-clock math | No WebSocket needed; cycle derived from (now - phase_started_at) % cycle |
| Parking score formula transparent | Users can see the 40/45/15 weighting in the UI |
| Parking seed skips if populated | Safe to run seed script multiple times |

## AI Traffic Analyzer Data Flow

```
User uploads image via /analyzer page
  -> analyzeImage(file)  [src/lib/api.js]
     -> POST http://localhost:8000/analyze/image  (multipart form)
        -> backend/routes/analyze.py
           -> detector.analyze_bytes(raw)  [backend/services/detector.py]
              -> cv2.imdecode() — decode image bytes
              -> YOLOv8n(img, conf=0.35) — detect objects
              -> count COCO class IDs: 2=car, 1/3=bike, 5=bus, 7=truck
              -> density  = total_vehicles / 100 (reference capacity)
              -> congestion_level from density thresholds
              -> clearance_minutes = queue_length / drain_speed
           -> VehicleDetectionResult (Pydantic schema)
        -> JSON response
     -> Frontend displays: vehicle counts, breakdown bars, density, congestion, clearance
```

## How to Start the FastAPI Backend

```powershell
# From the project root (drivesarthi/)

# 1. Create virtual environment (first time only)
python -m venv backend/.venv

# 2. Activate it (Windows PowerShell)
backend\.venv\Scripts\activate

# 3. Install dependencies (first time only — downloads YOLOv8n ~6 MB on first run)
pip install -r backend/requirements.txt

# 4. Start the server
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

The frontend expects the backend at `http://localhost:8000`.
Override with `NEXT_PUBLIC_FASTAPI_URL` in `.env.local` if using a different port or host.

API docs are available at `http://localhost:8000/docs` when the server is running.

## Next Recommended Task

All 8 modules are now implemented. Remaining work:

- Run the Supabase setup steps in DEVELOPMENT_STATUS.md (schema, seeds, storage bucket)
- Test end-to-end with real Supabase credentials in `.env.local`
- Start the FastAPI backend and test the AI Traffic Analyzer with a traffic image
- Polish UI, fix any edge cases found during testing

## Important Implementation Decisions (additions)

| Decision | Rationale |
|----------|-----------|
| incidentHelpers.js as query layer | Pages never call supabase.from('incidents') directly |
| Insert first, then upload image | Incident UUID needed as storage path; two-step write is safe |
| tel: links for SOS | Native phone dialler; no third-party dispatch API needed |
| Confirm-before-delete pattern | Prevents accidental incident/contact deletion |
| /incidents/[id] as separate route | Clean URL, shareable, keeps list page lightweight |
| FastAPI backend in backend/ | Keeps Python AI code separate from Next.js; clear boundary |
| YOLOv8n COCO pretrained | No custom training needed; detects cars/bikes/buses/trucks out of the box |
| Density = vehicles / 100 | Simple prototype approximation; transparent to users |
| clearance = queue / drain_speed | Basic queuing model; capped at 120 min to avoid absurd values |
| Backend-down detection in frontend | Distinguishes ERR_CONNECTION_REFUSED from real API errors; shows start-up instructions |
| CORS restricted to localhost:3000 | Sufficient for local prototype; widen if deploying |
| Lifespan event for model load | YOLO loads once at startup; 503 returned if not yet ready |
