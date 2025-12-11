import { GoogleGenAI, Type, Schema, Content } from "@google/genai";
import { Attachment, Message, Role, StudyPlan, Flashcard, ReviewQuestion, Task, OptimizedSchedule } from "../types";

// Initialize the API client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = "gemini-2.5-flash";

const SYSTEM_INSTRUCTION_SOCRATIC = `
Eres SócratesAI, un tutor educativo paciente, sabio y alentador.
TU MODO ACTUAL ES: SOCRÁTICO.

IMPORTANTE - IDIOMA:
1. Detecta automáticamente el idioma del usuario o de los apuntes adjuntos (Español, Catalán, Inglés, Euskera, Gallego, etc.).
2. RESPONDE SIEMPRE EN EL MISMO IDIOMA QUE EL USUARIO O SUS APUNTES. Si el usuario cambia de idioma, cambia tú también.

REGLAS PEDAGÓGICAS:
1. NO des respuestas directas. Guía al estudiante con preguntas.
2. Desglosa problemas complejos.
3. Si el estudiante sube apuntes, úsalos como referencia principal y respeta la terminología en su idioma.
4. Tu objetivo es el pensamiento crítico del alumno.
`;

const SYSTEM_INSTRUCTION_NORMAL = `
Eres SócratesAI, un asistente educativo eficiente y directo.
TU MODO ACTUAL ES: ASISTENTE DIRECTO.

IMPORTANTE - IDIOMA:
1. Detecta automáticamente el idioma del usuario o de los apuntes adjuntos (Español, Catalán, Inglés, Euskera, Gallego, etc.).
2. RESPONDE SIEMPRE EN EL MISMO IDIOMA QUE EL USUARIO O SUS APUNTES. Si el usuario cambia de idioma, cambia tú también.

REGLAS:
1. Responde a las preguntas de forma clara, concisa y directa.
2. Explica conceptos detalladamente sin dar rodeos innecesarios.
3. Si el estudiante pide la solución, dásela con una explicación paso a paso.
4. Sé útil y práctico.
`;

const SYSTEM_INSTRUCTION_PLANNER = `
Eres un experto pedagogo y creador de currículos especializado en preparación de exámenes.
Tu objetivo es analizar la información proporcionada (incluyendo apuntes adjuntos) y crear un "Kit de Supervivencia para el Examen" completo.

IDIOMA: Genera TODO el contenido (plan, tarjetas, preguntas) estrictamente en el mismo idioma en el que estén los apuntes adjuntos o la descripción del tema proporcionada por el usuario (ej. Si son apuntes en Catalán, el plan debe ser en Catalán).

Debes generar un calendario estricto basado en los días exactos que faltan.
`;

export const streamChatResponse = async (
  currentHistory: Message[],
  newMessage: string,
  attachments: Attachment[],
  isSocraticMode: boolean,
  onChunk: (text: string) => void
): Promise<string> => {
  
  const historyForApi: Content[] = currentHistory.map(msg => ({
    role: msg.role,
    parts: [
      ...((msg.attachments || []).map(att => ({
        inlineData: {
          mimeType: att.mimeType,
          data: att.data
        }
      }))),
      { text: msg.text }
    ]
  }));

  const chat = ai.chats.create({
    model: MODEL_NAME,
    config: {
      systemInstruction: isSocraticMode ? SYSTEM_INSTRUCTION_SOCRATIC : SYSTEM_INSTRUCTION_NORMAL,
    },
    history: historyForApi
  });

  const parts: any[] = [{ text: newMessage }];
  attachments.forEach(att => {
    parts.push({
      inlineData: {
        mimeType: att.mimeType,
        data: att.data
      }
    });
  });

  const result = await chat.sendMessageStream({ 
    message: { 
      role: 'user', 
      parts: parts 
    } 
  });

  let fullText = "";
  for await (const chunk of result) {
    const chunkText = chunk.text;
    if (chunkText) {
      fullText += chunkText;
      onChunk(fullText);
    }
  }

  return fullText;
};

export const generateStudyPlan = async (
  subject: string,
  examDate: string,
  daysRemaining: number,
  topics: string,
  hoursPerWeek: number,
  attachments: Attachment[]
): Promise<StudyPlan> => {
  
  const textPrompt = `
    Crea un plan de estudio maestro.
    Materia: ${subject}.
    Fecha del examen: ${examDate} (Faltan ${daysRemaining} días).
    Temas clave: ${topics}.
    Disponibilidad: ${hoursPerWeek} horas por semana.
    
    IMPORTANTE: Analiza el idioma de los "Temas clave" y de los "Adjuntos" (si los hay). Genera todo el JSON (textos, preguntas, consejos) en ese idioma.
    
    El plan debe cubrir exactamente ${daysRemaining} días (o los necesarios dentro de ese rango) para llegar preparado a la fecha.
    Distribuye la carga de forma inteligente.
    
    Genera un JSON con:
    1. Planificación de sesiones.
    2. 5-10 Flashcards clave.
    3. 5 Preguntas de repaso.
    4. 3 Consejos.
  `;

  const parts: any[] = [{ text: textPrompt }];
  attachments.forEach(att => {
    parts.push({
      inlineData: {
        mimeType: att.mimeType,
        data: att.data
      }
    });
  });

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      subject: { type: Type.STRING },
      goal: { type: Type.STRING },
      sessions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            day: { type: Type.STRING },
            topic: { type: Type.STRING },
            activities: { type: Type.ARRAY, items: { type: Type.STRING } },
            durationMinutes: { type: Type.INTEGER }
          },
          required: ["day", "topic", "activities", "durationMinutes"]
        }
      },
      flashcards: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            front: { type: Type.STRING },
            back: { type: Type.STRING }
          },
          required: ["front", "back"]
        }
      },
      reviewQuestions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            answer: { type: Type.STRING }
          },
          required: ["question", "answer"]
        }
      },
      tips: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    },
    required: ["subject", "goal", "sessions", "flashcards", "reviewQuestions", "tips"]
  };

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: { parts: parts },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION_PLANNER,
      responseMimeType: "application/json",
      responseSchema: responseSchema
    }
  });

  if (!response.text) {
    throw new Error("No se pudo generar el plan.");
  }

  return JSON.parse(response.text) as StudyPlan;
};

export const generateMoreFlashcards = async (subject: string, topics: string, existingCount: number): Promise<Flashcard[]> => {
  const prompt = `
  Contexto: Materia ${subject}, Temas: ${topics}.
  Tarea: Genera 5 flashcards ADICIONALES y NUEVAS.
  Idioma: IMPORTANTE. Detecta el idioma del texto en 'Materia' y 'Temas'. Genera las flashcards EN ESE MISMO IDIOMA.
  No repitas conceptos básicos si ya hay ${existingCount} creadas. Busca detalles importantes.`;

  const responseSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        front: { type: Type.STRING },
        back: { type: Type.STRING }
      },
      required: ["front", "back"]
    }
  };

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema
    }
  });

  return JSON.parse(response.text || "[]") as Flashcard[];
};

export const generateMoreQuestions = async (subject: string, topics: string): Promise<ReviewQuestion[]> => {
  const prompt = `
  Contexto: Materia ${subject}, Temas: ${topics}.
  Tarea: Genera 3 preguntas de repaso NUEVAS y desafiantes.
  Idioma: IMPORTANTE. Detecta el idioma del texto en 'Materia' y 'Temas'. Genera las preguntas EN ESE MISMO IDIOMA.`;

  const responseSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        question: { type: Type.STRING },
        answer: { type: Type.STRING }
      },
      required: ["question", "answer"]
    }
  };

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema
    }
  });

  return JSON.parse(response.text || "[]") as ReviewQuestion[];
};

// --- SMART PLANNER FUNCTIONS ---

export const estimateTaskDuration = async (taskDescription: string): Promise<number> => {
  const prompt = `
  Actúa como un planificador experto.
  Tarea: "${taskDescription}".
  Estima cuánto tiempo en MINUTOS tomaría completar esta tarea de forma realista y enfocada para un estudiante promedio.
  Devuelve SOLO un número entero (ej. 45). Nada más.
  `;
  
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "text/plain"
    }
  });

  const text = response.text?.trim() || "30";
  const minutes = parseInt(text.replace(/[^0-9]/g, ''), 10);
  return isNaN(minutes) ? 30 : minutes;
};

export const optimizeDailySchedule = async (tasks: Task[], date: string): Promise<OptimizedSchedule> => {
  const prompt = `
  Eres un experto en gestión del tiempo y productividad personal.
  Fecha: ${date}.
  Lista de tareas del usuario:
  ${JSON.stringify(tasks.map(t => ({ title: t.title, duration: t.durationMinutes, priority: t.priority, time: t.time })))}

  Objetivo:
  1. Organizar estas tareas en un orden lógico para maximizar productividad (considera prioridades).
  2. Sugerir un horario o secuencia.
  3. Dar un consejo breve y motivador en el idioma de las tareas.

  Salida JSON esperada:
  {
    "schedule": ["09:00 - Tarea 1", "10:30 - Tarea 2"...],
    "advice": "Texto del consejo..."
  }
  `;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      schedule: { type: Type.ARRAY, items: { type: Type.STRING } },
      advice: { type: Type.STRING }
    },
    required: ["schedule", "advice"]
  };

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema
    }
  });

  return JSON.parse(response.text || '{"schedule": [], "advice": "No pude optimizar el horario."}') as OptimizedSchedule;
};