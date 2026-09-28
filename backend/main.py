"""
DriveSarthi — FastAPI Backend
==============================
Handles AI/ML inference only.
All CRUD (incidents, profiles, parking, signals) is handled by the
Next.js frontend via the Supabase client.

Endpoints
---------
GET  /              health check
GET  /health        health check (JSON)
POST /analyze/image YOLO vehicle detection

STARTING THE SERVER
-------------------
From the project root (drivesarthi/):

  # Create and activate a virtual environment (first time only)
  python -m venv backend/.venv
  # Windows:
  backend\\.venv\\Scripts\\activate
  # macOS/Linux:
  source backend/.venv/bin/activate

  # Install dependencies (first time only)
  pip install -r backend/requirements.txt

  # Run the server
  uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

The frontend expects the backend at http://localhost:8000 by default.
Override with NEXT_PUBLIC_FASTAPI_URL in .env.local.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.models.schemas import HealthResponse
from backend.routes.analyze import router as analyze_router
from backend.services.detector import detector

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

VERSION = "1.0.0"

# ── lifespan: load YOLO model once at startup ─────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("DriveSarthi backend starting — loading YOLO model…")
    try:
        detector.load()
        logger.info("YOLO model ready.")
    except Exception as exc:
        logger.error("Failed to load YOLO model: %s", exc)
        # Server still starts; /analyze/image will return 503 until model loads
    yield
    logger.info("DriveSarthi backend shutting down.")


# ── app factory ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="DriveSarthi AI Backend",
    description=(
        "Vehicle detection and traffic analysis API for the DriveSarthi prototype. "
        "Uses YOLOv8n (COCO pretrained) — results are indicative, not a real traffic feed."
    ),
    version=VERSION,
    lifespan=lifespan,
)

# ── CORS — allow the Next.js dev server ───────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── routers ───────────────────────────────────────────────────────────────────
app.include_router(analyze_router)


# ── health endpoints ──────────────────────────────────────────────────────────
@app.get("/", include_in_schema=False)
async def root():
    return {"message": "DriveSarthi AI Backend", "version": VERSION, "docs": "/docs"}


@app.get("/health", response_model=HealthResponse, tags=["health"])
async def health():
    return HealthResponse(
        status="ok" if detector.is_loaded else "degraded",
        model_loaded=detector.is_loaded,
        version=VERSION,
    )
