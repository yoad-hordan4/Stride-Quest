from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from pathlib import Path
import utils.photo_taker as photo_taker

# Full absolute path to where we save the photo
PHOTO_SAVE_PATH = Path(__file__).resolve().parent / "experience" / "images" / "user_photo.jpg"

app = FastAPI(
    title="TrailQuest Photo API",
    description="Capture and display a photo via FastAPI",
    version="0.0.1"
)

# Serve images from the 'experience/images' directory at the '/images' URL path
app.mount("/images", StaticFiles(directory="experience/images"), name="images")

@app.get("/", response_class=HTMLResponse, include_in_schema=False)
def home():
    result_path = photo_taker.taker()
    relative_url = "/images/" + result_path.name

    return f"""
    <html>
        <body>
            <h1>Photo Taken Successfully!</h1>
            <img src="{relative_url}" alt="Captured Photo" style="width:50%; border-radius:8px;">
        </body>
    </html>
    """


def only_taker():
    image = photo_taker.take_photo()
    result = photo_taker.photo_saver(image)
    return result  # Returns a Path object


"""
def take_photo_in_web():
    image = valid.save_photo()
    if image is None or image.size == 0:
        print("Failed to capture a valid image.")
        return {"success": False, "message": "No image captured"}
    
    cv2.imshow("Captured Image", image)
    cv2.waitKey(0)  # Wait for a key press to close the window
    cv2.destroyAllWindows()
    return {"success": True, "message": "Photo displayed successfully"}

def display_photo_in_web():
    photo_path = valid.PHOTO_SAVE_PATH
    if not photo_path.exists():
        print("No photo to display.")
        return {"success": False, "message": "No photo found"}
    
    # Return the URL of the photo
    photo_url = f"/images/{photo_path.name}"
    return {"success": True, "message": "Photo found", "photo_url": photo_url}"""