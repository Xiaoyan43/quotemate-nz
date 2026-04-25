# QuoteMate NZ

QuoteMate NZ is an AI + full-stack portfolio project for New Zealand trade businesses.  
The app helps an authenticated user capture customer inquiries, generate structured quote drafts with AI, and persist quote history with per-user data isolation.

Live demo: [https://quotemate-nz.vercel.app](https://quotemate-nz.vercel.app)

## Tech Stack

- Next.js 16.2.4
- React 19
- TypeScript (strict)
- Tailwind CSS 4
- Supabase Auth + Postgres + Row Level Security (RLS)
- Anthropic SDK using `claude-haiku-4-5-20251001`
- Vercel

## Core Features (Current Implementation)

- **Auth**: Sign up, login, and protected app routes.
- **Inquiry workflow**: Inquiry create + read flows are implemented (full update/delete CRUD is not yet implemented).
- **AI quote generation**: Server-side quote drafting via Anthropic tool use.
- **Structured line items**: AI output is constrained to typed categories and validated server-side.
- **GST calculation**: Subtotal, GST (15%), and total are computed in code.
- **Quote persistence**: Generated quotes are inserted into Supabase with metadata.
- **Quote history**: Inquiry detail page shows historical quote entries.
- **Dual streaming UX**: Structured quote appears first, then a customer-facing summary streams token-by-token.

## Architecture

- **Server Components for data loading**
  - Dashboard and inquiry detail pages load Supabase data on the server.
- **Client Component for interactive quote generation**
  - A client-side section handles generation state, rendering quote tables, and consuming streaming summary text.
- **Server Action for structured AI quote generation and DB insert**
  - The server action calls Claude with a tool schema, validates output, calculates totals, and inserts the quote row.
- **Route Handler for streaming quote summary**
  - A dedicated API route streams plain-text summary output from Anthropic after the quote draft is available.
- **Supabase RLS for per-user data isolation**
  - Policies on `customers`, `inquiries`, and `quotes` enforce user-scoped reads/writes via `auth.uid() = user_id`.

## Key Engineering Decisions

- **Haiku 4.5 over Sonnet**
  - Chosen for better portfolio cost/latency trade-off while still producing usable structured drafts.
- **Tool use over JSON-in-prompt**
  - Claude tool input schema plus server-side parsing reduces malformed outputs and keeps structure explicit.
- **Dual streaming UX**
  - The user sees useful structured pricing first, then narrative summary streams, improving perceived responsiveness.
- **Native AI metadata columns instead of `jsonb`**
  - `assumptions`, `model_used`, `input_tokens`, and `output_tokens` are queryable columns for easier analysis/audit.
- **Env validation inside server-only function**
  - `createClaudeClient()` throws immediately if `ANTHROPIC_API_KEY` is missing.
- **Migration history fix after early schema drift**
  - `0003_align_initial_schema_to_reality.sql` reconciles drift from early dashboard-driven table setup.

## Database Notes

- **Main tables**: `customers`, `inquiries`, `quotes`.
- **Quotes tax column naming**: runtime schema uses `gst` (not `tax`).
- **AI metadata columns**: `assumptions`, `model_used`, `input_tokens`, `output_tokens`.
- **About `0003_align_initial_schema_to_reality.sql`**
  - Early project setup used Supabase Dashboard table creation before the initial SQL migration existed.
  - As a result, `0001` did not exactly match deployed schema.
  - `0003` is an idempotent alignment migration so a fresh clone can run `0001` + `0002` + `0003` and reproduce the current production shape.

## Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env.local` with required variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `ANTHROPIC_API_KEY`
3. Start local dev server:
   ```bash
   npm run dev
   ```
4. Run production build locally:
   ```bash
   npm run build
   ```

Notes:
- `npm run dev` and `npm run build` intentionally use `--webpack` in this project.

## Interview Talking Points

- **RLS-backed multi-user isolation**: auth + policy layer protects tenant data boundaries.
- **Tool-use schema validation**: structured AI outputs are constrained and revalidated before DB write.
- **Dual streaming interaction model**: deterministic quote structure first, narrative summary second.
- **Cost-aware model selection**: Haiku 4.5 balances quality with latency/cost for portfolio constraints.
- **Schema drift lesson learned**: migration `0003` documents and corrects early drift rather than hiding it.
