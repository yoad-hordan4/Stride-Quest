from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def list_trails():
    return [{"id": 1, "name": "Golden Gate Loop"}, {"id": 2, "name": "Central Park Explorer"}]
