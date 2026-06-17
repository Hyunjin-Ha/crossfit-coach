import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

_client: Client | None = None


def get_client() -> Client:
    global _client
    if _client is None:
        url = os.getenv("SUPABASE_URL", "")
        key = os.getenv("SUPABASE_KEY", "")
        _client = create_client(url, key)
    return _client


def save_message(role: str, body: str):
    get_client().table("chat_messages").insert({"msg_role": role, "msg_body": body}).execute()


def load_messages(limit: int = 100) -> list[dict]:
    res = get_client().table("chat_messages").select("msg_role, msg_body, created_at").order("created_at").limit(limit).execute()
    return [{"role": r["msg_role"], "content": r["msg_body"]} for r in res.data]


def save_program(raw_text: str, wods: list) -> dict:
    res = get_client().table("programs").insert({"raw_text": raw_text, "wods": wods}).execute()
    return res.data[0]


def load_programs(limit: int = 20) -> list[dict]:
    res = get_client().table("programs").select("*").order("created_at", desc=True).limit(limit).execute()
    return res.data
