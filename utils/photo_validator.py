from pathlib import Path
import imghdr
import photo_taker
import cv2

PATH_TO_IMAGES = Path(__file__).resolve().parent.parent / "experience" / "images" / "sample_img.jpg"

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

def save_photo(): # saves photo to experience/images
    image = photo_taker.take_photo()
    photo_taker.photo_saver(image, PATH_TO_IMAGES)

def show_photo(image):
    if isinstance(image, str):
        image = cv2.imread(PATH_TO_IMAGES)  #notice that the images directory is not in this files
        if image is None:
            print(f"Failed to load image from path: {image}")
            return
    
    if image is None:
        print("No image to display")
        return
    
    cv2.imshow("Captured Image", image)
    cv2.waitKey(0)
    cv2.destroyAllWindows()