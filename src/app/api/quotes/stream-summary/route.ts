import { createClaudeClient } from "@/lib/claude";
import type { GenerateQuoteLineItem, StreamSummaryRequest } from "@/lib/quote-types";
import { createClient } from "@/utils/supabase/server";

const STREAM_SUMMARY_SYSTEM =
  "You are an experienced NZ tradesperson writing a friendly summary message to attach to a quote draft. Write 2-3 sentences in plain English suitable to send directly to the customer. No hard-sell, no markdown, no headers, just natural prose.";

function isLineItemCategory(value: unknown): value is GenerateQuoteLineItem["category"] {
  return (
    value === "materials" ||
    value === "labor" ||
    value === "subcontractor" ||
    value === "other"
  );
}

function isValidStreamSummaryBody(body: unknown): body is StreamSummaryRequest {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const b = body as Record<string, unknown>;
  if (typeof b.inquiry_id !== "string" || b.inquiry_id.length === 0) {
    return false;
  }
  if (typeof b.total_nzd !== "number" || !Number.isFinite(b.total_nzd)) {
    return false;
  }
  if (!Array.isArray(b.assumptions) || b.assumptions.length === 0) {
    return false;
  }
  for (const a of b.assumptions) {
    if (typeof a !== "string" || a.trim().length === 0) {
      return false;
    }
  }
  if (!Array.isArray(b.line_items) || b.line_items.length === 0) {
    return false;
  }
  for (const item of b.line_items) {
    if (typeof item !== "object" || item === null) {
      return false;
    }
    const row = item as Record<string, unknown>;
    if (typeof row.description !== "string" || row.description.trim().length === 0) {
      return false;
    }
    if (!isLineItemCategory(row.category)) {
      return false;
    }
    if (typeof row.amount_nzd !== "number" || !Number.isFinite(row.amount_nzd) || row.amount_nzd < 0) {
      return false;
    }
  }
  return true;
}

function buildUserPrompt(payload: StreamSummaryRequest): string {
  const lines = payload.line_items
    .map(
      (item, i) =>
        `${i + 1}. ${item.description} (${item.category}) — NZ$ ${item.amount_nzd.toLocaleString("en-NZ")} excl. GST`,
    )
    .join("\n");

  const assumptions = payload.assumptions.map((a, i) => `${i + 1}. ${a}`).join("\n");

  const total = payload.total_nzd.toLocaleString("en-NZ");

  return `Here is a quote I'm preparing for a customer:

Line items:
${lines}

Total (incl. GST): NZ$ ${total}

Assumptions:
${assumptions}

Write the summary message I should send.`;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  if (!isValidStreamSummaryBody(body)) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  const payload = body;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  const { data: inquiry, error: inquiryError } = await supabase
    .from("inquiries")
    .select("id")
    .eq("id", payload.inquiry_id)
    .maybeSingle();

  if (inquiryError) {
    return new Response(JSON.stringify({ ok: false, error: inquiryError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  if (!inquiry) {
    return new Response(JSON.stringify({ ok: false, error: "Inquiry not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  const client = createClaudeClient();
  const userMessage = buildUserPrompt(payload);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const claudeStream = client.messages.stream({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        system: STREAM_SUMMARY_SYSTEM,
        messages: [{ role: "user", content: userMessage }],
      });

      claudeStream.on("text", (textDelta) => {
        controller.enqueue(encoder.encode(textDelta));
      });

      try {
        await claudeStream.done();
        controller.close();
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error(typeof err === "string" ? err : "Stream failed");
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
