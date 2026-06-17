from pydantic import BaseModel


class AssessmentMessage(BaseModel):
    role: str
    content: str


class AssessmentRequest(BaseModel):
    messages: list[AssessmentMessage]


class FitnessProfile(BaseModel):
    level: str
    years_experience: float | None = None
    can_do_pullups: bool | None = None
    pullup_count: int | None = None
    can_do_muscle_up: bool | None = None
    max_back_squat: str | None = None
    max_deadlift: str | None = None
    max_clean: str | None = None
    fran_time: str | None = None
    running_400m: str | None = None
    notes: str | None = None


class AssessmentResponse(BaseModel):
    message: str
    complete: bool = False
    profile: FitnessProfile | None = None
