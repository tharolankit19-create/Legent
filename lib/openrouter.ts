import { z } from "zod";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "anthropic/claude-sonnet-4-5";

export const platformSchema = z.enum(["X", "LINKEDIN", "INSTAGRAM", "THREADS"]);

export type Platform = z.infer<typeof platformSchema>;

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type OptimizeInput = {
  content: string;
  platform: Exclude<Platform, "THREADS">;
  userContext?: string;
};

export type OptimizeResult = z.infer<typeof optimizeResultSchema>;
export type AgentDraftPost = z.infer<typeof agentDraftPostSchema>;
export type AgentDraftResult = z.infer<typeof agentDraftResultSchema>;

export const optimizeSystemPrompt = `You are a social media expert for indie hackers and SaaS founders.
Analyze this post and return a JSON object with:
- score: number 1-10 (engagement likelihood)
- issues: string[] (what's wrong)
- suggestions: string[] (specific improvements)
- rewrittenVersion: string (improved post, same voice)
- characterCount: number
- platformOptimized: boolean (does it follow platform best practices)

Be specific, not generic. Founders hate vague advice.`;

const optimizeResultSchema = z.object({
  score: z.number().int().min(1).max(10),
  issues: z.array(z.string()),
  suggestions: z.array(z.string()),
  rewrittenVersion: z.string(),
  characterCount: z.number().int().nonnegative(),
  platformOptimized: z.boolean(),
});

const agentDraftPostSchema = z.object({
  day: z.number().int().min(1).max(7),
  content: z.string().min(1),
  suggestedTime: z.string().min(1),
  rationale: z.string().min(1),
  confidenceScore: z.number().int().min(1).max(10),
});

const agentDraftResultSchema = z.array(agentDraftPostSchema).length(7);

const openRouterChoiceSchema = z.object({
  message: z.object({
    content: z.string(),
  }),
});

const openRouterResponseSchema = z.object({
  choices: z.array(openRouterChoiceSchema).min(1),
});

function getOpenRouterApiKey(apiKey?: string) {
  const key = apiKey ?? process.env.OPENROUTER_API_KEY;

  if (!key) {
    throw new Error("OPENROUTER_API_KEY is required to call OpenRouter.");
  }

  return key;
}

function extractJson(content: string) {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1]?.trim() ?? trimmed;
}

function parseJsonPayload<T>(content: string, schema: z.ZodSchema<T>) {
  try {
    return schema.parse(JSON.parse(extractJson(content)));
  } catch (error) {
    throw new Error(
      `OpenRouter returned invalid structured JSON: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}

export class OpenRouterClient {
  private readonly apiKey?: string;
  private readonly model: string;

  constructor(options: { apiKey?: string; model?: string } = {}) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;
  }

  async createJsonCompletion<T>({
    messages,
    schema,
    temperature = 0.3,
    maxTokens = 4000,
    jsonObjectMode = true,
  }: {
    messages: ChatMessage[];
    schema: z.ZodSchema<T>;
    temperature?: number;
    maxTokens?: number;
    jsonObjectMode?: boolean;
  }): Promise<T> {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getOpenRouterApiKey(this.apiKey)}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.FRONTEND_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000",
        "X-Title": "Legent",
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature,
        max_tokens: maxTokens,
        ...(jsonObjectMode ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter request failed (${response.status}): ${errorText}`);
    }

    const json = openRouterResponseSchema.parse(await response.json());
    return parseJsonPayload(json.choices[0].message.content, schema);
  }

  optimizePost(input: OptimizeInput) {
    return this.createJsonCompletion({
      schema: optimizeResultSchema,
      temperature: 0.2,
      messages: [
        { role: "system", content: optimizeSystemPrompt },
        {
          role: "user",
          content: JSON.stringify({
            content: input.content,
            platform: input.platform,
            userContext: input.userContext,
          }),
        },
      ],
    });
  }

  draftWeeklyPosts({
    userName,
    productDescription,
    writingPatterns,
    topPosts,
    primaryPlatform,
  }: {
    userName: string;
    productDescription: string;
    writingPatterns: string;
    topPosts: string[];
    primaryPlatform: Platform;
  }) {
    const systemPrompt = `You are a social media agent for ${userName} who builds ${productDescription}.
Based on their top-performing posts, draft 7 posts for the upcoming week.

THEIR WRITING PATTERNS (learned from top posts):
${writingPatterns}

THEIR TOP 3 POSTS:
${topPosts.slice(0, 3).map((post, index) => `Post ${index + 1}:\n${post}`).join("\n\n")}

Rules:
1. Match their exact voice — do not sound corporate or generic
2. Each post must lead with a specific number or fact (their top format)
3. One post per day, each for their primary platform (${primaryPlatform})
4. Include mix: 2x build-in-public updates, 2x founder tips, 2x problem-agitate, 1x vulnerable/personal
5. Return as JSON array: [{day: 1, content: string, suggestedTime: string, rationale: string, confidenceScore: number}]`;

    return this.createJsonCompletion({
      schema: agentDraftResultSchema,
      temperature: 0.7,
      jsonObjectMode: false,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Draft this week's posts as structured JSON only." },
      ],
    });
  }
}

export const openrouter = new OpenRouterClient();
