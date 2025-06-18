import cv2
import time
from pathlib import Path

# Define where the photo will be saved
PHOTO_SAVE_PATH = Path(__file__).resolve().parent.parent / "experience" / "images" / "user_photo.jpg"

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

def photo_saver(image, filename=PHOTO_SAVE_PATH):
    success = cv2.imwrite(str(filename), image)
    if not success:
        raise IOError(f"Failed to save photo to {filename}")
    print(f"Photo saved to: {filename}")
    return filename


def taker():
    image = take_photo()
    result = photo_saver(image)
    return result  # Returns a Path object
