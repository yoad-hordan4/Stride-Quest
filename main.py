from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from routes import quizzes, trails
from pathlib import Path

app = FastAPI(
    title="StrideQuest API",
    description="API for interactive, location-based trail experiences",
    version="0.1.0"
)

# ✅ Fix CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can restrict to ["http://127.0.0.1:8000"] later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Mount frontend
experience_dir = Path(__file__).resolve().parent / "experience"
app.mount("/experience", StaticFiles(directory=experience_dir, html=True), name="experience")

# ✅ API Routes
app.include_router(trails.router, prefix="/trails", tags=["Trails"])
app.include_router(quizzes.router, prefix="/quizzes", tags=["Quizzes"])

@app.get("/", include_in_schema=False)
def home():
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/experience/")
