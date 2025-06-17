import cv2
import time

def take_photo():
    cam = cv2.VideoCapture(0)
    
    if not cam.isOpened():
        print("Failed to open the camera")
        return
    time.sleep(0.1)
    # Capture a single frame
    result, image = cam.read()
    if not result:
        print("Failed to capture image")
        return
    cam.release()
    return image


def retake_photo():
    print("Retaking photo...")
    return take_photo()

def display_image(image):
    cv2.imshow("Captured Image", image)
    cv2.waitKey(0)  # Wait for a key press to close the window
    cv2.destroyAllWindows()
    
def photo_saver(image, filename):
    """Saves the captured image to a file."""
    cv2.imwrite(filename, image)
    print(f"Photo saved as {filename}")
    return filename