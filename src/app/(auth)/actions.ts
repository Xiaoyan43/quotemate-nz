"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=Please%20enter%20email%20and%20password");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!email || !password || !confirmPassword) {
    redirect("/signup?error=Please%20fill%20in%20all%20fields");
  }

  if (password !== confirmPassword) {
    redirect("/signup?error=Passwords%20do%20not%20match");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/login?message=Check%20your%20email%20to%20confirm%20your%20account");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/");
  redirect("/");
}

export async function signOutAndSignUp() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/signup");
}

export async function demoSignIn() {
  const email = process.env.DEMO_EMAIL;
  const password = process.env.DEMO_PASSWORD;

  if (!email || !password) {
    redirect("/login?error=Demo%20mode%20is%20not%20configured");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect("/login?error=Demo%20login%20failed.%20Please%20try%20again.");
  }

  redirect("/dashboard");
}
