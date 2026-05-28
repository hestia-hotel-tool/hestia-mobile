/**
 * AI agent: transcribe voice note and respond to text.
 * Replace with real LLM (e.g. OpenAI) or Supabase Edge Function.
 */

export interface VoiceNoteResult {
  transcript: string;
  response: string;
}

/**
 * Transcribe audio and get AI response.
 * TODO: Upload audio to your backend; call speech-to-text (e.g. OpenAI Whisper), then LLM.
 */
export async function transcribeAndRespond(audioUri: string): Promise<VoiceNoteResult> {
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 1200));

  // Placeholder: real implementation would send audioUri to your API
  // e.g. POST /api/ai/voice -> { transcript, response }
  return {
    transcript: '[Voice note transcribed]',
    response:
      "I received your voice note. Connect a transcription service (e.g. Whisper) and an LLM in services/aiAgent.ts to get real transcript and responses.",
  };
}

/**
 * Send text to AI agent and get response.
 * TODO: Call your LLM API (e.g. OpenAI, Supabase Edge Function).
 */
export async function sendTextToAgent(text: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 800));
  // Placeholder: real implementation would POST text to your API and return the model reply
  return `I received: "${text}". Connect an LLM in services/aiAgent.ts sendTextToAgent() for real responses.`;
}
