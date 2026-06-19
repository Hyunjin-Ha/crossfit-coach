from pydantic import BaseModel


class WorkoutLogCreate(BaseModel):
    date: str
    wod_name: str | None = None
    result_type: str | None = None  # 'time' | 'rounds' | 'weight' | 'score'
    result_value: str | None = None
    notes: str | None = None


class WorkoutLogResponse(WorkoutLogCreate):
    id: str
    created_at: str
