"""
detector.py
-----------
YOLO-based vehicle detection service for DriveSarthi.

Uses the Ultralytics YOLOv8n pretrained model (COCO) without any custom training.
The model is downloaded automatically on first run (~6 MB).

COCO vehicle class IDs:
    1  = bicycle       → bikes
    2  = car           → cars
    3  = motorcycle    → bikes
    5  = bus           → buses
    7  = truck         → trucks

All other detected objects are counted as other_vehicles.

Density and congestion are estimated from vehicle counts relative to a
configurable reference capacity (default: 100 vehicles = 100% capacity).
This is a prototype approximation — not a calibrated traffic model.
"""

import io
import logging
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from ultralytics import YOLO

from backend.models.schemas import VehicleDetectionResult

logger = logging.getLogger(__name__)

# ── YOLO class → DriveSarthi category mapping ────────────────────────────────
# COCO class ids:  0=person 1=bicycle 2=car 3=motorcycle 5=bus 7=truck
VEHICLE_CLASSES = {1, 2, 3, 5, 7}

CLASS_MAP = {
    2: "cars",
    1: "bikes",
    3: "bikes",
    5: "buses",
    7: "trucks",
}

# Reference capacity for density calculation (prototype constant)
REFERENCE_CAPACITY = 100

# Congestion thresholds (density %)
CONGESTION_THRESHOLDS = [
    (33,  "Low"),
    (60,  "Moderate"),
    (85,  "High"),
    (101, "Very High"),
]

# Approximate average speed vs. congestion level (km/h)
SPEED_MAP = {
    "Low":       55.0,
    "Moderate":  35.0,
    "High":      20.0,
    "Very High": 10.0,
}


class VehicleDetector:
    """Singleton-style detector; load once at startup."""

    def __init__(self, model_name: str = "yolov8n.pt"):
        self.model_name = model_name
        self._model: YOLO | None = None

    def load(self) -> None:
        """Load (and download if needed) the YOLO model."""
        logger.info("Loading YOLO model: %s", self.model_name)
        self._model = YOLO(self.model_name)
        logger.info("YOLO model loaded.")

    @property
    def is_loaded(self) -> bool:
        return self._model is not None

    # ── public API ────────────────────────────────────────────────────────────

    def analyze_bytes(self, image_bytes: bytes) -> VehicleDetectionResult:
        """
        Run vehicle detection on raw image bytes.

        :param image_bytes: Raw bytes of a JPEG/PNG image.
        :returns: VehicleDetectionResult with counts, density and congestion.
        :raises RuntimeError: If model is not loaded.
        """
        if not self.is_loaded:
            raise RuntimeError("Model not loaded. Call .load() first.")

        # Decode image
        nparr = np.frombuffer(image_bytes, np.uint8)
        img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img_bgr is None:
            raise ValueError("Could not decode image. Ensure the file is a valid JPEG/PNG.")

        # Run inference (confidence threshold 0.35 keeps false-positives low)
        results = self._model(img_bgr, conf=0.35, verbose=False)

        # Count detections
        counts = {"cars": 0, "bikes": 0, "buses": 0, "trucks": 0, "other_vehicles": 0}

        for result in results:
            if result.boxes is None:
                continue
            for cls_id in result.boxes.cls.cpu().numpy().astype(int):
                if cls_id in VEHICLE_CLASSES:
                    key = CLASS_MAP.get(cls_id, "other_vehicles")
                    counts[key] += 1
                # Non-vehicle COCO classes are ignored entirely

        total = sum(counts.values())
        density = min(total / REFERENCE_CAPACITY, 1.0)
        density_pct = round(density * 100, 1)

        congestion = self._congestion_level(density_pct)
        avg_speed = SPEED_MAP[congestion]
        clearance = self._clearance_minutes(total, avg_speed)

        return VehicleDetectionResult(
            cars=counts["cars"],
            bikes=counts["bikes"],
            buses=counts["buses"],
            trucks=counts["trucks"],
            other_vehicles=counts["other_vehicles"],
            total_vehicles=total,
            density=round(density, 4),
            density_percent=density_pct,
            congestion_level=congestion,
            estimated_clearance_minutes=clearance,
            avg_speed_kmh=avg_speed,
            note=(
                "Prototype analysis using YOLOv8n (COCO pretrained). "
                "Results are indicative only and not a real traffic feed."
            ),
        )

    # ── helpers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _congestion_level(density_pct: float) -> str:
        for threshold, label in CONGESTION_THRESHOLDS:
            if density_pct < threshold:
                return label
        return "Very High"

    @staticmethod
    def _clearance_minutes(total_vehicles: int, avg_speed_kmh: float) -> float:
        """
        Rough clearance estimate:
        Assume an average inter-vehicle gap of 8 m and
        the queue drains at avg_speed_kmh through a 500 m section.
        """
        if total_vehicles == 0:
            return 0.0
        queue_length_m = total_vehicles * 8
        drain_speed_m_per_min = (avg_speed_kmh * 1000) / 60
        minutes = queue_length_m / max(drain_speed_m_per_min, 1.0)
        return round(min(minutes, 120.0), 2)  # cap at 120 min


# ── module-level singleton ────────────────────────────────────────────────────
detector = VehicleDetector()
