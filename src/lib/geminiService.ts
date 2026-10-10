export interface GeminiChatPayload {
  prompt?: string;
  history?: Array<{ role: 'user' | 'model'; text: string }>;
  modelType?: 'general' | 'fast' | 'complex' | 'thinking';
  systemInstruction?: string;
  image?: { data: string; mimeType: string };
  video?: { data: string; mimeType: string };
  enableSearch?: boolean;
  thinkingLevel?: 'HIGH' | 'LOW';
}

export interface GeminiChatResponse {
  text: string;
  modelUsed: string;
  grounding?: {
    webSearchQueries?: string[];
    groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
  };
}

export async function sendMessageToGemini(payload: GeminiChatPayload): Promise<GeminiChatResponse> {
  const res = await fetch('/api/gemini/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `خطأ في استجابة الخادم (${res.status})`);
  }

  return await res.json();
}

export async function transcribeAudioWithGemini(
  audioBase64: string,
  mimeType = 'audio/mp3',
  prompt?: string
): Promise<{ text: string; modelUsed: string }> {
  const res = await fetch('/api/gemini/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audioData: audioBase64,
      mimeType,
      prompt,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `فشل تفريغ الصوت (${res.status})`);
  }

  return await res.json();
}
