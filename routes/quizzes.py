from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def list_quizzes():
    return [{"id": 1, "location": "Golden Gate", "question_count": 5}]
