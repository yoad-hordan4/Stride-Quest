from fastapi import APIRouter, UploadFile, File, Form
from pathlib import Path
from utils.photo_validator import validate_photo, score_photo, SCORE_THRESHOLD

router = APIRouter()

@router.post("/validate")
async def validate_challenge(image: UploadFile = File(...), keyword: str = Form(...)):
    """Validate an uploaded photo by comparing it to a reference image."""
    temp_path = Path("/tmp") / image.filename
    with temp_path.open("wb") as f:
        f.write(await image.read())

    # Basic checks first
    if not validate_photo(str(temp_path), keyword):
        return {"valid": False, "score": 0.0}

    score = score_photo(str(temp_path), keyword)
    if score is None:
        return {"valid": False, "score": 0.0}

    is_valid = score >= SCORE_THRESHOLD
    return {"valid": is_valid, "score": round(score, 3)}

