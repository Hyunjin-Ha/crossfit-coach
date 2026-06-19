from fastapi import APIRouter, HTTPException
from app.models.workout import WorkoutLogCreate, WorkoutLogResponse
from app.services.db import save_workout, load_workouts, delete_workout

router = APIRouter(prefix="/workouts", tags=["workouts"])


@router.post("", response_model=WorkoutLogResponse)
async def create_workout(body: WorkoutLogCreate):
    try:
        record = save_workout(body.model_dump())
        return WorkoutLogResponse(**record)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=list[WorkoutLogResponse])
async def get_workouts():
    try:
        return load_workouts()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{workout_id}")
async def remove_workout(workout_id: str):
    try:
        delete_workout(workout_id)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
