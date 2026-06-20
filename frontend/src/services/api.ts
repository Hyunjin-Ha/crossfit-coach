import axios from "axios";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://crossfit-coach-ggb0.onrender.com";

const api = axios.create({ baseURL: BASE_URL });

export type Message = { role: "user" | "assistant"; content: string };

export type FitnessProfile = {
  level: string;
  years_experience: number | null;
  can_do_pullups: boolean | null;
  pullup_count: number | null;
  can_do_muscle_up: boolean | null;
  max_back_squat: string | null;
  max_deadlift: string | null;
  max_clean: string | null;
  fran_time: string | null;
  running_400m: string | null;
  notes: string | null;
};

export type AssessmentResult = {
  message: string;
  complete: boolean;
  profile: FitnessProfile | null;
};

export async function sendChat(messages: Message[], profile?: FitnessProfile | null): Promise<string> {
  const res = await api.post("/chat", { messages, profile: profile ?? null });
  return res.data.message;
}

export async function sendAssessmentMessage(messages: Message[]): Promise<AssessmentResult> {
  const res = await api.post("/assessment/message", { messages });
  return res.data;
}

export async function parseProgram(imageUri: string, mimeType: string) {
  const formData = new FormData();
  formData.append("file", {
    uri: imageUri,
    type: mimeType,
    name: "program.jpg",
  } as any);
  const res = await api.post("/program/parse", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export type WorkoutLog = {
  id: string;
  created_at: string;
  date: string;
  wod_name: string | null;
  result_type: string | null;
  result_value: string | null;
  notes: string | null;
};

export type WorkoutLogCreate = Omit<WorkoutLog, "id" | "created_at">;

export async function getWorkouts(): Promise<WorkoutLog[]> {
  const res = await api.get("/workouts");
  return res.data;
}

export async function createWorkout(data: WorkoutLogCreate): Promise<WorkoutLog> {
  const res = await api.post("/workouts", data);
  return res.data;
}

export async function deleteWorkout(id: string): Promise<void> {
  await api.delete(`/workouts/${id}`);
}

export type WodExtracted = {
  wod_name: string | null;
  movements: string;
  result_type: "time" | "rounds" | "weight" | "score";
  notes: string | null;
};

export async function extractWodFromImage(
  imageBase64: string,
  mediaType: string
): Promise<WodExtracted> {
  const res = await api.post("/workouts/from-image", {
    images: [{ image_base64: imageBase64, media_type: mediaType }],
  });
  return res.data;
}
