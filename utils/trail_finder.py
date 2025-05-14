import json
from geopy.distance import distance
from pathlib import Path

TRAILS_PATH = Path(__file__).resolve().parent.parent / "data" / "sample_trails.json"

def find_nearby_trails(user_lat, user_lon, radius_km=10):
    with open(TRAILS_PATH, "r") as f:
        trails = json.load(f)

    nearby = []
    for trail in trails:
        dist_km = distance((user_lat, user_lon), (trail["latitude"], trail["longitude"])).km
        if dist_km <= radius_km:
            trail["distance_km"] = round(dist_km, 2)
            nearby.append(trail)

    return sorted(nearby, key=lambda t: t["distance_km"])


def get_trail_by_id(trail_id: int):
    with open(TRAILS_PATH, "r") as f:
        trails = json.load(f)
    for trail in trails:
        if trail["id"] == trail_id:
            return trail
    return None

