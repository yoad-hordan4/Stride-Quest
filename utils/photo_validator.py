from fastapi import APIRouter
from pathlib import Path
import imghdr
import cv2
import utils.photo_taker as photo_taker

router = APIRouter()

PHOTO_SAVE_PATH = Path(__file__).resolve().parent.parent / "experience" / "images" / "user_photo.jpg"

def save_photo():
    image = photo_taker.take_photo()
    if image is None:
        return
    cv2.imwrite(str(PHOTO_SAVE_PATH), image)
    
def display_photo():
    photo_taker.display_image(str(PHOTO_SAVE_PATH))