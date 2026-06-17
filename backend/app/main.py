from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.routers import chat, program, assessment

load_dotenv()

app = FastAPI(title="CrossFit AI Coach API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(program.router)
app.include_router(assessment.router)


@app.get("/")
def health_check():
    return {"status": "ok"}
