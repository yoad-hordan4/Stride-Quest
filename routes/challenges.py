from fastapi import APIRouter, UploadFile, File, Form
from pathlib import Path
from utils.photo_validator import validate_photo

router = APIRouter()

@router.post("/validate")
async def validate_challenge(image: UploadFile = File(...), keyword: str = Form(...)):
    """Validate an uploaded photo against an expected location keyword."""
    temp_path = Path("/tmp") / image.filename
    with temp_path.open("wb") as f:
        f.write(await image.read())
    is_valid = validate_photo(str(temp_path), keyword)
    return {"valid": is_valid}

