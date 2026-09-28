# DriveSarthi — Architecture

> Read PROJECT_CONTEXT.md first for feature list, constraints, and dataset details.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser / Client                         │
│                                                                 │
│   Next.js 16 (App Router)  ·  React 19  ·  Tailwind CSS v4     │
│   MUI  ·  Leaflet/OSM  ·  Recharts                             │
└────────────┬──────────────────────────┬────────────────────────┘
             │                          │
             │ Supabase JS client        │ fetch / REST
             │ (auth, DB, storage)       │ (AI/ML only)
             ▼                          ▼
┌────────────────────────┐   ┌──────────────────────────────────┐
│       Supabase         │   │         FastAPI (Python)          │
│                        │   │                                  │
│  Auth   PostgreSQL     │   │  /analyze  — vehicle detection   │
│  Storage               │   │  /predict  — clearance time      │
│  (RLS policies)        │   │  /signal   — signal timing       │
└────────────────────────┘   └──────────────────────────────────┘
                                         │
                               YOLO + OpenCV
                               XGBoost / sklearn
                               drivesarthi_traffic_data.csv
```

---

## Frontend Architecture

### Framework
- **Next.js 16.3.6** using the **App Router** (`src/app/`)
- All routing is file-system based under `src/app/`
- Server Components by default; add `"use client"` at the top of a file only when the component needs browser APIs, React state/effects, or Supabase client calls

### Route Structure (implemented)
```
src/app/
├── layout.js                      ← root layout (AuthProvider, fonts, globals.css)
├── page.js                        ← landing: redirects to /dashboard or /login
├── globals.css
│
├── (auth)/                        ← route group — no app shell
│   ├── login/page.js              ← email/password login + registered banner
│   └── register/page.js           ← sign-up: name, email, phone, vehicle type
│
└── (app)/                         ← route group — all share AppLayout
    ├── layout.js                  ← Sidebar + Header wrapper
    ├── dashboard/page.js          ← traffic overview + quick-access grid
    ├── signal/page.js             ← Smart Signal Assistant (placeholder)
    ├── analyzer/page.js           ← AI Traffic Analyzer (placeholder)
    ├── parking/page.js            ← Nearby Parking (placeholder)
    ├── sos/page.js                ← Emergency SOS (placeholder)
    ├── incidents/page.js          ← Incident Reporting (placeholder)
    ├── analytics/page.js          ← Traffic Analytics (placeholder)
    └── profile/page.js            ← user profile edit
```

### Component Organisation
```
src/
├── app/                           ← Next.js routes (pages + layouts)
│   ├── (auth)/                    ← unauthenticated pages (no app shell)
│   │   ├── login/page.js          ← Suspense-wrapped login form
│   │   └── register/page.js       ← registration form
│   ├── (app)/                     ← authenticated pages share app shell layout
│   │   ├── layout.js              ← app shell: Sidebar + Header + main scroll area
│   │   ├── dashboard/page.js      ← road conditions, full vehicle breakdown, quick-access grid
│   │   ├── signal/page.js         ← Smart Signal Assistant — countdown ring, map, recommended speed
│   │   ├── analyzer/page.js       ← AI Traffic Analyzer — drag-drop upload, YOLO results display
│   │   ├── parking/page.js        ← Nearby Parking — ranked lots, map, recommendation banner
│   │   ├── incidents/page.js      ← Incident list + report form + map view (tabs)
│   │   ├── incidents/[id]/page.js ← Incident detail, resolve, delete
│   │   ├── sos/page.js            ← Emergency SOS — 4 service dials + personal contact CRUD
│   │   ├── analytics/page.js      ← Traffic Analytics — 6 Recharts charts with filters
│   │   └── profile/page.js        ← user profile read/edit via Supabase
│   ├── page.js                    ← root: redirects to /dashboard or /login
│   ├── layout.js                  ← root layout: AuthProvider, fonts, globals.css
│   └── globals.css                ← Tailwind v4 + Leaflet CSS
├── components/
│   ├── ui/
│   │   ├── NavIcon.js             ← inline SVG icons for all nav items + utilities
│   │   ├── PlaceholderPage.js     ← reusable "coming soon" shell
│   │   └── TrafficFilters.js      ← road/date/congestion filter bar (Analytics + Dashboard)
│   ├── layout/
│   │   ├── Sidebar.js             ← fixed sidebar (desktop) + slide-over drawer (mobile)
│   │   └── Header.js              ← top bar: page title, avatar initials, sign-out dropdown
│   └── charts/
│       ├── CongestionLineChart.js ← density% + speed over time (dual Y-axis)
│       ├── CongestionPieChart.js  ← distribution of Low/Moderate/High/Very High
│       ├── VehicleBarChart.js     ← horizontal bars per vehicle type
│       ├── PeakHourChart.js       ← 24-bar peak-hour chart with rush-hour highlights
│       ├── DailyTrendChart.js     ← area + line: total vehicles + avg speed per day
│       └── RoadComparisonChart.js ← grouped bars for all 5 roads
├── context/
│   └── AuthContext.js             ← AuthProvider + useAuth() hook
├── hooks/
│   └── useRequireAuth.js          ← redirects to /login if no session (client-side)
├── lib/
│   ├── supabase.js                ← lazy-proxy Supabase client singleton
│   ├── api.js                     ← FastAPI fetch helpers (AI/ML only)
│   ├── storage.js                 ← Supabase Storage upload/delete utilities
│   ├── nav.js                     ← NAV_ITEMS array — single source of truth for navigation
│   ├── trafficQueries.js          ← all Supabase traffic_data queries (8 functions)
│   ├── signalHelpers.js           ← computeSignalState, recommendedSpeed, PHASE_COLOURS
│   ├── parkingHelpers.js          ← enrichAndRankLots, parkingScore, availabilityBadge
│   ├── incidentHelpers.js         ← type/status config, fetchMyIncidents, createIncident, resolveIncident, deleteIncident
│   └── geo.js                     ← haversineKm, formatDistance, getCurrentPosition
└── components/map/
    └── BaseMap.js                 ← Leaflet/OSM wrapper — dynamic import (ssr:false) required
```

### Styling
- Tailwind CSS v4 imported via `@import "tailwindcss"` in `globals.css`
- PostCSS configured with `@tailwindcss/postcss`
- MUI components used where a rich component is justified (data tables, dialogs, date pickers)
- Do not mix Tailwind and MUI `sx` props on the same element — pick one per component

### Path Alias
- `@/` resolves to `src/` — use this for all internal imports

---

## Supabase Architecture

### Connection
- A lazy-initialised Supabase client proxy is in `src/lib/supabase.js`
- Exported as both `supabase` (proxy) and `getSupabase()` (factory)
- Client-side only — never expose the service role key in frontend code
- Environment variables (in `.env.local`):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Auth Flow
```
User fills login/register form
        │
        ▼
supabase.auth.signInWithPassword() / signUp()   ← via useAuth() hook
        │
        ▼
Supabase issues JWT session → stored in browser cookie/localStorage
        │
        ▼
AuthContext (src/context/AuthContext.js) listens via onAuthStateChange
        │
        ▼
Next.js middleware (src/middleware.js) checks session on every request
Redirects /dashboard/* → /login if unauthenticated
Redirects /login,/register → /dashboard if already authenticated
```

### Auth Files
| File | Purpose |
|------|---------|
| `src/lib/supabase.js` | Lazy client singleton + `useAuth`-compatible export |
| `src/context/AuthContext.js` | React context: `user`, `session`, `signUp`, `signIn`, `signOut` |
| `src/middleware.js` | Edge middleware: session guard on protected routes |
| `src/app/(auth)/login/page.js` | Login form page |
| `src/app/(auth)/register/page.js` | Registration form page (name, email, phone, vehicle type, password) |

### Database Tables (implemented in `supabase/schema.sql`)

| Table | Key Columns | RLS | Purpose |
|-------|-------------|-----|---------|
| `profiles` | id (FK → auth.users), full_name, phone, vehicle_type | Users own row | Extended user profile; auto-created by DB trigger on signup |
| `signals` | road_id, current_phase, green/yellow/red_seconds | Public read | Traffic signal state (seeded, updated by signal feature) |
| `parking_lots` | name, lat, lng, total_spots, available | Public read | Parking locations (seeded) |
| `incidents` | id, user_id, type, lat, lng, image_url, status | Users own rows | User-reported incidents |
| `emergency_contacts` | id, user_id, name, phone, relation | Users own rows | Personal SOS contacts |
| `traffic_data` | timestamp, road_id, vehicle counts, density, congestion_level | Public read | Mirrors CSV; populated by import script |
| `traffic_activity` | user_id, road_id, action, meta | Users own rows | Dashboard "Recent activity" log |

- Full schema with RLS policies: `supabase/schema.sql`
- A DB trigger (`on_auth_user_created`) auto-inserts a `profiles` row on every new signup

### Storage
- Bucket: `incident-images` (must be created manually in Supabase Dashboard)
- Access: authenticated users upload; public URL served for display
- Path pattern: `{user_id}/{incident_id}.{ext}`
- Utility functions: `src/lib/storage.js` — `uploadIncidentImage`, `deleteIncidentImage`, `getIncidentImageUrl`

---

---

## FastAPI Backend Architecture

### Location
```
backend/
├── __init__.py
├── main.py                  ← FastAPI app, CORS, lifespan (model load), /health
├── requirements.txt         ← fastapi, uvicorn, ultralytics, opencv-python-headless, numpy, Pillow
├── models/
│   └── schemas.py           ← Pydantic: VehicleDetectionResult, HealthResponse
├── routes/
│   └── analyze.py           ← POST /analyze/image — validates upload, calls detector
├── services/
│   └── detector.py          ← VehicleDetector singleton; YOLO inference + density/clearance math
└── utils/
    └── __init__.py
```

### AI/ML Pipeline
```
Uploaded image bytes
  -> cv2.imdecode()                      decode to BGR array
  -> YOLOv8n(img, conf=0.35)            inference (COCO pretrained, ~6 MB)
  -> filter COCO class IDs              2=car, 1/3=bike, 5=bus, 7=truck
  -> count per category
  -> density  = total / 100             reference capacity constant
  -> congestion = threshold lookup      Low < 33% / Moderate < 60% / High < 85% / Very High
  -> clearance = (total × 8 m) / drain  basic queuing model, capped at 120 min
  -> VehicleDetectionResult JSON        returned to frontend
```

### Starting the Backend
```powershell
python -m venv backend/.venv
backend\.venv\Scripts\activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000
```
API docs: http://localhost:8000/docs

### CORS
Allows `http://localhost:3000` only. Widen `allow_origins` in `main.py` if deploying.

### Environment
Frontend reads `NEXT_PUBLIC_FASTAPI_URL` (default: `http://localhost:8000`).
All calls go through `src/lib/api.js` — pages never `fetch` FastAPI directly.

### Location
- Separate directory (not yet scaffolded): `../drivesarthi-api/` or a `/api-server/` subfolder
- Development URL: `http://localhost:8000`
- Frontend reads the base URL from `NEXT_PUBLIC_FASTAPI_URL`

### Planned Endpoints

| Method | Path | Input | Output | Notes |
|--------|------|-------|--------|-------|
| `POST` | `/analyze/image` | multipart image | `{cars, bikes, buses, trucks, density}` | YOLO vehicle detection |
| `GET` | `/traffic/current` | `road_id`, `timestamp` | row from CSV dataset | Serves synthetic traffic data |
| `GET` | `/traffic/predict` | `road_id`, `hour`, `weather` | `{congestion_level, clearance_minutes}` | ML prediction from CSV-trained model |
| `GET` | `/signal/timing` | `road_id`, `density` | `{green_seconds, recommended_speed}` | Signal timing algorithm |
| `GET` | `/analytics/summary` | `road_id`, `date_range` | aggregated stats | Used by Traffic Analytics page |

### AI/ML Stack
- **YOLO + OpenCV**: vehicle detection from uploaded camera images
- **XGBoost / scikit-learn** (optional): congestion/clearance-time prediction trained on the CSV
- The CSV (`drivesarthi_traffic_data.csv`) is the training and serving data source — no external traffic APIs

---

## Traffic Data Flow

```
drivesarthi_traffic_data.csv  (project root, ~43,200 rows)
         │
         │  loaded by FastAPI at startup (pandas)
         ▼
FastAPI in-memory dataframe / SQLite cache
         │
         ├─── GET /traffic/current  ──────► Frontend dashboard, signal page
         ├─── GET /traffic/predict  ──────► AI Traffic Analyzer page
         ├─── GET /analytics/summary ─────► Traffic Analytics page
         └─── ML model training (offline) ► prediction endpoints
```

The CSV is **never** served directly to the browser. FastAPI reads it, processes it, and returns JSON responses.

For the Analytics page, if FastAPI is unavailable, the frontend can fall back to loading and parsing the CSV client-side using a utility in `src/lib/csvParser.js`.

---

## Frontend ↔ Supabase Communication

```javascript
// src/lib/supabase.js — lazy proxy, safe to import without env vars at build time
import { supabase } from '@/lib/supabase'

// Auth
const { data, error } = await supabase.auth.signInWithPassword({ email, password })

// DB read
const { data: incidents } = await supabase.from('incidents').select('*').eq('user_id', userId)

// DB write
await supabase.from('incidents').insert({ type, description, location, user_id })

// Storage upload
await supabase.storage.from('incident-images').upload(path, file)
```

---

## Frontend ↔ FastAPI Communication

```javascript
// src/lib/api.js
const BASE = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000'

export async function getTrafficCurrent(roadId) {
  const res = await fetch(`${BASE}/traffic/current?road_id=${roadId}`)
  if (!res.ok) throw new Error('Traffic fetch failed')
  return res.json()
}

export async function analyzeImage(file) {
  const form = new FormData()
  form.append('image', file)
  const res = await fetch(`${BASE}/analyze/image`, { method: 'POST', body: form })
  return res.json()
}
```

- All FastAPI calls go through `src/lib/api.js` — never call `fetch` directly against FastAPI from a page component
- FastAPI must set CORS headers allowing `http://localhost:3000` in development

---

## Where the CSV Is Used

| Location | How | Why |
|----------|-----|-----|
| `drivesarthi_traffic_data.csv` (root) | Source file — read by FastAPI | Primary traffic data store |
| FastAPI startup | `pandas.read_csv()` | Powers all traffic endpoints |
| FastAPI ML training | Offline, on the same CSV | Trains congestion prediction model |
| `src/lib/csvParser.js` (frontend) | `fetch('/api/traffic-data')` or direct parse | Fallback for analytics if FastAPI is down |

The CSV must never be deleted, renamed, moved, or regenerated.
