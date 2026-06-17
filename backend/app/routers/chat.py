from fastapi import APIRouter, HTTPException
from app.models.chat import ChatRequest, ChatResponse
from app.services.claude import chat

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    if not request.messages:
        raise HTTPException(status_code=400, detail="messages는 비어있을 수 없습니다")
    try:
        messages = [m.model_dump() for m in request.messages]
        reply = chat(messages, request.profile)
        return ChatResponse(message=reply)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
