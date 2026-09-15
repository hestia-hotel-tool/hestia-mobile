/**
 * AI agent: transcribe a voice note and respond.
 * Replace with a real LLM (e.g. OpenAI) or a Supabase Edge Function.
 *
 * Voice only. `sendTextToAgent` lived here until the assistant panel was
 * rebuilt to Figma 3910:1496, which has no text field — nothing called it
 * afterwards. It was six lines returning a canned string, so it goes rather
 * than lingering as a second unused stub; restoring it is trivial if the
 * design brings typing back.
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
