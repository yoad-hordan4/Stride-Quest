from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from routes import quizzes, trails
from routes import challenges
from pathlib import Path
import utils.photo_taker as photo_taker

app = FastAPI(
    title="StrideQuest API",
    description="API for interactive, location-based trail experiences",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount frontend
experience_dir = Path(__file__).resolve().parent / "experience"
app.mount("/experience", StaticFiles(directory=experience_dir, html=True), name="experience")

app.include_router(trails.router, prefix="/trails", tags=["Trails"])
app.include_router(quizzes.router, prefix="/quizzes", tags=["Quizzes"])
app.include_router(challenges.router, prefix="/challenges", tags=["Challenges"])

# Automatic redirection to experience
@app.get("/", include_in_schema=False)
def home():
    """Redirect the root URL to the frontend experience."""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/experience/")


@app.post("/take-photo")
def take_photo():
    """Capture a photo using the webcam and return its URL."""
    result_path = photo_taker.taker()
    relative_url = "/experience/images/" + result_path.name
    return {"photo_url": relative_url}
