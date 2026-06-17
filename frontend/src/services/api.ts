import axios from "axios";

const BASE_URL = "http://localhost:8000";

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
