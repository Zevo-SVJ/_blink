/**
 * Blink Analysis Worker
 *
 * Receives a screenshot, forwards it to a vision-capable AI model through the
 * Rork proxy (Vercel AI Gateway), validates the structured JSON response, and
 * returns it to the client. Also handles saving analyses for authenticated users.
 *
 * Auth: Supabase JWT verification via the Supabase project's JWKS endpoint.
 * The AI provider is replaceable — only the model ID and prompt need to change.
 * No API keys are exposed to the client.
 *
 * Routes: /ping, /analyze (POST), /save (POST), /analyses (GET)
 */

type Env = Record<string, string> & {
  DO: Fetcher;
};

/** Worker version — bumped on each deploy to force fresh bundling. */
const WORKER_VERSION = "2.0.0-debug";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/** Primary vision model — Google Gemini 3 Flash (fast, affordable, vision-capable). */
const PRIMARY_MODEL = "google/gemini-3-flash";
/** Fallback model — OpenAI GPT-4.1 (strong vision, higher cost). */
const FALLBACK_MODEL = "openai/gpt-4.1";

const MAX_IMAGE_BYTES = 4_500_000;

// ---------------------------------------------------------------------------
// Analysis prompt — contextual, not a checklist. Includes ownership detection.
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are Blink, a social perception analyst. You analyze Instagram profile screenshots and reveal how the profile likely comes across to different people.

You do NOT judge personal worth or attractiveness. You analyze the PERCEPTION the profile creates — the first impression it gives to viewers.

Your philosophy: Observation → Context → Interpretation → Perception → Recommendation

STEP 1 — PROFILE OWNERSHIP DETECTION
First, inspect the screenshot for UI elements that indicate whose profile this is:
- If you see "Edit profile" and/or "Share profile" or profile management controls → this is the user's OWN profile → ownership: "own"
- If you see "Follow", "Following", "Message", or "Contact" buttons → this is ANOTHER person's profile → ownership: "other"
- If you cannot confidently determine ownership → ownership: "uncertain"

STEP 2 — ANALYSIS
Critical rules:
1. NEVER use simplistic rules like "no bio = bad", "few posts = bad", "minimal profile = bad"
2. Recognize intentional minimalism — a minimal profile can communicate exclusivity, confidence, status, mystery, social proof
3. Only draw conclusions from what is VISIBLE in the screenshot
4. Never claim something as fact if the screenshot doesn't show it
5. If engagement data is not visible, do NOT claim "your followers love your content"
6. Instead say "your profile gives the impression of..." when drawing inferences
7. The score represents strength of the first impression, NOT attractiveness
8. A score of 8+ means a strong, clear, intentional first impression
9. Recommendations must be specific and contextual, never generic ("post more", "improve your bio")
10. Recommendations must respect the user's existing identity, not force everyone into the same template

STEP 3 — CATEGORY (optional, for future use)
If the profile clearly fits a recognizable archetype (e.g. "larp", "artist", "creator", "minimalist", "business", "fitness", "travel"), include it. If not, set category to null. Never force a category.

You must respond with ONLY a valid JSON object matching this exact schema (no markdown, no explanation outside JSON):
{
  "ownership": "own" | "other" | "uncertain",
  "overallScore": <number 0-10>,
  "firstImpression": "<short label>",
  "traits": ["<3-5 perception trait words>"],
  "why": "<2-3 sentence contextual explanation of the overall perception>",
  "signals": [
    {"label": "Visual Identity", "score": <0-10>, "description": "<one sentence>"},
    {"label": "Aesthetic", "score": <0-10>, "description": "<one sentence>"},
    {"label": "Confidence", "score": <0-10>, "description": "<one sentence>"},
    {"label": "Status", "score": <0-10>, "description": "<one sentence>"},
    {"label": "Approachability", "score": <0-10>, "description": "<one sentence>"},
    {"label": "Mystery", "score": <0-10>, "description": "<one sentence>"}
  ],
  "strengths": ["<2-3 strongest elements with context>"],
  "weaknesses": ["<1-3 contextual opportunities, not simplistic 'missing' items>"],
  "strongestSignals": ["<short labels for strongest signals>"],
  "recommendations": ["<specific, contextual recommendations>"],
  "nextMove": "<the single most important next action>",
  "category": {
    "category": "<string or null>",
    "categoryConfidence": <0-1>,
    "categorySignals": ["<short labels>"]
  },
  "perspectives": {
    "crush": {
      "traits": ["<2-3 traits>"],
      "summary": "<one sentence perception summary>",
      "why": "<one sentence contextual reasoning>",
      "recommendation": "<specific recommendation>"
    },
    "stranger": {
      "traits": ["<2-3 traits>"],
      "summary": "<one sentence>",
      "why": "<one sentence>",
      "recommendation": "<specific recommendation>"
    },
    "friends": {
      "traits": ["<2-3 traits>"],
      "summary": "<one sentence>",
      "why": "<one sentence>",
      "recommendation": "<specific recommendation>"
    },
    "recruiter": {
      "traits": ["<2-3 traits>"],
      "summary": "<one sentence>",
      "why": "<one sentence>",
      "recommendation": "<specific recommendation>"
    }
  }
}

For perspectives, reinterpret the SAME core analysis through different lenses:
- crush: focus on attractiveness of presentation, confidence, mystery, approachability, lifestyle
- stranger: focus on immediate first impression, social positioning, visual identity
- friends: focus on personality, consistency, social energy, authenticity
- recruiter: focus on professionalism, credibility, maturity, clarity

All perspective text must use language like "Based on your profile, Blink predicts..." — never claim certainty about what a specific person thinks.`;

// ---------------------------------------------------------------------------
// Error helpers
// ---------------------------------------------------------------------------

function errorResponse(code: string, status: number): Response {
  return new Response(JSON.stringify({ error: true, code }), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Supabase JWT verification
// ---------------------------------------------------------------------------

function getSupabaseConfig(env: Env): { url: string; anonKey: string } {
  const url = env.EXPO_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || "";
  const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || "";
  return { url, anonKey };
}

interface SupabaseUser {
  id: string;
  email: string;
  aud: string;
}

async function verifyToken(request: Request, env: Env): Promise<SupabaseUser | null> {
  const authHeader = request.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const { url, anonKey } = getSupabaseConfig(env);
  if (!url || !anonKey) return null;

  try {
    const response = await fetch(`${url}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anonKey,
      },
    });

    if (!response.ok) return null;

    const user = await response.json() as SupabaseUser;
    return user;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// AI call
// ---------------------------------------------------------------------------

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  >;
}

const TOOLKIT_URL_FALLBACK = "https://toolkit.rork.com";

function getToolkitConfig(env: Env): { url: string; key: string } {
  const url = env.EXPO_PUBLIC_TOOLKIT_URL || env.TOOLKIT_URL || TOOLKIT_URL_FALLBACK;
  const key =
    env.EXPO_PUBLIC_RORK_TOOLKIT_SECRET_KEY ||
    env.RORK_TOOLKIT_SECRET_KEY ||
    env.TOOLKIT_SECRET_KEY ||
    "";
  return { url, key };
}

async function callVisionModel(
  env: Env,
  model: string,
  imageBase64: string,
  mimeType: string,
): Promise<string> {
  const { url: toolkitUrl, key: secretKey } = getToolkitConfig(env);

  if (!toolkitUrl || !secretKey) {
    console.error("[vision] missing toolkit config", {
      hasUrl: !!toolkitUrl,
      hasKey: !!secretKey,
      envKeys: Object.keys(env).filter((k) => k.includes("TOOLKIT") || k.includes("RORK")).join(", "),
    });
    throw new Error("MISSING_CONFIG");
  }

  const dataUri = `data:${mimeType};base64,${imageBase64}`;

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: [{ type: "text", text: SYSTEM_PROMPT }],
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "Analyze this Instagram profile screenshot. First determine whose profile this is (look for Edit profile/Share profile = own, or Follow/Following/Message = other person's). Then analyze the entire profile as one system — profile picture, bio, posts grid, highlights, followers/following count, aesthetic, visual consistency, and any visible signals. Return the structured JSON analysis.",
        },
        { type: "image_url", image_url: { url: dataUri } },
      ],
    },
  ];

  const body = JSON.stringify({
    model,
    messages,
    max_tokens: 8000,
    temperature: 0.4,
  });

  const response = await fetch(`${toolkitUrl}/v2/vercel/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secretKey}`,
    },
    body,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    console.error(`[vision] AI call failed: ${response.status}`, errText.slice(0, 500));
    throw new Error(`AI_CALL_FAILED:${response.status}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content || typeof content !== "string") {
    throw new Error("EMPTY_RESPONSE");
  }

  return content;
}

function extractJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      try {
        return JSON.parse(fenceMatch[1].trim());
      } catch {
        // fall through
      }
    }
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(text.slice(firstBrace, lastBrace + 1));
      } catch {
        // fall through
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// In-memory analysis store (Durable Object storage would be used in production)
// ---------------------------------------------------------------------------

interface StoredAnalysis {
  id: string;
  createdAt: string;
  userId: string;
  ownership: string;
  result: unknown;
}

const analysisStore: StoredAnalysis[] = [];

// ---------------------------------------------------------------------------
// Entrypoint
// ---------------------------------------------------------------------------

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);

    if (url.pathname === "/ping") {
      return jsonResponse({ ok: true, now: Date.now() });
    }

    if (url.pathname === "/analyze" && request.method === "POST") {
      return handleAnalyze(request, env);
    }

    if (url.pathname === "/save" && request.method === "POST") {
      return handleSave(request, env);
    }

    if (url.pathname === "/analyses" && request.method === "GET") {
      return handleListAnalyses(request, env);
    }

    return new Response("not found", { status: 404, headers: CORS });
  },
} satisfies ExportedHandler<Env>;

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function handleAnalyze(request: Request, env: Env): Promise<Response> {
  console.log(`[analyze] v=${WORKER_VERSION} start`);

  let body: { image?: string; mimeType?: string };
  try {
    body = await request.json();
  } catch {
    console.error("[analyze] invalid JSON body");
    return errorResponse("INVALID_IMAGE", 400);
  }

  const { image, mimeType } = body;

  if (!image || typeof image !== "string") {
    console.error("[analyze] missing image field");
    return errorResponse("INVALID_IMAGE", 400);
  }

  const cleanBase64 = image.startsWith("data:")
    ? image.slice(image.indexOf(",") + 1)
    : image;

  const finalMimeType = mimeType ?? "image/jpeg";

  const approxBytes = Math.floor((cleanBase64.length * 3) / 4);
  console.log(`[analyze] image bytes~=${approxBytes} mime=${finalMimeType}`);

  if (approxBytes > MAX_IMAGE_BYTES) {
    console.error(`[analyze] image too large: ${approxBytes}`);
    return errorResponse("IMAGE_TOO_LARGE", 413);
  }

  let rawContent: string;
  try {
    console.log(`[analyze] calling primary model: ${PRIMARY_MODEL}`);
    rawContent = await callVisionModel(env, PRIMARY_MODEL, cleanBase64, finalMimeType);
    console.log(`[analyze] primary model success, content length=${rawContent.length}`);
  } catch (err) {
    console.warn(`[analyze] primary model failed: ${String(err)}, trying fallback`);
    try {
      rawContent = await callVisionModel(env, FALLBACK_MODEL, cleanBase64, finalMimeType);
      console.log(`[analyze] fallback model success, content length=${rawContent.length}`);
    } catch (err2) {
      console.error(`[analyze] fallback also failed: ${String(err2)}`);
      return errorResponse("ANALYSIS_FAILED", 502);
    }
  }

  const parsed = extractJson(rawContent);
  if (!parsed) {
    console.error("[analyze] failed to extract JSON from AI response");
    return errorResponse("ANALYSIS_FAILED", 502);
  }

  console.log(`[analyze] success, returning result`);
  // Image is deleted after processing — not stored
  return jsonResponse({ result: parsed });
}

async function handleSave(request: Request, env: Env): Promise<Response> {
  const authUser = await verifyToken(request, env);
  if (!authUser) {
    return errorResponse("UNAUTHORIZED", 401);
  }

  let body: { result?: unknown };
  try {
    body = await request.json();
  } catch {
    return errorResponse("BAD_REQUEST", 400);
  }

  if (!body.result) {
    return errorResponse("BAD_REQUEST", 400);
  }

  const id = `analysis_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const stored: StoredAnalysis = {
    id,
    createdAt: new Date().toISOString(),
    userId: authUser.id,
    ownership:
      (body.result as Record<string, unknown>)?.ownership as string ?? "uncertain",
    result: body.result,
  };

  analysisStore.push(stored);

  return jsonResponse({
    id: stored.id,
    createdAt: stored.createdAt,
    ownership: stored.ownership,
    result: stored.result,
  });
}

async function handleListAnalyses(request: Request, env: Env): Promise<Response> {
  const authUser = await verifyToken(request, env);
  if (!authUser) {
    return jsonResponse({ analyses: [] });
  }

  const userAnalyses = analysisStore
    .filter((a) => a.userId === authUser.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(({ id, createdAt, ownership, result }) => ({
      id,
      createdAt,
      ownership,
      result,
    }));

  return jsonResponse({ analyses: userAnalyses });
}
