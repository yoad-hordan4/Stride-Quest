from pathlib import Path
import imghdr

def validate_photo(image_path: str, keyword: str) -> bool:
    """Simple placeholder validation for location photos.

    Checks that the image exists, is a valid image type, and that the
    filename contains the expected keyword. A real implementation
    would use computer vision to match the scenery.
    """
    path = Path(image_path)
    if not path.exists():
        return False
    if imghdr.what(path) is None:
        return False
    return keyword.lower().replace(" ", "") in path.stem.lower()

