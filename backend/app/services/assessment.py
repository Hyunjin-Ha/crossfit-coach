import re
import json
import os
import anthropic
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = """당신은 크로스핏 AI 코치입니다. 처음 만나는 사용자의 운동 실력을 파악하기 위해 대화를 진행합니다.

자연스럽고 친근한 대화로 아래 정보를 파악하세요:
1. 크로스핏 경력 (몇 년/개월)
2. 풀업 가능 여부, 연속 최대 개수
3. 바 머슬업 가능 여부
4. 바벨 최대 중량: 백스쿼트, 데드리프트, 클린 (모르면 괜찮음)
5. 주요 벤치마크 WOD 기록 (Fran, Grace 등 — 모르면 넘어가도 됨)
6. 달리기 페이스 (400m 기준 — 모르면 넘어가도 됨)

경력과 풀업 여부, 바벨 정보 중 하나라도 파악하면 프로필 생성이 가능합니다.
충분히 파악했다고 판단되면 마무리 멘트 후 반드시 아래 형식으로 끝내세요.
[PROFILE_COMPLETE] 다음 줄에 JSON 한 줄 (다른 텍스트 없이):

[PROFILE_COMPLETE]
{"level":"beginner|intermediate|advanced|elite","years_experience":null,"can_do_pullups":true,"pullup_count":10,"can_do_muscle_up":false,"max_back_squat":"80kg","max_deadlift":"100kg","max_clean":"60kg","fran_time":"5:30","running_400m":"90","notes":null}

레벨 기준:
- beginner: 1년 미만 또는 풀업 불가
- intermediate: 1~3년, 풀업 가능, 백스쿼트 체중 이상
- advanced: 3년 이상, 머슬업 가능, 백스쿼트 체중 1.5배 이상
- elite: 대회 출전 수준

모르는 값은 반드시 null로 표기하세요."""


def run_assessment(messages: list[dict]) -> dict:
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=[{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}],
        messages=messages,
    )
    text = response.content[0].text

    if "[PROFILE_COMPLETE]" in text:
        parts = text.split("[PROFILE_COMPLETE]", 1)
        display = parts[0].strip()
        match = re.search(r"\{.*\}", parts[1], re.DOTALL)
        if match:
            try:
                profile = json.loads(match.group())
                message = display or "프로필이 완성되었습니다! 이제 맞춤 코칭을 시작해볼게요."
                return {"message": message, "complete": True, "profile": profile}
            except json.JSONDecodeError:
                pass

    return {"message": text, "complete": False, "profile": None}
