"use client";

import { useEffect } from "react";

// Auto-opens the print dialog on load (so "Download PDF" → tab opens → dialog),
// with a visible fallback button. Hidden from the printed output itself.
export default function PrintActions() {
  useEffect(() => {
    const timer = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="mb-8 flex items-center justify-between print:hidden">
      <button
        type="button"
        onClick={() => window.close()}
        className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100"
      >
        Close
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700"
      >
        Print / Save as PDF
      </button>
    </div>
  );
}
