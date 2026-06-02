"use server";

import type { Tool } from "@anthropic-ai/sdk/resources/messages/messages";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClaudeClient } from "@/lib/claude";
import {
  GST_RATE,
  type GenerateQuoteLineItem,
  type GenerateQuoteResult,
} from "@/lib/quote-types";
import { createClient } from "@/utils/supabase/server";

export async function createInquiry(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const budgetMinRaw = String(formData.get("budgetMin") ?? "").trim();
  const budgetMaxRaw = String(formData.get("budgetMax") ?? "").trim();

  if (!title || !description) {
    redirect("/inquiries/new?error=Title%20and%20description%20are%20required");
  }

  const budgetMin = budgetMinRaw ? Number(budgetMinRaw) : null;
  const budgetMax = budgetMaxRaw ? Number(budgetMaxRaw) : null;

  if (
    (budgetMinRaw && Number.isNaN(budgetMin)) ||
    (budgetMaxRaw && Number.isNaN(budgetMax))
  ) {
    redirect("/inquiries/new?error=Budget%20values%20must%20be%20valid%20numbers");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.from("inquiries").insert({
    user_id: user.id,
    title,
    description,
    budget_min: budgetMin,
    budget_max: budgetMax,
  });

  if (error) {
    redirect(`/inquiries/new?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function updateInquiry(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const budgetMinRaw = String(formData.get("budgetMin") ?? "").trim();
  const budgetMaxRaw = String(formData.get("budgetMax") ?? "").trim();

  if (!id) {
    redirect("/dashboard");
  }

  const editPath = `/inquiries/${id}/edit`;

  if (!title || !description) {
    redirect(`${editPath}?error=Title%20and%20description%20are%20required`);
  }

  const budgetMin = budgetMinRaw ? Number(budgetMinRaw) : null;
  const budgetMax = budgetMaxRaw ? Number(budgetMaxRaw) : null;

  if (
    (budgetMinRaw && Number.isNaN(budgetMin)) ||
    (budgetMaxRaw && Number.isNaN(budgetMax))
  ) {
    redirect(`${editPath}?error=Budget%20values%20must%20be%20valid%20numbers`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Scope by user_id as well as the RLS policy — defence in depth: a Server
  // Action is reachable via direct POST, so never trust the id alone.
  const { error } = await supabase
    .from("inquiries")
    .update({
      title,
      description,
      budget_min: budgetMin,
      budget_max: budgetMax,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    redirect(`${editPath}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/inquiries/${id}`);
  redirect(`/inquiries/${id}`);
}

const INQUIRY_STATUSES = [
  "new",
  "quoted",
  "accepted",
  "declined",
  "archived",
] as const;

type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

function isInquiryStatus(value: string): value is InquiryStatus {
  return (INQUIRY_STATUSES as readonly string[]).includes(value);
}

export async function updateInquiryStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!id) {
    redirect("/dashboard");
  }

  // Never trust the posted status — a Server Action is reachable via direct POST.
  if (!isInquiryStatus(status)) {
    redirect(`/inquiries/${id}?error=Invalid%20status`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("inquiries")
    .update({ status })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    redirect(`/inquiries/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/inquiries/${id}`);
  redirect(`/inquiries/${id}`);
}

export async function deleteInquiry(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Associated quotes cascade-delete via the inquiry_id FK (on delete cascade).
  const { error } = await supabase
    .from("inquiries")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    redirect(`/inquiries/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function deleteQuote(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const inquiryId = String(formData.get("inquiryId") ?? "").trim();

  if (!id || !inquiryId) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("quotes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    redirect(`/inquiries/${inquiryId}?error=${encodeURIComponent(error.message)}`);
  }

  // Dashboard stats count quotes and sum their totals, so revalidate it too.
  revalidatePath("/dashboard");
  revalidatePath(`/inquiries/${inquiryId}`);
  redirect(`/inquiries/${inquiryId}`);
}

const VALID_CATEGORIES = new Set(["materials", "labor", "subcontractor", "other"]);

export async function updateQuoteLineItems(
  quoteId: string,
  inquiryId: string,
  lineItems: GenerateQuoteLineItem[],
): Promise<{ error: string } | null> {
  if (!quoteId || !inquiryId) return { error: "Missing quote or inquiry ID" };

  if (lineItems.length < 2 || lineItems.length > 6) {
    return { error: "A quote must have between 2 and 6 line items" };
  }

  for (const item of lineItems) {
    if (!item.description?.trim()) {
      return { error: "All line items must have a description" };
    }
    if (!VALID_CATEGORIES.has(item.category)) {
      return { error: "Invalid category" };
    }
    if (!Number.isFinite(item.amount_nzd) || item.amount_nzd < 0) {
      return { error: "All amounts must be valid non-negative numbers" };
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const subtotal = lineItems.reduce((sum, li) => sum + li.amount_nzd, 0);
  const gst = Math.round(subtotal * GST_RATE * 100) / 100;
  const total = Math.round((subtotal + gst) * 100) / 100;

  const { error: dbError } = await supabase
    .from("quotes")
    .update({ line_items: lineItems, subtotal, gst, total })
    .eq("id", quoteId)
    .eq("user_id", user.id);

  if (dbError) return { error: dbError.message };

  revalidatePath(`/inquiries/${inquiryId}`);
  return null;
}

const RECORD_QUOTE_SYSTEM_PROMPT = `You are an experienced tradesperson in New Zealand helping a small trade business owner draft quotes for customer inquiries. You have practical knowledge of NZ market rates for materials and labor.

Your job: produce a structured DRAFT quote that the business owner will review and edit before sending to the customer.

Rules:
- All prices in NZD, GST-EXCLUSIVE (the system adds 15% GST separately)
- Do not include currency symbols; amount_nzd is a plain number
- Be conservative with estimates: when uncertain, lean slightly higher and note the uncertainty in 'assumptions'
- Never invent customer details that are not in the inquiry
- Use 2 to 6 line items total; do not over-decompose tiny items

You have one tool: record_quote. You MUST call it with structured input matching the schema. Do not write any prose outside the tool call.`;

const RECORD_QUOTE_TOOL: Tool = {
  name: "record_quote",
  description:
    "Record a structured quote draft with line items and explicit assumptions made.",
  input_schema: {
    type: "object",
    properties: {
      line_items: {
        type: "array",
        minItems: 2,
        maxItems: 6,
        items: {
          type: "object",
          properties: {
            description: {
              type: "string",
              description:
                'Short description of the work or material item, e.g. "Tile installation, 6m²"',
            },
            category: {
              type: "string",
              enum: ["materials", "labor", "subcontractor", "other"],
            },
            amount_nzd: {
              type: "number",
              minimum: 0,
              description:
                "Amount in NZD, GST-exclusive, no currency symbol, just the number",
            },
          },
          required: ["description", "category", "amount_nzd"],
        },
      },
      assumptions: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        maxItems: 5,
        description:
          "List the assumptions you made when estimating. Be honest about uncertainty.",
      },
    },
    required: ["line_items", "assumptions"],
  },
};

function formatBudgetLabel(
  budgetMin: number | null,
  budgetMax: number | null,
): string {
  if (budgetMin !== null && budgetMax !== null) {
    return `NZ$ ${budgetMin.toLocaleString()} - NZ$ ${budgetMax.toLocaleString()}`;
  }
  if (budgetMin !== null) {
    return `NZ$ ${budgetMin.toLocaleString()}+`;
  }
  if (budgetMax !== null) {
    return `Up to NZ$ ${budgetMax.toLocaleString()}`;
  }
  return "Not specified";
}

function findRecordQuoteToolUse(message: {
  content: Array<{ type: string; name?: string; input?: unknown }>;
}) {
  for (const block of message.content) {
    if (block.type === "tool_use" && block.name === "record_quote") {
      return block;
    }
  }
  return null;
}

function isLineItemCategory(
  value: unknown,
): value is GenerateQuoteLineItem["category"] {
  return (
    value === "materials" ||
    value === "labor" ||
    value === "subcontractor" ||
    value === "other"
  );
}

function parseRecordQuoteInput(input: unknown): GenerateQuoteLineItem[] | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }

  const record = input as Record<string, unknown>;
  const lineItemsRaw = record.line_items;
  const assumptions = record.assumptions;

  if (!Array.isArray(lineItemsRaw) || lineItemsRaw.length < 2 || lineItemsRaw.length > 6) {
    return null;
  }

  if (!Array.isArray(assumptions) || assumptions.length < 1 || assumptions.length > 5) {
    return null;
  }

  for (const assumption of assumptions) {
    if (typeof assumption !== "string" || assumption.trim().length === 0) {
      return null;
    }
  }

  const lineItems: GenerateQuoteLineItem[] = [];

  for (const item of lineItemsRaw) {
    if (typeof item !== "object" || item === null) {
      return null;
    }
    const row = item as Record<string, unknown>;
    const description = row.description;
    const category = row.category;
    const amount = row.amount_nzd;

    if (typeof description !== "string" || description.trim().length === 0) {
      return null;
    }
    if (!isLineItemCategory(category)) {
      return null;
    }
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
      return null;
    }

    lineItems.push({
      description: description.trim(),
      category,
      amount_nzd: amount,
    });
  }

  return lineItems;
}

export async function generateQuote(inquiryId: string): Promise<GenerateQuoteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Not authenticated", code: "unauthorized" };
  }

  const { data: inquiry, error: inquiryError } = await supabase
    .from("inquiries")
    .select("title, description, budget_min, budget_max")
    .eq("id", inquiryId)
    .maybeSingle();

  if (inquiryError) {
    return { ok: false, error: inquiryError.message, code: "unknown" };
  }

  if (!inquiry) {
    return { ok: false, error: "Inquiry not found", code: "not_found" };
  }

  const budgetLabel = formatBudgetLabel(inquiry.budget_min, inquiry.budget_max);
  const userMessage = `Please draft a quote for this customer inquiry:

Title: ${inquiry.title}
Description: ${inquiry.description}
Customer's stated budget range: ${budgetLabel}`;

  const client = createClaudeClient();

  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt === 1) {
      console.log("[generateQuote] Retrying Claude request...");
    }

    try {
      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        temperature: 0.3,
        stream: false,
        system: RECORD_QUOTE_SYSTEM_PROMPT,
        tool_choice: { type: "tool", name: "record_quote" },
        tools: [RECORD_QUOTE_TOOL],
        messages: [{ role: "user", content: userMessage }],
      });

      const toolUse = findRecordQuoteToolUse(message);
      if (!toolUse) {
        lastError = new Error("No tool_use block in Claude response");
        continue;
      }

      const assumptionsRaw = (toolUse.input as Record<string, unknown>).assumptions;

      if (!Array.isArray(assumptionsRaw)) {
        return { ok: false, error: "Invalid tool response shape", code: "invalid_response" };
      }

      const assumptions = assumptionsRaw
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      const lineItems = parseRecordQuoteInput(toolUse.input);
      if (!lineItems) {
        return { ok: false, error: "Invalid tool response shape", code: "invalid_response" };
      }

      if (assumptions.length < 1 || assumptions.length > 5) {
        return { ok: false, error: "Invalid assumptions in tool response", code: "invalid_response" };
      }

      const subtotal_nzd = lineItems.reduce((sum, item) => sum + item.amount_nzd, 0);
      const gst_nzd = subtotal_nzd * GST_RATE;
      const total_nzd = subtotal_nzd + gst_nzd;

      const { data: insertedQuote, error: insertError } = await supabase
        .from("quotes")
        .insert({
          user_id: user.id,
          inquiry_id: inquiryId,
          line_items: lineItems,
          subtotal: subtotal_nzd,
          gst: gst_nzd,
          total: total_nzd,
          assumptions,
          model_used: "claude-haiku-4-5-20251001",
          input_tokens: message.usage.input_tokens,
          output_tokens: message.usage.output_tokens,
        })
        .select()
        .single();

      if (insertError || !insertedQuote) {
        return {
          ok: false,
          error: insertError?.message ?? "Failed to persist generated quote",
          code: "persist_failed",
        };
      }

      return {
        ok: true,
        quote_id: insertedQuote.id,
        quote: {
          line_items: lineItems,
          assumptions,
          subtotal_nzd,
          gst_nzd,
          total_nzd,
        },
        usage: {
          input_tokens: message.usage.input_tokens,
          output_tokens: message.usage.output_tokens,
        },
      };
    } catch (err) {
      lastError = err;
    }
  }

  const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
  return { ok: false, error: errorMessage, code: "claude_failed" };
}
