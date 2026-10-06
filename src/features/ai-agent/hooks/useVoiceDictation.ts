import { useCallback, useRef, useState } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

/**
 * Dictation for the assistant.
 *
 * ## On-device, not a cloud transcriber
 *
 * Claude has no speech-to-text, so this needed its own answer. The iOS and
 * Android engines cost nothing, need no second vendor or key, and return
 * partial text *while* the user is still speaking — which is the difference
 * between dictation and uploading a voicemail. The point that settled it:
 * guest names and room numbers never leave the phone to be transcribed.
 *
 * The trade is accuracy in a noisy corridor with an accented speaker, where
 * Whisper is better. If that becomes the complaint, the swap is this file —
 * nothing above it knows where the words came from.
 *
 * ## Why `expo-speech-recognition` and not `@react-native-voice/voice`
 *
 * This project runs RN 0.85 with `newArchEnabled=true`. `@react-native-voice`
 * is at 3.2.4, community-maintained, and written for the old architecture.
 * `expo-speech-recognition` ships a matching 56.x line for this SDK, has a
 * config plugin for the two iOS usage strings, and supports the new
 * architecture.
 */

export interface UseVoiceDictationOptions {
  /** Partial text, as the user speaks. Drives the composer's live preview. */
  onText: (text: string) => void;
  /** The finished utterance. */
  onFinal: (text: string) => void;
}

export interface UseVoiceDictationResult {
  isRecording: boolean;
  error: string | null;
  toggle: () => void;
}

/**
 * Errors that are not failures.
 *
 * `no-speech` is someone opening dictation and saying nothing; `aborted` is
 * them stopping it deliberately. Surfacing either as an error makes a working
 * app look broken.
 */
const SILENT_ERRORS = new Set(['no-speech', 'aborted']);

export function useVoiceDictation({
  onText,
  onFinal,
}: UseVoiceDictationOptions): UseVoiceDictationResult {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /*
   * The best transcript so far.
   *
   * `end` carries no text, so the final utterance has to be remembered from
   * the last `result`. A ref rather than state because nothing renders from
   * it — the composer already shows the same words via `onText`, and
   * re-rendering on every syllable would be wasted work.
   */
  const latest = useRef('');

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results?.[0]?.transcript ?? '';
    if (!transcript) return;
    latest.current = transcript;
    onText(transcript);
  });

  useSpeechRecognitionEvent('error', (event) => {
    setIsRecording(false);
    if (SILENT_ERRORS.has(event.error)) {
      setError(null);
      return;
    }
    setError(
      event.error === 'not-allowed'
        ? 'Microphone access is off. Turn it on in Settings to dictate.'
        : 'Could not hear that. Try again, or type instead.',
    );
  });

  useSpeechRecognitionEvent('end', () => {
    setIsRecording(false);
    const text = latest.current.trim();
    latest.current = '';
    if (text) onFinal(text);
  });

  const toggle = useCallback(() => {
    if (isRecording) {
      // `stop` finishes the utterance and still emits a final result;
      // `abort` would throw the words away.
      ExpoSpeechRecognitionModule.stop();
      return;
    }

    setError(null);
    latest.current = '';

    void (async () => {
      const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!granted) {
        setError('Microphone access is needed for dictation. Enable it in Settings.');
        return;
      }

      setIsRecording(true);
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        // The whole point: words appear as they are spoken.
        interimResults: true,
        /*
         * Single utterance. The engine stops on a natural pause, which is the
         * right shape for a question — `continuous` would keep listening
         * through the silence after it and leave the user to tap stop.
         */
        continuous: false,
        /*
         * The vocabulary of the job, so "Room 204" is not heard as "Room 24"
         * and the domain words are not mangled.
         */
        contextualStrings: [
          'Hestia',
          'housekeeping',
          'lost and found',
          'turndown',
          'stayover',
          'checkout',
          'minibar',
        ],
      });
    })();
  }, [isRecording]);

  return { isRecording, error, toggle };
}
