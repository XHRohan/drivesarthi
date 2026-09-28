"""
Pydantic response schemas for the DriveSarthi FastAPI backend.
"""

from pydantic import BaseModel


class VehicleDetectionResult(BaseModel):
    cars: int
    bikes: int
    buses: int
    trucks: int
    other_vehicles: int
    total_vehicles: int
    density: float           # 0.0 – 1.0  (vehicles / reference capacity)
    density_percent: float   # 0 – 100
    congestion_level: str    # "Low" | "Moderate" | "High" | "Very High"
    estimated_clearance_minutes: float
    avg_speed_kmh: float
    note: str                # disclaimer / extra info


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    version: str
