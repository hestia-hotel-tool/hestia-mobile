import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';

/**
 * What the screen behind the assistant is showing, sent with each question.
 *
 * Tester feedback: "I can read 18 in my home screen" — and the assistant had
 * no idea, because its tools read the database while Home's figures are
 * computed in the app (the viewer's shift, their working set of rooms, the
 * categories Home draws). Recomputing them server-side would drift from the
 * screen; sending the screen's own numbers cannot.
 *
 * These are figures the person is already looking at, so sending them widens
 * nothing. The function treats them as data from the app, never as
 * instructions, and caps their size.
 */
export type ScreenFact = { label: string; value: string | number };

export type ScreenContext = {
  /** The screen's name as the app shows it, e.g. "Home". */
  screen: string;
  facts: ScreenFact[];
};

/** Older than this is no longer "what the screen shows". */
const MAX_AGE_MS = 30 * 60_000;

let current: (ScreenContext & { at: number }) | null = null;

/** A screen publishes what it shows; the latest one wins. */
export function setAssistantScreenContext(ctx: ScreenContext): void {
  current = { ...ctx, at: Date.now() };
}

/** Withdraw a screen's context when it is no longer the one on screen. */
export function clearAssistantScreenContext(screen: string): void {
  if (current?.screen === screen) current = null;
}

/** What to send with the next question, if anything recent. */
export function getAssistantScreenContext(): ScreenContext | null {
  if (!current || Date.now() - current.at > MAX_AGE_MS) return null;
  return { screen: current.screen, facts: current.facts };
}

/**
 * Publish a screen's figures while it is the one on screen: set on focus and
 * whenever they change, withdrawn on blur. Every main screen calls this, so
 * the assistant knows what is in front of the person wherever they open it.
 * `facts` should be memoised by the caller.
 */
export function useAssistantScreen(screen: string, facts: ScreenFact[]): void {
  useFocusEffect(
    useCallback(() => {
      setAssistantScreenContext({ screen, facts: facts.slice(0, 40) });
      return () => clearAssistantScreenContext(screen);
    }, [screen, facts])
  );
}
