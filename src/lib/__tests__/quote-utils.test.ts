import { describe, it, expect } from "vitest";
import {
  isInquiryStatus,
  formatBudgetLabel,
  parseRecordQuoteInput,
  INQUIRY_STATUSES,
} from "@/lib/quote-utils";

// ─── isInquiryStatus ──────────────────────────────────────────────────────────

describe("isInquiryStatus", () => {
  it.each(INQUIRY_STATUSES)("accepts valid status '%s'", (status) => {
    expect(isInquiryStatus(status)).toBe(true);
  });

  it("rejects an unknown string", () => {
    expect(isInquiryStatus("open")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isInquiryStatus("")).toBe(false);
  });

  it("is case-sensitive", () => {
    expect(isInquiryStatus("New")).toBe(false);
    expect(isInquiryStatus("QUOTED")).toBe(false);
  });
});

// ─── formatBudgetLabel ────────────────────────────────────────────────────────

describe("formatBudgetLabel", () => {
  it("returns range when both min and max are provided", () => {
    expect(formatBudgetLabel(1000, 5000)).toBe("NZ$ 1,000 - NZ$ 5,000");
  });

  it("returns open-ended label when only min is provided", () => {
    expect(formatBudgetLabel(2000, null)).toBe("NZ$ 2,000+");
  });

  it("returns upper-bound label when only max is provided", () => {
    expect(formatBudgetLabel(null, 3000)).toBe("Up to NZ$ 3,000");
  });

  it("returns 'Not specified' when both are null", () => {
    expect(formatBudgetLabel(null, null)).toBe("Not specified");
  });

  it("formats zero min correctly", () => {
    expect(formatBudgetLabel(0, 500)).toBe("NZ$ 0 - NZ$ 500");
  });
});

// ─── parseRecordQuoteInput ────────────────────────────────────────────────────

const validInput = {
  line_items: [
    { description: "Labour", category: "labor", amount_nzd: 200 },
    { description: "Tiles", category: "materials", amount_nzd: 350.5 },
  ],
  assumptions: ["Standard wall preparation assumed"],
};

describe("parseRecordQuoteInput", () => {
  it("parses a minimal valid input", () => {
    const result = parseRecordQuoteInput(validInput);
    expect(result).toHaveLength(2);
    expect(result![0]).toEqual({ description: "Labour", category: "labor", amount_nzd: 200 });
  });

  it("trims whitespace from descriptions", () => {
    const input = {
      ...validInput,
      line_items: [
        { description: "  Labour  ", category: "labor", amount_nzd: 100 },
        { description: "Tiles", category: "materials", amount_nzd: 50 },
      ],
    };
    const result = parseRecordQuoteInput(input);
    expect(result![0].description).toBe("Labour");
  });

  it("accepts all four valid categories", () => {
    const categories = ["materials", "labor", "subcontractor", "other"] as const;
    for (const category of categories) {
      const input = {
        assumptions: ["Assumed access"],
        line_items: [
          { description: "Item A", category, amount_nzd: 100 },
          { description: "Item B", category, amount_nzd: 200 },
        ],
      };
      expect(parseRecordQuoteInput(input)).not.toBeNull();
    }
  });

  it("accepts 6 line items (max)", () => {
    const input = {
      assumptions: ["Some assumption"],
      line_items: Array.from({ length: 6 }, (_, i) => ({
        description: `Item ${i + 1}`,
        category: "labor",
        amount_nzd: 100,
      })),
    };
    expect(parseRecordQuoteInput(input)).toHaveLength(6);
  });

  it("rejects null", () => {
    expect(parseRecordQuoteInput(null)).toBeNull();
  });

  it("rejects a non-object primitive", () => {
    expect(parseRecordQuoteInput("bad")).toBeNull();
  });

  it("rejects when line_items is missing", () => {
    expect(parseRecordQuoteInput({ assumptions: ["x"] })).toBeNull();
  });

  it("rejects fewer than 2 line items", () => {
    const input = {
      assumptions: ["x"],
      line_items: [{ description: "Only one", category: "labor", amount_nzd: 100 }],
    };
    expect(parseRecordQuoteInput(input)).toBeNull();
  });

  it("rejects more than 6 line items", () => {
    const input = {
      assumptions: ["x"],
      line_items: Array.from({ length: 7 }, (_, i) => ({
        description: `Item ${i + 1}`,
        category: "labor",
        amount_nzd: 100,
      })),
    };
    expect(parseRecordQuoteInput(input)).toBeNull();
  });

  it("rejects an invalid category", () => {
    const input = {
      assumptions: ["x"],
      line_items: [
        { description: "Item", category: "equipment", amount_nzd: 100 },
        { description: "Item 2", category: "labor", amount_nzd: 50 },
      ],
    };
    expect(parseRecordQuoteInput(input)).toBeNull();
  });

  it("rejects a negative amount", () => {
    const input = {
      assumptions: ["x"],
      line_items: [
        { description: "Item", category: "labor", amount_nzd: -10 },
        { description: "Item 2", category: "labor", amount_nzd: 50 },
      ],
    };
    expect(parseRecordQuoteInput(input)).toBeNull();
  });

  it("rejects a non-finite amount (NaN)", () => {
    const input = {
      assumptions: ["x"],
      line_items: [
        { description: "Item", category: "labor", amount_nzd: NaN },
        { description: "Item 2", category: "labor", amount_nzd: 50 },
      ],
    };
    expect(parseRecordQuoteInput(input)).toBeNull();
  });

  it("rejects an empty description", () => {
    const input = {
      assumptions: ["x"],
      line_items: [
        { description: "   ", category: "labor", amount_nzd: 100 },
        { description: "Item 2", category: "labor", amount_nzd: 50 },
      ],
    };
    expect(parseRecordQuoteInput(input)).toBeNull();
  });

  it("rejects missing assumptions", () => {
    const input = { line_items: validInput.line_items };
    expect(parseRecordQuoteInput(input)).toBeNull();
  });

  it("rejects empty assumptions array", () => {
    const input = { ...validInput, assumptions: [] };
    expect(parseRecordQuoteInput(input)).toBeNull();
  });

  it("rejects more than 5 assumptions", () => {
    const input = {
      ...validInput,
      assumptions: ["a", "b", "c", "d", "e", "f"],
    };
    expect(parseRecordQuoteInput(input)).toBeNull();
  });

  it("rejects a blank assumption string", () => {
    const input = { ...validInput, assumptions: ["  "] };
    expect(parseRecordQuoteInput(input)).toBeNull();
  });

  it("accepts zero as a valid amount", () => {
    const input = {
      assumptions: ["Included in other items"],
      line_items: [
        { description: "No charge item", category: "other", amount_nzd: 0 },
        { description: "Main work", category: "labor", amount_nzd: 500 },
      ],
    };
    expect(parseRecordQuoteInput(input)).not.toBeNull();
  });
});
