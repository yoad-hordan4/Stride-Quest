from fastapi import FastAPI
from routes import quizzes, trails
from routes import trails
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI()

# Mount frontend
frontend_path = os.path.join(os.path.dirname(__file__), "..", "experience")
app.mount("/experience", StaticFiles(directory=frontend_path, html=True), name="experience")

app = FastAPI(
    title="StrideQuest API",
    description="API for interactive, location-based trail experiences",
    version="0.1.0"
)

# Include modular routes
app.include_router(trails.router, prefix="/trails", tags=["Trails"])
app.include_router(quizzes.router, prefix="/quizzes", tags=["Quizzes"])


@app.get("/")
def home():
    return {"message": "Welcome to StrideQuest API"}
