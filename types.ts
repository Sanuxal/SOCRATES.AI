export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface Attachment {
  name: string;
  mimeType: string;
  data: string; // Base64 string
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  attachments?: Attachment[];
  isStreaming?: boolean;
}

export interface StudySession {
  day: string;
  topic: string;
  activities: string[];
  durationMinutes: number;
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface ReviewQuestion {
  question: string;
  answer: string;
}

export interface StudyPlan {
  subject: string;
  goal: string;
  sessions: StudySession[];
  flashcards: Flashcard[];
  reviewQuestions: ReviewQuestion[];
  tips: string[];
}

export type Priority = 'High' | 'Medium' | 'Low';

export interface Task {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  durationMinutes: number;
  priority: Priority;
  completed: boolean;
}

export interface OptimizedSchedule {
  schedule: string[]; // List of suggested times/ordering
  advice: string;
}

export enum AppMode {
  CHAT = 'CHAT',
  PLANNER = 'PLANNER',
  SMART_PLANNER = 'SMART_PLANNER'
}