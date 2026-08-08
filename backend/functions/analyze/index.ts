// Blink Analysis Edge Function
//
// Receives a screenshot, forwards it to a vision-capable AI model through the
// Rork proxy (Vercel AI Gateway), validates the structured JSON response, and
// returns it to the client.
//
// The AI provider is replaceable — only the model ID and prompt need to change.
// No API keys are exposed to the client.
//
// Deploy: managed deployEdgeFunction tool

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

const PRIMARY_MODEL = "google/gemini-3-flash";
const FALLBACK_MODEL = "openai/gpt-4.1";
const MAX_IMAGE_BYTES = 4_500_000;

const SYSTEM_PROMPT = `You are Blink, a social perception analyst. You analyze Instagram profile screenshots and reveal how the profile likely comes across to different people.

You do NOT judge personal worth or attractiveness. You analyze the PERCEPTION the profile creates — the first impression it gives to viewers.

Your philosophy: Observation → Context → Interpretation → Perception → Recommendation

STEP 1 — PROFILE OWNERSHIP DETECTION
Instagram renders a different action row depending on who is viewing. Report exactly which controls are VISIBLE in the screenshot, as booleans in "ownershipEvidence":
- editProfile: true only if a button labelled "Edit profile" is visible
- shareProfile: true only if a button labelled "Share profile" is visible
- follow: true only if a "Follow", "Following", or "Requested" button is visible
- message: true only if a "Message" or "Contact" button is visible

Report only what you can actually READ in the image. Never infer a button that is cropped out or not rendered. These booleans are the single most important output of this step — downstream logic depends on them being literal observations.

Then set "ownership":
- "Edit profile" and/or "Share profile" visible → "own"
- "Follow"/"Following"/"Message" visible → "other"
- Neither, or both → "uncertain"

Also report:
- "handle": the @username shown in the header, WITHOUT the leading @. null if not legible.
- "subjectGender": "male" | "female" | "unknown" — only when the profile makes it clearly legible (name, pronouns in bio, or unambiguous photos). Use "unknown" whenever there is genuine doubt. Do not guess.

STEP 1b — WHO THE OUTPUT IS FOR
If ownership is "own", the user IS the account owner: give full recommendations and improvement actions.
If ownership is "other" or "uncertain", the user is looking at SOMEONE ELSE. Return "recommendations": [], "nextMove": "", and "" for every perspective "recommendation". Never write advice addressed to that account's owner, and never address the subject as "you". Describe the profile in the third person.

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
  "ownershipEvidence": {
    "editProfile": <boolean>,
    "shareProfile": <boolean>,
    "follow": <boolean>,
    "message": <boolean>
  },
  "handle": "<username without @, or null>",
  "subjectGender": "male" | "female" | "unknown",
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

Never claim certainty about what a specific person thinks — write in terms of the impression the profile creates.

VOICE — this matters as much as the analysis itself:
- ownership "own": address the user directly ("your profile", "you come across as…").
- ownership "other"/"uncertain": write in the third person about the profile ("this profile", "he", "she"). Never write "you" or "your" about the subject, and never suggest changes for them to make.

function errorResponse(code: string, status: number): Response {
  return new Response(JSON.stringify({ error: true, code }), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  >;
}

function getToolkitConfig(): { url: string; key: string } {
  const url = Deno.env.get("EXPO_PUBLIC_TOOLKIT_URL") ||
    Deno.env.get("TOOLKIT_URL") ||
    "https://toolkit.rork.com";
  const key =
    Deno.env.get("EXPO_PUBLIC_RORK_TOOLKIT_SECRET_KEY") ||
    Deno.env.get("RORK_TOOLKIT_SECRET_KEY") ||
    Deno.env.get("TOOLKIT_SECRET_KEY") ||
    "";
  return { url, key };
}

async function callVisionModel(
  model: string,
  imageBase64: string,
  mimeType: string,
): Promise<string> {
  const { url: toolkitUrl, key: secretKey } = getToolkitConfig();

  if (!toolkitUrl || !secretKey) {
    console.error("[vision] missing toolkit config", {
      hasUrl: !!toolkitUrl,
      hasKey: !!secretKey,
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
          text: "Analyze this Instagram profile screenshot. First read the action row and report literally which buttons are visible (Edit profile / Share profile / Follow / Message) in ownershipEvidence — this decides whether the analysis is written to the account owner or about a third party. Also read the @handle. Then analyze the entire profile as one system — profile picture, bio, posts grid, highlights, followers/following count, aesthetic, visual consistency, and any visible signals. Return the structured JSON analysis.",
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

  console.log(`[vision] calling ${model} via ${toolkitUrl}`);

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
    console.error("[vision] empty response from AI");
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(req.url);

  if (url.pathname.endsWith("/ping") || url.pathname === "/ping") {
    return jsonResponse({ ok: true, now: Date.now() });
  }

  // The edge function is mounted at /functions/v1/analyze, so we check
  // for the analyze suffix
  if (url.pathname.endsWith("/analyze") && req.method === "POST") {
    return handleAnalyze(req);
  }

  return new Response("not found", { status: 404, headers: CORS_HEADERS });
});

async function handleAnalyze(req: Request): Promise<Response> {
  console.log("[analyze] start");

  let body: { image?: string; mimeType?: string };
  try {
    body = await req.json();
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
    rawContent = await callVisionModel(PRIMARY_MODEL, cleanBase64, finalMimeType);
    console.log(`[analyze] primary model success, content length=${rawContent.length}`);
  } catch (err) {
    console.warn(`[analyze] primary model failed: ${String(err)}, trying fallback`);
    try {
      rawContent = await callVisionModel(FALLBACK_MODEL, cleanBase64, finalMimeType);
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

  console.log("[analyze] success, returning result");
  return jsonResponse({ result: parsed });
}
