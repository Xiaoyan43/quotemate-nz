export const GST_RATE = 0.15;

export type GenerateQuoteLineItem = {
  description: string;
  category: "materials" | "labor" | "subcontractor" | "other";
  amount_nzd: number;
};

export type GenerateQuoteSuccess = {
  ok: true;
  quote_id: string;
  quote: {
    line_items: GenerateQuoteLineItem[];
    assumptions: string[];
    subtotal_nzd: number;
    gst_nzd: number;
    total_nzd: number;
  };
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
};

export type GenerateQuoteError = {
  ok: false;
  error: string;
  code:
    | "unauthorized"
    | "not_found"
    | "claude_failed"
    | "invalid_response"
    | "persist_failed"
    | "unknown";
};

export type GenerateQuoteResult = GenerateQuoteSuccess | GenerateQuoteError;

export type StreamSummaryRequest = {
  inquiry_id: string;
  line_items: GenerateQuoteLineItem[];
  total_nzd: number;
  assumptions: string[];
};
