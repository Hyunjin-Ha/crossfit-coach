from pydantic import BaseModel


class Exercise(BaseModel):
    name: str
    sets: int | None = None
    reps: int | None = None
    weight: str | None = None
    duration: str | None = None
    notes: str | None = None


class WOD(BaseModel):
    date: str | None = None
    type: str | None = None  # AMRAP, For Time, EMOM, etc.
    time_cap: str | None = None
    exercises: list[Exercise]
    notes: str | None = None


class ParseProgramResponse(BaseModel):
    id: str | None = None
    wods: list[WOD]
    raw_text: str
