from fastapi import APIRouter
from pydantic import BaseModel
from utils.trail_finder import find_nearby_trails

router = APIRouter()

class LocationInput(BaseModel):
    latitude: float
    longitude: float
    radius_km: float = 10

@router.post("/nearby")
def get_nearby_trails(location: LocationInput):
    return find_nearby_trails(location.latitude, location.longitude, location.radius_km)
