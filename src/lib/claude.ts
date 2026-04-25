import Anthropic from "@anthropic-ai/sdk";

export function createClaudeClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing ANTHROPIC_API_KEY. Check .env.local (or Vercel Environment Variables for production).",
    );
  }

  return new Anthropic({ apiKey });
}
