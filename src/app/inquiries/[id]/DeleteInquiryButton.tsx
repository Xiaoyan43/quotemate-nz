"use client";

import { deleteInquiry } from "../actions";

export default function DeleteInquiryButton({ inquiryId }: { inquiryId: string }) {
  return (
    <form
      action={deleteInquiry}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Delete this inquiry and all of its quotes? This cannot be undone.",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={inquiryId} />
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20"
      >
        Delete
      </button>
    </form>
  );
}
