from fastapi import APIRouter
from pathlib import Path
import imghdr
import cv2
from utils.photo_taker import take_photo
from utils.photo_validator import validate_photo

router = APIRouter()

PHOTO_SAVE_PATH = Path(__file__).resolve().parent.parent / "experience" / "images" / "user_photo.jpg"

@router.post("/take-photo")
def take_and_save_photo():
    image = take_photo()
    if image is None:
        return {"success": False, "message": "Failed to take photo"}
    
    # Save the photo
    cv2.imwrite(str(PHOTO_SAVE_PATH), image)
    return {"success": True, "message": "Photo taken successfully", "photo_path": str(PHOTO_SAVE_PATH)}

@router.post("/validate-photo")
def validate_user_photo(keyword: str):
    is_valid = validate_photo(str(PHOTO_SAVE_PATH), keyword)
    return {"success": is_valid, "message": "Photo validation complete"}