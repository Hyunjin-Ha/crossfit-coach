from pydantic import BaseModel


class Message(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: list[Message]
    profile: dict | None = None


class ChatResponse(BaseModel):
    message: str
