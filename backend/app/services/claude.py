import os
import json
import base64
import anthropic
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = """당신은 전문 크로스핏 AI 코치입니다.
운동 프로그램, WOD(Workout of the Day), 스케일링 옵션, 영양 조언을 제공합니다.
답변은 한국어로 하되 운동 용어는 영어를 병기합니다.
사용자 프로필이 있는 경우 반드시 해당 실력 수준에 맞게 스케일링 옵션, 중량, 운동량을 개인화하세요."""

PARSE_PROMPT = """이 이미지는 크로스핏 운동 프로그램입니다.
이미지에서 운동 내용을 읽어서 아래 JSON 형식으로 반환하세요.
다른 설명 없이 JSON만 반환하세요.

{
  "raw_text": "이미지에서 읽은 원본 텍스트",
  "wods": [
    {
      "date": "날짜 (없으면 null)",
      "type": "AMRAP / For Time / EMOM / 기타",
      "time_cap": "시간 제한 (없으면 null)",
      "exercises": [
        {
          "name": "운동 이름",
          "sets": 세트수 또는 null,
          "reps": 횟수 또는 null,
          "weight": "무게 (없으면 null)",
          "duration": "시간 (없으면 null)",
          "notes": "특이사항 (없으면 null)"
        }
      ],
      "notes": "기타 메모 (없으면 null)"
    }
  ]
}"""


def chat(messages: list[dict], profile: dict | None = None) -> str:
    system_text = SYSTEM_PROMPT
    if profile:
        profile_str = json.dumps(profile, ensure_ascii=False)
        system_text += f"\n\n## 사용자 피트니스 프로필\n{profile_str}"

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=[
            {
                "type": "text",
                "text": system_text,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=messages,
    )
    return response.content[0].text


def parse_program_image(image_data: bytes, media_type: str) -> dict:
    b64 = base64.standard_b64encode(image_data).decode("utf-8")
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": b64,
                        },
                    },
                    {"type": "text", "text": PARSE_PROMPT},
                ],
            }
        ],
    )
    text = response.content[0].text
    # JSON 블록만 추출
    if "```" in text:
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())
