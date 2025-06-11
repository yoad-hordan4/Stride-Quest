import json
import copy
import logging
from pathlib import Path
from geopy.distance import distance
import gpxpy

# Constants
TRAILS_PATH = Path(__file__).resolve().parent.parent / "data" / "sample_trails.json"
GPX_DIR = Path(__file__).resolve().parent.parent / "gpx"
MAX_DIST = 200  # in km, must match frontend expectation

# Setup logging
logging.basicConfig(level=logging.INFO)

def parse_gpx_file(filename):
    """Parse a GPX file and return a list of points."""
    path = GPX_DIR / filename
    if not path.exists():
        logging.warning(f"GPX file not found: {path}")
        return []
    try:
        with path.open("r") as f:
            gpx = gpxpy.parse(f)
    except Exception as e:
        logging.error(f"Failed to parse GPX file {path}: {e}")
        return []

    points = []
    for track in gpx.tracks:
        for segment in track.segments:
            for p in segment.points:
                points.append({"lat": p.latitude, "lon": p.longitude})
    return points

def assign_gpx_to_checkpoints(trail: dict) -> dict:
    """Assign GPX coordinates to trail checkpoints if possible."""
    if not trail.get("gpx_file") or not trail.get("checkpoints"):
        return trail

    gpx_points = parse_gpx_file(trail["gpx_file"])
    if not gpx_points:
        return trail

    # Update checkpoint coordinates sequentially
    for cp, pt in zip(trail["checkpoints"], gpx_points):
        cp["lat"], cp["lon"] = pt["lat"], pt["lon"]

    trail["gpx_points"] = gpx_points
    return trail

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
            if trail_copy.get("gpx_file"):
                trail_copy = assign_gpx_to_checkpoints(trail_copy)
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
            if trail.get("gpx_file"):
                trail = assign_gpx_to_checkpoints(trail)
            return trail

    logging.warning(f"Trail with ID {trail_id} not found.")
    return None
