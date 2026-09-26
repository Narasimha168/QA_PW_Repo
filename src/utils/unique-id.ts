/**
 * Every execution creates real records on a shared demo server, so identifiers
 * must be unique per run.
 *
 * Deliberately generated at call time from inside a test body, never at module
 * load: Playwright collects test titles in the main process and re-reads them in
 * the worker, so anything time-derived that leaks into a title would make the two
 * disagree. Generating per call also means a retried test uses a fresh id instead
 * of colliding with the record its failed attempt left behind.
 */

/** Digits available to the OrangeHRM "Employee Id" field once a prefix is applied. */
const ID_DIGITS = 9;

/**
 * Builds a short, collision-resistant numeric identifier: six digits of the
 * millisecond clock followed by three random digits.
 */
export function uniqueNumericId(): string {
  const clockPart = Date.now().toString().slice(-6);
  const randomPart = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');

  return `${clockPart}${randomPart}`.slice(0, ID_DIGITS);
}

/**
 * Expands the `{{unique}}` token in a data-file template.
 *
 * @param template Value such as `"T{{unique}}"`.
 */
export function expandUniqueToken(template: string): string {
  return template.split('{{unique}}').join(uniqueNumericId());
}
