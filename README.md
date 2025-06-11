# StrideQuest

StrideQuest is a demo FastAPI service providing location-based trail experiences. The service exposes endpoints under `/trails`, `/quizzes`, and `/challenges` while serving a small frontend from `/experience`.

## Setup

1. Install Python 3.9+.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
   Required packages include `geopy`, `fastapi`, `uvicorn[standard]`, `setuptools`, and `starlette`.

## Running the API

Start the application with `uvicorn`:
```bash
uvicorn main:app --reload
```
This launches the API at `http://127.0.0.1:8000`. API docs are available at `/docs`.

## Frontend

The frontend assets live in the `experience/` directory. Once the API is running, open:
```
http://127.0.0.1:8000/experience/
```
This page lets you find nearby trails, view details, and play through checkpoints.

