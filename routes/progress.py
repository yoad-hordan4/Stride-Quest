from fastapi import APIRouter
from pydantic import BaseModel
from geopy.distance import distance
from utils.trail_finder import get_trail_by_id

router = APIRouter()

class PositionData(BaseModel):
    trail_id: int
    checkpoint_index: int
    latitude: float
    longitude: float

@router.post("/check")
def check_position(data: PositionData):
    trail = get_trail_by_id(data.trail_id)
    if not trail:
        return {"error": "Trail not found"}
    if data.checkpoint_index >= len(trail.get("checkpoints", [])):
        return {"error": "Invalid checkpoint"}

    cp = trail["checkpoints"][data.checkpoint_index]
    cp_lat = cp.get("lat")
    cp_lon = cp.get("lon")
    if cp_lat is None or cp_lon is None:
        return {"error": "Checkpoint coordinates missing"}

    dist_km = distance((data.latitude, data.longitude), (cp_lat, cp_lon)).km
    reached = dist_km < 0.05
    return {"reached": reached, "distance_km": round(dist_km, 3)}
