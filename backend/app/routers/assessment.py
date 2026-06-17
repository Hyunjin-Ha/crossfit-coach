from fastapi import APIRouter, HTTPException
from app.models.assessment import AssessmentRequest, AssessmentResponse
from app.services.assessment import run_assessment

router = APIRouter(prefix="/assessment", tags=["assessment"])


@router.post("/message", response_model=AssessmentResponse)
async def assessment_message(request: AssessmentRequest):
    try:
        messages = [m.model_dump() for m in request.messages]
        result = run_assessment(messages)
        return AssessmentResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
