from fastapi import FastAPI
from routes import quizzes, trails
from routes import trails
from fastapi.staticfiles import StaticFiles
from pathlib import Path

app = FastAPI(
    title="StrideQuest API",
    description="API for interactive, location-based trail experiences",
    version="0.1.0"
)

# Mount frontend
experience_dir = Path(__file__).resolve().parents[1] / "experience"
app.mount("/experience", StaticFiles(directory=experience_dir, html=True), name="experience")

# Include modular routes
app.include_router(trails.router, prefix="/trails", tags=["Trails"])
app.include_router(quizzes.router, prefix="/quizzes", tags=["Quizzes"])


@app.get("/")
def home():
    return {"message": "Welcome to StrideQuest API"}
