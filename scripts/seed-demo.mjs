/**
 * Seed realistic demo data for the shared demo account.
 *
 * The demo user must already exist in Supabase Auth (create via Dashboard →
 * Authentication → Users → Add user, tick "Auto Confirm User").
 *
 * Usage:
 *   node --env-file=.env.local scripts/seed-demo.mjs
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *   DEMO_EMAIL
 *   DEMO_PASSWORD
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const DEMO_EMAIL = process.env.DEMO_EMAIL;
const DEMO_PASSWORD = process.env.DEMO_PASSWORD;

if (!SUPABASE_URL || !ANON_KEY || !DEMO_EMAIL || !DEMO_PASSWORD) {
  console.error(
    "Missing required env vars. Ensure NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, DEMO_EMAIL, and DEMO_PASSWORD are set.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// --- sign in as demo user ---

const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
  email: DEMO_EMAIL,
  password: DEMO_PASSWORD,
});

if (signInError) {
  console.error(
    `Sign-in failed: ${signInError.message}\n` +
      `Make sure the demo account exists in Supabase:\n` +
      `  Dashboard → Authentication → Users → Add user\n` +
      `  Email: ${DEMO_EMAIL} | Password: (your DEMO_PASSWORD) | tick "Auto Confirm User"`,
  );
  process.exit(1);
}

const demoUserId = signInData.user.id;
console.log(`Signed in as demo user: ${demoUserId}`);

// --- wipe existing demo data (quotes cascade from inquiries) ---

const { error: deleteError } = await supabase
  .from("inquiries")
  .delete()
  .eq("user_id", demoUserId);

if (deleteError) {
  console.error("Failed to clear existing data:", deleteError.message);
  process.exit(1);
}
console.log("Cleared existing demo data.");

// --- insert inquiries ---

const inquiryRows = [
  {
    user_id: demoUserId,
    title: "Leaking ridge cap repair – Mt Eden",
    description:
      "Water is coming in through the ridge cap on a 1970s tiled roof. Damage visible on interior ceiling in master bedroom. Approximately 3–4 ridge tiles affected. Property is a single-storey weatherboard home.",
    budget_min: 2000,
    budget_max: 4000,
    status: "quoted",
    created_at: "2026-05-12T09:15:00Z",
  },
  {
    user_id: demoUserId,
    title: "Full bathroom renovation – Birkenhead",
    description:
      "Strip out and replace everything in a main bathroom (approx. 8m²). New vanity, toilet suite, shower tray and screen. Full wall and floor tiling. Plumbing connections to existing rough-in. Client has chosen tiles but not fixtures yet.",
    budget_min: 8000,
    budget_max: 12000,
    status: "accepted",
    created_at: "2026-05-19T14:30:00Z",
  },
  {
    user_id: demoUserId,
    title: "Replace weatherboard cladding – Ponsonby",
    description:
      "Approximately 120m² of original villa weatherboard cladding is rotting and needs full replacement. Prefer like-for-like rebated weatherboard in cedar or equivalent. Include associated flashings, underlay, and repainting.",
    budget_min: 15000,
    budget_max: 25000,
    status: "new",
    created_at: "2026-05-26T10:00:00Z",
  },
  {
    user_id: demoUserId,
    title: "Cedar fence installation – Remuera back boundary",
    description:
      "Need a 1.8m cedar paling fence installed along 22 linear metres of the back boundary. Includes removal of the existing post-and-wire fence. Gate required at one end. Property has some slope.",
    budget_min: 3000,
    budget_max: 5000,
    status: "new",
    created_at: "2026-05-29T08:45:00Z",
  },
  {
    user_id: demoUserId,
    title: "Deck board replacement – Henderson",
    description:
      "Existing 20m² pine deck has boards that are badly split and cupping. Frame appears sound (client says 3 years old). Need deck boards replaced with H3.2 treated pine, sanded and oiled. Access is straightforward.",
    budget_min: 3500,
    budget_max: 6000,
    status: "quoted",
    created_at: "2026-05-14T11:00:00Z",
  },
  {
    user_id: demoUserId,
    title: "Kitchen splashback tiling – Grey Lynn",
    description:
      "Install subway tile splashback behind benchtop and cooktop. Area is roughly 3.5m². Surface is existing plasterboard – will need waterproof membrane behind the cooking zone. Client supplying tiles.",
    budget_min: 1500,
    budget_max: 3000,
    status: "archived",
    created_at: "2026-04-20T13:00:00Z",
  },
];

const { data: inquiries, error: inquiryError } = await supabase
  .from("inquiries")
  .insert(inquiryRows)
  .select("id, title, status");

if (inquiryError) {
  console.error("Failed to insert inquiries:", inquiryError.message);
  process.exit(1);
}
console.log(`Inserted ${inquiries.length} inquiries.`);

const byTitle = Object.fromEntries(inquiries.map((i) => [i.title, i.id]));

// --- insert quotes for quoted / accepted / archived inquiries ---

const GST = 0.15;

function makeQuote(userId, inquiryId, lineItems, assumptions, createdAt) {
  const subtotal = lineItems.reduce((s, li) => s + li.amount_nzd, 0);
  const gst = Math.round(subtotal * GST * 100) / 100;
  const total = Math.round((subtotal + gst) * 100) / 100;
  return {
    user_id: userId,
    inquiry_id: inquiryId,
    line_items: lineItems,
    subtotal,
    gst,
    total,
    assumptions,
    model_used: "claude-haiku-4-5-20251001",
    input_tokens: 420,
    output_tokens: 310,
    created_at: createdAt,
  };
}

const quoteRows = [
  // Inquiry 1 – roof repair (quoted)
  makeQuote(
    demoUserId,
    byTitle["Leaking ridge cap repair – Mt Eden"],
    [
      { description: "Ridge cap flashing – supply and fit", category: "materials", amount_nzd: 320 },
      { description: "Remove and relay 4 ridge tiles", category: "labor", amount_nzd: 280 },
      { description: "Waterproof membrane under ridge", category: "materials", amount_nzd: 180 },
      { description: "Re-bed and point ridge (2 lin. m)", category: "labor", amount_nzd: 320 },
      { description: "Site cleanup and waste disposal", category: "other", amount_nzd: 80 },
    ],
    [
      "Assumes damage is limited to the 3–4 tiles described; any hidden rot or sarking damage will be a variation",
      "Access via standard extension ladder – scaffolding not included",
      "Tile colour match is best-effort; exact match not guaranteed on a 1970s roof",
    ],
    "2026-05-13T10:30:00Z",
  ),

  // Inquiry 2 – bathroom reno (accepted)
  makeQuote(
    demoUserId,
    byTitle["Full bathroom renovation – Birkenhead"],
    [
      { description: "Strip-out – vanity, toilet, tiles, linings", category: "labor", amount_nzd: 680 },
      { description: "Waterproofing membrane – walls and floor", category: "materials", amount_nzd: 420 },
      { description: "Wall tiling – 14m² supply and install", category: "materials", amount_nzd: 1540 },
      { description: "Floor tiling – 5m² supply and install", category: "materials", amount_nzd: 650 },
      { description: "Vanity unit and toilet suite – supply and install", category: "materials", amount_nzd: 1380 },
      { description: "Plumbing rough-in and fit-off", category: "subcontractor", amount_nzd: 950 },
    ],
    [
      "Tile allowance based on mid-range subway tile at ~$85/m²; client's own tiles may change materials cost",
      "Existing plumbing rough-in is to code and in usable condition",
      "No structural work required; walls are standard timber-framed",
      "Electrical (extractor fan, heated towel rail) excluded – quote separately if needed",
    ],
    "2026-05-21T09:00:00Z",
  ),

  // Inquiry 5 – deck replacement (quoted)
  makeQuote(
    demoUserId,
    byTitle["Deck board replacement – Henderson"],
    [
      { description: "Remove existing decking boards", category: "labor", amount_nzd: 380 },
      { description: "Frame inspection and minor joist repairs", category: "labor", amount_nzd: 420 },
      { description: "H3.2 pine decking boards 20m² – supply", category: "materials", amount_nzd: 1960 },
      { description: "Install decking boards", category: "labor", amount_nzd: 760 },
      { description: "Two-coat decking oil – supply and apply", category: "materials", amount_nzd: 270 },
    ],
    [
      "Frame assumed sound as described; any rotten joists will be charged as a variation at $95/hr",
      "Board spacing and run direction to match existing layout",
      "Decking oil colour: Cabbot's Natural – client to confirm before order",
    ],
    "2026-05-16T14:00:00Z",
  ),

  // Inquiry 6 – splashback (archived)
  makeQuote(
    demoUserId,
    byTitle["Kitchen splashback tiling – Grey Lynn"],
    [
      { description: "Surface prep and waterproof membrane", category: "labor", amount_nzd: 140 },
      { description: "Tile adhesive and grout – supply", category: "materials", amount_nzd: 95 },
      { description: "Tile installation – 3.5m²", category: "labor", amount_nzd: 490 },
      { description: "Silicone beads and finishing", category: "labor", amount_nzd: 120 },
    ],
    [
      "Client supplying tiles – any cuts or breakages beyond 10% wastage are client's responsibility",
      "Plasterboard substrate assumed sound; no re-lining included",
    ],
    "2026-04-22T11:30:00Z",
  ),
];

const { data: quotes, error: quoteError } = await supabase
  .from("quotes")
  .insert(quoteRows)
  .select("id");

if (quoteError) {
  console.error("Failed to insert quotes:", quoteError.message);
  process.exit(1);
}

console.log(`Inserted ${quotes.length} quotes.`);
console.log("\nDemo seed complete.");
console.log(`  Inquiries : ${inquiries.length}`);
console.log(`  Quotes    : ${quotes.length}`);
