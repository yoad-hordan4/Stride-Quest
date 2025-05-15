import json
import copy
import logging
from pathlib import Path
from geopy.distance import distance

# Constants
TRAILS_PATH = Path(__file__).resolve().parent.parent / "data" / "sample_trails.json"
MAX_DIST = 100  # in km, must match frontend expectation

# Setup logging
logging.basicConfig(level=logging.INFO)

def validate_coordinates(lat, lon):
    return -90 <= lat <= 90 and -180 <= lon <= 180

def find_nearby_trails(user_lat, user_lon, radius_km=MAX_DIST):
    """Returns trails within a given radius of the user location."""
    if not validate_coordinates(user_lat, user_lon):
        raise ValueError("Invalid coordinates provided.")

    try:
        with open(TRAILS_PATH, "r") as f:
            trails = json.load(f)
    except FileNotFoundError:
        logging.error(f"Trail data file not found at {TRAILS_PATH}")
        return []
    except json.JSONDecodeError:
        logging.error("Trail data file is not valid JSON.")
        return []

    nearby = []
    for trail in trails:
        trail_coords = (trail.get("latitude"), trail.get("longitude"))
        if not all(trail_coords):
            continue  # Skip incomplete entries

        dist_km = distance((user_lat, user_lon), trail_coords).km
        if dist_km <= radius_km:
            trail_copy = copy.deepcopy(trail)
            trail_copy["distance_km"] = round(dist_km, 2)
            nearby.append(trail_copy)

    logging.info(f"User at ({user_lat}, {user_lon}) — Found {len(nearby)} nearby trails.")
    return sorted(nearby, key=lambda t: t["distance_km"])

def get_trail_by_id(trail_id: int):
    """Fetch a single trail by its unique ID."""
    try:
        with open(TRAILS_PATH, "r") as f:
            trails = json.load(f)
    except FileNotFoundError:
        logging.error(f"Trail data file not found at {TRAILS_PATH}")
        return None
    except json.JSONDecodeError:
        logging.error("Trail data file is not valid JSON.")
        return None

    for trail in trails:
        if trail.get("id") == trail_id:
            return trail

    logging.warning(f"Trail with ID {trail_id} not found.")
    return None
