/**
 * Syntax guard for the Supabase edge function.
 *
 * `backend/` sits outside the web app's tsconfig and Deno isn't part of this
 * toolchain, so nothing here used to parse that file — an unterminated
 * template literal in the system prompt once shipped undetected and would have
 * stopped the function from running at all.
 *
 * These tests parse it with the TypeScript compiler and assert the contract the
 * client depends on. Syntax only: Deno globals aren't typed here, so type
 * diagnostics would be noise.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const FUNCTION_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../backend/functions/analyze/index.ts",
);

const source = readFileSync(FUNCTION_PATH, "utf8");

function syntaxErrors(code: string): string[] {
  const file = ts.createSourceFile(
    "analyze.ts",
    code,
    ts.ScriptTarget.ES2022,
    /* setParentNodes */ true,
    ts.ScriptKind.TS,
  );
  // `parseDiagnostics` is internal but is the only way to read syntax errors
  // off a standalone SourceFile without creating a full Program.
  const diagnostics =
    (file as unknown as { parseDiagnostics?: ts.Diagnostic[] }).parseDiagnostics ?? [];
  return diagnostics.map((d) => {
    const message = ts.flattenDiagnosticMessageText(d.messageText, " ");
    const line =
      d.start !== undefined
        ? file.getLineAndCharacterOfPosition(d.start).line + 1
        : "?";
    return `line ${line}: ${message}`;
  });
}

describe("analyze edge function", () => {
  it("parses without syntax errors", () => {
    expect(syntaxErrors(source)).toEqual([]);
  });

  it("closes the SYSTEM_PROMPT template literal", () => {
    // The specific regression: the prompt ran unterminated into the module.
    const match = source.match(/const SYSTEM_PROMPT = `[\s\S]*?`;/);
    expect(match, "SYSTEM_PROMPT must be a closed template literal").not.toBeNull();

    // And the code after it must still be parseable as top-level declarations.
    expect(source).toMatch(/\nfunction errorResponse\(/);
    expect(source).toMatch(/Deno\.serve\(/);
  });

  it("would fail on an unterminated prompt", () => {
    // Proves the guard actually detects the shape of the original bug.
    const broken = source.replace(/(never suggest changes for them to make\.)`;/, "$1");
    expect(broken).not.toBe(source);
    expect(syntaxErrors(broken).length).toBeGreaterThan(0);
  });

  it("instructs the model to emit every field the client validates", () => {
    for (const field of [
      "ownershipEvidence",
      "editProfile",
      "shareProfile",
      "follow",
      "message",
      "handle",
      "subjectGender",
      "overallScore",
      "signals",
      "perspectives",
      "category",
    ]) {
      expect(source, `prompt must mention ${field}`).toContain(field);
    }
  });

  it("returns the model result unfiltered so new fields flow through", () => {
    expect(source).toContain("jsonResponse({ result: parsed })");
  });
});
