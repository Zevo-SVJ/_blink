/**
 * Blink — the strings in one dictionary, read out of `messages.ts`.
 *
 * Both leak harnesses ask the same question: does this phrase exist in
 * `MESSAGES.en` and not in `MESSAGES.fr`? Answering it needs the string
 * literals of one object, and the obvious way to get them — a regex for
 * `"..."` with a minimum length — is subtly wrong.
 *
 * A regex has to start somewhere, and `matchAll` restarts after each match.
 * When a literal is shorter than the minimum the pattern skips it, and the
 * next attempt is free to begin at that literal's *closing* quote. From there
 * the "string" it captures is the gap between two literals — `,\n    title: `
 * — which is long enough to pass, contains no quote of its own, and consumes
 * the opening quote of the literal that follows. Every pair after that is off
 * by one, so roughly alternate strings vanish from the oracle.
 *
 * That is not hypothetical: it is why "How to climb" sat in English on the
 * French profile page while this check reported no leaks. `title: "How to
 * climb"` came directly after a short literal, so the scanner was already
 * out of phase and never saw it.
 *
 * A character scanner cannot go out of phase, because a quote is only ever an
 * opener when the scanner is outside a string. Comments are skipped for the
 * same reason — an apostrophe in a prose comment would otherwise open a
 * "string" that swallows the next several literals.
 */

/** Every double-quoted literal in `source`, in order, unescaped. */
export function stringLiterals(source) {
  const out = [];
  let i = 0;
  while (i < source.length) {
    const c = source[i];

    if (c === "/" && source[i + 1] === "/") {
      const nl = source.indexOf("\n", i);
      i = nl === -1 ? source.length : nl + 1;
      continue;
    }
    if (c === "/" && source[i + 1] === "*") {
      const end = source.indexOf("*/", i + 2);
      i = end === -1 ? source.length : end + 2;
      continue;
    }
    // Template and single-quoted literals are stepped over rather than
    // collected: the dictionaries use double quotes throughout, and a
    // apostrophe inside one would otherwise desynchronise the scan.
    if (c === "'" || c === "`") {
      const quote = c;
      i++;
      while (i < source.length && source[i] !== quote) i += source[i] === "\\" ? 2 : 1;
      i++;
      continue;
    }
    if (c === '"') {
      i++;
      let value = "";
      while (i < source.length && source[i] !== '"') {
        if (source[i] === "\\") {
          value += source[i + 1] === "n" ? "\n" : source[i + 1];
          i += 2;
        } else {
          value += source[i];
          i++;
        }
      }
      i++;
      out.push(value);
      continue;
    }
    i++;
  }
  return out;
}

/**
 * Leaf strings of one dictionary, long enough to be unambiguous.
 *
 * Placeholders are dropped: a phrase carrying `{points}` never appears on a
 * page in that form, so matching it would only ever produce a false negative.
 */
export function dictionaryStrings(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`dictionaryStrings: markers not found (${startMarker} … ${endMarker})`);
  }
  const out = new Set();
  for (const value of stringLiterals(source.slice(start, end))) {
    if (value.length < 12) continue;
    if (value.includes("{") || value.includes("<")) continue;
    out.add(value);
  }
  return out;
}
