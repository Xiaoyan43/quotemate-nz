"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
