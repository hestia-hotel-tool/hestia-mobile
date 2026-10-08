let seq = 0;

/**
 * A channel name that is new every time.
 *
 * supabase-js hands back the existing channel when one with the same name is
 * still registered — and `removeChannel` is asynchronous, so an effect that
 * re-runs (a dependency changed, a screen re-mounted) gets the old, already
 * subscribed channel back. Adding a listener to it then throws "cannot add
 * `postgres_changes` callbacks … after `subscribe()`". A unique suffix per
 * subscription means each one gets its own channel.
 */
export function uniqueChannelName(base: string): string {
  seq += 1;
  return `${base}:${seq}`;
}
