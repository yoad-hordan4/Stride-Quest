import cv2
import time
from pathlib import Path

# Directory where user photos will be stored
PHOTO_DIR = Path(__file__).resolve().parent.parent / "experience" / "images"
PHOTO_DIR.mkdir(parents=True, exist_ok=True)

def _next_photo_path() -> Path:
    """Generate a unique file name for the captured photo."""
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    return PHOTO_DIR / f"user_photo_{timestamp}.jpg"

def take_photo():
    cam = cv2.VideoCapture(0)
    
    if not cam.isOpened():
        raise RuntimeError("Failed to open the camera")

    time.sleep(0.1)
    result, image = cam.read()
    cam.release()

    if not result:
        raise RuntimeError("Failed to capture image")

    return image

def photo_saver(image, filename: Path):
    success = cv2.imwrite(str(filename), image)
    if not success:
        raise IOError(f"Failed to save photo to {filename}")
    print(f"Photo saved to: {filename}")
    return filename

def taker() -> Path:
    """Capture a photo and save it to a unique file."""
    image = take_photo()
    path = _next_photo_path()
    result = photo_saver(image, path)
    return result  # Returns a Path object
