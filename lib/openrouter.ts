/**
 * Legent — OpenRouter AI Wrapper
 * Centralized client for all AI features (optimization + agent drafting)
 * Uses anthropic/claude-sonnet-4-5 by default via OpenRouter
 */

import { z } from 'zod';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface OptimizeInput {
  content: string;
  platform: 'X' | 'LINKEDIN' | 'INSTAGRAM' | 'THREADS';
  userContext?: string; // Optional: product description, tone, etc.
}

export interface OptimizeResult {
  score: number;           // 1-10
  issues: string[];
  suggestions: string[];
  rewrittenVersion: string;
  characterCount: number;
  platformOptimized: boolean;
  rationale?: string;
}

export interface AgentDraftPost {
  day: number;
  content: string;
  suggestedTime: string;   // e.g. "09:00"
  rationale: string;
  confidenceScore: number; // 1-10
}

export interface AgentDraftResult {
  posts: AgentDraftPost[];
  overallNotes?: string;
}

// Zod schemas for strict validation
const OptimizeResultSchema = z.object({
  score: z.number().min(1).max(10),
  issues: z.array(z.string()),
  suggestions: z.array(z.string()),
  rewrittenVersion: z.string(),
  characterCount: z.number(),
  platformOptimized: z.boolean(),
  rationale: z.string().optional(),
});

const AgentDraftPostSchema = z.object({
  day: z.number().min(1).max(7),
  content: z.string().min(10),
  suggestedTime: z.string(),
  rationale: z.string(),
  confidenceScore: z.number().min(1).max(10),
});

const AgentDraftResultSchema = z.object({
  posts: z.array(AgentDraftPostSchema),
  overallNotes: z.string().optional(),
});

export class OpenRouterClient {
  private apiKey: string;
  private defaultModel: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY || '';
    this.defaultModel = model || process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4-5';

    if (!this.apiKey) {
      console.warn('⚠️  OPENROUTER_API_KEY is not set');
    }
  }

  private async callOpenRouter(systemPrompt: string, userPrompt: string, temperature = 0.7) {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://legent.ai',
        'X-Title': 'Legent AI Agent',
      },
      body: JSON.stringify({
        model: this.defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature,
        max_tokens: 4000,
        response_format: { type: 'json_object' }, // Force JSON
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content returned from OpenRouter');
    }

    return content;
  }

  /**
   * AI Post Optimization (Core Feature)
   * Endpoint: /api/ai/optimize
   */
  async optimizePost(input: OptimizeInput): Promise<OptimizeResult> {
    const systemPrompt = `You are a world-class social media expert specialized in helping indie hackers and SaaS founders grow on ${input.platform}.

Your job is to analyze a post and return ONLY a valid JSON object with this exact structure:
{
  "score": number (1-10, engagement likelihood for founders),
  "issues": string[] (specific problems with the post),
  "suggestions": string[] (actionable, specific improvements),
  "rewrittenVersion": string (improved version that keeps the founder\'s authentic voice),
  "characterCount": number,
  "platformOptimized": boolean (true if it follows platform best practices),
  "rationale": string (brief explanation of your scoring)
}

Rules:
- Be brutally specific. Founders hate generic advice like "make it more engaging".
- Prioritize: numbers/facts first, storytelling, vulnerability, actionable tips.
- Keep the rewritten version in the same voice as the original (casual, founder tone).
- For X: max 280 chars recommended, use threads if needed.
- For LinkedIn: longer form, professional but human, use line breaks.`;

    const userPrompt = `Analyze this post for ${input.platform}:

"""
${input.content}
"""

${input.userContext ? `Additional context about the founder/product: ${input.userContext}` : ''}

Return ONLY the JSON object.`;

    try {
      const rawResponse = await this.callOpenRouter(systemPrompt, userPrompt, 0.3);
      const parsed = JSON.parse(rawResponse);
      return OptimizeResultSchema.parse(parsed);
    } catch (error) {
      console.error('OpenRouter optimize error:', error);
      throw new Error('Failed to optimize post. Please try again.');
    }
  }

  /**
   * AI Agent — Weekly Post Drafting (THE differentiator)
   * Endpoint: /api/ai/agent/draft
   */
  async generateWeeklyDrafts(params: {
    userName: string;
    productDescription: string;
    primaryPlatform: string;
    topPosts: Array<{ content: string; engagementRate?: number }>;
    patterns?: string; // Extracted patterns from analytics
  }): Promise<AgentDraftResult> {
    const systemPrompt = `You are Legent — an autonomous social media co-founder AI agent for indie hackers and SaaS founders.

You are building for: ${params.userName} who builds ${params.productDescription}.

Your goal is to draft 7 high-quality posts for the next 7 days that match their exact voice and proven patterns.

CRITICAL RULES:
1. Match their exact voice — do NOT sound corporate, generic, or overly polished.
2. Every post must lead with a specific number, metric, or concrete fact (their top performing format).
3. One post per day. Mix: 2x build-in-public, 2x founder lessons/tips, 2x problem-agitate-solve, 1x vulnerable/personal story.
4. Keep posts authentic and slightly raw — founders connect with imperfection.
5. Return STRICT JSON array only.

Output format:
{
  "posts": [
    {
      "day": 1,
      "content": "The actual post text here...",
      "suggestedTime": "09:30",
      "rationale": "Why this post will perform well",
      "confidenceScore": 8
    },
    ...
  ],
  "overallNotes": "Any strategic notes for the week"
}`;

    const userPrompt = `Here are their top-performing posts (use these as style reference):

${params.topPosts.map((p, i) => `Post ${i + 1} (${p.engagementRate || '?'}% engagement):\n${p.content}`).join('\n\n')}

${params.patterns ? `Learned patterns from their analytics:\n${params.patterns}` : ''}

Now draft 7 posts for the upcoming week on ${params.primaryPlatform}.

Return ONLY valid JSON.`;

    try {
      const rawResponse = await this.callOpenRouter(systemPrompt, userPrompt, 0.8);
      const parsed = JSON.parse(rawResponse);
      return AgentDraftResultSchema.parse(parsed);
    } catch (error) {
      console.error('OpenRouter agent draft error:', error);
      throw new Error('Failed to generate weekly drafts. Please try again later.');
    }
  }
}

// Singleton instance
export const openrouter = new OpenRouterClient();