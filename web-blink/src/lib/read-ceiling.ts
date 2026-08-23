/**
 * Blink — the longest a read is allowed to take.
 *
 * ## Why this is its own module
 *
 * Both data modules had their own `safe()` wrapper and only one of them was
 * bounded — which is why Home still sat on a pulsing skeleton after the
 * bounded one had been fixed. One ceiling, in one place, so that cannot happen
 * again. It lives here rather than beside the Supabase client because it is
 * not part of the client, and because the client module is mocked wholesale in
 * tests that have nothing to do with timeouts.
 */

/**
 * How long any read may take before it counts as a failure.
 *
 * Eight seconds. These are small queries and a slow connection deserves
 * patience, but a page load is not a vision call, and a skeleton that pulses
 * for longer than this has stopped reading as "nearly there" and started
 * reading as "broken" — with no way for the reader to tell which.
 */
export const READ_TIMEOUT_MS = 8_000;

/**
 * Reject a read that has not answered within the ceiling.
 *
 * The ceiling is not defensive dressing. With the backend unreachable,
 * supabase-js retries a token refresh with backoff before a query is even
 * issued, and every read queued behind it waits with it — measured at close to
 * twenty seconds per screen, with no error and no way out.
 */
export function withReadCeiling<T>(context: string, work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    work,
    new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`${context} timed out after ${READ_TIMEOUT_MS}ms`)),
        READ_TIMEOUT_MS,
      );
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}
