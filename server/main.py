from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import anthropic
import os
import json
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

app = FastAPI(title="CrossFit AI Coach API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

claude = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

SYSTEM_PROMPT = """당신은 전문 크로스핏 AI 코치입니다. 선수의 실력 데이터를 기반으로 구체적인 처방을 내립니다.

역할:
- 오늘의 WOD 설명 및 전략 조언
- 스케일링 옵션 제시
- 자세 및 기술 조언
- 영양/식단 가이드
- 회복 및 부상 예방

중요 규칙:
- 선수 프로필이 있으면 반드시 1RM 기반으로 실제 무게를 계산해서 제시하세요
  예: "백스쿼트 1RM 130kg → 오늘 85% = 110kg 사용"
- 퍼센티지만 말하지 말고 실제 kg 수를 항상 병기하세요
- 선수의 약점과 강점을 파악해서 맞춤 조언하세요
- 선수 프로필이 없으면 벤치마크 인테이크를 먼저 권유하세요

응답 스타일:
- 친근하고 격려하는 톤
- 구체적이고 실용적인 조언
- 한국어로 답변
- 마크다운 절대 사용 금지 (**, ##, --, 표, 코드블록 등 사용하지 말 것)
- 이모지도 최소화, 꼭 필요할 때만"""

BENCHMARK_PROMPT = """당신은 전문 크로스핏 AI 코치입니다. 지금은 선수의 현재 실력을 파악하는 인테이크 세션입니다.

다음 항목들을 자연스러운 대화로 하나씩 물어보세요. 한 번에 여러 개 묻지 말고, 답변 받으면 다음으로 넘어가세요:

1. 백스쿼트 1RM (또는 3RM/5RM 중 아는 것)
2. 데드리프트 1RM
3. 클린 1RM (파워클린도 OK)
4. 스내치 1RM
5. 스트릭트 프레스 1RM
6. 풀업 능력 (스트릭트 몇 개, 킵핑 가능 여부, 밴드 사용 여부)
7. 더블언더 (가능 여부, 최대 연속 횟수)
8. 핸드스탠드 푸시업 (가능 여부)
9. 벤치마크 WOD 기록 — Fran(21-15-9 스러스터+풀업), Grace(클린&저크 30개) 중 해본 것

모든 항목을 다 물어본 뒤 마지막에 전체 요약을 깔끔하게 정리해서 보여주세요.
모르는 항목은 "모름" 또는 "미측정"으로 처리하세요.
마지막 요약 메시지 맨 끝에 반드시 "[[BENCHMARK_COMPLETE]]" 를 추가하세요.
한국어로 친근하게 대화하세요.
마크다운 사용 금지 (**, ##, 표, 코드블록 등). 일반 텍스트로만 작성하세요."""

PARSE_PROMPT = """아래 크로스핏 벤치마크 요약을 JSON으로 파싱하세요. JSON만 응답하고 설명은 쓰지 마세요.

{
  "back_squat_1rm": 숫자 또는 null,
  "deadlift_1rm": 숫자 또는 null,
  "clean_1rm": 숫자 또는 null,
  "snatch_1rm": 숫자 또는 null,
  "strict_press_1rm": 숫자 또는 null,
  "pullup_strict": 숫자 또는 null,
  "pullup_kipping": true 또는 false 또는 null,
  "double_under": true 또는 false 또는 null,
  "double_under_max": 숫자 또는 null,
  "hspu": true 또는 false 또는 null,
  "fran_time": "MM:SS" 또는 null,
  "grace_time": "MM:SS" 또는 null,
  "raw_summary": "원문 요약 전체"
}

모르거나 미측정인 값은 null로 처리하세요."""


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[Message]
    device_id: str | None = None
    mode: str = "chat"
    wod_context: str | None = None


class ProfileSaveRequest(BaseModel):
    device_id: str
    summary: str


class WorkoutLogCreate(BaseModel):
    date: str
    wod_name: str | None = None
    result_type: str | None = None
    result_value: str | None = None
    notes: str | None = None


class ImageAnalyzeRequest(BaseModel):
    image_base64: str
    media_type: str = "image/jpeg"


@app.get("/")
def root():
    return {"status": "ok"}


@app.get("/profile/{device_id}")
def get_profile(device_id: str):
    res = supabase.table("athlete_profiles").select("*").eq("device_id", device_id).maybe_single().execute()
    return {"profile": res.data}


@app.post("/profile")
def save_profile(req: ProfileSaveRequest):
    parse_res = claude.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        messages=[{"role": "user", "content": f"{PARSE_PROMPT}\n\n---\n{req.summary}"}],
    )
    try:
        benchmark = json.loads(parse_res.content[0].text)
    except Exception:
        benchmark = {"raw_summary": req.summary}

    supabase.table("athlete_profiles").upsert(
        {"device_id": req.device_id, "benchmark": benchmark},
        on_conflict="device_id",
    ).execute()

    return {"ok": True, "benchmark": benchmark}


WOD_EXTRACT_PROMPT = """이 이미지에서 크로스핏 WOD(오늘의 운동) 정보를 추출하세요. JSON만 응답하고 다른 텍스트는 쓰지 마세요.

{
  "wod_name": "WOD 이름 (예: Fran, Helen, 날짜/코드명) 또는 null",
  "movements": "운동 동작과 횟수 전체 내용 (예: 21-15-9 Thrusters 43kg, Pull-ups)",
  "result_type": "time 또는 rounds 또는 weight 또는 score 중 하나",
  "notes": "타임캡, 스케일 옵션, 추가 정보 등"
}

WOD를 찾을 수 없으면: {"error": "WOD를 찾을 수 없습니다"}"""


@app.get("/workouts")
def get_workouts():
    res = supabase.table("workout_logs").select("*").order("date", desc=True).execute()
    return res.data


@app.post("/workouts")
def create_workout(log: WorkoutLogCreate):
    res = supabase.table("workout_logs").insert(log.model_dump()).execute()
    return res.data[0]


@app.delete("/workouts/{log_id}")
def delete_workout(log_id: str):
    supabase.table("workout_logs").delete().eq("id", log_id).execute()
    return {"ok": True}


@app.post("/workouts/from-image")
def extract_wod_from_image(req: ImageAnalyzeRequest):
    response = claude.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": req.media_type,
                        "data": req.image_base64,
                    },
                },
                {"type": "text", "text": WOD_EXTRACT_PROMPT},
            ],
        }],
    )
    try:
        return json.loads(response.content[0].text)
    except Exception:
        return {"error": "WOD 파싱에 실패했습니다"}


def build_context(profile: dict | None) -> str:
    if not profile or not profile.get("benchmark"):
        return ""
    b = profile["benchmark"]
    lines = ["[선수 벤치마크 프로필]"]
    if b.get("back_squat_1rm"):    lines.append(f"백스쿼트 1RM: {b['back_squat_1rm']}kg")
    if b.get("deadlift_1rm"):      lines.append(f"데드리프트 1RM: {b['deadlift_1rm']}kg")
    if b.get("clean_1rm"):         lines.append(f"클린 1RM: {b['clean_1rm']}kg")
    if b.get("snatch_1rm"):        lines.append(f"스내치 1RM: {b['snatch_1rm']}kg")
    if b.get("strict_press_1rm"):  lines.append(f"스트릭트 프레스 1RM: {b['strict_press_1rm']}kg")
    if b.get("pullup_strict") is not None:
        lines.append(f"스트릭트 풀업: {b['pullup_strict']}개")
    if b.get("pullup_kipping") is not None:
        lines.append(f"킵핑 풀업: {'가능' if b['pullup_kipping'] else '불가'}")
    if b.get("double_under_max") is not None:
        lines.append(f"더블언더 최대: {b['double_under_max']}개")
    if b.get("hspu") is not None:
        lines.append(f"HSPU: {'가능' if b['hspu'] else '불가'}")
    if b.get("fran_time"):         lines.append(f"Fran 기록: {b['fran_time']}")
    if b.get("grace_time"):        lines.append(f"Grace 기록: {b['grace_time']}")
    if b.get("raw_summary"):       lines.append(f"\n[전체 요약]\n{b['raw_summary']}")
    return "\n".join(lines)


@app.post("/chat")
def chat(request: ChatRequest):
    profile = None
    if request.device_id and request.mode != "benchmark_intake":
        res = supabase.table("athlete_profiles").select("benchmark").eq("device_id", request.device_id).maybe_single().execute()
        profile = res.data

    if request.mode == "benchmark_intake":
        system = BENCHMARK_PROMPT
    else:
        context = build_context(profile)
        wod_ctx = f"\n\n[오늘의 WOD]\n{request.wod_context}" if request.wod_context else ""
        system = SYSTEM_PROMPT + (f"\n\n{context}" if context else "") + wod_ctx

    def generate():
        with claude.messages.stream(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            system=system,
            messages=[{"role": m.role, "content": m.content} for m in request.messages],
        ) as stream:
            for text in stream.text_stream:
                yield text

    return StreamingResponse(generate(), media_type="text/plain")
