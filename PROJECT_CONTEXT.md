# DriveSarthi — Project Context

> This file is the source of truth for any AI agent or developer working on this project.
> Read this before making any changes.

## Project Purpose

DriveSarthi is a smart traffic and mobility assistance application built as a college/hackathon prototype. It aims to help urban drivers in Indian cities navigate traffic, find parking, respond to emergencies, and understand real-time (synthetic) traffic conditions through AI-assisted insights.

The name "DriveSarthi" is a blend of "Drive" and "Sarthi" (Hindi for charioteer/guide), reflecting its role as a driving companion.

## Complete Feature List

| # | Module | Key Functions |
|---|--------|--------------|
| 1 | **User Module** | Registration, login, profile management via Supabase Auth |
| 2 | **Dashboard** | Traffic overview, quick access to all modules, recent activity feed |
| 3 | **Smart Signal Assistant** | Next signal info, signal status, countdown timer, recommended speed, estimated wait time |
| 4 | **AI Traffic Analyzer** | Vehicle detection (cars/bikes/buses/trucks), traffic density, clearance-time estimation |
| 5 | **Nearby Parking** | Parking locations on map, availability, distance, capacity, recommendations |
| 6 | **Emergency SOS** | One-tap contacts for ambulance, police, fire brigade; personal emergency contacts |
| 7 | **Incident Reporting** | Report accidents/jams/road damage with image upload and location |
| 8 | **Traffic Analytics** | Vehicle statistics, congestion analysis, peak-hour reports, daily traffic trends |

## Technology Stack

### Frontend
- **Framework**: Next.js 16.3.6 (App Router)
- **Language**: JavaScript only — no TypeScript
- **React**: 19.2.8
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/postcss`)
- **UI Components**: MUI (Material UI) — to be added when needed
- **Maps**: Leaflet + OpenStreetMap — for parking and incident location features
- **Charts**: Recharts — for traffic analytics visualisations
- **Font**: Geist (loaded via `next/font/google`)

### Backend
- **Runtime**: Python
- **Framework**: FastAPI
- **Purpose**: AI/ML inference only — vehicle detection, traffic analysis, clearance-time prediction
- **AI/ML**: YOLO + OpenCV (vehicle detection), optionally XGBoost/scikit-learn

### Database / Auth / Storage
- **Platform**: Supabase
- **Database**: Supabase PostgreSQL — stores users, incidents, parking data, activity logs
- **Auth**: Supabase Auth — handles registration, login, sessions
- **Storage**: Supabase Storage — stores incident images uploaded by users

### Path Alias
- `@/*` resolves to `./src/*` (configured in `jsconfig.json`)

## Important Constraints

1. **JavaScript only** — never introduce TypeScript (`.ts`, `.tsx`)
2. **Prototype scope** — this is a hackathon project, not a production system
3. **Credit-efficient** — reuse existing code and dependencies; do not install packages unnecessarily
4. **No fake functionality** — implement real working prototypes where feasible
5. **No AI for marketing** — AI/ML is only used where it provides an actual function (vehicle detection, predictions)
6. **Supabase for CRUD** — frontend reads/writes user data, incidents, parking directly via Supabase client; FastAPI is not a general CRUD proxy
7. **No external traffic APIs** — the synthetic CSV is the sole traffic data source

## Traffic Dataset Information

| Property | Value |
|----------|-------|
| File | `drivesarthi_traffic_data.csv` (project root — do NOT move, rename, or overwrite) |
| Rows | ~43,200 observations |
| Frequency | 5-minute intervals |
| Date range | Starting 2026-01-01 |
| Roads covered | RD001–RD005 (NH24 Corridor, GT Road, City Center Road, Market Road, College Road) |

### CSV Columns
```
timestamp, road_id, road_name, road_type, weather, event,
cars, bikes, auto_rickshaws, buses, trucks, other_vehicles,
total_vehicles, road_capacity, density, density_percent,
avg_speed_kmh, congestion_level, estimated_clearance_minutes
```

### Road Types
- `highway` — NH24 Corridor (capacity 650)
- `arterial` — GT Road (capacity 500)
- `city_road` — City Center Road (capacity 360), College Road (capacity 300)
- `market_road` — Market Road (capacity 230)

### Congestion Levels (in data)
- `Low`, `Moderate`, `High`, `Very High`

### Event Types (in data)
- `normal`, `signal_delay`, `minor_jam`, `school_zone`, and others

This dataset is **synthetic** and must be presented in the UI as simulated/prototype data — never as live real-world measurements.

## Current Architectural Decisions

- Next.js App Router is used (not Pages Router)
- Server Components are available but client components (`"use client"`) will be needed for interactive UI and Supabase client calls
- Supabase JS client will handle auth + database + storage from the frontend
- FastAPI backend runs separately (expected at `http://localhost:8000` in development)
- No monorepo structure — frontend and backend are separate projects (FastAPI not yet scaffolded)
- No state management library has been chosen yet; React context is preferred for prototype scope
