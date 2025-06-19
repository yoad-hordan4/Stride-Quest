from pathlib import Path
from typing import Optional

from PIL import Image, UnidentifiedImageError

import cv2

# Map challenge keywords to reference images bundled with the experience
IMAGE_DIR = Path(__file__).resolve().parent.parent / "experience" / "images"
KEYWORD_IMAGES = {
    "springs": "yarkon.jpg",
    "aqueduct": "caesarea.jpg",
    "viewpoint": "masada.jpg",
    "warehouse": "default-stridequest.jpg",
}

SCORE_THRESHOLD = 0.5


def validate_photo(image_path: str, keyword: str) -> bool:
    """Simple placeholder validation for location photos.

    Checks that the image exists, is a valid image type, and that the
    filename contains the expected keyword. A real implementation would
    use computer vision to analyze the scene.
    """
    path = Path(image_path)
    if not path.exists():
        return False
    try:
        with Image.open(path) as img:
            img.verify()
    except (UnidentifiedImageError, OSError):
        return False
    return keyword.lower().replace(" ", "") in path.stem.lower()


def image_similarity(img1_path: str, img2_path: str) -> float:
    """Compute a rough similarity score between two images using ORB features."""
    img1 = cv2.imread(img1_path, cv2.IMREAD_GRAYSCALE)
    img2 = cv2.imread(img2_path, cv2.IMREAD_GRAYSCALE)
    if img1 is None or img2 is None:
        return 0.0

    orb = cv2.ORB_create()
    kp1, des1 = orb.detectAndCompute(img1, None)
    kp2, des2 = orb.detectAndCompute(img2, None)
    if des1 is None or des2 is None:
        return 0.0

    bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
    matches = bf.match(des1, des2)
    if not matches:
        return 0.0
    good_matches = [m for m in matches if m.distance < 50]
    score = len(good_matches) / max(len(kp1), len(kp2))
    return float(score)


def score_photo(image_path: str, keyword: str) -> Optional[float]:
    """Return a similarity score between uploaded photo and reference image."""
    ref_name = KEYWORD_IMAGES.get(keyword.lower())
    if not ref_name:
        return None
    ref_path = IMAGE_DIR / ref_name
    if not ref_path.exists():
        return None
    return image_similarity(str(image_path), str(ref_path))

