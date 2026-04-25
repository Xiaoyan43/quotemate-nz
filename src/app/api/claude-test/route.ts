import { NextResponse } from "next/server";
import { createClaudeClient } from "@/lib/claude";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = createClaudeClient();
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      stream: false,
      messages: [
        {
          role: "user",
          content: "Say hello in one sentence to confirm the API works.",
        },
      ],
    });

    const replyParts: string[] = [];
    for (const block of message.content) {
      if (block.type === "text") {
        replyParts.push(block.text);
      }
    }
    const reply = replyParts.join("\n").trim();

    return NextResponse.json({
      ok: true,
      reply,
      model: message.model,
      usage: message.usage,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}
