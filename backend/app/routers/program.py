from fastapi import APIRouter, UploadFile, File, HTTPException
from app.models.program import ParseProgramResponse
from app.services.claude import parse_program_image

router = APIRouter(prefix="/program", tags=["program"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}


@router.post("/parse", response_model=ParseProgramResponse)
async def parse_program(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="jpg, png, gif, webp만 업로드 가능합니다")
    contents = await file.read()
    try:
        result = parse_program_image(contents, file.content_type)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
