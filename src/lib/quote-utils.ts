import { type GenerateQuoteLineItem } from "@/lib/quote-types";

export const INQUIRY_STATUSES = [
  "new",
  "quoted",
  "accepted",
  "declined",
  "archived",
] as const;

export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export function isInquiryStatus(value: string): value is InquiryStatus {
  return (INQUIRY_STATUSES as readonly string[]).includes(value);
}

export function formatBudgetLabel(
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

export function parseRecordQuoteInput(input: unknown): GenerateQuoteLineItem[] | null {
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
