
import { GoogleGenAI, Type, Schema, LiveServerMessage, Modality, FunctionDeclaration, Tool } from "@google/genai";
import { EmotionalProfile, StyleSuggestion, FutureLetter } from "../types";

// --- TEXT GENERATION HELPERS ---

export const generateEmotionalAnalysis = async (textInput: string): Promise<EmotionalProfile> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Проаналізуй наступне висловлювання або нотатки клієнта, щоб визначити його емоційний стан. Відповідь повинна бути українською мовою.
    
    Вхідні дані: "${textInput}"
    
    Поверни результат у форматі JSON.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          mood: { type: Type.STRING, description: "Поточний емоційний стан (наприклад, Тривожний, Збуджений)" },
          context: { type: Type.STRING, description: "Життєвий контекст (наприклад, Зміна роботи, Розрив стосунків)" },
          motivation: { type: Type.STRING, description: "Чому вони хочуть змін" },
          confidenceLevel: { type: Type.NUMBER, description: "Оцінка рівня впевненості 1-10" },
        },
        required: ["mood", "context", "motivation", "confidenceLevel"],
      } as Schema,
    },
  });

  if (response.text) {
    return JSON.parse(response.text) as EmotionalProfile;
  }
  throw new Error("Не вдалося згенерувати аналіз");
};

export const generateStyleSuggestions = async (profile: EmotionalProfile): Promise<StyleSuggestion[]> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });

  const prompt = `На основі цього профілю клієнта (відповідай українською мовою):
  - Настрій: ${profile.mood}
  - Контекст: ${profile.context}
  - Мотивація: ${profile.motivation}
  
  Запропонуй 3 "Емоційні Стилі". Це не просто стрижки, а персоналії/образи.
  Приклад: "Тихий Авторитет" (Мінімалізм, для лідерських ролей).
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Назва стилю українською" },
            visualDescription: { type: Type.STRING, description: "Візуальний опис українською" },
            emotionalVibe: { type: Type.STRING, description: "Емоційний вайб українською" },
            pitch: { type: Type.STRING, description: "Як пояснити це клієнту (українською)" }
          },
          required: ["name", "visualDescription", "emotionalVibe", "pitch"]
        }
      } as Schema
    }
  });

  if (response.text) {
    return JSON.parse(response.text) as StyleSuggestion[];
  }
  return [];
};

export const generateFutureLetter = async (clientName: string, styleName: string, vibe: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
  
  const prompt = `Напиши короткий, поетичний "Лист від майбутнього себе" для ${clientName}.
  Вони щойно отримали стиль "${styleName}", який дає вайб "${vibe}".
  Лист має підтвердити їхню трансформацію та надихнути.
  Мова: Українська.
  Максимум 100 слів.
  Формат: Звичайний текст.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text || "Не вдалося згенерувати лист.";
};


// --- LIVE API HELPERS ---

export const RECEPTIONIST_INSTRUCTION = `Ти — Марія, ввічливий та професійний ШІ-адміністратор барбершопу STILEVO.
Власник/Майстер барбершопу — Дмитро (Telegram: @D_Nakaznyi).

Твоя мета: Прийняти "телефонний дзвінок" від клієнта та записати його на стрижку.

Алгоритм розмови:
1. Привітайся українською мовою: "Барбершоп STILEVO, адміністратор Марія. Чим можу допомогти?".
2. Запитай про бажану послугу (стрижка, борода тощо).
3. Запитай про бажану дату та час.
4. ОБОВ'ЯЗКОВО запитай Ім'я та Номер телефону клієнта для підтвердження.
5. Коли у тебе є вся інформація (Ім'я, Телефон, Послуга, Час), використай функцію 'createAppointmentRequest'.
6. Повідом клієнта: "Запис створено! Я також надіслала повідомлення майстру Дмитру (@D_Nakaznyi) з деталями вашого візиту."
7. Будь лаконічною і говори природно.`;

export const RECEPTION_TOOLS: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "createAppointmentRequest",
        description: "Створити запис, додати його в календар та надіслати повідомлення майстру в Telegram.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            clientName: { type: Type.STRING, description: "Ім'я клієнта" },
            clientPhone: { type: Type.STRING, description: "Номер телефону клієнта" },
            service: { type: Type.STRING, description: "Бажана послуга" },
            date: { type: Type.STRING, description: "Бажана дата (наприклад, Завтра, П'ятниця)" },
            time: { type: Type.STRING, description: "Бажаний час (наприклад, 14:00)" }
          },
          required: ["clientName", "clientPhone", "service", "date", "time"]
        }
      }
    ]
  }
];

const DEFAULT_TOOLS: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "saveClientContact",
        description: "Зберегти ім'я клієнта, номер телефону та соціальні мережі, якщо надано.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Повне ім'я клієнта" },
            phone: { type: Type.STRING, description: "Номер телефону клієнта" },
            telegram: { type: Type.STRING, description: "Нікнейм в Telegram (необов'язково)" },
            whatsapp: { type: Type.STRING, description: "Номер WhatsApp (необов'язково)" },
          },
          required: ["name", "phone"]
        }
      },
      {
        name: "processPayment",
        description: "Обробити платіж за послугу.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER, description: "Сума до оплати" },
            method: { type: Type.STRING, description: "Метод оплати: 'card' (картка) або 'cash' (готівка)" }
          },
          required: ["amount"]
        }
      },
      {
        name: "sendReminder",
        description: "Надіслати нагадування або підтвердження через певну платформу.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            platform: { type: Type.STRING, description: "Платформа: 'whatsapp' або 'telegram'" },
            message: { type: Type.STRING, description: "Зміст повідомлення" }
          },
          required: ["platform", "message"]
        }
      }
    ]
  }
];

const DEFAULT_SYSTEM_INSTRUCTION = `Ти — інтелектуальний асистент барбершопу STILEVO. Твоя роль подвійна:
1. Аналіз емоцій: Слухай клієнта, щоб зрозуміти його настрій та потреби в стилі.
2. Адміністратор: Ти МУСИШ запитати Ім'я та Номер телефону клієнта, якщо вони невідомі. Ти також повинен допомагати з оплатою та пропонувати надіслати нагадування.

Правила:
- Спілкуйся виключно українською мовою.
- Якщо ти не знаєш імені або телефону клієнта, ввічливо запитай і використай функцію 'saveClientContact'.
- Якщо клієнт згадує про оплату, запитай метод (картка/готівка) та суму, потім використай 'processPayment'.
- Після запису або оплати запропонуй надіслати чек або нагадування в WhatsApp чи Telegram, використовуючи 'sendReminder'.
- Будь професійним, теплим та лаконічним.`;

export interface LiveSessionCallbacks {
  onMessage: (text: string) => void;
  onAudioData: (base64: string) => void;
  onClose: () => void;
  onError: (error: any) => void;
  onToolCall?: (toolCall: any) => Promise<any[]>;
}

export const connectToLiveSession = async (
    callbacks: LiveSessionCallbacks, 
    systemInstruction?: string,
    customTools?: Tool[]
) => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
  
  // Audio Context Setup
  const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  
  const sessionPromise = ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
    config: {
      responseModalities: [Modality.AUDIO],
      systemInstruction: systemInstruction || DEFAULT_SYSTEM_INSTRUCTION,
      inputAudioTranscription: {}, // Enable transcription
      tools: customTools || DEFAULT_TOOLS,
    },
    callbacks: {
      onopen: () => {
        // Stream audio from the microphone to the model.
        const source = inputAudioContext.createMediaStreamSource(stream);
        const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
        
        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
          const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
          const pcmBlob = createPcmBlob(inputData);
          
          sessionPromise.then((session) => {
            session.sendRealtimeInput({ media: pcmBlob });
          });
        };
        
        source.connect(scriptProcessor);
        scriptProcessor.connect(inputAudioContext.destination);
      },
      onmessage: async (message: LiveServerMessage) => {
        // Handle Transcription
        if (message.serverContent?.inputTranscription) {
            callbacks.onMessage(`Клієнт: ${message.serverContent.inputTranscription.text}`);
        }
        if (message.serverContent?.outputTranscription) {
           callbacks.onMessage(`ШІ: ${message.serverContent.outputTranscription.text}`);
        }

        // Handle Tool Calls
        if (message.toolCall && callbacks.onToolCall) {
            const responses = await callbacks.onToolCall(message.toolCall);
            // Send responses back to model
            sessionPromise.then(session => {
                for(const resp of responses) {
                    session.sendToolResponse({
                        functionResponses: [resp]
                    });
                }
            });
        }

        // Handle Audio Output
        const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          callbacks.onAudioData(base64Audio);
        }
      },
      onclose: () => callbacks.onClose(),
      onerror: (err) => callbacks.onError(err),
    }
  });

  return sessionPromise;
};

// PCM Helper
function createPcmBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  
  // Convert buffer to binary string then btoa
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  return {
    data: btoa(binary),
    mimeType: 'audio/pcm;rate=16000',
  };
}

export const decodeAudio = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const playAudioChunk = async (
    data: Uint8Array, 
    ctx: AudioContext, 
    startTime: number
): Promise<number> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length; // Mono
    const buffer = ctx.createBuffer(1, frameCount, 24000); // 24kHz is typical for Gemini Live output
    const channelData = buffer.getChannelData(0);
    
    for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(startTime);
    return startTime + buffer.duration;
};
