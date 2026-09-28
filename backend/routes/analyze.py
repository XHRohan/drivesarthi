"""
routes/analyze.py
-----------------
POST /analyze/image  — accepts a multipart image upload, runs YOLO detection,
                       returns structured JSON.
"""

from fastapi import APIRouter, File, HTTPException, UploadFile

from backend.models.schemas import VehicleDetectionResult
from backend.services.detector import detector

router = APIRouter(prefix="/analyze", tags=["analyze"])

ALLOWED_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_BYTES = 20 * 1024 * 1024  # 20 MB


@router.post(
    "/image",
    response_model=VehicleDetectionResult,
    summary="Detect vehicles in a traffic image",
    description=(
        "Upload a road/traffic camera image (JPEG, PNG, WebP ≤ 20 MB). "
        "YOLO detects cars, bikes, buses, and trucks. "
        "Returns vehicle counts, density %, congestion level, and estimated clearance time. "
        "This is a prototype analysis using a generic pretrained model — not a real traffic feed."
    ),
)
async def analyze_image(image: UploadFile = File(...)):
    # ── validate ─────────────────────────────────────────────────────────────
    if image.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{image.content_type}'. Upload JPEG, PNG, or WebP.",
        )

    raw = await image.read()
    if len(raw) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="Image exceeds 20 MB limit.")

    if not detector.is_loaded:
        raise HTTPException(status_code=503, detail="YOLO model not loaded. Try again shortly.")

    # ── detect ────────────────────────────────────────────────────────────────
    try:
        result = detector.analyze_bytes(raw)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Detection failed: {exc}") from exc

    return result
